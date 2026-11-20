import { getLeagueById, WORLD_CLUB_BLUEPRINTS, WORLD_LEAGUES } from '../data/worldLeagues';
import { nextId } from '../data/clubs';
import {
  Club,
  Confederation,
  CupCompetition,
  CupMatch,
  CupStandingRow,
  CupTeamSnapshot,
} from '../types/game';
import { getClubAvgOverall } from '../utils/format';

const GROUP_NAMES = [
  'Grupo A',
  'Grupo B',
  'Grupo C',
  'Grupo D',
  'Grupo E',
  'Grupo F',
  'Grupo G',
  'Grupo H',
];

const UCL_STAGE_DAYS = [8, 14, 20, 26, 32, 38, 44, 50];
const LIB_STAGE_DAYS = [11, 20, 29, 38, 47, 56];

function clubToSnapshot(club: Club, leagueName: string): CupTeamSnapshot {
  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    stadiumName: club.stadiumName,
    overall: getClubAvgOverall(club),
    leagueName,
  };
}

function blueprintToSnapshot(bpId: string): CupTeamSnapshot | null {
  const bp = WORLD_CLUB_BLUEPRINTS.find((b) => b.id === bpId);
  if (!bp) return null;
  const league = getLeagueById(bp.leagueId);
  return {
    id: bp.id,
    name: bp.name,
    shortName: bp.shortName,
    primaryColor: bp.primaryColor,
    secondaryColor: bp.secondaryColor,
    stadiumName: bp.stadiumName,
    overall: bp.targetOverall,
    leagueName: league.name,
  };
}

export function sortCupStandings(rows: CupStandingRow[]): CupStandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    if (b.won !== a.won) return b.won - a.won;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (b.team.overall !== a.team.overall) return b.team.overall - a.team.overall;
    return a.team.name.localeCompare(b.team.name);
  });
}

export function applyCupMatchToStandings(
  cup: CupCompetition,
  match: CupMatch,
): CupCompetition {
  if (
    !match.isGroupOrLeagueStage ||
    !cup.standings ||
    match.homeGoals === undefined ||
    match.awayGoals === undefined
  ) {
    return cup;
  }

  const hg = match.homeGoals;
  const ag = match.awayGoals;
  const homeWin = hg > ag;
  const awayWin = ag > hg;
  const draw = hg === ag;

  const standings = cup.standings.map((row) => {
    if (row.team.id === match.homeTeam.id) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (homeWin ? 1 : 0),
        drawn: row.drawn + (draw ? 1 : 0),
        lost: row.lost + (awayWin ? 1 : 0),
        gf: row.gf + hg,
        ga: row.ga + ag,
        points: row.points + (homeWin ? 3 : draw ? 1 : 0),
      };
    }
    if (row.team.id === match.awayTeam.id) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (awayWin ? 1 : 0),
        drawn: row.drawn + (draw ? 1 : 0),
        lost: row.lost + (homeWin ? 1 : 0),
        gf: row.gf + ag,
        ga: row.ga + hg,
        points: row.points + (awayWin ? 3 : draw ? 1 : 0),
      };
    }
    return row;
  });

  return { ...cup, standings };
}

