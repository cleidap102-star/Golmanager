import {
  Club,
  ExternalTransferTarget,
  FormationId,
  GenderDivision,
  PitchSlotCoord,
  Player,
  PlayerAttributes,
  Position,
  SponsorDeal,
  StaffMember,
  StaffRole,
  WeeklyTrainingSlot,
} from '../types/game';
import { FEDERATIONS, getFederationById } from './federations';
import {
  getLeagueById,
  WORLD_CLUB_BLUEPRINTS,
  WorldClubBlueprint,
} from './worldLeagues';

export const SPONSOR_CATALOG: Omit<SponsorDeal, 'weeksRemaining'>[] = [
  {
    id: 'sp-master-1',
    name: 'Banco SulAmérica Digital',
    sector: 'Fintech & Pagamentos',
    slot: 'MASTER',
    weeklyIncome: 480000,
    winBonus: 80000,
    titleBonus: 2500000,
  },
  {
    id: 'sp-master-2',
    name: 'Energia Verde Global',
    sector: 'Energia Renovável',
    slot: 'MASTER',
    weeklyIncome: 380000,
    winBonus: 185000,
    titleBonus: 4200000,
  },
  {
    id: 'sp-master-3',
    name: 'Veloce Telecom 5G',
    sector: 'Telecomunicações',
    slot: 'MASTER',
    weeklyIncome: 540000,
    winBonus: 40000,
    titleBonus: 1500000,
  },
  {
    id: 'sp-manga-1',
    name: 'Kits Sportiva Pro',
    sector: 'Material Esportivo',
    slot: 'MANGA',
    weeklyIncome: 190000,
    winBonus: 45000,
    titleBonus: 1000000,
  },
  {
    id: 'sp-manga-2',
    name: 'AeroWorld Linhas Aéreas',
    sector: 'Aviação & Turismo',
    slot: 'MANGA',
    weeklyIncome: 225000,
    winBonus: 25000,
    titleBonus: 800000,
  },
];

export const FORMATION_POSITIONS: Record<FormationId, Position[]> = {
  '4-3-3': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
  '4-4-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-2-3-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
  '3-5-2': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-1-4-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA'],
  PERSONALIZADA: ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
};

export const FORMATION_COORDS: Record<FormationId, PitchSlotCoord[]> = {
  '4-3-3': [
    { x: 50, y: 89, label: 'GOL' },
    { x: 16, y: 71, label: 'LAT' },
    { x: 38, y: 74, label: 'ZAG' },
    { x: 62, y: 74, label: 'ZAG' },
    { x: 84, y: 71, label: 'LAT' },
    { x: 50, y: 54, label: 'VOL' },
    { x: 30, y: 42, label: 'MEI' },
    { x: 70, y: 42, label: 'MEI' },
    { x: 20, y: 20, label: 'ATA' },
    { x: 50, y: 15, label: 'ATA' },
    { x: 80, y: 20, label: 'ATA' },
  ],
  '4-4-2': [
    { x: 50, y: 89, label: 'GOL' },
    { x: 16, y: 71, label: 'LAT' },
    { x: 38, y: 74, label: 'ZAG' },
    { x: 62, y: 74, label: 'ZAG' },
    { x: 84, y: 71, label: 'LAT' },
    { x: 36, y: 52, label: 'VOL' },
    { x: 64, y: 52, label: 'MEI' },
    { x: 18, y: 38, label: 'MEI' },
    { x: 82, y: 38, label: 'MEI' },
    { x: 37, y: 17, label: 'ATA' },
    { x: 63, y: 17, label: 'ATA' },
  ],
  '4-2-3-1': [
    { x: 50, y: 89, label: 'GOL' },
    { x: 16, y: 72, label: 'LAT' },
    { x: 38, y: 75, label: 'ZAG' },
    { x: 62, y: 75, label: 'ZAG' },
    { x: 84, y: 72, label: 'LAT' },
    { x: 37, y: 56, label: 'VOL' },
    { x: 63, y: 56, label: 'VOL' },
    { x: 20, y: 35, label: 'MEI' },
    { x: 50, y: 36, label: 'MEI' },
    { x: 80, y: 35, label: 'MEI' },
    { x: 50, y: 15, label: 'ATA' },
  ],
  '3-5-2': [
    { x: 50, y: 89, label: 'GOL' },
    { x: 26, y: 73, label: 'ZAG' },
    { x: 50, y: 75, label: 'ZAG' },
    { x: 74, y: 73, label: 'ZAG' },
    { x: 36, y: 54, label: 'VOL' },
    { x: 64, y: 54, label: 'VOL' },
    { x: 15, y: 40, label: 'MEI' },
    { x: 50, y: 37, label: 'MEI' },
    { x: 85, y: 40, label: 'MEI' },
    { x: 38, y: 16, label: 'ATA' },
    { x: 62, y: 16, label: 'ATA' },
  ],
  '4-1-4-1': [
    { x: 50, y: 89, label: 'GOL' },
    { x: 16, y: 72, label: 'LAT' },
    { x: 38, y: 75, label: 'ZAG' },
    { x: 62, y: 75, label: 'ZAG' },
    { x: 84, y: 72, label: 'LAT' },
    { x: 50, y: 57, label: 'VOL' },
    { x: 18, y: 37, label: 'MEI' },
    { x: 40, y: 40, label: 'MEI' },
    { x: 60, y: 40, label: 'MEI' },
    { x: 82, y: 37, label: 'MEI' },
    { x: 50, y: 15, label: 'ATA' },
  ],
  PERSONALIZADA: [
    { x: 50, y: 89, label: 'GOL' },
    { x: 16, y: 71, label: 'LAT' },
    { x: 38, y: 74, label: 'ZAG' },
    { x: 62, y: 74, label: 'ZAG' },
    { x: 84, y: 71, label: 'LAT' },
    { x: 50, y: 54, label: 'VOL' },
    { x: 30, y: 42, label: 'MEI' },
    { x: 70, y: 42, label: 'MEI' },
    { x: 20, y: 20, label: 'ATA' },
    { x: 50, y: 15, label: 'ATA' },
    { x: 80, y: 20, label: 'ATA' },
  ],
};

