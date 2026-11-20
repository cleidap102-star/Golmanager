import {
  buildClubFromBlueprint,
  computeInjuryRisk,
  DEFAULT_WEEKLY_TRAINING,
  generateAvailableStaffPool,
  generateExternalMarketPool,
  generateFreeAgentsPool,
  generateInitialClubStaff,
  generatePlayer,
  nextId,
  pickBestStarters,
  SPONSOR_CATALOG,
} from '../data/clubs';
import { getFederationById } from '../data/federations';
import {
  getBlueprintsForLeague,
  getLeagueById,
  WORLD_LEAGUES,
} from '../data/worldLeagues';
import {
  Club,
  CupMatch,
  FinanceEntry,
  Fixture,
  GameState,
  GenderDivision,
  InboxMessage,
  LockerThread,
  NewsItem,
  Player,
  Position,
  SocialPost,
  StaffMember,
  TrophyRecord,
  WeeklyTrainingSlot,
  WorldLeagueSnapshot,
  YouthLeagueRow,
} from '../types/game';
import { formatCompactBRL, sortStandings } from '../utils/format';
import {
  advanceCupBracketIfReady,
  applyCupMatchToStandings,
  createSeasonCups,
  simulateCupMatchAI,
} from './cupEngine';
import {
  applyMatchResultToStandings,
  generateDoubleRoundRobinFixtures,
  simulateFastAIMatch,
} from './matchEngine';

function buildInitialWorldTables(
  activeLeagueId: string,
  division: GenderDivision,
): WorldLeagueSnapshot[] {
  return WORLD_LEAGUES.filter((l) => l.id !== activeLeagueId).map((l) => {
    const bps = getBlueprintsForLeague(l.id);
    return {
      leagueId: l.id,
      standings: bps.map((bp) => ({
        clubId: bp.id,
        name: division === 'FEMININO' ? `${bp.name} Fem.` : bp.name,
        shortName: bp.shortName,
        primaryColor: bp.primaryColor,
        secondaryColor: bp.secondaryColor,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
      })),
    };
  });
}

