import React, { useState } from 'react';
import { Globe2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { getLeagueById, WORLD_LEAGUES } from '../data/worldLeagues';
import { sortCupStandings } from '../engine/cupEngine';
import { Confederation, CupCompetition, GameState } from '../types/game';
import { formatCompactBRL, sortStandings } from '../utils/format';
import { ClubCrest } from './ClubCrest';
import { PlayerPortrait } from './PlayerPortrait';

interface LeagueViewProps {
  state: GameState;
}

type CompetitionTab = 'MINHA_LIGA' | 'COPAS' | 'BASE_SUB20' | 'MUNDO';

export const LeagueView: React.FC<LeagueViewProps> = ({ state }) => {
  const [subTab, setSubTab] = useState<CompetitionTab>('MINHA_LIGA');
  const maxRound = Math.max(
    1,
    state.fixtures.reduce((m, f) => Math.max(m, f.round), 1),
  );
  const [selectedRound, setSelectedRound] = useState(() => {
    const nextUnplayed = state.fixtures.find((f) => !f.played);
    return nextUnplayed ? nextUnplayed.round : maxRound;
  });

  const [worldConfFilter, setWorldConfFilter] = useState<Confederation | 'TODAS'>('TODAS');
  const [selectedWorldLeagueId, setSelectedWorldLeagueId] = useState<string>(() => {
    const firstOther = WORLD_LEAGUES.find((l) => l.id !== state.leagueId);
    return firstOther ? firstOther.id : state.leagueId;
  });
  const [cupStageView, setCupStageView] = useState<'FASE_INICIAL' | 'MATA_MATA'>('FASE_INICIAL');
  const [selectedCupRound, setSelectedCupRound] = useState<number>(1);

  const activeLeague = getLeagueById(state.leagueId);
  const userClub = state.clubs.find((c) => c.id === state.userClubId) || state.clubs[0];
  const sorted = sortStandings(state.standings, activeLeague.rules);
  const roundFixtures = state.fixtures.filter((f) => f.round === selectedRound);

  const allPlayers = state.clubs.flatMap((c) =>
    c.roster.map((p) => ({ player: p, club: c })),
  );
  const topScorers = [...allPlayers]
    .sort((a, b) => b.player.goalsSeason - a.player.goalsSeason || b.player.overall - a.player.overall)
    .slice(0, 8);

  const worldLeaguesFiltered =
    worldConfFilter === 'TODAS'
      ? WORLD_LEAGUES
      : WORLD_LEAGUES.filter((l) => l.confederation === worldConfFilter);

  const inspectedLeague = getLeagueById(selectedWorldLeagueId);
  const inspectedWorldTable =
    inspectedLeague.id === state.leagueId
      ? {
          leagueId: state.leagueId,
          standings: sorted.map((row) => {
            const c = state.clubs.find((cl) => cl.id === row.clubId)!;
            return {
              ...row,
              name: c.name,
              shortName: c.shortName,
              primaryColor: c.primaryColor,
              secondaryColor: c.secondaryColor,
            };
          }),
        }
      : state.worldTables.find((wt) => wt.leagueId === inspectedLeague.id);

  const sortedWorldStandings = inspectedWorldTable
    ? [...inspectedWorldTable.standings].sort((a, b) => {
        for (const tb of inspectedLeague.rules.tiebreakers) {
          if (tb === 'Pontos' && b.points !== a.points) return b.points - a.points;
          if (tb === 'Vitórias' && b.won !== a.won) return b.won - a.won;
          if (tb === 'Saldo de Gols') {
            const gdA = a.gf - a.ga;
            const gdB = b.gf - b.ga;
            if (gdB !== gdA) return gdB - gdA;
          }
          if (tb === 'Gols Pró' && b.gf !== a.gf) return b.gf - a.gf;
        }
        return b.points - a.points || b.gf - b.ga - (a.gf - a.ga);
      })
    : [];

  const sortedYouth = [...(state.youthStandings || [])].sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.won - a.won,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">
            Competições, Regras & Mundo
          </h2>
          <p className="text-xs text-slate-400">
            {activeLeague.name} ({activeLeague.country}) · {state.division === 'FEMININO' ? 'Feminino' : 'Masculino'} · Temporada {state.season}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#121B28] rounded-lg border border-white/10 overflow-x-auto">
          {(
            [
              { id: 'MINHA_LIGA', label: activeLeague.name },
              { id: 'COPAS', label: `Copas & Mundial (${state.cups.length})` },
              { id: 'BASE_SUB20', label: 'Campeonato Sub-20' },
              { id: 'MUNDO', label: `Ligas do Mundo (${WORLD_LEAGUES.length})` },
            ] as Array<{ id: CompetitionTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                subTab === t.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ACTIVE LEAGUE + OFFICIAL RULES */}
      {subTab === 'MINHA_LIGA' && (
        <div className="space-y-6">
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Regulamento Oficial · {activeLeague.name} ({activeLeague.confederation})
              </div>
              <p className="text-slate-300 leading-relaxed">{activeLeague.rules.summary}</p>
            </div>
            <div className="text-right space-y-0.5 text-[11px] text-slate-400 shrink-0">
              <div>Desempate: {activeLeague.rules.tiebreakers.join(' -> ')}</div>
              <div>{activeLeague.rules.foreignLimitLabel}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-[#121B28] border border-white/10 rounded-xl p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Clube</th>
                    <th className="py-2 px-2 font-medium text-right">P</th>
                    <th className="py-2 px-2 font-medium text-right">J</th>
                    <th className="py-2 px-2 font-medium text-right">V</th>
                    <th className="py-2 px-2 font-medium text-right">E</th>
                    <th className="py-2 px-2 font-medium text-right">D</th>
                    <th className="py-2 px-2 font-medium text-right">SG</th>
                    <th className="py-2 pl-2 font-medium text-right">Zona</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {sorted.map((row, idx) => {
                    const pos = idx + 1;
                    const club = state.clubs.find((c) => c.id === row.clubId)!;
                    const isUser = club.id === state.userClubId;
                    const gd = row.gf - row.ga;
                    const promoSpots = activeLeague.promotesToLeagueId
                      ? activeLeague.promotionSpots || 3
                      : 0;
                    const topCutoff = activeLeague.rules.continentalTopSpots;
                    const secCutoff = topCutoff + activeLeague.rules.secondaryContinentalSpots;
                    const relStart =
                      activeLeague.rules.relegationSpots > 0
                        ? sorted.length - activeLeague.rules.relegationSpots + 1
                        : 999;

                    const zoneLabel =
                      promoSpots > 0 && pos <= promoSpots
                        ? 'Acesso'
                        : pos === 1
                          ? 'Líder'
                          : pos <= topCutoff
                            ? activeLeague.rules.continentalCupName.split(' ')[0]
                            : pos <= secCutoff
                              ? 'Playoff / Cont.'
                              : pos >= relStart
                                ? 'Z-Rebaix.'
                                : '—';

                    return (
                      <tr
                        key={club.id}
                        className={isUser ? 'bg-emerald-500/10 font-semibold' : 'hover:bg-white/5'}
                      >
                        <td className="py-2.5 pr-2 font-mono tabular-nums text-slate-400">{pos}º</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <ClubCrest club={club} size={22} className="shrink-0" />
                            <span className={isUser ? 'text-emerald-300' : 'text-white'}>
                              {club.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-white">
                          {row.points}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {row.played}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {row.won}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {row.drawn}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {row.lost}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                        <td
                          className={`py-2.5 pl-2 text-right text-[11px] ${
                            (promoSpots > 0 && pos <= promoSpots) || pos <= topCutoff
                              ? 'text-emerald-400'
                              : pos <= secCutoff
                                ? 'text-sky-400'
                                : pos >= relStart
                                  ? 'text-rose-400'
                                  : 'text-slate-500'
                          }`}
                        >
                          {zoneLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-white">Jogos da Rodada</h3>
                  <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white font-mono"
                  >
                    {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        Rodada {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="divide-y divide-white/8 text-xs max-h-[380px] overflow-y-auto pr-1">
                  {roundFixtures.map((f) => {
                    const home = state.clubs.find((c) => c.id === f.homeClubId)!;
                    const away = state.clubs.find((c) => c.id === f.awayClubId)!;
                    const involvesUser =
                      home.id === state.userClubId || away.id === state.userClubId;
                    return (
                      <div
                        key={f.id}
                        className={`py-2.5 flex items-center justify-between gap-2 ${
                          involvesUser ? 'text-emerald-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ClubCrest club={home} size={20} className="shrink-0" />
                          <span className="truncate">{home.shortName}</span>
                        </div>
                        <div className="font-mono font-bold text-white px-2 tabular-nums">
                          {f.played ? `${f.homeGoals} x ${f.awayGoals}` : `Dia ${f.day}`}
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                          <span className="truncate">{away.shortName}</span>
                          <ClubCrest club={away} size={20} className="shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
                <h3 className="font-display text-xl font-bold text-white">Artilharia</h3>
                <div className="divide-y divide-white/8 text-xs">
                  {topScorers.map(({ player: p, club }, idx) => (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-500 w-4 tabular-nums">{idx + 1}.</span>
                        <span className="text-white font-medium truncate">{p.name}</span>
                        <span className="text-slate-400">({club.shortName})</span>
                      </div>
                      <div className="font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                        {p.goalsSeason} gols
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUPS & CLUB WORLD CUP */}
      {subTab === 'COPAS' && (
        <div className="space-y-6">
          {state.cups.map((cup: CupCompetition) => {
            const format = cup.format || 'KNOCKOUT';
            const po = cup.matches.filter((m) => m.roundIndex === 10);
            const r16 = cup.matches.filter((m) => m.roundIndex === 11);
            const qf = cup.matches.filter((m) => m.roundIndex === 0);
            const sf = cup.matches.filter((m) => m.roundIndex === 1);
            const fin = cup.matches.filter((m) => m.roundIndex === 2);

            const hasStageMode =
              format === 'UCL_LEAGUE_PHASE' || format === 'LIBERTADORES_GROUPS';
            const maxCupRound = format === 'UCL_LEAGUE_PHASE' ? 8 : 6;
            const activeCupRound = Math.min(maxCupRound, Math.max(1, selectedCupRound));
            const stageMatchesForRound = cup.matches.filter(
              (m) => m.roundIndex === -1 && m.roundNumber === activeCupRound,
            );
            const sortedStageMatches = [...stageMatchesForRound].sort((a, b) => {
              const aUser =
                a.homeTeam.id === state.userClubId || a.awayTeam.id === state.userClubId ? 0 : 1;
              const bUser =
                b.homeTeam.id === state.userClubId || b.awayTeam.id === state.userClubId ? 0 : 1;
              return aUser - bUser;
            });

            const renderMatchCard = (m: (typeof cup.matches)[number]) => {
              const hasUser =
                m.homeTeam.id === state.userClubId || m.awayTeam.id === state.userClubId;
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
                    hasUser
                      ? 'bg-[#182334] border-emerald-400/50'
                      : 'bg-[#0B111A] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{m.stageLabel}</span>
                    <span className="font-mono tabular-nums">
                      {m.played ? 'Encerrado' : `Dia ${m.day}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { team: m.homeTeam, goals: m.homeGoals, pen: m.penHome },
                      { team: m.awayTeam, goals: m.awayGoals, pen: m.penAway },
                    ].map(({ team, goals, pen }) => {
                      const isWinner = m.played && m.winnerId === team.id;
                      const isUserTeam = team.id === state.userClubId;
                      return (
                        <div
                          key={team.id}
                          className={`flex items-center justify-between gap-2 ${
                            isWinner
                              ? 'text-emerald-300 font-bold'
                              : isUserTeam
                                ? 'text-white font-semibold'
                                : 'text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ClubCrest club={team} size={18} className="shrink-0" />
                            <span className="truncate">{team.name}</span>
                          </div>
                          <span className="font-mono tabular-nums shrink-0">
                            {m.played ? goals : '-'}
                            {m.played && pen !== undefined ? ` (${pen})` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };

            const uclStandings =
              format === 'UCL_LEAGUE_PHASE' && cup.standings
                ? sortCupStandings(cup.standings)
                : [];

            const groupNames = [
              'Grupo A',
              'Grupo B',
              'Grupo C',
              'Grupo D',
              'Grupo E',
              'Grupo F',
              'Grupo G',
              'Grupo H',
            ];

            return (
              <div
                key={cup.id}
                className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h3 className="font-display text-2xl font-bold text-white">{cup.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{cup.rulesSummary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {hasStageMode && (
                      <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 text-xs">
                        <button
                          type="button"
                          onClick={() => setCupStageView('FASE_INICIAL')}
                          className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                            cupStageView === 'FASE_INICIAL'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {format === 'UCL_LEAGUE_PHASE' ? 'Fase de Liga (36)' : 'Grupos (A–H)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCupStageView('MATA_MATA')}
                          className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                            cupStageView === 'MATA_MATA'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          Mata-Mata
                        </button>
                      </div>
                    )}
                    <div className="text-right text-xs">
                      <div className="text-slate-400">Premiação ao Campeão</div>
                      <div className="font-mono font-bold text-emerald-400 tabular-nums">
                        {formatCompactBRL(cup.prizeChampion)}
                      </div>
                      {cup.championName && (
                        <div className="text-amber-300 font-bold mt-0.5">
                          Campeão: {cup.championName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* UCL 36-CLUB LEAGUE PHASE */}
                {format === 'UCL_LEAGUE_PHASE' && cupStageView === 'FASE_INICIAL' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <div className="lg:col-span-7 bg-[#0B111A] border border-white/10 rounded-xl p-4 overflow-x-auto max-h-[540px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-[#0B111A]">
                          <tr className="border-b border-white/10 text-slate-400">
                            <th className="py-2 pr-2 font-medium">#</th>
                            <th className="py-2 pr-3 font-medium">Clube</th>
                            <th className="py-2 px-2 font-medium text-right">P</th>
                            <th className="py-2 px-2 font-medium text-right">J</th>
                            <th className="py-2 px-2 font-medium text-right">V</th>
                            <th className="py-2 px-2 font-medium text-right">E</th>
                            <th className="py-2 px-2 font-medium text-right">D</th>
                            <th className="py-2 px-2 font-medium text-right">SG</th>
                            <th className="py-2 pl-2 font-medium text-right">Zona</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8">
                          {uclStandings.map((row, idx) => {
                            const pos = idx + 1;
                            const isUser = row.team.id === state.userClubId;
                            const gd = row.gf - row.ga;
                            const zoneLabel =
                              pos <= 8 ? 'Oitavas' : pos <= 24 ? 'Playoff' : 'Elim.';
                            const zoneClass =
                              pos <= 8
                                ? 'text-emerald-400'
                                : pos <= 24
                                  ? 'text-amber-300'
                                  : 'text-rose-400';

                            return (
                              <tr
                                key={row.team.id}
                                className={
                                  isUser ? 'bg-emerald-500/15 font-semibold' : 'hover:bg-white/5'
                                }
                              >
                                <td className="py-2 pr-2 font-mono tabular-nums text-slate-400">
                                  {pos}º
                                </td>
                                <td className="py-2 pr-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ClubCrest club={row.team} size={18} className="shrink-0" />
                                    <span
                                      className={`truncate ${
                                        isUser ? 'text-emerald-300' : 'text-white'
                                      }`}
                                    >
                                      {row.team.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-bold tabular-nums text-white">
                                  {row.points}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                                  {row.played}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                                  {row.won}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                                  {row.drawn}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                                  {row.lost}
                                </td>
                                <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-300">
                                  {gd > 0 ? `+${gd}` : gd}
                                </td>
                                <td className={`py-2 pl-2 text-right text-[11px] ${zoneClass}`}>
                                  {zoneLabel}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:col-span-5 bg-[#0B111A] border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-white">Jogos da Fase de Liga</div>
                        <select
                          value={activeCupRound}
                          onChange={(e) => setSelectedCupRound(Number(e.target.value))}
                          className="px-2.5 py-1 bg-[#121B28] border border-white/15 rounded-lg text-xs text-white font-mono"
                        >
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((r) => (
                            <option key={r} value={r}>
                              Rodada {r}/8
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 max-h-[470px] overflow-y-auto pr-1">
                        {sortedStageMatches.map(renderMatchCard)}
                      </div>
                    </div>
                  </div>
                )}

                {/* LIBERTADORES 8 GROUPS (32 CLUBS) */}
                {format === 'LIBERTADORES_GROUPS' && cupStageView === 'FASE_INICIAL' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {groupNames.map((gName) => {
                        const rows = sortCupStandings(
                          (cup.standings || []).filter((r) => r.groupName === gName),
                        );
                        return (
                          <div
                            key={gName}
                            className="bg-[#0B111A] border border-white/10 rounded-xl p-3.5 space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="text-xs font-bold text-white">{gName}</span>
                              <span className="text-[10px] text-emerald-400">Top 2 Oitavas</span>
                            </div>
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="py-1 pr-1 font-medium">#</th>
                                  <th className="py-1 pr-2 font-medium">Clube</th>
                                  <th className="py-1 px-1 font-medium text-right">P</th>
                                  <th className="py-1 px-1 font-medium text-right">J</th>
                                  <th className="py-1 pl-1 font-medium text-right">SG</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/6">
                                {rows.map((row, idx) => {
                                  const isUser = row.team.id === state.userClubId;
                                  const gd = row.gf - row.ga;
                                  const qualifies = idx < 2;
                                  return (
                                    <tr
                                      key={row.team.id}
                                      className={isUser ? 'bg-emerald-500/15 font-semibold' : ''}
                                    >
                                      <td
                                        className={`py-1.5 pr-1 font-mono tabular-nums ${
                                          qualifies ? 'text-emerald-400 font-bold' : 'text-slate-500'
                                        }`}
                                      >
                                        {idx + 1}º
                                      </td>
                                      <td className="py-1.5 pr-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <ClubCrest club={row.team} size={15} className="shrink-0" />
                                          <span
                                            className={`truncate max-w-[115px] ${
                                              isUser ? 'text-emerald-300' : 'text-slate-200'
                                            }`}
                                          >
                                            {row.team.shortName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-1 text-right font-mono font-bold text-white tabular-nums">
                                        {row.points}
                                      </td>
                                      <td className="py-1.5 px-1 text-right font-mono text-slate-400 tabular-nums">
                                        {row.played}
                                      </td>
                                      <td className="py-1.5 pl-1 text-right font-mono text-slate-300 tabular-nums">
                                        {gd > 0 ? `+${gd}` : gd}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-[#0B111A] border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-white">
                          Jogos da Fase de Grupos
                        </div>
                        <select
                          value={activeCupRound}
                          onChange={(e) => setSelectedCupRound(Number(e.target.value))}
                          className="px-2.5 py-1 bg-[#121B28] border border-white/15 rounded-lg text-xs text-white font-mono"
                        >
                          {Array.from({ length: 6 }, (_, i) => i + 1).map((r) => (
                            <option key={r} value={r}>
                              Rodada {r}/6
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {sortedStageMatches.map(renderMatchCard)}
                      </div>
                    </div>
                  </div>
                )}

                {/* KNOCKOUT BRACKET (ALL FORMATS) */}
                {(!hasStageMode || cupStageView === 'MATA_MATA') && (
                  <div
                    className={`grid grid-cols-1 gap-4 ${
                      format === 'UCL_LEAGUE_PHASE'
                        ? 'md:grid-cols-2 xl:grid-cols-5'
                        : format === 'LIBERTADORES_GROUPS'
                          ? 'md:grid-cols-2 xl:grid-cols-4'
                          : 'md:grid-cols-3'
                    }`}
                  >
                    {format === 'UCL_LEAGUE_PHASE' && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-amber-300">
                          Playoff (Repescagem)
                        </div>
                        {po.length > 0 ? (
                          po.map(renderMatchCard)
                        ) : (
                          <div className="p-4 rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
                            Aguardando fim das 8 rodadas da Fase de Liga (9º–24º).
                          </div>
                        )}
                      </div>
                    )}

                    {(format === 'UCL_LEAGUE_PHASE' || format === 'LIBERTADORES_GROUPS') && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-semibold text-emerald-400">
                          Oitavas de Final
                        </div>
                        {r16.length > 0 ? (
                          r16.map(renderMatchCard)
                        ) : (
                          <div className="p-4 rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
                            Aguardando classificados para as Oitavas.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-400">Quartas de Final</div>
                      {qf.length > 0 ? (
                        qf.map(renderMatchCard)
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
                          Aguardando definição das Oitavas de Final.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-400">Semifinal</div>
                      {sf.length > 0 ? (
                        sf.map(renderMatchCard)
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
                          Aguardando definição das Quartas de Final.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-400">Grande Final</div>
                      {fin.length > 0 ? (
                        fin.map(renderMatchCard)
                      ) : (
                        <div className="p-4 rounded-lg border border-dashed border-white/10 text-xs text-slate-500">
                          Aguardando definição das Semifinais.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: YOUTH LEAGUE SUB-20 */}
      {subTab === 'BASE_SUB20' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4 overflow-x-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display text-xl font-bold text-white">
                  Campeonato de Base Sub-20 · {activeLeague.country}
                </h3>
              </div>
              <span className="text-xs text-slate-400">Simulado a cada 4 dias</span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Equipe Sub-20</th>
                  <th className="py-2 px-2 font-medium text-right">P</th>
                  <th className="py-2 px-2 font-medium text-right">J</th>
                  <th className="py-2 px-2 font-medium text-right">V</th>
                  <th className="py-2 px-2 font-medium text-right">E</th>
                  <th className="py-2 px-2 font-medium text-right">D</th>
                  <th className="py-2 pl-2 font-medium text-right">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {sortedYouth.map((row, idx) => {
                  const gd = row.gf - row.ga;
                  return (
                    <tr
                      key={row.id}
                      className={row.isUser ? 'bg-emerald-500/10 font-semibold' : 'hover:bg-white/5'}
                    >
                      <td className="py-2.5 pr-2 font-mono tabular-nums text-slate-400">
                        {idx + 1}º
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <ClubCrest
                            club={{
                              name: row.clubName,
                              shortName: row.shortName,
                              primaryColor: row.primaryColor,
                              secondaryColor: row.secondaryColor,
                            }}
                            size={20}
                            className="shrink-0"
                          />
                          <span className={row.isUser ? 'text-emerald-300' : 'text-white'}>
                            {row.clubName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-white tabular-nums">
                        {row.points}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                        {row.played}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                        {row.won}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                        {row.drawn}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                        {row.lost}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono text-slate-300 tabular-nums">
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-5 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
            <h3 className="font-display text-xl font-bold text-white">
              Destaques da Sua Base ({userClub.youthAcademy.length})
            </h3>
            <p className="text-xs text-slate-400">
              Promova jovens desta equipe diretamente na aba Scout e Mercado &gt; Base Sub-20.
            </p>
            {userClub.youthAcademy.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma joia restante na base no momento.
              </div>
            ) : (
              <div className="divide-y divide-white/8 text-xs">
                {userClub.youthAcademy.map((kid) => (
                  <div key={kid.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerPortrait
                        name={kid.name}
                        countryCode={kid.countryCode}
                        gender={kid.gender}
                        age={kid.age}
                        faceSeed={kid.faceSeed}
                        primaryColor={userClub.primaryColor}
                        secondaryColor={userClub.secondaryColor}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{kid.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {kid.position} · {kid.age} anos · {kid.archetype}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                      {kid.overall} / {kid.potential}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ALL WORLD LEAGUES & RULES */}
      {subTab === 'MUNDO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Ligas e Regras pelo Mundo
              </h3>
            </div>

            <div className="flex flex-wrap gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 text-[11px]">
              {(['TODAS', 'CONMEBOL', 'UEFA', 'CONCACAF', 'AFC', 'CAF', 'OFC'] as const).map(
                (cf) => (
                  <button
                    key={cf}
                    type="button"
                    onClick={() => setWorldConfFilter(cf)}
                    className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                      worldConfFilter === cf
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {cf}
                  </button>
                ),
              )}
            </div>

            <div className="divide-y divide-white/8 max-h-[480px] overflow-y-auto pr-1">
              {worldLeaguesFiltered.map((lg) => {
                const active = lg.id === inspectedLeague.id;
                return (
                  <button
                    key={lg.id}
                    type="button"
                    onClick={() => setSelectedWorldLeagueId(lg.id)}
                    className={`w-full py-2.5 px-3 text-left rounded-lg transition-colors cursor-pointer ${
                      active ? 'bg-[#182334] text-emerald-300' : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{lg.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {lg.confederation} · {lg.tier}ª Div
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {lg.country} · Copas: {lg.rules.cupName} & {lg.rules.continentalCupName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-bold text-white">
                  {inspectedLeague.name} ({inspectedLeague.country})
                </h3>
                <span className="font-mono text-emerald-400">{inspectedLeague.confederation}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{inspectedLeague.rules.summary}</p>
              <div className="text-[11px] text-slate-400 pt-1">
                Critérios de desempate: {inspectedLeague.rules.tiebreakers.join(' -> ')} ·{' '}
                {inspectedLeague.rules.foreignLimitLabel}
              </div>
            </div>

            <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Clube</th>
                    <th className="py-2 px-2 font-medium text-right">P</th>
                    <th className="py-2 px-2 font-medium text-right">J</th>
                    <th className="py-2 px-2 font-medium text-right">V</th>
                    <th className="py-2 px-2 font-medium text-right">E</th>
                    <th className="py-2 px-2 font-medium text-right">D</th>
                    <th className="py-2 pl-2 font-medium text-right">SG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {sortedWorldStandings.map((row, idx) => {
                    const gd = row.gf - row.ga;
                    return (
                      <tr key={row.clubId} className="hover:bg-white/5">
                        <td className="py-2 pr-2 font-mono tabular-nums text-slate-400">
                          {idx + 1}º
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <ClubCrest club={row} size={20} className="shrink-0" />
                            <span className="text-white">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-white tabular-nums">
                          {row.points}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.played}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.won}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.drawn}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300 tabular-nums">
                          {row.lost}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono text-slate-300 tabular-nums">
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
