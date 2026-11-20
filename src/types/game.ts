export type GenderDivision = 'MASCULINO' | 'FEMININO';

export type Confederation = 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'AFC' | 'CAF' | 'OFC';

export type Position = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';

export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '4-1-4-1' | 'PERSONALIZADA';

export type Mentality = 'RETRANCA' | 'EQUILIBRADO' | 'OFENSIVO';
export type PressingStyle = 'BAIXA' | 'MEDIA' | 'ALTA';
export type PassingStyle = 'POSSE' | 'MISTO' | 'CONTRA_ATAQUE';
export type TrainingFocus = 'EQUILIBRADO' | 'FISICO' | 'TECNICO' | 'TATICO' | 'FINALIZACAO' | 'RECUPERACAO';

export type KitPattern = 'LISO' | 'LISTRADO' | 'FAIXA' | 'METADE';

export interface KitConfig {
  primary: string;
  secondary: string;
  accent: string;
  pattern: KitPattern;
}

export interface PlayerAttributes {
  pac: number;
  fin: number;
  pas: number;
  dri: number;
  def: number;
  fis: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  countryCode: string;
  position: Position;
  gender: GenderDivision;
  overall: number;
  potential: number;
  attributes: PlayerAttributes;
  salary: number;
  marketValue: number;
  contractYears: number;
  sellOnClausePct?: number;
  morale: number;
  fatigue: number;
  form: number;
  injuredDays: number;
  goalsSeason: number;
  assistsSeason: number;
  matchesSeason: number;
  isYouth: boolean;
  archetype: string;
  faceSeed?: string;
  individualFocus?: TrainingFocus;
}

export interface FederationProfile {
  id: string;
  country: string;
  countryCode: string;
  region: 'AMÉRICA DO SUL' | 'ÁFRICA' | 'ÁSIA' | 'EUROPA' | 'AMÉRICA DO NORTE' | 'OCEANIA';
  federationName: string;
  summary: string;
  scoutCost: number;
  scoutDays: number;
  academyCost: number;
  academyMaintenanceWeekly: number;
  attributeBias: Partial<PlayerAttributes>;
  archetypes: string[];
  maleFirstNames: string[];
  femaleFirstNames: string[];
  lastNames: string[];
}

export interface PitchSlotCoord {
  x: number;
  y: number;
  label: Position;
}

export interface ClubTactics {
  formation: FormationId;
  mentality: Mentality;
  pressing: PressingStyle;
  passing: PassingStyle;
  starterIds: string[];
  customCoords?: PitchSlotCoord[];
}

export interface SponsorDeal {
  id: string;
  name: string;
  sector: string;
  slot: 'MASTER' | 'MANGA';
  weeklyIncome: number;
  winBonus: number;
  titleBonus: number;
  weeksRemaining: number;
}

export interface Club {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  city: string;
  stadiumName: string;
  stadiumCapacity: number;
  stadiumLevel: number;
  trainingLevel: number;
  medicalLevel: number;
  primaryColor: string;
  secondaryColor: string;
  homeKit: KitConfig;
  awayKit: KitConfig;
  cash: number;
  boardConfidence: number;
  boardGoalRank: number;
  boardGoalLabel: string;
  trainingFocus: TrainingFocus;
  cohesion?: number;
  tactics: ClubTactics;
  roster: Player[];
  youthAcademy: Player[];
  activeSponsors: SponsorDeal[];
  reputation: number;
}

export interface LeagueRules {
  pointsWin: number;
  pointsDraw: number;
  tiebreakers: string[];
  continentalTopSpots: number;
  secondaryContinentalSpots: number;
  relegationSpots: number;
  hasPlayoffs: boolean;
  foreignLimitLabel: string;
  cupName: string;
  continentalCupName: string;
  summary: string;
}

export interface LeagueDefinition {
  id: string;
  name: string;
  country: string;
  federationId: string;
  confederation: Confederation;
  tier: 1 | 2;
  currencyLabel: string;
  promotesToLeagueId?: string;
  relegatesToLeagueId?: string;
  promotionSpots?: number;
  rules: LeagueRules;
}