function collectConfederationTeams(
  userClub: Club,
  leagueClubs: Club[],
  leagueId: string,
  confederation: Confederation,
  totalNeeded: number,
): CupTeamSnapshot[] {
  const userLeague = getLeagueById(leagueId);
  const picked: CupTeamSnapshot[] = [clubToSnapshot(userClub, userLeague.name)];
  const usedIds = new Set<string>([userClub.id]);

  // Add up to 3 top local rivals so domestic powerhouses appear in continental play
  const localOthers = leagueClubs
    .filter((c) => !usedIds.has(c.id))
    .sort((a, b) => getClubAvgOverall(b) - getClubAvgOverall(a))
    .slice(0, 3);

  for (const lc of localOthers) {
    if (picked.length >= totalNeeded) break;
    usedIds.add(lc.id);
    picked.push(clubToSnapshot(lc, userLeague.name));
  }

  // Gather elite clubs across the same confederation (diverse leagues, top OVR)
  const confLeagueIds = new Set(
    WORLD_LEAGUES.filter((l) => l.confederation === confederation).map((l) => l.id),
  );

  const foreignConfBps = WORLD_CLUB_BLUEPRINTS.filter(
    (bp) => confLeagueIds.has(bp.leagueId) && bp.leagueId !== leagueId && !usedIds.has(bp.id),
  ).sort((a, b) => b.targetOverall - a.targetOverall);

  for (const bp of foreignConfBps) {
    if (picked.length >= totalNeeded) break;
    usedIds.add(bp.id);
    const snap = blueprintToSnapshot(bp.id);
    if (snap) picked.push(snap);
  }

  // Same-league remaining clubs if still needed
  const remainingLocal = leagueClubs
    .filter((c) => !usedIds.has(c.id))
    .sort((a, b) => getClubAvgOverall(b) - getClubAvgOverall(a));
  for (const lc of remainingLocal) {
    if (picked.length >= totalNeeded) break;
    usedIds.add(lc.id);
    picked.push(clubToSnapshot(lc, userLeague.name));
  }

  // Global fallback if a smaller confederation ever needs extra teams
  if (picked.length < totalNeeded) {
    const anyBps = WORLD_CLUB_BLUEPRINTS.filter((bp) => !usedIds.has(bp.id)).sort(
      (a, b) => b.targetOverall - a.targetOverall,
    );
    for (const bp of anyBps) {
      if (picked.length >= totalNeeded) break;
      usedIds.add(bp.id);
      const snap = blueprintToSnapshot(bp.id);
      if (snap) picked.push(snap);
    }
  }

  return picked.slice(0, totalNeeded);
}

function buildUclLeaguePhaseCup(
  userClub: Club,
  leagueClubs: Club[],
  leagueId: string,
  cupName: string,
): CupCompetition {
  const teams = collectConfederationTeams(userClub, leagueClubs, leagueId, 'UEFA', 36);
  const standings: CupStandingRow[] = teams.map((team) => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));

  // Shuffle non-user slots slightly for varied Swiss pairings each season while keeping 36 distinct teams
  const n = teams.length;
  const rotating = teams.slice(1);
  const fixed = teams[0];
  const matches: CupMatch[] = [];

  for (let round = 1; round <= 8; round += 1) {
    const order = [fixed, ...rotating];
    const day = UCL_STAGE_DAYS[round - 1];
    for (let i = 0; i < n / 2; i += 1) {
      const tA = order[i];
      const tB = order[n - 1 - i];
      const swapHome = (round + i) % 2 === 1;
      const homeTeam = swapHome ? tB : tA;
      const awayTeam = swapHome ? tA : tB;
      matches.push({
        id: nextId('cupm'),
        cupId: 'CONTINENTAL_CUP',
        cupName,
        roundIndex: -1,
        roundNumber: round,
        stageLabel: `Fase de Liga · Rodada ${round}/8`,
        isGroupOrLeagueStage: true,
        day,
        homeTeam,
        awayTeam,
        played: false,
      });
    }
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return {
    id: 'CONTINENTAL_CUP',
    name: cupName,
    prizeChampion: 18500000,
    format: 'UCL_LEAGUE_PHASE',
    rulesSummary:
      'Formato UEFA (36 clubes): 8 rodadas na Fase de Liga. 1º–8º avançam direto às Oitavas; 9º–24º vão ao Playoff (Repescagem); 25º–36º são eliminados.',
    standings,
    matches,
  };
}

