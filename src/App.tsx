import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Calendar,
  ChevronRight,
  Cloud,
  Compass,
  LayoutDashboard,
  LogIn,
  MessagesSquare,
  Newspaper,
  RotateCcw,
  Stethoscope,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import {
  buildClubFromBlueprint,
  DEFAULT_WEEKLY_TRAINING,
  generateAvailableStaffPool,
  generateInitialClubStaff,
  nextId,
  pickBestStarters,
} from './data/clubs';
import { getFederationById } from './data/federations';
import { getLeagueById, WORLD_CLUB_BLUEPRINTS } from './data/worldLeagues';
import {
  advanceOneDay,
  createInitialGameState,
  finalizeUserMatch,
  findNextUserMatch,
  startNextSeason,
} from './engine/dayEngine';
import {
  auth,
  type CloudSaveSummary,
  deleteCloudSave,
  listCloudSaves,
  saveCareerToCloud,
  signInWithGoogle,
  signOutUser,
} from './firebase';
import {
  BoardRequestType,
  Club,
  CupMatch,
  CupTeamSnapshot,
  Fixture,
  GameState,
  GenderDivision,
  KitConfig,
  LockerMessage,
  LockerThread,
  Player,
  Position,
  PressInterviewOption,
  SponsorDeal,
  StaffMember,
  TrainingFocus,
  WeeklyTrainingSlot,
} from './types/game';
import { formatCompactBRL, getCalendarLabel, sortStandings } from './utils/format';
import { sfx } from './utils/sound';
import { ClubCrest } from './components/ClubCrest';
import { DashboardView } from './components/DashboardView';
import { FinanceClubView } from './components/FinanceClubView';
import { LeagueView } from './components/LeagueView';
import { LockerChatView } from './components/LockerChatView';
import { MatchModal } from './components/MatchModal';
import {
  NegotiationModal,
  type NegotiationMode,
  type NegotiationTerms,
} from './components/NegotiationModal';
import { PressBoardView } from './components/PressBoardView';
import { ScoutMarketView } from './components/ScoutMarketView';
import { SetupScreen } from './components/SetupScreen';
import { SquadTacticsView } from './components/SquadTacticsView';
import { StaffMedicalView } from './components/StaffMedicalView';

const STORAGE_KEY = 'nextfoot_save_v2';

type NavTab =
  | 'dashboard'
  | 'tactics'
  | 'staff'
  | 'locker'
  | 'scout'
  | 'league'
  | 'finance'
  | 'press';

interface ActiveNegotiation {
  mode: NegotiationMode;
  player: Player;
  sellerClubId?: string;
  sellerLabel?: string;
  isExternal?: boolean;
}

const DEFAULT_INTERVIEW_OPTIONS: PressInterviewOption[] = [
  {
    label: 'Elogiar a entrega do grupo',
    quote: 'O grupo está de parabéns pela entrega em campo. Seguimos juntos!',
    moraleDelta: 4,
    confidenceDelta: 1,
    effectHint: 'Aumenta a moral dos atletas',
  },
  {
    label: 'Cobrar mais intensidade e concentração',
    quote: 'Vestir essa camisa exige intensidade os 90 minutos. Vamos cobrar mais.',
    moraleDelta: -2,
    confidenceDelta: 3,
    effectHint: 'Agrada à diretoria exigente',
  },
  {
    label: 'Virar a chave e focar no próximo jogo',
    quote: 'Resultado passado já ficou para trás, foco total no próximo desafio.',
    moraleDelta: 2,
    confidenceDelta: 2,
    effectHint: 'Equilíbrio entre moral e diretoria',
  },
];