export interface Fixture {
  id: string;
  round: number;
  day: number;
  homeClubId: string;
  awayClubId: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  attendance?: number;
  competitionType?: 'LEAGUE' | 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP';
  competitionName?: string;
  stageLabel?: string;
  penaltyWinnerId?: string;
  penHome?: number;
  penAway?: number;
}

export interface CupTeamSnapshot {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string;
  overall: number;
  leagueName: string;
}

export type ContinentalFormat = 'KNOCKOUT' | 'UCL_LEAGUE_PHASE' | 'LIBERTADORES_GROUPS';

export interface CupStandingRow {
  team: CupTeamSnapshot;
  groupName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface CupMatch {
  id: string;
  cupId: 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP';
  cupName: string;
  roundIndex: number; // -1 = Liga/Grupos, 10 = Playoff UCL, 11 = Oitavas, 0 = Quartas, 1 = Semi, 2 = Final
  roundNumber?: number; // 1..8 (UCL) or 1..6 (Libertadores)
  stageLabel: string;
  groupName?: string;
  isGroupOrLeagueStage?: boolean;
  day: number;
  homeTeam: CupTeamSnapshot;
  awayTeam: CupTeamSnapshot;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  penHome?: number;
  penAway?: number;
  winnerId?: string;
}

export interface CupCompetition {
  id: 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP';
  name: string;
  prizeChampion: number;
  rulesSummary: string;
  format?: ContinentalFormat;
  standings?: CupStandingRow[];
  matches: CupMatch[];
  championId?: string;
  championName?: string;
}

export interface LeagueRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface WorldLeagueSnapshot {
  leagueId: string;
  standings: Array<{
    clubId: string;
    name: string;
    shortName: string;
    primaryColor: string;
    secondaryColor: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
  }>;
}

export interface ScoutMission {
  id: string;
  federationId: string;
  targetPosition: Position | 'QUALQUER';
  focusProfile: 'EQUILIBRADO' | 'VELOCIDADE' | 'TECNICA' | 'FISICO' | 'PROMESSA';
  daysRemaining: number;
  totalDays: number;
  completed: boolean;
  foundPlayers: Player[];
}

export interface OverseasAcademy {
  id: string;
  federationId: string;
  level: number;
  openedDay: number;
  daysUntilNextIntake: number;
  totalGraduates: number;
}

export interface FinanceEntry {
  id: string;
  day: number;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  amount: number;
}

export interface NewsItem {
  id: string;
  day: number;
  category: 'CLUBE' | 'MERCADO' | 'IMPRENSA' | 'DIRETORIA' | 'BASE' | 'RESULTADO' | 'COPA';
  title: string;
  body: string;
}

export interface SocialPost {
  id: string;
  day: number;
  author: string;
  handle: string;
  role: 'TORCEDOR' | 'JORNALISTA' | 'PERFIL_HUMOR' | 'ANALISTA';
  content: string;
  likes: number;
  reposts: number;
}

export interface MatchEvent {
  minute: number;
  type: 'GOL' | 'AMARELO' | 'VERMELHO' | 'CHANCE' | 'DEFESA' | 'LESAO' | 'SUBSTITUICAO' | 'APITO';
  team: 'HOME' | 'AWAY' | 'NEUTRAL';
  text: string;
  playerId?: string;
  assistId?: string;
}

export interface CareerHistoryEntry {
  season: number;
  clubId: string;
  clubName: string;
  leagueName: string;
  division: GenderDivision;
  finalPosition: number;
  points: number;
  champion: boolean;
  cupsWon: string[];
  leftReason: 'FIM_TEMPORADA' | 'DEMISSAO_PEDIDA' | 'DEMITIDO';
  promotedTo?: string;
  relegatedTo?: string;
}

export interface PressInterviewOption {
  label: string;
  quote: string;
  moraleDelta: number;
  confidenceDelta: number;
  effectHint: string;
}

export interface PendingInterview {
  fixtureId: string;
  opponentName: string;
  userGoals: number;
  opponentGoals: number;
  wasHome: boolean;
  competitionLabel: string;
  aiLoaded?: boolean;
  reporterName?: string;
  outlet?: string;
  question?: string;
  options?: PressInterviewOption[];
}

export interface ExternalTransferTarget {
  player: Player;
  clubId: string;
  clubName: string;
  clubShortName: string;
  leagueName: string;
}

export type StaffRole = 'AUXILIAR' | 'PREPARADOR' | 'MEDICO' | 'OLHEIRO_CHEFE';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  nationality: string;
  countryCode: string;
  overall: number;
  specialty: string;
  salary: number;
  hireCost: number;
  faceSeed: string;
}