function buildLibertadoresGroupCup(
  userClub: Club,
  leagueClubs: Club[],
  leagueId: string,
  cupName: string,
): CupCompetition {
  const teams = collectConfederationTeams(userClub, leagueClubs, leagueId, 'CONMEBOL', 32);

  // Separate user team into Grupo A (pot 1 slot 0), distribute remaining teams into 4 strength pots
  const userSnap = teams[0];
  const others = [...teams.slice(1)].sort((a, b) => b.overall - a.overall);
  const groups: CupTeamSnapshot[][] = Array.from({ length: 8 }, () => []);

  groups[0].push(userSnap);
  for (let g = 1; g < 8; g += 1) {
    const team = others.shift();
    if (team) groups[g].push(team);
  }
  for (let pot = 1; pot <= 3; pot += 1) {
    for (let idx = 0; idx < 8; idx += 1) {
      const gIdx = pot % 2 === 1 ? 7 - idx : idx;
      const team = others.shift();
      if (team) groups[gIdx].push(team);
    }
  }

  const standings: CupStandingRow[] = [];
  const matches: CupMatch[] = [];

  groups.forEach((groupTeams, gIdx) => {
    const groupName = GROUP_NAMES[gIdx];
    groupTeams.forEach((team) => {
      standings.push({
        team,
        groupName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
      });
    });

    if (groupTeams.length < 4) return;
    const [t0, t1, t2, t3] = groupTeams;
    const roundPairs: Array<Array<[CupTeamSnapshot, CupTeamSnapshot]>> = [
      [[t0, t1], [t2, t3]],
      [[t3, t0], [t1, t2]],
      [[t0, t2], [t1, t3]],
      [[t1, t0], [t3, t2]],
      [[t0, t3], [t2, t1]],
      [[t2, t0], [t3, t1]],
    ];

    roundPairs.forEach((pairs, rIdx) => {
      const round = rIdx + 1;
      const day = LIB_STAGE_DAYS[rIdx];
      pairs.forEach(([homeTeam, awayTeam]) => {
        matches.push({
          id: nextId('cupm'),
          cupId: 'CONTINENTAL_CUP',
          cupName,
          roundIndex: -1,
          roundNumber: round,
          groupName,
          stageLabel: `${groupName} · Rodada ${round}/6`,
          isGroupOrLeagueStage: true,
          day,
          homeTeam,
          awayTeam,
          played: false,
        });
      });
    });
  });

  return {
    id: 'CONTINENTAL_CUP',
    name: cupName,
    prizeChampion: 16000000,
    format: 'LIBERTADORES_GROUPS',
    rulesSummary:
      'Fase de Grupos CONMEBOL (32 clubes em 8 grupos): 6 rodadas em turno e returno. Os 2 melhores de cada grupo avançam às Oitavas de Final.',
    standings,
    matches,
  };
}