function resolveCupClub(
  snapshot: CupTeamSnapshot,
  clubs: Club[],
  division: GenderDivision,
): Club {
  const local = clubs.find((c) => c.id === snapshot.id);
  if (local) return local;
  const bp = WORLD_CLUB_BLUEPRINTS.find((b) => b.id === snapshot.id);
  if (bp) return buildClubFromBlueprint(bp, division);
  return buildClubFromBlueprint(
    {
      ...WORLD_CLUB_BLUEPRINTS[0],
      id: snapshot.id,
      name: snapshot.name,
      shortName: snapshot.shortName,
      stadiumName: snapshot.stadiumName,
      primaryColor: snapshot.primaryColor,
      secondaryColor: snapshot.secondaryColor,
      targetOverall: snapshot.overall,
    },
    division,
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeLeagueMatch, setActiveLeagueMatch] = useState<Fixture | null>(null);
  const [activeCupMatch, setActiveCupMatch] = useState<CupMatch | null>(null);
  const [activeNegotiation, setActiveNegotiation] = useState<ActiveNegotiation | null>(null);

  // Firebase Auth & Cloud Saves
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudSaves, setCloudSaves] = useState<CloudSaveSummary[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaveFeedback, setCloudSaveFeedback] = useState<string | null>(null);

  // AI Press, Social & Locker states
  const [aiInterviewLoading, setAiInterviewLoading] = useState(false);
  const [aiInterviewError, setAiInterviewError] = useState<string | null>(null);
  const [interviewRetryTick, setInterviewRetryTick] = useState(0);
  const [aiSocialLoading, setAiSocialLoading] = useState(false);
  const [aiSocialError, setAiSocialError] = useState<string | null>(null);
  const [lockerSending, setLockerSending] = useState(false);
  const [lockerError, setLockerError] = useState<string | null>(null);

  const hydrateSave = (raw: GameState): GameState => {
    const league = getLeagueById(raw.leagueId);
    const staff =
      raw.staff && raw.staff.length > 0 ? raw.staff : generateInitialClubStaff(league.federationId);
    const availableStaff =
      raw.availableStaff && raw.availableStaff.length > 0
        ? raw.availableStaff
        : generateAvailableStaffPool(12);
    const userClub = raw.clubs.find((c) => c.id === raw.userClubId) || raw.clubs[0];
    const lockerThreads: LockerThread[] =
      raw.lockerThreads && raw.lockerThreads.length > 0
        ? raw.lockerThreads
        : [
            {
              id: 'thread-group',
              targetType: 'GROUP',
              title: `Vestiário ${userClub.shortName} (Grupo)`,
              subtitle: 'Grupo oficial do elenco e comissão',
              unread: false,
              messages: [
                {
                  id: nextId('lmsg'),
                  senderType: 'PLAYER',
                  senderName: userClub.roster[0]?.name || 'Capitão',
                  senderRole: 'Capitão do Elenco',
                  text: `Grupo conectado no VestiárioZap, professor ${raw.managerName}!`,
                  day: raw.currentDay,
                },
              ],
            },
            {
              id: 'thread-ceo',
              targetType: 'CEO',
              title: `Diretoria / CEO · ${userClub.shortName}`,
              subtitle: 'Canal direto com a presidência do clube',
              unread: false,
              messages: [
                {
                  id: nextId('lmsg'),
                  senderType: 'CEO',
                  senderName: 'Presidência do Clube',
                  senderRole: 'Diretoria Executiva',
                  text: `Seguimos acompanhando a campanha. Meta: ${userClub.boardGoalLabel}.`,
                  day: raw.currentDay,
                },
              ],
            },
          ];

    return {
      ...raw,
      staff,
      availableStaff,
      weeklyTraining:
        raw.weeklyTraining && raw.weeklyTraining.length === 7
          ? raw.weeklyTraining
          : DEFAULT_WEEKLY_TRAINING.map((d) => ({ ...d })),
      lockerThreads,
      lockerPromises: raw.lockerPromises || [],
      boardRequests: raw.boardRequests || [],
      trophies: raw.trophies || [],
      youthStandings: raw.youthStandings || [],
      inboxMessages: raw.inboxMessages || [],
    };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        if (
          parsed &&
          parsed.userClubId &&
          parsed.leagueId &&
          Array.isArray(parsed.clubs) &&
          Array.isArray(parsed.cups)
        ) {
          setHasSavedGame(true);
        }
      }
    } catch {
      setHasSavedGame(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setCloudLoading(true);
        setCloudError(null);
        try {
          const list = await listCloudSaves(user.uid);
          setCloudSaves(list);
        } catch (err) {
          setCloudError(
            err instanceof Error ? err.message : 'Erro ao buscar saves na nuvem.',
          );
        } finally {
          setCloudLoading(false);
        }
      } else {
        setCloudSaves([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!gameState) return;
    sfx.enabled = gameState.soundEnabled;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      setHasSavedGame(true);
    } catch {
      // Ignore localStorage quota exceeded
    }
  }, [gameState]);

  // Trigger AI Press Interview when pendingInterview appears
  useEffect(() => {
    const pending = gameState?.pendingInterview;
    if (!gameState || !pending || pending.aiLoaded) return;

    const league = getLeagueById(gameState.leagueId);
    const sorted = sortStandings(gameState.standings, league.rules);
    const rank = sorted.findIndex((r) => r.clubId === gameState.userClubId) + 1;
    const club = gameState.clubs.find((c) => c.id === gameState.userClubId);
    if (!club) return;

    let cancelled = false;
    setAiInterviewLoading(true);
    setAiInterviewError(null);

    fetch('/api/press/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        managerName: gameState.managerName,
        clubName: club.name,
        leagueName: league.name,
        opponentName: pending.opponentName,
        userGoals: pending.userGoals,
        opponentGoals: pending.opponentGoals,
        wasHome: pending.wasHome,
        rank,
        boardConfidence: club.boardConfidence,
        competitionLabel: pending.competitionLabel,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Falha ao gerar coletiva com IA.');
        }
        return data as {
          reporterName?: string;
          outlet?: string;
          question?: string;
          options?: PressInterviewOption[];
        };
      })
      .then((data) => {
        if (cancelled) return;
        setGameState((prev) => {
          if (!prev || !prev.pendingInterview || prev.pendingInterview.fixtureId !== pending.fixtureId) {
            return prev;
          }
          return {
            ...prev,
            pendingInterview: {
              ...prev.pendingInterview,
              aiLoaded: true,
              reporterName: data.reporterName || 'Repórter de Campo',
              outlet: data.outlet || 'Imprensa Esportiva',
              question: data.question,
              options:
                Array.isArray(data.options) && data.options.length >= 2
                  ? data.options.slice(0, 3)
                  : DEFAULT_INTERVIEW_OPTIONS,
            },
          };
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setAiInterviewError(err instanceof Error ? err.message : 'Erro na coletiva com IA.');
        setGameState((prev) => {
          if (!prev || !prev.pendingInterview || prev.pendingInterview.fixtureId !== pending.fixtureId) {
            return prev;
          }
          return {
            ...prev,
            pendingInterview: {
              ...prev.pendingInterview,
              aiLoaded: true,
            },
          };
        });
      })
      .finally(() => {
        if (!cancelled) setAiInterviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameState?.pendingInterview?.fixtureId, interviewRetryTick]);

  const handleSignInGoogle = async () => {
    setCloudError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Erro ao conectar conta Google.');
    }
  };

  const handleSignOutGoogle = async () => {
    await signOutUser();
  };

  const handleSaveToCloud = async () => {
    if (!gameState) return;
    if (!firebaseUser) {
      await handleSignInGoogle();
      return;
    }
    const club = gameState.clubs.find((c) => c.id === gameState.userClubId) || gameState.clubs[0];
    const league = getLeagueById(gameState.leagueId);
    setCloudSaving(true);
    setCloudSaveFeedback(null);
    try {
      await saveCareerToCloud(
        firebaseUser.uid,
        gameState.saveId || `save_${gameState.leagueId}_${club.id}`,
        gameState,
        league.name,
        club.name,
      );
      const updated = await listCloudSaves(firebaseUser.uid);
      setCloudSaves(updated);
      setCloudSaveFeedback('Salvo na nuvem!');
      window.setTimeout(() => setCloudSaveFeedback(null), 3500);
    } catch (err) {
      setCloudSaveFeedback(
        err instanceof Error ? err.message : 'Erro ao salvar na nuvem.',
      );
    } finally {
      setCloudSaving(false);
    }
  };

  const handleLoadCloudSave = (save: CloudSaveSummary) => {
    sfx.click();
    setGameState(hydrateSave(save.stateMap));
    setActiveTab('dashboard');
    setActiveLeagueMatch(null);
    setActiveCupMatch(null);
  };

  const handleDeleteCloudSave = async (saveId: string) => {
    if (!firebaseUser) return;
    try {
      await deleteCloudSave(firebaseUser.uid, saveId);
      setCloudSaves((prev) => prev.filter((s) => s.id !== saveId));
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Erro ao remover save.');
    }
  };

  const handleContinueSave = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      sfx.click();
      setGameState(hydrateSave(parsed));
      setActiveTab('dashboard');
    } catch {
      setHasSavedGame(false);
    }
  };

  const handleStartNewGame = (
    clubId: string,
    managerName: string,
    division: GenderDivision,
    leagueId: string,
  ) => {
    sfx.click();
    const fresh = createInitialGameState(clubId, managerName, division, leagueId);
    setGameState(fresh);
    setActiveTab('dashboard');
    setActiveLeagueMatch(null);
    setActiveCupMatch(null);
  };

  if (!gameState) {
    return (
      <SetupScreen
        hasSavedGame={hasSavedGame}
        onContinueSave={handleContinueSave}
        onStartNewGame={handleStartNewGame}
        firebaseUser={firebaseUser}
        cloudSaves={cloudSaves}
        cloudLoading={cloudLoading}
        cloudError={cloudError}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        onLoadCloudSave={handleLoadCloudSave}
        onDeleteCloudSave={handleDeleteCloudSave}
      />
    );
  }

  const activeLeague = getLeagueById(gameState.leagueId);
  const userClub =
    gameState.clubs.find((c) => c.id === gameState.userClubId) || gameState.clubs[0];

  const { fixture: nextLeagueFixture, cupMatch: nextCupMatch } = findNextUserMatch(gameState);
  const nextScheduledDay = nextCupMatch ? nextCupMatch.day : nextLeagueFixture?.day;
  const isMatchDay = Boolean(
    nextScheduledDay !== undefined && nextScheduledDay === gameState.currentDay,
  );

  const updateUserClub = (updated: Club) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => (c.id === updated.id ? updated : c)),
      };
    });
  };

  const handleAdvanceDay = () => {
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return advanceOneDay(prev);
    });
  };

  const handleFinishMatch = (
    matchId: string,
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
  ) => {
    setActiveLeagueMatch(null);
    setActiveCupMatch(null);
    setGameState((prev) => {
      if (!prev) return prev;
      return finalizeUserMatch(
        prev,
        matchId,
        homeGoals,
        awayGoals,
        goalScorers,
        playedIds,
        cupContext,
      );
    });
  };

  const handleAnswerInterviewOption = (option: PressInterviewOption) => {
    sfx.click();
    setGameState((prev) => {
      if (!prev || !prev.pendingInterview) return prev;
      const club = prev.clubs.find((c) => c.id === prev.userClubId)!;

      return {
        ...prev,
        pendingInterview: null,
        clubs: prev.clubs.map((c) =>
          c.id === club.id
            ? {
                ...c,
                boardConfidence: Math.min(
                  100,
                  Math.max(5, c.boardConfidence + option.confidenceDelta),
                ),
                roster: c.roster.map((p) => ({
                  ...p,
                  morale: Math.min(100, Math.max(20, p.morale + option.moraleDelta)),
                })),
              }
            : c,
        ),
        socialFeed: [
          {
            id: nextId('soc'),
            day: prev.currentDay,
            author: prev.pendingInterview.outlet || 'Coletiva Ao Vivo',
            handle: '@coletivanextfoot',
            role: 'JORNALISTA' as const,
            content: `${prev.managerName} (${club.shortName}): "${option.quote}"`,
            likes: 510 + Math.floor(Math.random() * 600),
            reposts: 72,
          },
          ...prev.socialFeed,
        ].slice(0, 40),
      };
    });
  };

  const handleDispatchScout = (
    federationId: string,
    targetPosition: Position | 'QUALQUER',
    focusProfile: 'EQUILIBRADO' | 'VELOCIDADE' | 'TECNICA' | 'FISICO' | 'PROMESSA',
  ) => {
    const fed = getFederationById(federationId);
    if (userClub.cash < fed.scoutCost) return;
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id ? { ...c, cash: c.cash - fed.scoutCost } : c,
        ),
        scoutMissions: [
          {
            id: nextId('sct'),
            federationId,
            targetPosition,
            focusProfile,
            daysRemaining: fed.scoutDays,
            totalDays: fed.scoutDays,
            completed: false,
            foundPlayers: [],
          },
          ...prev.scoutMissions,
        ],
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Scout Global',
            description: `Missão de observação enviada para ${fed.country}`,
            amount: fed.scoutCost,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
      };
    });
  };

  const handleSignScoutedPlayer = (missionId: string, player: Player) => {
    const cost = Math.round(player.marketValue * 0.75);
    if (userClub.cash < cost) return;
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id
            ? { ...c, cash: c.cash - cost, roster: [player, ...c.roster] }
            : c,
        ),
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Contratação Scout',
            description: `Chegada de ${player.name} (${player.nationality})`,
            amount: cost,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
        news: [
          {
            id: nextId('news'),
            day: prev.currentDay,
            category: 'MERCADO' as const,
            title: `${userClub.shortName} contrata ${player.name} (${player.nationality})`,
            body: `Descoberto pelo departamento de scout em ${player.nationality}, ${player.name} (${player.position}, OVR ${player.overall}) assina contrato por ${formatCompactBRL(cost)}.`,
          },
          ...prev.news,
        ].slice(0, 40),
        scoutMissions: prev.scoutMissions.map((m) =>
          m.id === missionId
            ? { ...m, foundPlayers: m.foundPlayers.filter((fp) => fp.id !== player.id) }
            : m,
        ),
      };
    });
  };

  const handleOpenAcademy = (federationId: string) => {
    const fed = getFederationById(federationId);
    if (userClub.cash < fed.academyCost) return;
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === userClub.id ? { ...c, cash: c.cash - fed.academyCost } : c,
        ),
        overseasAcademies: [
          ...prev.overseasAcademies,
          {
            id: nextId('aca'),
            federationId,
            level: 1,
            openedDay: prev.currentDay,
            daysUntilNextIntake: 6,
            totalGraduates: 0,
          },
        ],
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Academia Global',
            description: `Implantação de núcleo de talentos em ${fed.country}`,
            amount: fed.academyCost,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
        news: [
          {
            id: nextId('news'),
            day: prev.currentDay,
            category: 'BASE' as const,
            title: `${userClub.shortName} abre base de talentos em ${fed.country}`,
            body: `Projeto internacional aprovado: o clube passará a revelar jovens promessas de ${fed.country} regularmente.`,
          },
          ...prev.news,
        ].slice(0, 40),
      };
    });
  };

  const handlePromoteYouth = (playerId: string) => {
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      const club = prev.clubs.find((c) => c.id === prev.userClubId)!;
      const kid = club.youthAcademy.find((p) => p.id === playerId);
      if (!kid) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === club.id
            ? {
                ...c,
                youthAcademy: c.youthAcademy.filter((p) => p.id !== playerId),
                roster: [{ ...kid, isYouth: false }, ...c.roster],
              }
            : c,
        ),
        news: [
          {
            id: nextId('news'),
            day: prev.currentDay,
            category: 'BASE' as const,
            title: `${kid.name} é promovido ao elenco principal`,
            body: `Aos ${kid.age} anos, a promessa da base (${kid.position}, OVR ${kid.overall}) passa a treinar com o time profissional.`,
          },
          ...prev.news,
        ].slice(0, 40),
      };
    });
  };

  const handleCompleteNegotiation = (terms: NegotiationTerms) => {
    if (!activeNegotiation) return;
    const { mode, player, sellerClubId, sellerLabel, isExternal } = activeNegotiation;
    if (userClub.cash < terms.transferFee) return;
    sfx.click();

    const updatedPlayer: Player = {
      ...player,
      salary: terms.salary,
      contractYears: terms.contractYears,
      sellOnClausePct: mode === 'BUY_CLUB' ? terms.sellOnClausePct : player.sellOnClausePct,
    };

    setGameState((prev) => {
      if (!prev) return prev;

      if (mode === 'RENEW') {
        return {
          ...prev,
          clubs: prev.clubs.map((c) =>
            c.id === userClub.id
              ? {
                  ...c,
                  cash: c.cash - terms.transferFee,
                  roster: c.roster.map((p) => (p.id === player.id ? updatedPlayer : p)),
                }
              : c,
          ),
          financeLedger: [
            {
              id: nextId('fin'),
              day: prev.currentDay,
              type: 'DESPESA' as const,
              category: 'Renovação',
              description: `Luvas de renovação de ${player.name} (${terms.contractYears} anos)`,
              amount: terms.transferFee,
            },
            ...prev.financeLedger,
          ].slice(0, 60),
          news: [
            {
              id: nextId('news'),
              day: prev.currentDay,
              category: 'CLUBE' as const,
              title: `${player.name} renova contrato com o ${userClub.shortName}`,
              body: `Vínculo estendido por ${terms.contractYears} ano(s) com salário de ${formatCompactBRL(terms.salary)}/mês.`,
            },
            ...prev.news,
          ].slice(0, 40),
        };
      }

      if (mode === 'FREE_AGENT') {
        return {
          ...prev,
          freeAgents: prev.freeAgents.filter((p) => p.id !== player.id),
          clubs: prev.clubs.map((c) =>
            c.id === userClub.id
              ? { ...c, cash: c.cash - terms.transferFee, roster: [updatedPlayer, ...c.roster] }
              : c,
          ),
          financeLedger: [
            {
              id: nextId('fin'),
              day: prev.currentDay,
              type: 'DESPESA' as const,
              category: 'Jogador Livre',
              description: `Luvas pela assinatura de ${player.name}`,
              amount: terms.transferFee,
            },
            ...prev.financeLedger,
          ].slice(0, 60),
          news: [
            {
              id: nextId('news'),
              day: prev.currentDay,
              category: 'MERCADO' as const,
              title: `${userClub.shortName} fecha com o agente livre ${player.name}`,
              body: `Contrato de ${terms.contractYears} ano(s) assinado sem custo de transferência.`,
            },
            ...prev.news,
          ].slice(0, 40),
        };
      }

      // BUY_CLUB (either local club or external world market)
      const updatedClubs = prev.clubs.map((c) => {
        if (c.id === userClub.id) {
          return {
            ...c,
            cash: c.cash - terms.transferFee,
            roster: [updatedPlayer, ...c.roster],
          };
        }
        if (!isExternal && sellerClubId && c.id === sellerClubId) {
          const remaining = c.roster.filter((p) => p.id !== player.id);
          return {
            ...c,
            cash: c.cash + terms.transferFee,
            roster: remaining,
            tactics: {
              ...c.tactics,
              starterIds: pickBestStarters(remaining, c.tactics.formation),
            },
          };
        }
        return c;
      });

      return {
        ...prev,
        clubs: updatedClubs,
        externalMarket: isExternal
          ? prev.externalMarket.filter((e) => e.player.id !== player.id)
          : prev.externalMarket,
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Transferência',
            description: `Compra de ${player.name} (${sellerLabel || 'Mercado'})`,
            amount: terms.transferFee,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
        news: [
          {
            id: nextId('news'),
            day: prev.currentDay,
            category: 'MERCADO' as const,
            title: `Reforço contratado: ${player.name} chega ao ${userClub.shortName}`,
            body: `Acordo fechado por ${formatCompactBRL(terms.transferFee)}${
              terms.sellOnClausePct > 0 ? ` + ${terms.sellOnClausePct}% de revenda futura` : ''
            }. Contrato de ${terms.contractYears} ano(s).`,
          },
          ...prev.news,
        ].slice(0, 40),
      };
    });

    setActiveNegotiation(null);
  };

  const handleSellPlayer = (player: Player) => {
    const grossSale = Math.round(player.marketValue * 0.85);
    const sellOnCut = player.sellOnClausePct
      ? Math.round((grossSale * player.sellOnClausePct) / 100)
      : 0;
    const netSale = grossSale - sellOnCut;
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== userClub.id) return c;
          const remaining = c.roster.filter((p) => p.id !== player.id);
          return {
            ...c,
            cash: c.cash + netSale,
            roster: remaining,
            tactics: {
              ...c.tactics,
              starterIds: pickBestStarters(remaining, c.tactics.formation),
            },
          };
        }),
        freeAgents: [{ ...player, sellOnClausePct: undefined }, ...prev.freeAgents],
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'RECEITA' as const,
            category: 'Venda de Atleta',
            description: `Venda de ${player.name}${
              sellOnCut > 0 ? ` (desconto revenda ${formatCompactBRL(sellOnCut)})` : ''
            }`,
            amount: netSale,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
      };
    });
  };

  const handleSignSponsor = (sponsor: SponsorDeal) => {
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== userClub.id) return c;
          const filtered = c.activeSponsors.filter((s) => s.slot !== sponsor.slot);
          return {
            ...c,
            activeSponsors: [...filtered, { ...sponsor, weeksRemaining: 16 }],
          };
        }),
      };
    });
  };

  const handleUpgradeFacility = (type: 'STADIUM' | 'TRAINING' | 'MEDICAL') => {
    const cost =
      type === 'STADIUM'
        ? userClub.stadiumLevel * 4500000
        : type === 'TRAINING'
          ? userClub.trainingLevel * 2800000
          : userClub.medicalLevel * 2200000;
    if (userClub.cash < cost) return;
    sfx.click();

    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clubs: prev.clubs.map((c) => {
          if (c.id !== userClub.id) return c;
          return {
            ...c,
            cash: c.cash - cost,
            stadiumLevel: type === 'STADIUM' ? c.stadiumLevel + 1 : c.stadiumLevel,
            stadiumCapacity:
              type === 'STADIUM' ? c.stadiumCapacity + 7500 : c.stadiumCapacity,
            trainingLevel: type === 'TRAINING' ? c.trainingLevel + 1 : c.trainingLevel,
            medicalLevel: type === 'MEDICAL' ? c.medicalLevel + 1 : c.medicalLevel,
          };
        }),
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Infraestrutura',
            description:
              type === 'STADIUM'
                ? 'Ampliação do estádio (+7.500 lugares)'
                : type === 'TRAINING'
                  ? 'Modernização do Centro de Treinamento'
                  : 'Equipamentos para Departamento Médico',
            amount: cost,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
      };
    });
  };

  const handleUpdateKit = (slot: 'HOME' | 'AWAY', kit: KitConfig) => {
    updateUserClub({
      ...userClub,
      homeKit: slot === 'HOME' ? kit : userClub.homeKit,
      awayKit: slot === 'AWAY' ? kit : userClub.awayKit,
    });
  };

  const handleManagerStatement = (tone: 'OFENSIVO' | 'APOIO_TORCIDA' | 'COBRAR_ELENCO') => {
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      const text =
        tone === 'APOIO_TORCIDA'
          ? `Contamos com o apoio da nossa torcida no ${userClub.stadiumName} para fazer a diferença!`
          : tone === 'OFENSIVO'
            ? `Nosso DNA é jogar para frente e buscar o gol o tempo inteiro.`
            : `O nível de exigência aqui é alto. Quem entrar em campo precisa dar 100%.`;
      return {
        ...prev,
        socialFeed: [
          {
            id: nextId('soc'),
            day: prev.currentDay,
            author: prev.managerName,
            handle: `@${prev.managerName.toLowerCase().replace(/\s+/g, '')}`,
            role: 'JORNALISTA' as const,
            content: text,
            likes: 420 + Math.floor(Math.random() * 500),
            reposts: 65,
          },
          ...prev.socialFeed,
        ].slice(0, 40),
      };
    });
  };

  const handleGenerateAiSocial = async () => {
    if (!gameState) return;
    setAiSocialLoading(true);
    setAiSocialError(null);
    const sorted = sortStandings(gameState.standings, activeLeague.rules);
    const rank = sorted.findIndex((r) => r.clubId === userClub.id) + 1;
    const latestNews = gameState.news[0]?.title || `Campanha na ${activeLeague.name}`;

    try {
      const res = await fetch('/api/press/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubName: userClub.name,
          leagueName: activeLeague.name,
          managerName: gameState.managerName,
          summary: `${rank}º colocado na liga. Última manchete: ${latestNews}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao gerar posts com IA.');
      }
      const posts = Array.isArray(data.posts) ? data.posts : [];
      setGameState((prev) => {
        if (!prev) return prev;
        const formatted = posts.map(
          (p: { author?: string; handle?: string; role?: string; content?: string }) => ({
            id: nextId('soc'),
            day: prev.currentDay,
            author: p.author || 'Coluna Esportiva',
            handle: p.handle || '@footsocial',
            role:
              p.role === 'TORCEDOR'
                ? ('TORCEDOR' as const)
                : p.role === 'PERFIL_HUMOR'
                  ? ('PERFIL_HUMOR' as const)
                  : p.role === 'ANALISTA'
                    ? ('ANALISTA' as const)
                    : ('JORNALISTA' as const),
            content: p.content || '',
            likes: 750 + Math.floor(Math.random() * 1400),
            reposts: 95 + Math.floor(Math.random() * 240),
          }),
        );
        return {
          ...prev,
          socialFeed: [...formatted, ...prev.socialFeed].slice(0, 40),
        };
      });
    } catch (err) {
      setAiSocialError(err instanceof Error ? err.message : 'Erro ao conectar com a IA.');
    } finally {
      setAiSocialLoading(false);
    }
  };

  const handleResignClub = (newClubId: string) => {
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      const nextClub = prev.clubs.find((c) => c.id === newClubId);
      if (!nextClub) return prev;
      return {
        ...prev,
        userClubId: newClubId,
        news: [
          {
            id: nextId('news'),
            day: prev.currentDay,
            category: 'CLUBE' as const,
            title: `${prev.managerName} deixa o ${userClub.shortName} e assume o ${nextClub.name}`,
            body: `Movimentação surpreendente na ${activeLeague.name}! O treinador pediu demissão e já comandou o primeiro treino no novo clube.`,
          },
          ...prev.news,
        ].slice(0, 40),
      };
    });
  };

  const handleSelectLockerThread = (threadId: string) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lockerThreads: (prev.lockerThreads || []).map((t) =>
          t.id === threadId ? { ...t, unread: false } : t,
        ),
      };
    });
  };

  const handleStartPlayerThread = (player: Player): string => {
    const existingId = `thread-player-${player.id}`;
    setGameState((prev) => {
      if (!prev) return prev;
      const threads = prev.lockerThreads || [];
      if (threads.some((t) => t.id === existingId)) {
        return {
          ...prev,
          lockerThreads: threads.map((t) => (t.id === existingId ? { ...t, unread: false } : t)),
        };
      }
      const newThread: LockerThread = {
        id: existingId,
        targetType: 'PLAYER',
        targetId: player.id,
        title: player.name,
        subtitle: `${player.position} · OVR ${player.overall} · Moral ${player.morale}%`,
        unread: false,
        messages: [
          {
            id: nextId('lmsg'),
            senderType: 'PLAYER',
            senderName: player.name,
            senderRole: `${player.position} (${player.age}a)`,
            text: `Fala professor ${prev.managerName}, pode mandar!`,
            day: prev.currentDay,
          },
        ],
      };
      return {
        ...prev,
        lockerThreads: [newThread, ...threads],
      };
    });
    return existingId;
  };

  const handleSendLockerMessage = async (
    threadId: string,
    text: string,
    skipAppendUserMsg = false,
  ) => {
    if (!gameState) return;
    const thread = (gameState.lockerThreads || []).find((t) => t.id === threadId);
    if (!thread) return;

    if (!skipAppendUserMsg) {
      const userMsg: LockerMessage = {
        id: nextId('lmsg'),
        senderType: 'MANAGER',
        senderName: gameState.managerName,
        senderRole: 'Técnico',
        text,
        day: gameState.currentDay,
      };

      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lockerThreads: (prev.lockerThreads || []).map((t) =>
            t.id === threadId ? { ...t, unread: false, messages: [...t.messages, userMsg] } : t,
          ),
        };
      });
    }

    setLockerSending(true);
    setLockerError(null);

    const sorted = sortStandings(gameState.standings, activeLeague.rules);
    const rank = sorted.findIndex((r) => r.clubId === userClub.id) + 1;
    const targetPlayer =
      thread.targetType === 'PLAYER' && thread.targetId
        ? userClub.roster.find((p) => p.id === thread.targetId)
        : undefined;
    const targetStaff =
      thread.targetType === 'STAFF' && thread.targetId
        ? (gameState.staff || []).find((s) => s.id === thread.targetId)
        : undefined;

    try {
      const res = await fetch('/api/chat/locker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerName: gameState.managerName,
          clubName: userClub.name,
          leagueName: activeLeague.name,
          rank,
          cohesion: userClub.cohesion ?? 74,
          targetType: thread.targetType,
          targetName: thread.title,
          targetRole: targetPlayer?.position || targetStaff?.role || thread.subtitle,
          targetMorale: targetPlayer?.morale,
          targetAge: targetPlayer?.age,
          targetOvr: targetPlayer?.overall || targetStaff?.overall,
          targetStarter: targetPlayer
            ? userClub.tactics.starterIds.includes(targetPlayer.id)
            : undefined,
          userMessage: text,
          recentHistory: thread.messages.slice(-6).map((m) => ({
            senderName: m.senderName,
            text: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao responder no VestiárioZap.');
      }

      const replies: LockerMessage[] = (
        Array.isArray(data.replies) ? data.replies : []
      ).map((r: { senderName?: string; senderRole?: string; text?: string }) => ({
        id: nextId('lmsg'),
        senderType:
          thread.targetType === 'CEO'
            ? ('CEO' as const)
            : thread.targetType === 'STAFF'
              ? ('STAFF' as const)
              : ('PLAYER' as const),
        senderName: r.senderName || thread.title,
        senderRole: r.senderRole || thread.subtitle,
        text: r.text || 'Entendido, professor.',
        day: gameState.currentDay,
      }));

      const moraleDelta = Number(data.moraleDelta) || 0;
      const cohesionDelta = Number(data.cohesionDelta) || 0;
      const confidenceDelta = Number(data.confidenceDelta) || 0;

      setGameState((prev) => {
        if (!prev) return prev;
        const nextPromises = [...(prev.lockerPromises || [])];
        if (data.createdPromise?.summary) {
          nextPromises.unshift({
            id: nextId('prom'),
            summary: data.createdPromise.summary,
            targetName: thread.title,
            createdDay: prev.currentDay,
            dueDay: prev.currentDay + (Number(data.createdPromise.dueDays) || 7),
            status: 'ATIVA',
          });
        }

        return {
          ...prev,
          lockerThreads: (prev.lockerThreads || []).map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, ...replies] } : t,
          ),
          lockerPromises: nextPromises.slice(0, 15),
          clubs: prev.clubs.map((c) => {
            if (c.id !== prev.userClubId) return c;
            return {
              ...c,
              cohesion: Math.min(100, Math.max(30, (c.cohesion ?? 74) + cohesionDelta)),
              boardConfidence: Math.min(100, Math.max(5, c.boardConfidence + confidenceDelta)),
              roster: c.roster.map((p) => {
                if (thread.targetType === 'PLAYER' && thread.targetId && p.id !== thread.targetId) {
                  return p;
                }
                return {
                  ...p,
                  morale: Math.min(100, Math.max(15, p.morale + moraleDelta)),
                };
              }),
            };
          }),
        };
      });
    } catch (err) {
      setLockerError(err instanceof Error ? err.message : 'Falha na conexão com o VestiárioZap.');
    } finally {
      setLockerSending(false);
    }
  };

  const handleRetryLockerMessage = async (threadId: string) => {
    if (!gameState) return;
    const thread = (gameState.lockerThreads || []).find((t) => t.id === threadId);
    if (!thread) return;
    const lastManagerMsg = [...thread.messages]
      .reverse()
      .find((m) => m.senderType === 'MANAGER');
    if (!lastManagerMsg) return;
    await handleSendLockerMessage(threadId, lastManagerMsg.text, true);
  };

  const handleHireStaff = (cand: StaffMember) => {
    if (userClub.cash < cand.hireCost) return;
    sfx.click();
    setGameState((prev) => {
      if (!prev) return prev;
      const currentStaff = prev.staff || [];
      const hasRole = currentStaff.some((s) => s.role === cand.role);
      const nextStaff = hasRole
        ? currentStaff.map((s) => (s.role === cand.role ? cand : s))
        : [...currentStaff, cand];
      return {
        ...prev,
        staff: nextStaff,
        availableStaff: (prev.availableStaff || []).filter((s) => s.id !== cand.id),
        clubs: prev.clubs.map((c) =>
          c.id === prev.userClubId ? { ...c, cash: c.cash - cand.hireCost } : c,
        ),
        financeLedger: [
          {
            id: nextId('fin'),
            day: prev.currentDay,
            type: 'DESPESA' as const,
            category: 'Comissão Técnica',
            description: `Contratação de ${cand.name} (${cand.role})`,
            amount: cand.hireCost,
          },
          ...prev.financeLedger,
        ].slice(0, 60),
      };
    });
  };

  const handleUpdateWeeklyTraining = (slots: WeeklyTrainingSlot[]) => {
    setGameState((prev) => (prev ? { ...prev, weeklyTraining: slots } : prev));
  };

  const handleUpdatePlayerFocus = (playerId: string, focus: TrainingFocus | undefined) => {
    updateUserClub({
      ...userClub,
      roster: userClub.roster.map((p) =>
        p.id === playerId ? { ...p, individualFocus: focus } : p,
      ),
    });
  };

  const handleBoardRequest = (type: BoardRequestType) => {
    if (!gameState) return;
    sfx.click();
    const conf = userClub.boardConfidence;
    const approved =
      type === 'LOWER_PRESSURE'
        ? conf >= 45
        : type === 'FACILITY_UPGRADE'
          ? conf >= 62
          : conf >= 58;

    const labelMap: Record<BoardRequestType, string> = {
      TRANSFER_BUDGET: 'Verba de Transferências',
      WAGE_BUDGET: 'Fôlego Salarial',
      FACILITY_UPGRADE: 'Subsídio de CT/DM',
      LOWER_PRESSURE: 'Alinhar Meta & Pressão',
    };

    let responseText = '';
    let cashBonus = 0;
    let confDelta = 0;
    let goalRankDelta = 0;
    let upgradeCt = false;

    if (approved) {
      if (type === 'TRANSFER_BUDGET') {
        cashBonus = 6000000;
        responseText = 'Aprovado! Liberamos +R$ 6M em caixa para reforçar o elenco.';
      } else if (type === 'WAGE_BUDGET') {
        cashBonus = 2500000;
        responseText = 'Aprovado! Diretoria aportou +R$ 2,5M para renovar contratos.';
      } else if (type === 'FACILITY_UPGRADE') {
        upgradeCt = userClub.trainingLevel < 5;
        cashBonus = upgradeCt ? 0 : 2000000;
        responseText = upgradeCt
          ? 'Aprovado! A presidência bancou a evolução direta do Centro de Treinamento (+1 Nível).'
          : 'CT já no nível máximo! Recebeu R$ 2M de bônus operacional.';
      } else {
        goalRankDelta = 2;
        responseText = 'Compreendemos o momento. A meta da temporada foi flexibilizada em 2 posições.';
      }
      confDelta = -3;
    } else {
      confDelta = -2;
      responseText =
        'Recusado no momento. A diretoria exige maior confiança ou melhores resultados em campo antes de liberar.';
    }

    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        boardRequests: [
          {
            id: nextId('breq'),
            day: prev.currentDay,
            type,
            label: labelMap[type],
            approved,
            responseText,
          },
          ...(prev.boardRequests || []),
        ].slice(0, 20),
        clubs: prev.clubs.map((c) => {
          if (c.id !== prev.userClubId) return c;
          const nextRank = Math.min(18, c.boardGoalRank + goalRankDelta);
          return {
            ...c,
            cash: c.cash + cashBonus,
            trainingLevel: upgradeCt ? Math.min(5, c.trainingLevel + 1) : c.trainingLevel,
            boardConfidence: Math.max(5, Math.min(100, c.boardConfidence + confDelta)),
            boardGoalRank: nextRank,
            boardGoalLabel:
              goalRankDelta > 0 ? `Terminar até ${nextRank}º lugar` : c.boardGoalLabel,
          };
        }),
        financeLedger:
          cashBonus > 0
            ? [
                {
                  id: nextId('fin'),
                  day: prev.currentDay,
                  type: 'RECEITA' as const,
                  category: 'Aporte da Diretoria',
                  description: responseText,
                  amount: cashBonus,
                },
                ...prev.financeLedger,
              ].slice(0, 60)
            : prev.financeLedger,
      };
    });
  };

  const handleMarkInboxRead = (messageId: string) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inboxMessages: (prev.inboxMessages || []).map((m) =>
          m.id === messageId ? { ...m, read: true } : m,
        ),
      };
    });
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Central do Clube', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tactics', label: 'Elenco e Tática', icon: <Users className="w-4 h-4" /> },
    { id: 'staff', label: 'Comissão & DM', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'locker', label: 'VestiárioZap', icon: <MessagesSquare className="w-4 h-4" /> },
    { id: 'scout', label: 'Scout e Mercado', icon: <Compass className="w-4 h-4" /> },
    { id: 'league', label: 'Competições & Mundo', icon: <Trophy className="w-4 h-4" /> },
    { id: 'finance', label: 'Finanças & Troféus', icon: <Wallet className="w-4 h-4" /> },
    { id: 'press', label: 'Imprensa e Diretoria', icon: <Newspaper className="w-4 h-4" /> },
  ];

  const sortedFinal = sortStandings(gameState.standings, activeLeague.rules);
  const championClub = gameState.clubs.find((c) => c.id === sortedFinal[0]?.clubId);
  const finalUserRank = sortedFinal.findIndex((r) => r.clubId === userClub.id) + 1;
  const willPromote =
    Boolean(activeLeague.promotesToLeagueId) && finalUserRank <= (activeLeague.promotionSpots || 3);
  const willRelegate =
    Boolean(activeLeague.relegatesToLeagueId) &&
    activeLeague.rules.relegationSpots > 0 &&
    finalUserRank > sortedFinal.length - activeLeague.rules.relegationSpots;
  const doctorOverall = (gameState.staff || []).find((s) => s.role === 'MEDICO')?.overall || 70;

  const interviewOptions =
    gameState.pendingInterview?.options && gameState.pendingInterview.options.length > 0
      ? gameState.pendingInterview.options
      : DEFAULT_INTERVIEW_OPTIONS;

  return (
    <div className="min-h-screen bg-[#0B111A] text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-[#0F1724] border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 flex flex-col justify-between">
        <div>
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              NEXTFOOT
            </span>
            <span className="text-[11px] font-medium text-emerald-400">
              {gameState.division === 'FEMININO' ? 'FEM' : 'MASC'}
            </span>
          </div>

          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            <ClubCrest club={userClub} size={38} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{userClub.name}</div>
              <div className="text-xs text-slate-400 truncate">
                {activeLeague.name} · {gameState.managerName}
              </div>
            </div>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setActiveTab(item.id);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3 text-xs">
          <button
            type="button"
            disabled={cloudSaving}
            onClick={handleSaveToCloud}
            className="w-full py-2 px-3 bg-[#121B28] hover:bg-[#182334] border border-white/10 rounded-lg text-slate-200 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {firebaseUser ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {cloudSaving
              ? 'Salvando...'
              : firebaseUser
                ? 'Salvar na Nuvem'
                : 'Entrar Google (Salvar)'}
          </button>

          {cloudSaveFeedback && (
            <div className="text-[11px] text-center text-emerald-400">{cloudSaveFeedback}</div>
          )}

          <div className="flex items-center justify-between gap-2 text-slate-400">
            <button
              type="button"
              onClick={() =>
                setGameState((prev) =>
                  prev ? { ...prev, soundEnabled: !prev.soundEnabled } : prev,
                )
              }
              className="flex items-center gap-1.5 hover:text-white cursor-pointer"
            >
              {gameState.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              Som
            </button>
            <button
              type="button"
              onClick={() => setGameState(null)}
              className="flex items-center gap-1.5 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Menu Inicial
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-white/10 bg-[#0B111A] px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="text-xs sm:text-sm text-slate-300 font-medium truncate">
            {getCalendarLabel(gameState.currentDay, gameState.season)} ·{' '}
            <span className="font-mono text-emerald-400 tabular-nums">
              Caixa {formatCompactBRL(userClub.cash)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isMatchDay && nextCupMatch ? (
              <button
                type="button"
                onClick={() => setActiveCupMatch(nextCupMatch)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                Jogar Copa
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : isMatchDay && nextLeagueFixture ? (
              <button
                type="button"
                onClick={() => setActiveLeagueMatch(nextLeagueFixture)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                Jogar Partida
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdvanceDay}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Avançar Dia
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 max-w-[1320px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={gameState}
              userClub={userClub}
              nextLeagueFixture={nextLeagueFixture}
              nextCupMatch={nextCupMatch}
              onAdvanceDay={handleAdvanceDay}
              onPlayLeagueMatch={(fix) => setActiveLeagueMatch(fix)}
              onPlayCupMatch={(cm) => setActiveCupMatch(cm)}
              onNavigate={(tab) => setActiveTab(tab as NavTab)}
              onMarkInboxRead={handleMarkInboxRead}
            />
          )}

          {activeTab === 'tactics' && (
            <SquadTacticsView
              club={userClub}
              doctorOverall={doctorOverall}
              onUpdateClub={updateUserClub}
              onSellPlayer={handleSellPlayer}
              onNegotiateRenew={(player) =>
                setActiveNegotiation({ mode: 'RENEW', player })
              }
            />
          )}

          {activeTab === 'staff' && (
            <StaffMedicalView
              state={gameState}
              userClub={userClub}
              onHireStaff={handleHireStaff}
              onUpdateWeeklyTraining={handleUpdateWeeklyTraining}
              onUpdatePlayerFocus={handleUpdatePlayerFocus}
            />
          )}

          {activeTab === 'locker' && (
            <LockerChatView
              state={gameState}
              userClub={userClub}
              onSelectThread={handleSelectLockerThread}
              onStartPlayerThread={handleStartPlayerThread}
              onSendMessage={handleSendLockerMessage}
              onRetryLastMessage={handleRetryLockerMessage}
              onClearError={() => setLockerError(null)}
              sending={lockerSending}
              error={lockerError}
            />
          )}

          {activeTab === 'scout' && (
            <ScoutMarketView
              state={gameState}
              userClub={userClub}
              onDispatchScout={handleDispatchScout}
              onSignScoutedPlayer={handleSignScoutedPlayer}
              onOpenAcademy={handleOpenAcademy}
              onPromoteYouth={handlePromoteYouth}
              onOpenNegotiation={(mode, player, meta) =>
                setActiveNegotiation({
                  mode,
                  player,
                  sellerClubId: meta?.sellerClubId,
                  sellerLabel: meta?.sellerLabel,
                  isExternal: meta?.isExternal,
                })
              }
            />
          )}

          {activeTab === 'league' && <LeagueView state={gameState} />}

          {activeTab === 'finance' && (
            <FinanceClubView
              state={gameState}
              userClub={userClub}
              onSignSponsor={handleSignSponsor}
              onUpgradeFacility={handleUpgradeFacility}
              onUpdateKit={handleUpdateKit}
              onBoardRequest={handleBoardRequest}
            />
          )}

          {activeTab === 'press' && (
            <PressBoardView
              state={gameState}
              userClub={userClub}
              onManagerStatement={handleManagerStatement}
              onResignClub={handleResignClub}
              onGenerateAiSocial={handleGenerateAiSocial}
              aiSocialLoading={aiSocialLoading}
              aiSocialError={aiSocialError}
            />
          )}
        </main>
      </div>

      {/* Live 2D League Match Modal */}
      {activeLeagueMatch && (
        <MatchModal
          fixture={activeLeagueMatch}
          homeClub={gameState.clubs.find((c) => c.id === activeLeagueMatch.homeClubId)!}
          awayClub={gameState.clubs.find((c) => c.id === activeLeagueMatch.awayClubId)!}
          userClubId={userClub.id}
          onFinishMatch={handleFinishMatch}
        />
      )}

      {/* Live 2D Cup Match Modal (with Extra Time & Penalties) */}
      {activeCupMatch && (
        <MatchModal
          cupMatch={activeCupMatch}
          homeClub={resolveCupClub(activeCupMatch.homeTeam, gameState.clubs, gameState.division)}
          awayClub={resolveCupClub(activeCupMatch.awayTeam, gameState.clubs, gameState.division)}
          userClubId={userClub.id}
          onFinishMatch={handleFinishMatch}
        />
      )}

      {/* Interactive Transfer / Contract Negotiation Modal */}
      {activeNegotiation && (
        <NegotiationModal
          mode={activeNegotiation.mode}
          player={activeNegotiation.player}
          sellerLabel={activeNegotiation.sellerLabel}
          userCash={userClub.cash}
          onClose={() => setActiveNegotiation(null)}
          onAccept={handleCompleteNegotiation}
        />
      )}

      {/* Post-Match Press Interview Modal (AI Powered with clean fallback) */}
      {gameState.pendingInterview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-lg w-full p-6 space-y-5">
            <div>
              <div className="text-xs text-emerald-400 font-medium">
                Coletiva Pós-Jogo · {gameState.pendingInterview.competitionLabel}
              </div>
              <h3 className="font-display text-2xl font-bold text-white mt-0.5">
                {userClub.name} {gameState.pendingInterview.userGoals} x{' '}
                {gameState.pendingInterview.opponentGoals}{' '}
                {gameState.pendingInterview.opponentName}
              </h3>

              {aiInterviewLoading ? (
                <p className="text-xs text-slate-400 mt-3">
                  Jornalistas preparando pergunta na sala de imprensa...
                </p>
              ) : (
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {gameState.pendingInterview.reporterName || 'Repórter'} (
                  {gameState.pendingInterview.outlet || 'Imprensa Esportiva'}): &ldquo;
                  {gameState.pendingInterview.question ||
                    `Professor ${gameState.managerName}, qual a sua avaliação sobre a atuação da equipe hoje e o impacto para a sequência da temporada?`}
                  &rdquo;
                </p>
              )}

              {aiInterviewError && (
                <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-400/30 rounded text-[11px] text-rose-200 flex items-center justify-between gap-2">
                  <span>{aiInterviewError} (Exibindo perguntas padrão.)</span>
                  <button
                    type="button"
                    disabled={aiInterviewLoading}
                    onClick={() => {
                      setAiInterviewError(null);
                      setGameState((prev) =>
                        prev && prev.pendingInterview
                          ? {
                              ...prev,
                              pendingInterview: { ...prev.pendingInterview, aiLoaded: false },
                            }
                          : prev,
                      );
                      setInterviewRetryTick((t) => t + 1);
                    }}
                    className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 rounded font-semibold text-white whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Recarregar Pergunta IA
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {interviewOptions.map((opt, idx) => (
                <button
                  key={`${opt.label}-${idx}`}
                  type="button"
                  disabled={aiInterviewLoading}
                  onClick={() => handleAnswerInterviewOption(opt)}
                  className="w-full p-3 bg-[#0B111A] hover:bg-[#182334] disabled:opacity-50 border border-white/10 rounded-lg text-left text-white cursor-pointer"
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-slate-400 mt-0.5">{opt.effectHint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* End of Season Summary Modal */}
      {gameState.seasonEnded && !gameState.pendingInterview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-md w-full p-6 space-y-5">
            <div>
              <div className="text-xs text-amber-400 font-medium">
                Fim da Temporada {gameState.season} · {activeLeague.name}
              </div>
              <h3 className="font-display text-3xl font-bold text-white mt-0.5">
                Campeão: {championClub?.name}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Seu clube terminou em{' '}
                <span className="font-bold text-white">{finalUserRank}º lugar</span>.{' '}
                {willPromote && (
                  <span className="text-emerald-400 font-bold">
                    Acesso garantido para a{' '}
                    {getLeagueById(activeLeague.promotesToLeagueId!).name}!{' '}
                  </span>
                )}
                {willRelegate && (
                  <span className="text-rose-400 font-bold">
                    Rebaixado para a{' '}
                    {getLeagueById(activeLeague.relegatesToLeagueId!).name}.{' '}
                  </span>
                )}
                As premiações por posição serão creditadas automaticamente ao avançar para a
                próxima temporada.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                sfx.click();
                setGameState((prev) => (prev ? startNextSeason(prev) : prev));
              }}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg cursor-pointer"
            >
              Iniciar Temporada {gameState.season + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