export type TrainingIntensity = 'LEVE' | 'NORMAL' | 'INTENSO';

export interface WeeklyTrainingSlot {
  dayIndex: number; // 0 = Seg .. 6 = Dom
  dayLabel: string;
  focus: TrainingFocus;
  intensity: TrainingIntensity;
}

export interface LockerMessage {
  id: string;
  senderType: 'MANAGER' | 'PLAYER' | 'CEO' | 'STAFF';
  senderName: string;
  senderRole: string;
  text: string;
  day: number;
}

export interface LockerThread {
  id: string;
  targetType: 'GROUP' | 'PLAYER' | 'CEO' | 'STAFF';
  targetId?: string;
  title: string;
  subtitle: string;
  unread: boolean;
  messages: LockerMessage[];
}

export interface LockerPromise {
  id: string;
  summary: string;
  targetName: string;
  dueDay: number;
  createdDay: number;
  status: 'ATIVA' | 'CUMPRIDA' | 'QUEBRADA';
}

export type BoardRequestType =
  | 'TRANSFER_BUDGET'
  | 'WAGE_BUDGET'
  | 'FACILITY_UPGRADE'
  | 'LOWER_PRESSURE';

export interface BoardRequestItem {
  id: string;
  day: number;
  type: BoardRequestType;
  label: string;
  approved: boolean;
  responseText: string;
}

export interface TrophyRecord {
  id: string;
  season: number;
  title: string;
  competition: string;
  clubName: string;
  type: 'LIGA' | 'COPA_NACIONAL' | 'CONTINENTAL' | 'MUNDIAL';
}

export interface YouthLeagueRow {
  id: string;
  clubName: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  isUser: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface InboxMessage {
  id: string;
  day: number;
  title: string;
  category: 'BOAS_VINDAS' | 'TUTORIAL' | 'DIRETORIA' | 'ELENCO';
  body: string;
  actionTab?: string;
  read: boolean;
}

export interface GameState {
  saveId: string;
  managerName: string;
  division: GenderDivision;
  leagueId: string;
  season: number;
  currentDay: number;
  userClubId: string;
  clubs: Club[];
  fixtures: Fixture[];
  standings: LeagueRow[];
  cups: CupCompetition[];
  worldTables: WorldLeagueSnapshot[];
  externalMarket: ExternalTransferTarget[];
  freeAgents: Player[];
  availableSponsors: SponsorDeal[];
  scoutMissions: ScoutMission[];
  overseasAcademies: OverseasAcademy[];
  financeLedger: FinanceEntry[];
  news: NewsItem[];
  socialFeed: SocialPost[];
  careerHistory: CareerHistoryEntry[];
  pendingInterview: PendingInterview | null;
  seasonEnded: boolean;
  soundEnabled: boolean;
  staff?: StaffMember[];
  availableStaff?: StaffMember[];
  weeklyTraining?: WeeklyTrainingSlot[];
  lockerThreads?: LockerThread[];
  lockerPromises?: LockerPromise[];
  boardRequests?: BoardRequestItem[];
  trophies?: TrophyRecord[];
  youthStandings?: YouthLeagueRow[];
  inboxMessages?: InboxMessage[];
}