export function createSeasonCups(
  userClub: Club,
  leagueClubs: Club[],
  leagueId: string,
): CupCompetition[] {
  const league = getLeagueById(leagueId);

  // 1. National Cup (8 teams -> QF Day 16, SF Day 46, Final Day 88)
  const otherLocal = leagueClubs.filter((c) => c.id !== userClub.id).slice(0, 7);
  const nationalTeams = [userClub, ...otherLocal].map((c) => clubToSnapshot(c, league.name));

  const nationalMatches: CupMatch[] = [];
  for (let i = 0; i < 4; i += 1) {
    nationalMatches.push({
      id: nextId('cupm'),
      cupId: 'NATIONAL_CUP',
      cupName: league.rules.cupName,
      roundIndex: 0,
      stageLabel: 'Quartas de Final',
      day: 16,
      homeTeam: nationalTeams[i * 2],
      awayTeam: nationalTeams[i * 2 + 1],
      played: false,
    });
  }

  // 2. Continental Cup (UEFA League Phase 36 clubs / CONMEBOL 8 Groups 32 clubs / Knockout for others)
  let continentalCup: CupCompetition;
  if (league.confederation === 'UEFA') {
    continentalCup = buildUclLeaguePhaseCup(
      userClub,
      leagueClubs,
      leagueId,
      league.rules.continentalCupName,
    );
  } else if (league.confederation === 'CONMEBOL') {
    continentalCup = buildLibertadoresGroupCup(
      userClub,
      leagueClubs,
      leagueId,
      league.rules.continentalCupName,
    );
  } else {
    const contTeams = collectConfederationTeams(
      userClub,
      leagueClubs,
      leagueId,
      league.confederation,
      8,
    );
    const contMatches: CupMatch[] = [];
    for (let i = 0; i < 4; i += 1) {
      contMatches.push({
        id: nextId('cupm'),
        cupId: 'CONTINENTAL_CUP',
        cupName: league.rules.continentalCupName,
        roundIndex: 0,
        stageLabel: 'Quartas de Final',
        day: 28,
        homeTeam: contTeams[i * 2],
        awayTeam: contTeams[i * 2 + 1],
        played: false,
      });
    }
    continentalCup = {
      id: 'CONTINENTAL_CUP',
      name: league.rules.continentalCupName,
      prizeChampion: 14000000,
      format: 'KNOCKOUT',
      rulesSummary: `Torneio de elite da ${league.confederation} em mata-mata eliminatório. Campeão vai ao Mundial.`,
      matches: contMatches,
    };
  }

  // 3. Club World Cup (Days 115, 118, 121 after 38 league rounds)
  const confederationRepresentatives: Record<Confederation, string> = {
    CONMEBOL: league.confederation === 'CONMEBOL' ? userClub.id : 'fla',
    UEFA: league.confederation === 'UEFA' ? userClub.id : 'rma',
    CONCACAF: league.confederation === 'CONCACAF' ? userClub.id : 'ame_m',
    AFC: league.confederation === 'AFC' ? userClub.id : 'hil',
    CAF: league.confederation === 'CAF' ? userClub.id : 'ahy',
    OFC: league.confederation === 'OFC' ? userClub.id : 'auc',
  };

  const cwcTeams: CupTeamSnapshot[] = [
    league.confederation === 'CONMEBOL'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.CONMEBOL)!,
    league.confederation === 'UEFA'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.UEFA)!,
    league.confederation === 'AFC'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.AFC)!,
    league.confederation === 'CAF'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.CAF)!,
    league.confederation === 'CONCACAF'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.CONCACAF)!,
    league.confederation === 'OFC'
      ? clubToSnapshot(userClub, league.name)
      : blueprintToSnapshot(confederationRepresentatives.OFC)!,
    blueprintToSnapshot('mci')!,
    blueprintToSnapshot('pal')!,
  ].slice(0, 8);

  const seen = new Set<string>();
  const uniqueCwc: CupTeamSnapshot[] = [];
  for (const t of cwcTeams) {
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      uniqueCwc.push(t);
    }
  }
  for (const bp of WORLD_CLUB_BLUEPRINTS) {
    if (uniqueCwc.length >= 8) break;
    if (!seen.has(bp.id)) {
      seen.add(bp.id);
      uniqueCwc.push(blueprintToSnapshot(bp.id)!);
    }
  }

  const cwcMatches: CupMatch[] = [];
  for (let i = 0; i < 4; i += 1) {
    cwcMatches.push({
      id: nextId('cupm'),
      cupId: 'CLUB_WORLD_CUP',
      cupName: 'Mundial de Clubes FIFA',
      roundIndex: 0,
      stageLabel: 'Quartas de Final',
      day: 115,
      homeTeam: uniqueCwc[i * 2],
      awayTeam: uniqueCwc[i * 2 + 1],
      played: false,
    });
  }

  return [
    {
      id: 'NATIONAL_CUP',
      name: league.rules.cupName,
      prizeChampion: 6500000,
      format: 'KNOCKOUT',
      rulesSummary: 'Mata-mata nacional em jogo único. Empate nos 90 min vai para prorrogação e pênaltis.',
      matches: nationalMatches,
    },
    continentalCup,
    {
      id: 'CLUB_WORLD_CUP',
      name: 'Mundial de Clubes FIFA',
      prizeChampion: 22000000,
      format: 'KNOCKOUT',
      rulesSummary:
        'Reúne representantes das 6 confederações (CONMEBOL, UEFA, CONCACAF, AFC, CAF, OFC) no fim da temporada.',
      matches: cwcMatches,
    },
  ];
}

export function simulateCupMatchAI(match: CupMatch): CupMatch {
  const diff = match.homeTeam.overall - match.awayTeam.overall;
  const hLambda = Math.max(0.5, 1.3 + diff * 0.06);
  const aLambda = Math.max(0.45, 1.15 - diff * 0.06);

  const sample = (l: number) => {
    let g = 0;
    for (let i = 0; i < 5; i += 1) {
      if (Math.random() < l / 5) g += 1;
    }
    return g;
  };

  const homeGoals = sample(hLambda);
  const awayGoals = sample(aLambda);

  // League Phase & Group Stage allow regulation draws (1 point each)
  if (match.isGroupOrLeagueStage) {
    const winnerId =
      homeGoals > awayGoals
        ? match.homeTeam.id
        : awayGoals > homeGoals
          ? match.awayTeam.id
          : undefined;
    return {
      ...match,
      played: true,
      homeGoals,
      awayGoals,
      winnerId,
    };
  }

  let winnerId = homeGoals > awayGoals ? match.homeTeam.id : match.awayTeam.id;
  let penHome: number | undefined;
  let penAway: number | undefined;

  if (homeGoals === awayGoals) {
    penHome = 4 + Math.floor(Math.random() * 2);
    penAway = 3 + Math.floor(Math.random() * 2);
    if (penHome === penAway) {
      if (Math.random() < 0.52) penHome += 1;
      else penAway += 1;
    }
    winnerId = penHome > penAway ? match.homeTeam.id : match.awayTeam.id;
  }

  return {
    ...match,
    played: true,
    homeGoals,
    awayGoals,
    penHome,
    penAway,
    winnerId,
  };
}

