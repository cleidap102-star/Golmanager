import { Club, LeagueRules, LeagueRow, Position } from '../types/game';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactBRL(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)} mil`;
  }
  return `${sign}R$ ${abs}`;
}

export function getCalendarLabel(day: number, season: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthIdx = Math.min(months.length - 1, Math.floor((day - 1) / 10));
  const dayOfMonth = ((day - 1) % 10) * 3 + 1;
  return `${String(dayOfMonth).padStart(2, '0')} ${months[monthIdx]} · Temp. ${season}`;
}

export function getPositionLabel(pos: Position): string {
  switch (pos) {
    case 'GOL':
      return 'Goleiro';
    case 'ZAG':
      return 'Zagueiro';
    case 'LAT':
      return 'Lateral';
    case 'VOL':
      return 'Volante';
    case 'MEI':
      return 'Meia';
    case 'ATA':
      return 'Atacante';
  }
}

export function getClubAvgOverall(club: Club): number {
  const starters = club.tactics.starterIds
    .map((id) => club.roster.find((p) => p.id === id))
    .filter(Boolean);
  if (starters.length === 0) return 70;
  const total = starters.reduce((sum, p) => sum + (p?.overall || 70), 0);
  return Math.round(total / starters.length);
}

export function sortStandings(rows: LeagueRow[], rules?: LeagueRules): LeagueRow[] {
  const tiebreakers = rules?.tiebreakers || ['Pontos', 'Vitórias', 'Saldo de Gols', 'Gols Pró'];
  return [...rows].sort((a, b) => {
    for (const tb of tiebreakers) {
      if (tb === 'Pontos' && b.points !== a.points) return b.points - a.points;
      if (tb === 'Vitórias' && b.won !== a.won) return b.won - a.won;
      if (tb === 'Saldo de Gols') {
        const gdA = a.gf - a.ga;
        const gdB = b.gf - b.ga;
        if (gdB !== gdA) return gdB - gdA;
      }
      if (tb === 'Gols Pró' && b.gf !== a.gf) return b.gf - a.gf;
    }
    if (b.points !== a.points) return b.points - a.points;
    return b.gf - a.gf;
  });
}