export const DEFAULT_WEEKLY_TRAINING: WeeklyTrainingSlot[] = [
  { dayIndex: 0, dayLabel: 'Seg', focus: 'FISICO', intensity: 'INTENSO' },
  { dayIndex: 1, dayLabel: 'Ter', focus: 'TATICO', intensity: 'NORMAL' },
  { dayIndex: 2, dayLabel: 'Qua', focus: 'TECNICO', intensity: 'NORMAL' },
  { dayIndex: 3, dayLabel: 'Qui', focus: 'FINALIZACAO', intensity: 'NORMAL' },
  { dayIndex: 4, dayLabel: 'Sex', focus: 'TATICO', intensity: 'LEVE' },
  { dayIndex: 5, dayLabel: 'Sáb', focus: 'EQUILIBRADO', intensity: 'NORMAL' },
  { dayIndex: 6, dayLabel: 'Dom', focus: 'RECUPERACAO', intensity: 'LEVE' },
];

let idCounter = 1;
export function nextId(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function computeOverall(pos: Position, attr: PlayerAttributes): number {
  switch (pos) {
    case 'GOL':
      return clamp(attr.fin * 0.4 + attr.def * 0.25 + attr.pas * 0.15 + attr.fis * 0.2, 40, 99);
    case 'ZAG':
      return clamp(attr.def * 0.42 + attr.fis * 0.26 + attr.pac * 0.16 + attr.pas * 0.16, 40, 99);
    case 'LAT':
      return clamp(attr.pac * 0.28 + attr.def * 0.26 + attr.pas * 0.24 + attr.dri * 0.12 + attr.fis * 0.1, 40, 99);
    case 'VOL':
      return clamp(attr.def * 0.3 + attr.pas * 0.28 + attr.fis * 0.24 + attr.dri * 0.1 + attr.pac * 0.08, 40, 99);
    case 'MEI':
      return clamp(attr.pas * 0.33 + attr.dri * 0.28 + attr.fin * 0.18 + attr.pac * 0.13 + attr.fis * 0.08, 40, 99);
    case 'ATA':
      return clamp(attr.fin * 0.36 + attr.pac * 0.26 + attr.dri * 0.22 + attr.fis * 0.1 + attr.pas * 0.06, 40, 99);
  }
}

export function computeInjuryRisk(
  player: Player,
  medicalLevel = 2,
  doctorOverall = 70,
): { score: number; level: 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO' } {
  if (player.injuredDays > 0) {
    return { score: 99, level: 'CRITICO' };
  }
  const agePenalty = player.age >= 32 ? (player.age - 30) * 5 : player.age <= 19 ? 2 : 0;
  const fatigueRisk = player.fatigue * 0.85;
  const medicalReduction = (medicalLevel - 1) * 4 + Math.max(0, (doctorOverall - 65) * 0.35);
  const raw = clamp(fatigueRisk + agePenalty - medicalReduction + 8, 5, 96);
  const level =
    raw >= 72 ? 'CRITICO' : raw >= 50 ? 'ALTO' : raw >= 28 ? 'MODERADO' : 'BAIXO';
  return { score: raw, level };
}

export function generatePlayer(options: {
  position: Position;
  gender: GenderDivision;
  federationId?: string;
  targetOverall?: number;
  isYouth?: boolean;
  focusProfile?: 'EQUILIBRADO' | 'VELOCIDADE' | 'TECNICA' | 'FISICO' | 'PROMESSA';
}): Player {
  const fed = getFederationById(options.federationId || 'bra');
  const isYouth = Boolean(options.isYouth);
  const age = isYouth
    ? randInt(16, 19)
    : options.focusProfile === 'PROMESSA'
      ? randInt(17, 21)
      : randInt(19, 34);

  const baseOvr = options.targetOverall ?? randInt(64, 78);
  const pos = options.position;

  const baseAttr: PlayerAttributes = {
    pac: baseOvr + randInt(-6, 6),
    fin: baseOvr + randInt(-7, 6),
    pas: baseOvr + randInt(-6, 6),
    dri: baseOvr + randInt(-6, 6),
    def: baseOvr + randInt(-7, 6),
    fis: baseOvr + randInt(-6, 6),
  };

  if (pos === 'GOL') {
    baseAttr.fin += 8;
    baseAttr.def += 4;
    baseAttr.dri -= 12;
    baseAttr.pac -= 8;
  } else if (pos === 'ZAG') {
    baseAttr.def += 9;
    baseAttr.fis += 7;
    baseAttr.fin -= 12;
  } else if (pos === 'LAT') {
    baseAttr.pac += 7;
    baseAttr.def += 4;
    baseAttr.pas += 3;
  } else if (pos === 'VOL') {
    baseAttr.def += 6;
    baseAttr.fis += 6;
    baseAttr.pas += 4;
  } else if (pos === 'MEI') {
    baseAttr.pas += 8;
    baseAttr.dri += 7;
    baseAttr.def -= 6;
  } else if (pos === 'ATA') {
    baseAttr.fin += 9;
    baseAttr.pac += 6;
    baseAttr.dri += 5;
    baseAttr.def -= 14;
  }

  baseAttr.pac += (fed.attributeBias.pac || 0) * 0.6;
  baseAttr.fin += (fed.attributeBias.fin || 0) * 0.6;
  baseAttr.pas += (fed.attributeBias.pas || 0) * 0.6;
  baseAttr.dri += (fed.attributeBias.dri || 0) * 0.6;
  baseAttr.def += (fed.attributeBias.def || 0) * 0.6;
  baseAttr.fis += (fed.attributeBias.fis || 0) * 0.6;

  if (options.focusProfile === 'VELOCIDADE') baseAttr.pac += 7;
  if (options.focusProfile === 'TECNICA') {
    baseAttr.dri += 6;
    baseAttr.pas += 5;
  }
  if (options.focusProfile === 'FISICO') {
    baseAttr.fis += 7;
    baseAttr.def += 4;
  }

  const attributes: PlayerAttributes = {
    pac: clamp(baseAttr.pac, 35, 97),
    fin: clamp(baseAttr.fin, 30, 97),
    pas: clamp(baseAttr.pas, 35, 97),
    dri: clamp(baseAttr.dri, 32, 97),
    def: clamp(baseAttr.def, 28, 97),
    fis: clamp(baseAttr.fis, 38, 97),
  };

  const overall = computeOverall(pos, attributes);
  const potentialBoost = age <= 20 ? randInt(8, 17) : age <= 24 ? randInt(3, 8) : randInt(0, 2);
  const potential = clamp(overall + potentialBoost, overall, 96);

  const firstName =
    options.gender === 'MASCULINO' ? pick(fed.maleFirstNames) : pick(fed.femaleFirstNames);
  const lastName = pick(fed.lastNames);

  const valueMultiplier = Math.pow(Math.max(1, overall - 52), 2.25) * 8200;
  const ageFactor = age <= 21 ? 1.32 : age >= 31 ? 0.62 : 1;
  const marketValue = Math.round((valueMultiplier * ageFactor) / 10000) * 10000;
  const salary = Math.max(8000, Math.round((marketValue * 0.011) / 1000) * 1000);

  return {
    id: nextId('ply'),
    name: `${firstName} ${lastName}`,
    age,
    nationality: fed.country,
    countryCode: fed.countryCode,
    position: pos,
    gender: options.gender,
    overall,
    potential,
    attributes,
    salary,
    marketValue,
    contractYears: randInt(1, 4),
    morale: randInt(68, 86),
    fatigue: randInt(4, 15),
    form: randInt(65, 82),
    injuredDays: 0,
    goalsSeason: 0,
    assistsSeason: 0,
    matchesSeason: 0,
    isYouth,
    archetype: pick(fed.archetypes),
    faceSeed: `${fed.countryCode}-${options.gender}-${randInt(100000, 999999)}`,
  };
}

export function pickBestStarters(
  roster: Player[],
  formation: FormationId,
  customCoords?: PitchSlotCoord[],
): string[] {
  const slots =
    formation === 'PERSONALIZADA' && customCoords && customCoords.length === 11
      ? customCoords.map((c) => c.label)
      : FORMATION_POSITIONS[formation];
  const chosen = new Set<string>();
  const starterIds: string[] = [];

  const fitnessScore = (p: Player) =>
    p.overall - p.fatigue * 0.28 + (p.morale - 70) * 0.08 - (p.fatigue > 75 ? 4 : 0);

  for (const pos of slots) {
    const exact = roster
      .filter((p) => !chosen.has(p.id) && p.injuredDays === 0 && p.position === pos)
      .sort((a, b) => fitnessScore(b) - fitnessScore(a));

    if (exact.length > 0) {
      chosen.add(exact[0].id);
      starterIds.push(exact[0].id);
    } else {
      const fallback = roster
        .filter((p) => !chosen.has(p.id) && p.injuredDays === 0)
        .sort((a, b) => fitnessScore(b) - fitnessScore(a));
      if (fallback.length > 0) {
        chosen.add(fallback[0].id);
        starterIds.push(fallback[0].id);
      }
    }
  }
  return starterIds;
}

const STAFF_SPECIALTIES: Record<StaffRole, string[]> = {
  AUXILIAR: ['Bolas Paradas & Compactação', 'Leitura Tática & Pressão', 'Gestão de Vestiário'],
  PREPARADOR: ['Resistência Aeróbica', 'Explosão & Velocidade', 'Prevenção Muscular'],
  MEDICO: ['Fisioterapia Esportiva', 'Recuperação Acelerada', 'Medicina Preventiva'],
  OLHEIRO_CHEFE: ['Garimpo Sul-Americano', 'Mercado Europeu & Base', 'Olheiro Global'],
};

export function generateStaffMember(
  role: StaffRole,
  federationId = 'bra',
  minOverall = 68,
  maxOverall = 86,
): StaffMember {
  const fed = getFederationById(federationId);
  const first = pick([...fed.maleFirstNames, ...fed.femaleFirstNames]);
  const last = pick(fed.lastNames);
  const overall = randInt(minOverall, maxOverall);
  const salary = Math.round((overall * 1100) / 1000) * 1000;
  const hireCost = salary * randInt(4, 7);

  return {
    id: nextId('stf'),
    name: `${first} ${last}`,
    role,
    nationality: fed.country,
    countryCode: fed.countryCode,
    overall,
    specialty: pick(STAFF_SPECIALTIES[role]),
    salary,
    hireCost,
    faceSeed: `stf-${fed.countryCode}-${randInt(100000, 999999)}`,
  };
}

export function generateInitialClubStaff(federationId: string): StaffMember[] {
  return [
    generateStaffMember('AUXILIAR', federationId, 68, 76),
    generateStaffMember('PREPARADOR', federationId, 67, 75),
    generateStaffMember('MEDICO', federationId, 68, 76),
    generateStaffMember('OLHEIRO_CHEFE', federationId, 67, 75),
  ];
}

export function generateAvailableStaffPool(count = 12): StaffMember[] {
  const roles: StaffRole[] = ['AUXILIAR', 'PREPARADOR', 'MEDICO', 'OLHEIRO_CHEFE'];
  const list: StaffMember[] = [];
  for (let i = 0; i < count; i += 1) {
    const fed = FEDERATIONS[(i * 3) % FEDERATIONS.length];
    list.push(generateStaffMember(roles[i % roles.length], fed.id, 72, 92));
  }
  return list.sort((a, b) => b.overall - a.overall);
}

export function buildClubFromBlueprint(
  bp: WorldClubBlueprint,
  division: GenderDivision,
): Club {
  const positions: Position[] = [
    'GOL', 'GOL',
    'ZAG', 'ZAG', 'ZAG', 'ZAG',
    'LAT', 'LAT', 'LAT', 'LAT',
    'VOL', 'VOL', 'VOL',
    'MEI', 'MEI', 'MEI', 'MEI',
    'ATA', 'ATA', 'ATA', 'ATA', 'ATA',
  ];

  const globalForeignPool = ['bra', 'arg', 'ury', 'nga', 'gha', 'jpn', 'prt', 'fra', 'esp', 'som'];

  const roster = positions.map((pos, idx) => {
    const useForeign = idx % 5 === 3;
    const fedId = useForeign ? pick(globalForeignPool) : bp.federationId;
    const starBoost = idx % 4 === 0 ? randInt(1, 4) : randInt(-4, 2);
    return generatePlayer({
      position: pos,
      gender: division,
      federationId: fedId,
      targetOverall: bp.targetOverall + starBoost,
      isYouth: false,
    });
  });

  const youthPositions: Position[] = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA', 'ATA'];
  const youthAcademy = youthPositions.map((pos) =>
    generatePlayer({
      position: pos,
      gender: division,
      federationId: bp.federationId,
      targetOverall: bp.targetOverall - randInt(10, 16),
      isYouth: true,
    }),
  );

  const formation: FormationId = '4-3-3';
  const starterIds = pickBestStarters(roster, formation);

  const masterSponsor = { ...pick(SPONSOR_CATALOG.filter((s) => s.slot === 'MASTER')), weeksRemaining: 16 };
  const mangaSponsor = { ...pick(SPONSOR_CATALOG.filter((s) => s.slot === 'MANGA')), weeksRemaining: 12 };

  return {
    id: bp.id,
    leagueId: bp.leagueId,
    name: division === 'FEMININO' ? `${bp.name} Fem.` : bp.name,
    shortName: bp.shortName,
    city: bp.city,
    stadiumName: bp.stadiumName,
    stadiumCapacity: bp.stadiumCapacity,
    stadiumLevel: bp.reputation >= 84 ? 3 : 2,
    trainingLevel: bp.reputation >= 84 ? 3 : 2,
    medicalLevel: 2,
    primaryColor: bp.primaryColor,
    secondaryColor: bp.secondaryColor,
    homeKit: { ...bp.homeKit },
    awayKit: { ...bp.awayKit },
    cash: division === 'FEMININO' ? Math.round(bp.baseCash * 0.45) : bp.baseCash,
    boardConfidence: 74,
    boardGoalRank: bp.boardGoalRank,
    boardGoalLabel: bp.boardGoalLabel,
    trainingFocus: 'EQUILIBRADO',
    cohesion: 74,
    tactics: {
      formation,
      mentality: 'EQUILIBRADO',
      pressing: 'MEDIA',
      passing: 'MISTO',
      starterIds,
    },
    roster,
    youthAcademy,
    activeSponsors: [masterSponsor, mangaSponsor],
    reputation: bp.reputation,
  };
}

export function generateFreeAgentsPool(division: GenderDivision, count = 24): Player[] {
  const positions: Position[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const list: Player[] = [];
  for (let i = 0; i < count; i += 1) {
    const fed = FEDERATIONS[i % FEDERATIONS.length];
    list.push(
      generatePlayer({
        position: positions[i % positions.length],
        gender: division,
        federationId: fed.id,
        targetOverall: randInt(64, 78),
      }),
    );
  }
  return list.sort((a, b) => b.overall - a.overall);
}

export function generateExternalMarketPool(
  activeLeagueId: string,
  division: GenderDivision,
  count = 40,
): ExternalTransferTarget[] {
  const otherClubs = WORLD_CLUB_BLUEPRINTS.filter((c) => c.leagueId !== activeLeagueId);
  const positions: Position[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const targets: ExternalTransferTarget[] = [];

  for (let i = 0; i < count; i += 1) {
    const bp = otherClubs[(i * 7) % otherClubs.length];
    const league = getLeagueById(bp.leagueId);
    const player = generatePlayer({
      position: positions[i % positions.length],
      gender: division,
      federationId: bp.federationId,
      targetOverall: bp.targetOverall + randInt(-2, 4),
    });
    targets.push({
      player,
      clubId: bp.id,
      clubName: division === 'FEMININO' ? `${bp.name} Fem.` : bp.name,
      clubShortName: bp.shortName,
      leagueName: league.name,
    });
  }

  return targets.sort((a, b) => b.player.overall - a.player.overall);
}