export function advanceCupBracketIfReady(cup: CupCompetition): CupCompetition {
  let workingCup = cup;
  const format = workingCup.format || 'KNOCKOUT';

  // Step A1: UCL League Phase (-1) -> Playoff Repescagem (10)
  if (format === 'UCL_LEAGUE_PHASE') {
    const stageLeague = workingCup.matches.filter((m) => m.roundIndex === -1);
    const playoffs = workingCup.matches.filter((m) => m.roundIndex === 10);
    if (
      stageLeague.length > 0 &&
      stageLeague.every((m) => m.played) &&
      playoffs.length === 0 &&
      workingCup.standings
    ) {
      const ranked = sortCupStandings(workingCup.standings);
      const playoffMatches: CupMatch[] = [];
      for (let i = 0; i < 8; i += 1) {
        const highSeed = ranked[8 + i]?.team;
        const lowSeed = ranked[23 - i]?.team;
        if (!highSeed || !lowSeed) continue;
        playoffMatches.push({
          id: nextId('cupm'),
          cupId: workingCup.id,
          cupName: workingCup.name,
          roundIndex: 10,
          stageLabel: 'Playoff (Repescagem)',
          day: 59,
          homeTeam: highSeed,
          awayTeam: lowSeed,
          played: false,
        });
      }
      workingCup = { ...workingCup, matches: [...workingCup.matches, ...playoffMatches] };
    }

    // Step A2: UCL Playoff (10) -> Oitavas de Final (11)
    const updatedPlayoffs = workingCup.matches.filter((m) => m.roundIndex === 10);
    const r16 = workingCup.matches.filter((m) => m.roundIndex === 11);
    if (
      updatedPlayoffs.length === 8 &&
      updatedPlayoffs.every((m) => m.played) &&
      r16.length === 0 &&
      workingCup.standings
    ) {
      const ranked = sortCupStandings(workingCup.standings);
      const top8 = ranked.slice(0, 8).map((r) => r.team);
      const poWinners = updatedPlayoffs.map((m) =>
        m.winnerId === m.homeTeam.id ? m.homeTeam : m.awayTeam,
      );
      const r16Matches: CupMatch[] = top8.map((seedTeam, idx) => ({
        id: nextId('cupm'),
        cupId: workingCup.id,
        cupName: workingCup.name,
        roundIndex: 11,
        stageLabel: 'Oitavas de Final',
        day: 71,
        homeTeam: seedTeam,
        awayTeam: poWinners[7 - idx],
        played: false,
      }));
      workingCup = { ...workingCup, matches: [...workingCup.matches, ...r16Matches] };
    }
  }

  // Step B1: Libertadores Group Stage (-1) -> Oitavas de Final (11)
  if (format === 'LIBERTADORES_GROUPS') {
    const stageGroups = workingCup.matches.filter((m) => m.roundIndex === -1);
    const r16 = workingCup.matches.filter((m) => m.roundIndex === 11);
    if (
      stageGroups.length > 0 &&
      stageGroups.every((m) => m.played) &&
      r16.length === 0 &&
      workingCup.standings
    ) {
      const topByGroup = GROUP_NAMES.map((gName) => {
        const rows = sortCupStandings(
          workingCup.standings!.filter((r) => r.groupName === gName),
        );
        return { first: rows[0]?.team, second: rows[1]?.team };
      });

      const pairings: Array<[number, number]> = [
        [0, 1],
        [1, 0],
        [2, 3],
        [3, 2],
        [4, 5],
        [5, 4],
        [6, 7],
        [7, 6],
      ];

      const r16Matches: CupMatch[] = [];
      for (const [gFirst, gSecond] of pairings) {
        const homeTeam = topByGroup[gFirst]?.first;
        const awayTeam = topByGroup[gSecond]?.second;
        if (!homeTeam || !awayTeam) continue;
        r16Matches.push({
          id: nextId('cupm'),
          cupId: workingCup.id,
          cupName: workingCup.name,
          roundIndex: 11,
          stageLabel: 'Oitavas de Final',
          day: 71,
          homeTeam,
          awayTeam,
          played: false,
        });
      }
      workingCup = { ...workingCup, matches: [...workingCup.matches, ...r16Matches] };
    }
  }

  // Step C: Oitavas (11) -> Quartas (0)
  const r16 = workingCup.matches.filter((m) => m.roundIndex === 11);
  const round0 = workingCup.matches.filter((m) => m.roundIndex === 0);
  if (r16.length === 8 && r16.every((m) => m.played) && round0.length === 0) {
    const winners = r16.map((m) => (m.winnerId === m.homeTeam.id ? m.homeTeam : m.awayTeam));
    const qfs: CupMatch[] = [0, 1, 2, 3].map((i) => ({
      id: nextId('cupm'),
      cupId: workingCup.id,
      cupName: workingCup.name,
      roundIndex: 0,
      stageLabel: 'Quartas de Final',
      day: 83,
      homeTeam: winners[i * 2],
      awayTeam: winners[i * 2 + 1],
      played: false,
    }));
    workingCup = { ...workingCup, matches: [...workingCup.matches, ...qfs] };
  }

  // Step D: Quartas (0) -> Semifinal (1)
  const qfNow = workingCup.matches.filter((m) => m.roundIndex === 0);
  const round1 = workingCup.matches.filter((m) => m.roundIndex === 1);
  if (qfNow.length === 4 && qfNow.every((m) => m.played) && round1.length === 0) {
    const isExtendedContinental =
      format === 'UCL_LEAGUE_PHASE' || format === 'LIBERTADORES_GROUPS';
    const semiDay =
      workingCup.id === 'NATIONAL_CUP'
        ? 46
        : workingCup.id === 'CONTINENTAL_CUP'
          ? isExtendedContinental
            ? 95
            : 64
          : 118;
    const winners = qfNow.map((m) => (m.winnerId === m.homeTeam.id ? m.homeTeam : m.awayTeam));
    const semis: CupMatch[] = [
      {
        id: nextId('cupm'),
        cupId: workingCup.id,
        cupName: workingCup.name,
        roundIndex: 1,
        stageLabel: 'Semifinal',
        day: semiDay,
        homeTeam: winners[0],
        awayTeam: winners[1],
        played: false,
      },
      {
        id: nextId('cupm'),
        cupId: workingCup.id,
        cupName: workingCup.name,
        roundIndex: 1,
        stageLabel: 'Semifinal',
        day: semiDay,
        homeTeam: winners[2],
        awayTeam: winners[3],
        played: false,
      },
    ];
    workingCup = { ...workingCup, matches: [...workingCup.matches, ...semis] };
  }

  // Step E: Semifinal (1) -> Grande Final (2)
  const sfNow = workingCup.matches.filter((m) => m.roundIndex === 1);
  const round2 = workingCup.matches.filter((m) => m.roundIndex === 2);
  if (sfNow.length === 2 && sfNow.every((m) => m.played) && round2.length === 0) {
    const isExtendedContinental =
      format === 'UCL_LEAGUE_PHASE' || format === 'LIBERTADORES_GROUPS';
    const finalDay =
      workingCup.id === 'NATIONAL_CUP'
        ? 88
        : workingCup.id === 'CONTINENTAL_CUP'
          ? isExtendedContinental
            ? 107
            : 103
          : 121;
    const winners = sfNow.map((m) => (m.winnerId === m.homeTeam.id ? m.homeTeam : m.awayTeam));
    const finalMatch: CupMatch = {
      id: nextId('cupm'),
      cupId: workingCup.id,
      cupName: workingCup.name,
      roundIndex: 2,
      stageLabel: 'Grande Final',
      day: finalDay,
      homeTeam: winners[0],
      awayTeam: winners[1],
      played: false,
    };
    workingCup = { ...workingCup, matches: [...workingCup.matches, finalMatch] };
  }

  // Step F: Grande Final (2) -> Champion
  const finNow = workingCup.matches.filter((m) => m.roundIndex === 2);
  if (finNow.length === 1 && finNow[0].played && !workingCup.championId) {
    const fin = finNow[0];
    const champ = fin.winnerId === fin.homeTeam.id ? fin.homeTeam : fin.awayTeam;
    return {
      ...workingCup,
      championId: champ.id,
      championName: champ.name,
    };
  }

  return workingCup;
}