function buildInitialYouthStandings(clubs: Club[], userClubId: string): YouthLeagueRow[] {
  return clubs.slice(0, 10).map((c) => ({
    id: `y-${c.id}`,
    clubName: `${c.shortName} Sub-20`,
    shortName: c.shortName,
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
    isUser: c.id === userClubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
}

function advanceYouthStandingsOneRound(
  rows: YouthLeagueRow[],
  userClub: Club,
): YouthLeagueRow[] {
  if (!rows || rows.length < 2) return rows;
  const next = rows.map((r) => ({ ...r }));
  const userYouthAvg =
    userClub.youthAcademy.length > 0
      ? userClub.youthAcademy.reduce((s, p) => s + p.overall, 0) / userClub.youthAcademy.length
      : 58;

  const indices = next.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  for (let k = 0; k + 1 < indices.length; k += 2) {
    const h = next[indices[k]];
    const a = next[indices[k + 1]];
    const hStr = h.isUser ? userYouthAvg + 3 : 60;
    const aStr = a.isUser ? userYouthAvg + 3 : 60;
    const diff = hStr - aStr;
    const hExp = Math.max(0.5, 1.35 + diff * 0.05);
    const aExp = Math.max(0.4, 1.15 - diff * 0.05);
    const sample = (l: number) => {
      let g = 0;
      for (let t = 0; t < 5; t += 1) if (Math.random() < l / 5) g += 1;
      return g;
    };
    const hg = sample(hExp);
    const ag = sample(aExp);

    h.played += 1;
    a.played += 1;
    h.gf += hg;
    h.ga += ag;
    a.gf += ag;
    a.ga += hg;
    if (hg > ag) {
      h.won += 1;
      h.points += 3;
      a.lost += 1;
    } else if (hg === ag) {
      h.drawn += 1;
      a.drawn += 1;
      h.points += 1;
      a.points += 1;
    } else {
      a.won += 1;
      a.points += 3;
      h.lost += 1;
    }
  }
  return next;
}

function buildInitialLockerThreads(
  userClub: Club,
  managerName: string,
  staff: StaffMember[],
): LockerThread[] {
  const captain =
    userClub.roster
      .filter((p) => userClub.tactics.starterIds.includes(p.id))
      .sort((a, b) => b.overall - a.overall)[0] || userClub.roster[0];

  const topPlayers = [...userClub.roster]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 4);

  const aux = staff.find((s) => s.role === 'AUXILIAR');

  const threads: LockerThread[] = [
    {
      id: 'thread-group',
      targetType: 'GROUP',
      title: `Vestiário ${userClub.shortName} (Grupo)`,
      subtitle: 'Grupo oficial do elenco e comissão',
      unread: true,
      messages: [
        {
          id: nextId('lmsg'),
          senderType: 'PLAYER',
          senderName: captain?.name || 'Capitão',
          senderRole: 'Capitão do Elenco',
          text: `Bem-vindo ao ${userClub.shortName}, professor ${managerName}! O grupo está fechado para buscar os objetivos da temporada.`,
          day: 1,
        },
      ],
    },
    {
      id: 'thread-ceo',
      targetType: 'CEO',
      title: `Diretoria / CEO · ${userClub.shortName}`,
      subtitle: 'Canal direto com a presidência do clube',
      unread: true,
      messages: [
        {
          id: nextId('lmsg'),
          senderType: 'CEO',
          senderName: 'Presidência do Clube',
          senderRole: 'Diretoria Executiva',
          text: `Contamos com seu trabalho, ${managerName}. Nossa meta oficial é: ${userClub.boardGoalLabel}. Qualquer pedido de verba ou suporte, fale comigo aqui ou na aba Finanças.`,
          day: 1,
        },
      ],
    },
  ];

  if (aux) {
    threads.push({
      id: `thread-staff-${aux.id}`,
      targetType: 'STAFF',
      targetId: aux.id,
      title: aux.name,
      subtitle: `Auxiliar Técnico · OVR ${aux.overall}`,
      unread: false,
      messages: [
        {
          id: nextId('lmsg'),
          senderType: 'STAFF',
          senderName: aux.name,
          senderRole: 'Auxiliar Técnico',
          text: `Professor, já separei os relatórios físicos e táticos do elenco para a semana.`,
          day: 1,
        },
      ],
    });
  }

  for (const p of topPlayers) {
    threads.push({
      id: `thread-player-${p.id}`,
      targetType: 'PLAYER',
      targetId: p.id,
      title: p.name,
      subtitle: `${p.position} · OVR ${p.overall} · Moral ${p.morale}%`,
      unread: false,
      messages: [
        {
          id: nextId('lmsg'),
          senderType: 'PLAYER',
          senderName: p.name,
          senderRole: `${p.position} (${p.age}a)`,
          text: `Fala professor! Estou à disposição para ajudar o ${userClub.shortName} em campo.`,
          day: 1,
        },
      ],
    });
  }

  return threads;
}

function buildInitialInbox(userClub: Club, leagueName: string): InboxMessage[] {
  return [
    {
      id: nextId('inb'),
      day: 1,
      title: `Bem-vindo ao ${userClub.name}!`,
      category: 'BOAS_VINDAS',
      body: `Você assumiu o comando na ${leagueName} (20 clubes, 38 rodadas). Confira sua meta: ${userClub.boardGoalLabel}.`,
      actionTab: 'tactics',
      read: false,
    },
    {
      id: nextId('inb'),
      day: 1,
      title: 'Dica: Arraste e solte na Prancheta Tática',
      category: 'TUTORIAL',
      body: 'Em Elenco e Tática você pode arrastar jogadores no campinho 2D, montar formações personalizadas ou clicar em Escalar Melhores.',
      actionTab: 'tactics',
      read: false,
    },
    {
      id: nextId('inb'),
      day: 1,
      title: 'VestiárioZap & Comissão Técnica',
      category: 'TUTORIAL',
      body: 'Converse com elenco, capitão e CEO em tempo real pelo VestiárioZap, e ajuste a Agenda Semanal de Treinos e Risco de Lesão em Comissão & DM.',
      actionTab: 'locker',
      read: false,
    },
  ];
}

function advanceWorldTablesOneRound(
  worldTables: WorldLeagueSnapshot[],
): WorldLeagueSnapshot[] {
  return worldTables.map((wt) => {
    const league = getLeagueById(wt.leagueId);
    const bps = getBlueprintsForLeague(wt.leagueId);
    const rows = wt.standings.map((r) => ({ ...r }));
    const indices = rows.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    for (let k = 0; k + 1 < indices.length; k += 2) {
      const h = rows[indices[k]];
      const a = rows[indices[k + 1]];
      const hOvr = bps.find((b) => b.id === h.clubId)?.targetOverall || 72;
      const aOvr = bps.find((b) => b.id === a.clubId)?.targetOverall || 72;
      const diff = hOvr - aOvr;
      const hExp = Math.max(0.45, 1.35 + diff * 0.06);
      const aExp = Math.max(0.35, 1.1 - diff * 0.055);
      const sample = (l: number) => {
        let g = 0;
        for (let t = 0; t < 5; t += 1) if (Math.random() < l / 5) g += 1;
        return g;
      };
      const hg = sample(hExp);
      const ag = sample(aExp);

      h.played += 1;
      a.played += 1;
      h.gf += hg;
      h.ga += ag;
      a.gf += ag;
      a.ga += hg;
      if (hg > ag) {
        h.won += 1;
        h.points += league.rules.pointsWin;
        a.lost += 1;
      } else if (hg === ag) {
        h.drawn += 1;
        a.drawn += 1;
        h.points += league.rules.pointsDraw;
        a.points += league.rules.pointsDraw;
      } else {
        a.won += 1;
        a.points += league.rules.pointsWin;
        h.lost += 1;
      }
    }

    return { ...wt, standings: rows };
  });
}

export function createInitialGameState(
  userClubId: string,
  managerName: string,
  division: GenderDivision,
  leagueId = 'bra_a',
): GameState {
  const league = getLeagueById(leagueId);
  const bps = getBlueprintsForLeague(league.id);
  const clubs = bps.map((bp) => buildClubFromBlueprint(bp, division));
  const fixtures = generateDoubleRoundRobinFixtures(clubs);
  const standings = clubs.map((c) => ({
    clubId: c.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));

  const userClub = clubs.find((c) => c.id === userClubId) || clubs[0];
  const cups = createSeasonCups(userClub, clubs, league.id);
  const worldTables = buildInitialWorldTables(league.id, division);
  const externalMarket = generateExternalMarketPool(league.id, division, 42);
  const freeAgents = generateFreeAgentsPool(division, 24);
  const availableSponsors = SPONSOR_CATALOG.map((s) => ({ ...s, weeksRemaining: 16 }));
  const staff = generateInitialClubStaff(league.federationId);
  const availableStaff = generateAvailableStaffPool(12);
  const weeklyTraining = DEFAULT_WEEKLY_TRAINING.map((d) => ({ ...d }));
  const lockerThreads = buildInitialLockerThreads(userClub, managerName.trim() || 'Gabriel Silva', staff);
  const youthStandings = buildInitialYouthStandings(clubs, userClub.id);
  const inboxMessages = buildInitialInbox(userClub, league.name);

  const firstNews: NewsItem = {
    id: nextId('news'),
    day: 1,
    category: 'CLUBE',
    title: `${managerName} assume o comando do ${userClub.name}`,
    body: `Apresentado oficialmente na ${league.name} (${league.country}), ${managerName} tem como meta: ${userClub.boardGoalLabel}. O clube também disputa ${league.rules.cupName} e ${league.rules.continentalCupName}.`,
  };

  const firstSocial: SocialPost[] = [
    {
      id: nextId('soc'),
      day: 1,
      author: 'Jornal dos Gramados',
      handle: '@jornaldosgramados',
      role: 'JORNALISTA',
      content: `Oficial! ${managerName} assume o ${userClub.name} na ${league.name} com 20 clubes. Diretoria promete apoio no mercado global.`,
      likes: 1420,
      reposts: 215,
    },
    {
      id: nextId('soc'),
      day: 1,
      author: `Torcida ${userClub.shortName}`,
      handle: `@torcida_${userClub.shortName.toLowerCase()}`,
      role: 'TORCEDOR',
      content: `Bora ${userClub.shortName}! Queremos título da liga e campanha forte na ${league.rules.continentalCupName}!`,
      likes: 486,
      reposts: 54,
    },
  ];

  return {
    saveId: `save_${league.id}_${userClub.id}`,
    managerName: managerName.trim() || 'Gabriel Silva',
    division,
    leagueId: league.id,
    season: 2026,
    currentDay: 1,
    userClubId: userClub.id,
    clubs,
    fixtures,
    standings,
    cups,
    worldTables,
    externalMarket,
    freeAgents,
    availableSponsors,
    scoutMissions: [],
    overseasAcademies: [],
    financeLedger: [],
    news: [firstNews],
    socialFeed: firstSocial,
    careerHistory: [],
    pendingInterview: null,
    seasonEnded: false,
    soundEnabled: true,
    staff,
    availableStaff,
    weeklyTraining,
    lockerThreads,
    lockerPromises: [],
    boardRequests: [],
    trophies: [],
    youthStandings,
    inboxMessages,
  };
}

function applyTrainingToClub(
  club: Club,
  isUserClub: boolean,
  daySlot?: WeeklyTrainingSlot,
  staffList: StaffMember[] = [],
  newNews?: NewsItem[],
  currentDay = 1,
): Club {
  const prepOvr = isUserClub
    ? staffList.find((s) => s.role === 'PREPARADOR')?.overall || 70
    : 70;
  const medOvr = isUserClub
    ? staffList.find((s) => s.role === 'MEDICO')?.overall || 70
    : 70;
  const auxOvr = isUserClub
    ? staffList.find((s) => s.role === 'AUXILIAR')?.overall || 70
    : 70;

  const baseFocus = isUserClub && daySlot ? daySlot.focus : club.trainingFocus;
  const intensity = isUserClub && daySlot ? daySlot.intensity : 'NORMAL';

  const facilityMultiplier =
    (1 + (club.trainingLevel - 1) * 0.15) *
    (1 + Math.max(0, prepOvr - 68) * 0.012) *
    (intensity === 'INTENSO' ? 1.35 : intensity === 'LEVE' ? 0.7 : 1);

  const recoveryBoost =
    8 +
    (club.medicalLevel - 1) * 2.5 +
    Math.max(0, medOvr - 68) * 0.15 +
    (intensity === 'LEVE' ? 5 : intensity === 'INTENSO' ? -3 : 0);

  const updatedRoster = club.roster.map((p) => {
    const healStep = medOvr >= 80 && Math.random() < 0.3 ? 2 : 1;
    let injuredDays = Math.max(0, p.injuredDays - healStep);
    let fatigue = p.fatigue;
    let morale = p.morale;
    const attributes = { ...p.attributes };
    const focus = p.individualFocus || baseFocus;

    if (focus === 'RECUPERACAO') {
      fatigue = Math.max(0, fatigue - (recoveryBoost + 10));
      morale = Math.min(100, morale + 1);
    } else {
      const fatigueDelta = intensity === 'INTENSO' ? 6 : intensity === 'LEVE' ? 1 : 4;
      fatigue = Math.max(0, fatigue - recoveryBoost + fatigueDelta);
      const gainChance = (p.age <= 22 ? 0.16 : p.age <= 27 ? 0.08 : 0.02) * facilityMultiplier;
      if (p.overall < p.potential && Math.random() < gainChance) {
        if (focus === 'FISICO') {
          attributes.pac = Math.min(97, attributes.pac + 1);
          attributes.fis = Math.min(97, attributes.fis + 1);
        } else if (focus === 'TECNICO') {
          attributes.dri = Math.min(97, attributes.dri + 1);
          attributes.pas = Math.min(97, attributes.pas + 1);
        } else if (focus === 'FINALIZACAO') {
          attributes.fin = Math.min(97, attributes.fin + 1);
        } else if (focus === 'TATICO') {
          attributes.def = Math.min(97, attributes.def + 1);
          attributes.pas = Math.min(97, attributes.pas + 1);
        } else {
          attributes.pas = Math.min(97, attributes.pas + 1);
        }
      }
    }

    // Training injury check when risk is high/critical
    if (isUserClub && injuredDays === 0 && intensity === 'INTENSO') {
      const risk = computeInjuryRisk(p, club.medicalLevel, medOvr);
      if ((risk.level === 'CRITICO' && Math.random() < 0.07) || (risk.level === 'ALTO' && Math.random() < 0.02)) {
        injuredDays = 4 + Math.floor(Math.random() * 8);
        if (newNews) {
          newNews.unshift({
            id: nextId('news'),
            day: currentDay,
            category: 'CLUBE',
            title: `Baixa no DM: ${p.name} sofre lesão muscular`,
            body: `Após treino intenso com desgaste elevado, ${p.name} ficará fora por ${injuredDays} dias em tratamento no Departamento Médico.`,
          });
        }
      }
    }

    const avgDelta = Math.round(
      (attributes.pac + attributes.fin + attributes.pas + attributes.dri + attributes.def + attributes.fis) / 6,
    );
    const overall = p.overall < p.potential && avgDelta > p.overall ? p.overall + 1 : p.overall;

    return {
      ...p,
      injuredDays,
      fatigue: Math.round(fatigue),
      morale: Math.round(morale),
      attributes,
      overall: Math.min(p.potential, overall),
    };
  });

  const cohesionGain = isUserClub && auxOvr >= 75 && Math.random() < 0.25 ? 1 : 0;

  return {
    ...club,
    cohesion: Math.min(100, (club.cohesion ?? 74) + cohesionGain),
    roster: updatedRoster,
  };
}

export function findNextUserMatch(state: GameState): {
  fixture: Fixture | null;
  cupMatch: CupMatch | null;
} {
  const nextLeague =
    state.fixtures
      .filter(
        (f) =>
          !f.played &&
          (f.homeClubId === state.userClubId || f.awayClubId === state.userClubId),
      )
      .sort((a, b) => a.day - b.day)[0] || null;

  const nextCup =
    state.cups
      .flatMap((c) => c.matches)
      .filter(
        (m) =>
          !m.played &&
          (m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId),
      )
      .sort((a, b) => a.day - b.day)[0] || null;

  if (nextCup && (!nextLeague || nextCup.day <= nextLeague.day)) {
    return { fixture: null, cupMatch: nextCup };
  }
  return { fixture: nextLeague, cupMatch: null };
}

export function advanceOneDay(state: GameState): GameState {
  if (state.seasonEnded) return state;

  const nextDay = state.currentDay + 1;
  const newNews: NewsItem[] = [...state.news];
  const newSocial: SocialPost[] = [...state.socialFeed];
  const newLedger: FinanceEntry[] = [...state.financeLedger];
  const schedule = state.weeklyTraining || DEFAULT_WEEKLY_TRAINING;
  const daySlot = schedule[(nextDay - 1) % 7];
  const staff = state.staff || [];

  let clubs = state.clubs.map((c) =>
    applyTrainingToClub(c, c.id === state.userClubId, daySlot, staff, newNews, nextDay),
  );
  let standings = [...state.standings];
  let fixtures = [...state.fixtures];
  let worldTables = [...state.worldTables];
  let youthStandings = state.youthStandings || buildInitialYouthStandings(clubs, state.userClubId);

  const userClubIdx = clubs.findIndex((c) => c.id === state.userClubId);
  let userClub = { ...clubs[userClubIdx] };

  // 1. Weekly finances every 7 days
  if (nextDay % 7 === 0) {
    const sponsorTotal = userClub.activeSponsors.reduce((s, sp) => s + sp.weeklyIncome, 0);
    const weeklyPayroll = Math.round(
      userClub.roster.reduce((s, p) => s + p.salary, 0) / 4,
    );
    const staffPayroll = Math.round(staff.reduce((s, st) => s + st.salary, 0) / 4);
    const academyCost = state.overseasAcademies.reduce(
      (s, ac) => s + getFederationById(ac.federationId).academyMaintenanceWeekly,
      0,
    );
    const infraCost =
      (userClub.stadiumLevel + userClub.trainingLevel + userClub.medicalLevel) * 24000;

    userClub.cash += sponsorTotal - weeklyPayroll - staffPayroll - academyCost - infraCost;

    if (sponsorTotal > 0) {
      newLedger.unshift({
        id: nextId('fin'),
        day: nextDay,
        type: 'RECEITA',
        category: 'Patrocínio',
        description: 'Repasse semanal dos patrocinadores ativos',
        amount: sponsorTotal,
      });
    }
    newLedger.unshift({
      id: nextId('fin'),
      day: nextDay,
      type: 'DESPESA',
      category: 'Folha Salarial',
      description: 'Salários semanais do elenco e comissão técnica',
      amount: weeklyPayroll + staffPayroll,
    });
    if (academyCost > 0) {
      newLedger.unshift({
        id: nextId('fin'),
        day: nextDay,
        type: 'DESPESA',
        category: 'Academias Globais',
        description: `Manutenção de ${state.overseasAcademies.length} base(s) no exterior`,
        amount: academyCost,
      });
    }
  }

  // 2. Process Scout Missions (Chief Scout bonus reduces wait/improves OVR)
  const chiefScout = staff.find((s) => s.role === 'OLHEIRO_CHEFE');
  const scoutBonus = chiefScout && chiefScout.overall >= 78 ? 2 : 0;

  const scoutMissions = state.scoutMissions.map((m) => {
    if (m.completed) return m;
    const rem = m.daysRemaining - 1;
    if (rem <= 0) {
      const fed = getFederationById(m.federationId);
      const positions: Position[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
      const foundPlayers: Player[] = [0, 1, 2].map(() => {
        const pos =
          m.targetPosition === 'QUALQUER'
            ? positions[Math.floor(Math.random() * positions.length)]
            : m.targetPosition;
        return generatePlayer({
          position: pos,
          gender: state.division,
          federationId: fed.id,
          targetOverall: 67 + scoutBonus + Math.floor(Math.random() * 13),
          focusProfile: m.focusProfile,
        });
      });

      newNews.unshift({
        id: nextId('news'),
        day: nextDay,
        category: 'MERCADO',
        title: `Relatório de Scout: ${fed.country}`,
        body: `Nosso olheiro retornou de ${fed.country} com ${foundPlayers.length} atletas dentro do perfil solicitado.`,
      });

      return { ...m, daysRemaining: 0, completed: true, foundPlayers };
    }
    return { ...m, daysRemaining: rem };
  });

  // 3. Process Overseas Academies
  const overseasAcademies = state.overseasAcademies.map((ac) => {
    const rem = ac.daysUntilNextIntake - 1;
    if (rem <= 0) {
      const fed = getFederationById(ac.federationId);
      const positions: Position[] = ['ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const prospect = generatePlayer({
        position: pos,
        gender: state.division,
        federationId: fed.id,
        targetOverall: 61 + ac.level * 2 + Math.floor(Math.random() * 6),
        isYouth: true,
        focusProfile: 'PROMESSA',
      });

      userClub = {
        ...userClub,
        youthAcademy: [prospect, ...userClub.youthAcademy],
      };

      newNews.unshift({
        id: nextId('news'),
        day: nextDay,
        category: 'BASE',
        title: `Joia descoberta na Academia de ${fed.country}!`,
        body: `${prospect.name} (${prospect.age} anos, ${prospect.position}, OVR ${prospect.overall}) chegou ao Sub-20 vindo do nosso núcleo em ${fed.country}.`,
      });

      return { ...ac, daysUntilNextIntake: 10, totalGraduates: ac.totalGraduates + 1 };
    }
    return { ...ac, daysUntilNextIntake: rem };
  });

  clubs[userClubIdx] = userClub;

  // 4. Simulate AI League matches on nextDay
  let hadLeagueRoundToday = false;
  fixtures = fixtures.map((f) => {
    if (f.played || f.day !== nextDay) return f;
    hadLeagueRoundToday = true;
    if (f.homeClubId === state.userClubId || f.awayClubId === state.userClubId) {
      return f;
    }

    const homeIdx = clubs.findIndex((c) => c.id === f.homeClubId);
    const awayIdx = clubs.findIndex((c) => c.id === f.awayClubId);
    const home = clubs[homeIdx];
    const away = clubs[awayIdx];
    const sim = simulateFastAIMatch(home, away);

    const updateClubStats = (c: Club, isHome: boolean): Club => {
      const ids = c.tactics.starterIds;
      const ticketIncome = isHome ? sim.attendance * 55 : 0;
      return {
        ...c,
        cash: c.cash + ticketIncome,
        roster: c.roster.map((p) => {
          const played = ids.includes(p.id);
          const goals = sim.goalScorers.filter((g) => g.clubId === c.id && g.scorerId === p.id).length;
          const assists = sim.goalScorers.filter((g) => g.clubId === c.id && g.assistId === p.id).length;
          return {
            ...p,
            goalsSeason: p.goalsSeason + goals,
            assistsSeason: p.assistsSeason + assists,
            matchesSeason: p.matchesSeason + (played ? 1 : 0),
            fatigue: played ? Math.min(95, p.fatigue + 16) : p.fatigue,
          };
        }),
      };
    };

    clubs[homeIdx] = updateClubStats(home, true);
    clubs[awayIdx] = updateClubStats(away, false);
    standings = applyMatchResultToStandings(standings, home.id, away.id, sim.homeGoals, sim.awayGoals);

    return {
      ...f,
      played: true,
      homeGoals: sim.homeGoals,
      awayGoals: sim.awayGoals,
      attendance: sim.attendance,
    };
  });

  if (hadLeagueRoundToday) {
    worldTables = advanceWorldTablesOneRound(worldTables);
    if (youthStandings.length > 0 && youthStandings[0].played < 18) {
      youthStandings = advanceYouthStandingsOneRound(youthStandings, userClub);
    }
  }

  // 5. Simulate AI Cup matches scheduled for nextDay & advance brackets
  const trophies = [...(state.trophies || [])];
  const cups = state.cups.map((cup) => {
    let workingCup = { ...cup };
    const updatedMatches = workingCup.matches.map((m) => {
      if (m.played || m.day !== nextDay) return m;
      if (m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId) {
        return m;
      }
      const simulated = simulateCupMatchAI(m);
      workingCup = applyCupMatchToStandings(workingCup, simulated);
      return simulated;
    });
    const nextCup = advanceCupBracketIfReady({ ...workingCup, matches: updatedMatches });
    if (nextCup.championName && !cup.championName) {
      newNews.unshift({
        id: nextId('news'),
        day: nextDay,
        category: 'COPA',
        title: `${nextCup.championName} conquista a ${nextCup.name}!`,
        body: `Após grande campanha na competição, o ${nextCup.championName} levantou o troféu da ${nextCup.name}.`,
      });
    }
    return nextCup;
  });

  // Update promises due
  const lockerPromises = (state.lockerPromises || []).map((pr) => {
    if (pr.status === 'ATIVA' && nextDay >= pr.dueDay) {
      return { ...pr, status: 'CUMPRIDA' as const };
    }
    return pr;
  });

  const allLeaguePlayed = fixtures.every((f) => f.played);
  const hasPendingUserCup = cups.some((c) =>
    c.matches.some(
      (m) =>
        !m.played &&
        (m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId),
    ),
  );

  return {
    ...state,
    currentDay: nextDay,
    clubs,
    fixtures,
    standings,
    cups,
    worldTables,
    youthStandings,
    trophies,
    lockerPromises,
    scoutMissions,
    overseasAcademies,
    financeLedger: newLedger.slice(0, 60),
    news: newNews.slice(0, 40),
    socialFeed: newSocial.slice(0, 40),
    seasonEnded: allLeaguePlayed && !hasPendingUserCup && nextDay >= 114,
  };
}

export function finalizeUserMatch(
  state: GameState,
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
  goalScorers: Array<{ clubId: string; scorerId: string; assistId?: string }>,
  playedIds: string[],
  cupContext?: {
    cupId: 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP';
    penHome?: number;
    penAway?: number;
    winnerId?: string;
  },
): GameState {
  if (cupContext) {
    return finalizeUserCupMatch(
      state,
      fixtureId,
      cupContext.cupId,
      homeGoals,
      awayGoals,
      cupContext.penHome,
      cupContext.penAway,
      cupContext.winnerId,
      goalScorers,
      playedIds,
    );
  }

  const league = getLeagueById(state.leagueId);
  const fixture = state.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return state;

  const homeClub = state.clubs.find((c) => c.id === fixture.homeClubId)!;
  const awayClub = state.clubs.find((c) => c.id === fixture.awayClubId)!;
  const isUserHome = homeClub.id === state.userClubId;
  const userGoals = isUserHome ? homeGoals : awayGoals;
  const oppGoals = isUserHome ? awayGoals : homeGoals;
  const oppClub = isUserHome ? awayClub : homeClub;

  const fillRate = Math.min(
    0.98,
    0.58 + (homeClub.reputation + awayClub.reputation) / 390 + (homeClub.stadiumLevel - 1) * 0.04,
  );
  const attendance = Math.round(homeClub.stadiumCapacity * fillRate);
  const ticketPrice = 58 + homeClub.stadiumLevel * 8;
  const gateRevenue = isUserHome ? attendance * ticketPrice : 0;

  const won = userGoals > oppGoals;
  const drawn = userGoals === oppGoals;
  const sponsorWinBonus = won
    ? (isUserHome ? homeClub : awayClub).activeSponsors.reduce((s, sp) => s + sp.winBonus, 0)
    : 0;

  const updatedClubs = state.clubs.map((c) => {
    if (c.id !== homeClub.id && c.id !== awayClub.id) return c;
    const isUser = c.id === state.userClubId;
    const isH = c.id === homeClub.id;
    const startersUsed = isUser ? playedIds : c.tactics.starterIds;
    const confidenceDelta = isUser ? (won ? 4 : drawn ? 0 : -5) : 0;
    const cohesionDelta = isUser ? (won ? 2 : drawn ? 0 : -1) : 0;

    return {
      ...c,
      cash: c.cash + (isUser ? gateRevenue + sponsorWinBonus : isH ? gateRevenue : 0),
      boardConfidence: Math.max(5, Math.min(100, c.boardConfidence + confidenceDelta)),
      cohesion: Math.max(30, Math.min(100, (c.cohesion ?? 74) + cohesionDelta)),
      roster: c.roster.map((p) => {
        const played = startersUsed.includes(p.id);
        const goals = goalScorers.filter((g) => g.clubId === c.id && g.scorerId === p.id).length;
        const assists = goalScorers.filter((g) => g.clubId === c.id && g.assistId === p.id).length;
        const moraleDelta = won ? 3 : drawn ? 0 : -3;
        return {
          ...p,
          goalsSeason: p.goalsSeason + goals,
          assistsSeason: p.assistsSeason + assists,
          matchesSeason: p.matchesSeason + (played ? 1 : 0),
          fatigue: played ? Math.min(96, p.fatigue + 18) : p.fatigue,
          morale: Math.max(25, Math.min(100, p.morale + moraleDelta)),
        };
      }),
    };
  });

  const updatedFixtures = state.fixtures.map((f) =>
    f.id === fixtureId ? { ...f, played: true, homeGoals, awayGoals, attendance } : f,
  );
  const updatedStandings = applyMatchResultToStandings(
    state.standings,
    homeClub.id,
    awayClub.id,
    homeGoals,
    awayGoals,
  );

  const newLedger = [...state.financeLedger];
  if (gateRevenue > 0) {
    newLedger.unshift({
      id: nextId('fin'),
      day: state.currentDay,
      type: 'RECEITA',
      category: 'Bilheteria',
      description: `Renda de ${attendance.toLocaleString('pt-BR')} pagantes vs ${awayClub.shortName}`,
      amount: gateRevenue,
    });
  }
  if (sponsorWinBonus > 0) {
    newLedger.unshift({
      id: nextId('fin'),
      day: state.currentDay,
      type: 'RECEITA',
      category: 'Bônus Vitória',
      description: `Premiação dos patrocinadores pela vitória sobre ${oppClub.shortName}`,
      amount: sponsorWinBonus,
    });
  }

  const userClub = updatedClubs.find((c) => c.id === state.userClubId)!;
  const headline = won
    ? `${userClub.shortName} vence ${oppClub.shortName} por ${userGoals}x${oppGoals}`
    : drawn
      ? `Tudo igual: ${homeClub.shortName} ${homeGoals}x${awayGoals} ${awayClub.shortName}`
      : `${oppClub.shortName} supera ${userClub.shortName} por ${oppGoals}x${userGoals}`;

  const newsEntry: NewsItem = {
    id: nextId('news'),
    day: state.currentDay,
    category: 'RESULTADO',
    title: headline,
    body: `Público de ${attendance.toLocaleString('pt-BR')} torcedores no ${homeClub.stadiumName} pela ${league.name}.${gateRevenue > 0 ? ` Bilheteria: ${formatCompactBRL(gateRevenue)}.` : ''}`,
  };

  const socialEntry: SocialPost = {
    id: nextId('soc'),
    day: state.currentDay,
    author: won ? `Torcida ${userClub.shortName}` : 'Mesa Redonda Global',
    handle: won ? `@torcida_${userClub.shortName.toLowerCase()}` : '@mesaredonda',
    role: won ? 'TORCEDOR' : 'JORNALISTA',
    content: won
      ? `Atuação sólida do ${userClub.shortName}! ${userGoals}x${oppGoals} pra cima do ${oppClub.shortName}. ${state.managerName} acertou na estratégia!`
      : drawn
        ? `Empate em ${homeGoals}x${awayGoals} contra ${oppClub.shortName}. Ponto importante fora ou gosto amargo?`
        : `Derrota dura contra ${oppClub.shortName} (${userGoals}x${oppGoals}). Pressão aumenta sobre ${state.managerName}.`,
    likes: 650 + Math.floor(Math.random() * 1800),
    reposts: 80 + Math.floor(Math.random() * 300),
  };

  const allLeaguePlayed = updatedFixtures.every((f) => f.played);
  const hasPendingUserCup = state.cups.some((c) =>
    c.matches.some(
      (m) =>
        !m.played &&
        (m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId),
    ),
  );

  return {
    ...state,
    clubs: updatedClubs,
    fixtures: updatedFixtures,
    standings: updatedStandings,
    financeLedger: newLedger.slice(0, 60),
    news: [newsEntry, ...state.news].slice(0, 40),
    socialFeed: [socialEntry, ...state.socialFeed].slice(0, 40),
    pendingInterview: {
      fixtureId,
      opponentName: oppClub.name,
      userGoals,
      opponentGoals: oppGoals,
      wasHome: isUserHome,
      competitionLabel: league.name,
    },
    seasonEnded: allLeaguePlayed && !hasPendingUserCup && state.currentDay >= 114,
  };
}

function finalizeUserCupMatch(
  state: GameState,
  matchId: string,
  cupId: 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP',
  homeGoals: number,
  awayGoals: number,
  penHome: number | undefined,
  penAway: number | undefined,
  winnerId: string | undefined,
  goalScorers: Array<{ clubId: string; scorerId: string; assistId?: string }>,
  playedIds: string[],
): GameState {
  const cup = state.cups.find((c) => c.id === cupId);
  const match = cup?.matches.find((m) => m.id === matchId);
  if (!cup || !match) return state;

  const isUserHome = match.homeTeam.id === state.userClubId;
  const userGoals = isUserHome ? homeGoals : awayGoals;
  const oppGoals = isUserHome ? awayGoals : homeGoals;
  const oppTeam = isUserHome ? match.awayTeam : match.homeTeam;
  const isGroupDraw = Boolean(match.isGroupOrLeagueStage && homeGoals === awayGoals);
  const userWon = !isGroupDraw && (userGoals > oppGoals || winnerId === state.userClubId);

  const newLedger = [...state.financeLedger];
  const newNews = [...state.news];
  const newTrophies = [...(state.trophies || [])];
  let cashPrize = userWon ? 1_200_000 : isGroupDraw ? 650_000 : 350_000;

  const updatedCups = state.cups.map((c) => {
    if (c.id !== cupId) return c;
    let updatedMatch: CupMatch = match;
    const matches = c.matches.map((m) => {
      if (m.id !== matchId) return m;
      updatedMatch = {
        ...m,
        played: true,
        homeGoals,
        awayGoals,
        penHome,
        penAway,
        winnerId,
      };
      return updatedMatch;
    });
    const withStandings = applyCupMatchToStandings({ ...c, matches }, updatedMatch);
    const advanced = advanceCupBracketIfReady(withStandings);
    if (advanced.championId === state.userClubId && !c.championId) {
      cashPrize += advanced.prizeChampion;
      const userTeamName =
        match.homeTeam.id === state.userClubId ? match.homeTeam.name : match.awayTeam.name;
      newNews.unshift({
        id: nextId('news'),
        day: state.currentDay,
        category: 'COPA',
        title: `É CAMPEÃO! ${userTeamName} fatura a ${c.name}!`,
        body: `Título histórico! Além da taça da ${c.name}, o clube embolsou ${formatCompactBRL(advanced.prizeChampion)} em premiação.`,
      });
      const trophyType: TrophyRecord['type'] =
        c.id === 'NATIONAL_CUP'
          ? 'COPA_NACIONAL'
          : c.id === 'CONTINENTAL_CUP'
            ? 'CONTINENTAL'
            : 'MUNDIAL';
      newTrophies.unshift({
        id: nextId('trp'),
        season: state.season,
        title: `Campeão da ${c.name}`,
        competition: c.name,
        clubName: userTeamName,
        type: trophyType,
      });
    }
    return advanced;
  });

  newLedger.unshift({
    id: nextId('fin'),
    day: state.currentDay,
    type: 'RECEITA',
    category: cup.name,
    description: `${match.stageLabel} vs ${oppTeam.shortName}`,
    amount: cashPrize,
  });

  const confidenceDelta = userWon ? 6 : isGroupDraw ? 1 : -4;
  const cohesionDelta = userWon ? 2 : isGroupDraw ? 1 : -1;
  const moraleDelta = userWon ? 5 : isGroupDraw ? 1 : -4;

  const updatedClubs = state.clubs.map((c) => {
    if (c.id !== state.userClubId) return c;
    return {
      ...c,
      cash: c.cash + cashPrize,
      boardConfidence: Math.max(5, Math.min(100, c.boardConfidence + confidenceDelta)),
      cohesion: Math.max(30, Math.min(100, (c.cohesion ?? 74) + cohesionDelta)),
      roster: c.roster.map((p) => {
        const played = playedIds.includes(p.id);
        const goals = goalScorers.filter((g) => g.clubId === c.id && g.scorerId === p.id).length;
        const assists = goalScorers.filter((g) => g.clubId === c.id && g.assistId === p.id).length;
        return {
          ...p,
          goalsSeason: p.goalsSeason + goals,
          assistsSeason: p.assistsSeason + assists,
          matchesSeason: p.matchesSeason + (played ? 1 : 0),
          fatigue: played ? Math.min(96, p.fatigue + 18) : p.fatigue,
          morale: Math.max(25, Math.min(100, p.morale + moraleDelta)),
        };
      }),
    };
  });

  const allLeaguePlayed = state.fixtures.every((f) => f.played);
  const hasPendingUserCup = updatedCups.some((c) =>
    c.matches.some(
      (m) =>
        !m.played &&
        (m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId),
    ),
  );

  return {
    ...state,
    clubs: updatedClubs,
    cups: updatedCups,
    trophies: newTrophies,
    financeLedger: newLedger.slice(0, 60),
    news: newNews.slice(0, 40),
    pendingInterview: {
      fixtureId: matchId,
      opponentName: oppTeam.name,
      userGoals,
      opponentGoals: oppGoals,
      wasHome: isUserHome,
      competitionLabel: `${cup.name} · ${match.stageLabel}`,
    },
    seasonEnded: allLeaguePlayed && !hasPendingUserCup && state.currentDay >= 114,
  };
}

export function startNextSeason(state: GameState): GameState {
  const league = getLeagueById(state.leagueId);
  const sorted = sortStandings(state.standings, league.rules);
  const userRank = sorted.findIndex((r) => r.clubId === state.userClubId) + 1;
  const userRow = sorted.find((r) => r.clubId === state.userClubId)!;
  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;
  const championId = sorted[0]?.clubId;

  const cupsWon = state.cups
    .filter((c) => c.championId === state.userClubId)
    .map((c) => c.name);

  const newTrophies = [...(state.trophies || [])];
  if (championId === userClub.id) {
    newTrophies.unshift({
      id: nextId('trp'),
      season: state.season,
      title: `Campeão — ${league.name}`,
      competition: league.name,
      clubName: userClub.name,
      type: 'LIGA',
    });
  }

  // Check real promotion / relegation
  const promoted =
    Boolean(league.promotesToLeagueId) &&
    userRank <= (league.promotionSpots || 3);
  const relegated =
    Boolean(league.relegatesToLeagueId) &&
    league.rules.relegationSpots > 0 &&
    userRank > sorted.length - league.rules.relegationSpots;

  const targetLeagueId = promoted
    ? league.promotesToLeagueId!
    : relegated
      ? league.relegatesToLeagueId!
      : league.id;
  const targetLeague = getLeagueById(targetLeagueId);

  const historyEntry = {
    season: state.season,
    clubId: userClub.id,
    clubName: userClub.name,
    leagueName: league.name,
    division: state.division,
    finalPosition: userRank,
    points: userRow.points,
    champion: championId === userClub.id,
    cupsWon,
    leftReason: 'FIM_TEMPORADA' as const,
    promotedTo: promoted ? targetLeague.name : undefined,
    relegatedTo: relegated ? targetLeague.name : undefined,
  };

  const prizeMoney = Math.max(1500000, (sorted.length + 1 - userRank) * 900000);
  const titleSponsorBonus =
    championId === userClub.id
      ? userClub.activeSponsors.reduce((s, sp) => s + sp.titleBonus, 0)
      : 0;

  const nextSeason = state.season + 1;

  const ageClub = (c: Club, isUser: boolean, newLeagueId: string): Club => {
    const agedRoster = c.roster
      .map((p) => ({
        ...p,
        age: p.age + 1,
        contractYears: Math.max(1, p.contractYears - 1),
        goalsSeason: 0,
        assistsSeason: 0,
        matchesSeason: 0,
        fatigue: 5,
        injuredDays: 0,
      }))
      .filter((p) => p.age <= 38);

    const agedYouth = c.youthAcademy.map((p) => ({
      ...p,
      age: p.age + 1,
      fatigue: 5,
    }));

    return {
      ...c,
      leagueId: newLeagueId,
      cash: c.cash + (isUser ? prizeMoney + titleSponsorBonus : 2500000),
      boardConfidence: isUser ? (userRank <= c.boardGoalRank || promoted ? 84 : 62) : 74,
      boardGoalRank: isUser && promoted ? 14 : isUser && relegated ? 4 : c.boardGoalRank,
      boardGoalLabel:
        isUser && promoted
          ? `Permanecer na ${targetLeague.name}`
          : isUser && relegated
            ? `Voltar à elite (${league.name})`
            : c.boardGoalLabel,
      roster: agedRoster,
      youthAcademy: agedYouth,
      tactics: {
        ...c.tactics,
        starterIds: pickBestStarters(agedRoster, c.tactics.formation, c.tactics.customCoords),
      },
    };
  };

  let updatedClubs: Club[];
  if (targetLeagueId !== league.id) {
    // Move user club to promoted/relegated league and replace the last team in target division
    const targetBps = getBlueprintsForLeague(targetLeagueId).slice(0, 19);
    const targetClubs = targetBps.map((bp) => buildClubFromBlueprint(bp, state.division));
    const agedUser = ageClub(userClub, true, targetLeagueId);
    updatedClubs = [agedUser, ...targetClubs];
  } else {
    updatedClubs = state.clubs.map((c) => ageClub(c, c.id === state.userClubId, league.id));
  }

  const nextUserClub = updatedClubs.find((c) => c.id === state.userClubId)!;
  const fixtures = generateDoubleRoundRobinFixtures(updatedClubs);
  const standings = updatedClubs.map((c) => ({
    clubId: c.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
  const cups = createSeasonCups(nextUserClub, updatedClubs, targetLeague.id);
  const worldTables = buildInitialWorldTables(targetLeague.id, state.division);
  const youthStandings = buildInitialYouthStandings(updatedClubs, nextUserClub.id);

  const transitionMsg = promoted
    ? `ACESSO CONFIRMADO! O ${userClub.name} subiu para a ${targetLeague.name}!`
    : relegated
      ? `REBAIXAMENTO: O ${userClub.name} disputará a ${targetLeague.name} em ${nextSeason}.`
      : `Início da Temporada ${nextSeason} na ${targetLeague.name}!`;

  return {
    ...state,
    leagueId: targetLeague.id,
    season: nextSeason,
    currentDay: 1,
    clubs: updatedClubs,
    fixtures,
    standings,
    cups,
    worldTables,
    youthStandings,
    trophies: newTrophies,
    careerHistory: [historyEntry, ...state.careerHistory],
    seasonEnded: false,
    pendingInterview: null,
    news: [
      {
        id: nextId('news'),
        day: 1,
        category: 'CLUBE' as const,
        title: transitionMsg,
        body: `Após terminar em ${userRank}º lugar, o ${userClub.name} recebeu ${formatCompactBRL(prizeMoney + titleSponsorBonus)} em premiações e inicia nova jornada.`,
      },
      ...state.news,
    ].slice(0, 40),
  };
}
