import { Club, Fixture, LeagueRow, MatchEvent, Player } from '../types/game';
import { nextId } from '../data/clubs';

export function generateDoubleRoundRobinFixtures(clubs: Club[]): Fixture[] {
  const ids = clubs.map((c) => c.id);
  const n = ids.length; // 20 clubs -> 19 rounds first half, 19 rounds second half = 38 rounds
  const fixed = ids[0];
  const rotating = ids.slice(1);
  const fixtures: Fixture[] = [];

  for (let round = 1; round <= n - 1; round += 1) {
    const matchDay = round * 3; // match every 3 days (38 rounds = Day 114)
    const roundPairs: Array<[string, string]> = [];

    const firstOpponent = rotating[0];
    if (round % 2 === 1) {
      roundPairs.push([fixed, firstOpponent]);
    } else {
      roundPairs.push([firstOpponent, fixed]);
    }

    for (let i = 1; i < n / 2; i += 1) {
      const a = rotating[i];
      const b = rotating[rotating.length - i];
      if ((round + i) % 2 === 0) {
        roundPairs.push([a, b]);
      } else {
        roundPairs.push([b, a]);
      }
    }

    for (const [homeClubId, awayClubId] of roundPairs) {
      fixtures.push({
        id: nextId('fix'),
        round,
        day: matchDay,
        homeClubId,
        awayClubId,
        played: false,
      });
    }

    // Rotate clockwise
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  // Second half (returno)
  const firstHalfCount = fixtures.length;
  for (let i = 0; i < firstHalfCount; i += 1) {
    const f = fixtures[i];
    const round = f.round + (n - 1);
    fixtures.push({
      id: nextId('fix'),
      round,
      day: round * 3,
      homeClubId: f.awayClubId,
      awayClubId: f.homeClubId,
      played: false,
    });
  }

  return fixtures;
}

export function getClubMatchStrength(club: Club, isHome: boolean): {
  attack: number;
  midfield: number;
  defense: number;
} {
  const starters = club.tactics.starterIds
    .map((id) => club.roster.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  const pool = starters.length >= 8 ? starters : club.roster.slice(0, 11);

  const avg = (list: Player[], fallback: number) => {
    if (list.length === 0) return fallback;
    return (
      list.reduce((acc, p) => {
        const fitPenalty = p.fatigue * 0.14;
        const moraleBoost = (p.morale - 70) * 0.1;
        return acc + p.overall - fitPenalty + moraleBoost;
      }, 0) / list.length
    );
  };

  const defenders = pool.filter((p) => p.position === 'GOL' || p.position === 'ZAG' || p.position === 'LAT');
  const midfielders = pool.filter((p) => p.position === 'VOL' || p.position === 'MEI');
  const attackers = pool.filter((p) => p.position === 'ATA' || p.position === 'MEI');

  const cohesionBonus = ((club.cohesion ?? 74) - 70) * 0.08;

  let attack = avg(attackers, 72) + cohesionBonus;
  let midfield = avg(midfielders, 72) + cohesionBonus;
  let defense = avg(defenders, 72) + cohesionBonus;

  if (club.tactics.mentality === 'OFENSIVO') {
    attack += 3.5;
    defense -= 2.5;
  } else if (club.tactics.mentality === 'RETRANCA') {
    defense += 3.5;
    attack -= 3;
  }

  if (club.tactics.pressing === 'ALTA') {
    midfield += 2.2;
  } else if (club.tactics.pressing === 'BAIXA') {
    defense += 1.5;
  }

  if (isHome) {
    attack += 2.2;
    midfield += 1.8;
    defense += 1.5;
  }

  return { attack, midfield, defense };
}

export function pickScorer(club: Club, activeIds?: string[]): { scorer?: Player; assister?: Player } {
  const pool = (activeIds || club.tactics.starterIds)
    .map((id) => club.roster.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  if (pool.length === 0) return {};

  const weighted: Player[] = [];
  for (const p of pool) {
    const weight =
      p.position === 'ATA'
        ? 8
        : p.position === 'MEI'
          ? 5
          : p.position === 'VOL'
            ? 2
            : p.position === 'LAT'
              ? 2
              : p.position === 'ZAG'
                ? 1
                : 0;
    for (let i = 0; i < weight; i += 1) weighted.push(p);
  }

  const scorer = weighted.length > 0 ? weighted[Math.floor(Math.random() * weighted.length)] : pool[0];
  const assistCandidates = pool.filter((p) => p.id !== scorer.id && p.position !== 'GOL');
  const assister =
    assistCandidates.length > 0
      ? assistCandidates[Math.floor(Math.random() * assistCandidates.length)]
      : undefined;

  return { scorer, assister };
}

export function simulateFastAIMatch(
  home: Club,
  away: Club,
): {
  homeGoals: number;
  awayGoals: number;
  attendance: number;
  goalScorers: Array<{ clubId: string; scorerId: string; assistId?: string }>;
} {
  const h = getClubMatchStrength(home, true);
  const a = getClubMatchStrength(away, false);

  const homeExpected = Math.max(0.45, 1.35 + (h.attack - a.defense) * 0.055 + (h.midfield - a.midfield) * 0.025);
  const awayExpected = Math.max(0.35, 1.1 + (a.attack - h.defense) * 0.055 + (a.midfield - h.midfield) * 0.025);

  const sampleGoals = (lambda: number): number => {
    let g = 0;
    for (let i = 0; i < 6; i += 1) {
      if (Math.random() < lambda / 6) g += 1;
    }
    return g;
  };

  const homeGoals = sampleGoals(homeExpected);
  const awayGoals = sampleGoals(awayExpected);
  const goalScorers: Array<{ clubId: string; scorerId: string; assistId?: string }> = [];

  for (let i = 0; i < homeGoals; i += 1) {
    const { scorer, assister } = pickScorer(home);
    if (scorer) goalScorers.push({ clubId: home.id, scorerId: scorer.id, assistId: assister?.id });
  }
  for (let i = 0; i < awayGoals; i += 1) {
    const { scorer, assister } = pickScorer(away);
    if (scorer) goalScorers.push({ clubId: away.id, scorerId: scorer.id, assistId: assister?.id });
  }

  const fillRate = Math.min(0.96, 0.55 + (home.reputation + away.reputation) / 420);
  const attendance = Math.round(home.stadiumCapacity * fillRate);

  return { homeGoals, awayGoals, attendance, goalScorers };
}

export interface LiveMatchTickResult {
  event: MatchEvent | null;
  homeShot: boolean;
  awayShot: boolean;
  homeGoal: boolean;
  awayGoal: boolean;
  ballX: number;
  ballY: number;
  possessionSide: 'HOME' | 'AWAY';
  scorerId?: string;
  assistId?: string;
  yellowPlayerId?: string;
  injuredPlayerId?: string;
}

export function simulateLiveMinute(
  minute: number,
  home: Club,
  away: Club,
  homeActiveIds: string[],
  awayActiveIds: string[],
): LiveMatchTickResult {
  const h = getClubMatchStrength(home, true);
  const a = getClubMatchStrength(away, false);

  const midDiff = h.midfield - a.midfield;
  const homePossChance = Math.min(0.72, Math.max(0.28, 0.52 + midDiff * 0.012));
  const possessionSide: 'HOME' | 'AWAY' = Math.random() < homePossChance ? 'HOME' : 'AWAY';

  let ballX = possessionSide === 'HOME' ? 52 + Math.random() * 34 : 14 + Math.random() * 34;
  let ballY = 18 + Math.random() * 64;

  const chanceRoll = Math.random();
  const atkEdge = possessionSide === 'HOME' ? (h.attack - a.defense) * 0.004 : (a.attack - h.defense) * 0.004;

  if (chanceRoll < 0.14 + Math.max(0, atkEdge)) {
    const isHome = possessionSide === 'HOME';
    const attackingClub = isHome ? home : away;
    const defendingClub = isHome ? away : home;
    const activeIds = isHome ? homeActiveIds : awayActiveIds;

    ballX = isHome ? 88 + Math.random() * 9 : 3 + Math.random() * 9;
    ballY = 34 + Math.random() * 32;

    const goalProb = isHome
      ? Math.min(0.42, Math.max(0.14, 0.23 + (h.attack - a.defense) * 0.012))
      : Math.min(0.42, Math.max(0.12, 0.21 + (a.attack - h.defense) * 0.012));

    if (Math.random() < goalProb) {
      const { scorer, assister } = pickScorer(attackingClub, activeIds);
      const scorerName = scorer?.name || attackingClub.shortName;
      const assistPhrase = assister ? ` (assistência de ${assister.name})` : '';
      return {
        event: {
          minute,
          type: 'GOL',
          team: isHome ? 'HOME' : 'AWAY',
          text: `GOL do ${attackingClub.shortName}! ${scorerName} finaliza com categoria${assistPhrase}!`,
          playerId: scorer?.id,
          assistId: assister?.id,
        },
        homeShot: isHome,
        awayShot: !isHome,
        homeGoal: isHome,
        awayGoal: !isHome,
        ballX: isHome ? 96 : 4,
        ballY: 50,
        possessionSide,
        scorerId: scorer?.id,
        assistId: assister?.id,
      };
    }

    const { scorer } = pickScorer(attackingClub, activeIds);
    const keeper = defendingClub.roster.find((p) => p.position === 'GOL');
    const saved = Math.random() < 0.6;
    return {
      event: {
        minute,
        type: saved ? 'DEFESA' : 'CHANCE',
        team: isHome ? 'HOME' : 'AWAY',
        text: saved
          ? `Grande defesa de ${keeper?.name || 'goleiro'} após chute perigoso de ${scorer?.name || 'atacante'}!`
          : `Quase! ${scorer?.name || attackingClub.shortName} tira tinta da trave para o ${attackingClub.shortName}.`,
      },
      homeShot: isHome,
      awayShot: !isHome,
      homeGoal: false,
      awayGoal: false,
      ballX,
      ballY,
      possessionSide,
    };
  }

  if (Math.random() < 0.025) {
    const isHome = Math.random() < 0.5;
    const club = isHome ? home : away;
    const active = (isHome ? homeActiveIds : awayActiveIds)
      .map((id) => club.roster.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));
    const player = active[Math.floor(Math.random() * active.length)];
    if (player) {
      return {
        event: {
          minute,
          type: 'AMARELO',
          team: isHome ? 'HOME' : 'AWAY',
          text: `Cartão amarelo para ${player.name} (${club.shortName}) por falta tática no meio-campo.`,
          playerId: player.id,
        },
        homeShot: false,
        awayShot: false,
        homeGoal: false,
        awayGoal: false,
        ballX,
        ballY,
        possessionSide,
        yellowPlayerId: player.id,
      };
    }
  }

  if (Math.random() < 0.0045) {
    const isHome = Math.random() < 0.5;
    const club = isHome ? home : away;
    const active = (isHome ? homeActiveIds : awayActiveIds)
      .map((id) => club.roster.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p && p.position !== 'GOL'));
    const player = active[Math.floor(Math.random() * active.length)];
    if (player) {
      return {
        event: {
          minute,
          type: 'LESAO',
          team: isHome ? 'HOME' : 'AWAY',
          text: `${player.name} (${club.shortName}) sentiu o músculo e preocupa o departamento médico.`,
          playerId: player.id,
        },
        homeShot: false,
        awayShot: false,
        homeGoal: false,
        awayGoal: false,
        ballX,
        ballY,
        possessionSide,
        injuredPlayerId: player.id,
      };
    }
  }

  return {
    event: null,
    homeShot: false,
    awayShot: false,
    homeGoal: false,
    awayGoal: false,
    ballX,
    ballY,
    possessionSide,
  };
}

export function applyMatchResultToStandings(
  standings: LeagueRow[],
  homeId: string,
  awayId: string,
  homeGoals: number,
  awayGoals: number,
): LeagueRow[] {
  return standings.map((row) => {
    if (row.clubId !== homeId && row.clubId !== awayId) return row;
    const isHome = row.clubId === homeId;
    const gf = isHome ? homeGoals : awayGoals;
    const ga = isHome ? awayGoals : homeGoals;
    const won = gf > ga ? 1 : 0;
    const drawn = gf === ga ? 1 : 0;
    const lost = gf < ga ? 1 : 0;
    const points = won * 3 + drawn;
    return {
      ...row,
      played: row.played + 1,
      won: row.won + won,
      drawn: row.drawn + drawn,
      lost: row.lost + lost,
      gf: row.gf + gf,
      ga: row.ga + ga,
      points: row.points + points,
    };
  });
}
