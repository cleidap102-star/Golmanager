import React from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Globe,
  Inbox,
  MessagesSquare,
  Newspaper,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { getLeagueById } from '../data/worldLeagues';
import { Club, CupMatch, Fixture, GameState } from '../types/game';
import { formatCompactBRL, getClubAvgOverall, sortStandings } from '../utils/format';
import { ClubCrest } from './ClubCrest';

interface DashboardViewProps {
  state: GameState;
  userClub: Club;
  nextLeagueFixture: Fixture | null;
  nextCupMatch: CupMatch | null;
  onAdvanceDay: () => void;
  onPlayLeagueMatch: (fixture: Fixture) => void;
  onPlayCupMatch: (cupMatch: CupMatch) => void;
  onNavigate: (tab: string) => void;
  onMarkInboxRead: (messageId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  userClub,
  nextLeagueFixture,
  nextCupMatch,
  onAdvanceDay,
  onPlayLeagueMatch,
  onPlayCupMatch,
  onNavigate,
  onMarkInboxRead,
}) => {
  const league = getLeagueById(state.leagueId);
  const sorted = sortStandings(state.standings, league.rules);
  const rank = sorted.findIndex((r) => r.clubId === userClub.id) + 1;
  const userRow = sorted.find((r) => r.clubId === userClub.id);
  const avgMoral = Math.round(
    userClub.roster.reduce((s, p) => s + p.morale, 0) / Math.max(1, userClub.roster.length),
  );
  const avgFatigue = Math.round(
    userClub.roster.reduce((s, p) => s + p.fatigue, 0) / Math.max(1, userClub.roster.length),
  );

  const isCupNext = Boolean(nextCupMatch);
  const nextDay = nextCupMatch ? nextCupMatch.day : nextLeagueFixture?.day;
  const isMatchDay = Boolean(nextDay !== undefined && nextDay === state.currentDay);

  const homeLeagueClub = nextLeagueFixture
    ? state.clubs.find((c) => c.id === nextLeagueFixture.homeClubId)
    : null;
  const awayLeagueClub = nextLeagueFixture
    ? state.clubs.find((c) => c.id === nextLeagueFixture.awayClubId)
    : null;

  const activeMissions = state.scoutMissions.filter((m) => !m.completed).length;
  const inbox = (state.inboxMessages || []).filter((m) => !m.read);
  const activePromises = (state.lockerPromises || []).filter((p) => p.status === 'ATIVA');

  return (
    <div className="space-y-6">
      {/* Top 4 KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400 truncate">Posição · {league.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">{rank}º</span>
            <span className="text-xs text-slate-400 tabular-nums">
              {userRow?.points || 0} pts · {userRow?.won || 0}V {userRow?.drawn || 0}E{' '}
              {userRow?.lost || 0}D
            </span>
          </div>
        </div>

        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Caixa do Clube</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                userClub.cash >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCompactBRL(userClub.cash)}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {userClub.activeSponsors.length} patrocinadores ativos
          </div>
        </div>

        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Confiança da Diretoria</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                userClub.boardConfidence >= 65
                  ? 'text-emerald-400'
                  : userClub.boardConfidence >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {userClub.boardConfidence}%
            </span>
            <span className="text-xs text-slate-400 truncate">Meta: {userClub.boardGoalLabel}</span>
          </div>
        </div>

        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Estado do Elenco</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              OVR {getClubAvgOverall(userClub)}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              Moral {avgMoral}% · Fadiga {avgFatigue}%
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding Inbox & Active Promises */}
      {(inbox.length > 0 || activePromises.length > 0) && (
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-lg font-bold text-white">
                Caixa de Entrada & Primeiros Passos
              </h3>
            </div>
            {activePromises.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('locker')}
                className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
              >
                <MessagesSquare className="w-3.5 h-3.5" />
                {activePromises.length} promessa(s) ativa(s) no VestiárioZap
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {inbox.slice(0, 3).map((msg) => (
              <div
                key={msg.id}
                className="p-3.5 bg-[#0B111A] border border-white/10 rounded-lg flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400">{msg.category}</div>
                  <div className="font-bold text-white">{msg.title}</div>
                  <p className="text-slate-300 leading-relaxed">{msg.body}</p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  {msg.actionTab ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkInboxRead(msg.id);
                        onNavigate(msg.actionTab!);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      Abrir módulo
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => onMarkInboxRead(msg.id)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Marcar lida
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main focal anchor: Next Match (League or Cup) + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#121B28] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                {isCupNext && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                {isMatchDay
                  ? isCupNext
                    ? nextCupMatch?.isGroupOrLeagueStage
                      ? 'Dia de Copa Continental'
                      : 'Dia de Mata-Mata'
                    : 'Dia de Jogo da Liga'
                  : 'Próximo Compromisso'}
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                {nextCupMatch
                  ? `${nextCupMatch.cupName} · ${nextCupMatch.stageLabel}`
                  : nextLeagueFixture
                    ? `Rodada ${nextLeagueFixture.round} · ${homeLeagueClub?.stadiumName}`
                    : 'Temporada Concluída'}
              </h2>
            </div>
            {nextDay !== undefined && (
              <div className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                {isMatchDay ? 'Hoje' : `Em ${nextDay - state.currentDay} dia(s)`}
              </div>
            )}
          </div>

          {nextCupMatch ? (
            <div className="flex items-center justify-between gap-4 py-4 border-y border-white/10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ClubCrest club={nextCupMatch.homeTeam} size={52} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {nextCupMatch.homeTeam.name}
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums truncate">
                    {nextCupMatch.homeTeam.leagueName} · OVR {nextCupMatch.homeTeam.overall}
                  </div>
                </div>
              </div>

              <div className="font-display text-2xl font-extrabold text-amber-400 px-3 shrink-0">
                VS
              </div>

              <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {nextCupMatch.awayTeam.name}
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums truncate">
                    {nextCupMatch.awayTeam.leagueName} · OVR {nextCupMatch.awayTeam.overall}
                  </div>
                </div>
                <ClubCrest club={nextCupMatch.awayTeam} size={52} className="shrink-0" />
              </div>
            </div>
          ) : nextLeagueFixture && homeLeagueClub && awayLeagueClub ? (
            <div className="flex items-center justify-between gap-4 py-4 border-y border-white/10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ClubCrest club={homeLeagueClub} size={52} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {homeLeagueClub.name}
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums">
                    Mandante · OVR {getClubAvgOverall(homeLeagueClub)}
                  </div>
                </div>
              </div>

              <div className="font-display text-2xl font-extrabold text-slate-500 px-3 shrink-0">
                VS
              </div>

              <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {awayLeagueClub.name}
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums">
                    Visitante · OVR {getClubAvgOverall(awayLeagueClub)}
                  </div>
                </div>
                <ClubCrest club={awayLeagueClub} size={52} className="shrink-0" />
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-slate-300 border-y border-white/10">
              Todas as rodadas e copas da temporada foram disputadas. Confira a classificação final
              ou avance para a próxima temporada!
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Esquema:{' '}
              <span className="text-white font-semibold">{userClub.tactics.formation}</span> ·
              Entrosamento:{' '}
              <span className="text-emerald-400 font-mono font-semibold tabular-nums">
                {userClub.cohesion ?? 74}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('tactics')}
                className="px-4 py-2 bg-[#182334] hover:bg-[#1E2C42] border border-white/10 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Ajustar Tática
              </button>

              {isMatchDay && nextCupMatch ? (
                <button
                  type="button"
                  onClick={() => onPlayCupMatch(nextCupMatch)}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  Jogar Copa
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : isMatchDay && nextLeagueFixture ? (
                <button
                  type="button"
                  onClick={() => onPlayLeagueMatch(nextLeagueFixture)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  Ir para Partida
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAdvanceDay}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  Avançar Dia
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Club Modules & Mini Standings */}
        <div className="lg:col-span-5 bg-[#121B28] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-white">Topo da {league.name}</h3>
            <button
              type="button"
              onClick={() => onNavigate('league')}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              Ver ligas e copas
            </button>
          </div>

          <div className="divide-y divide-white/8 text-xs">
            {sorted.slice(0, 6).map((row, idx) => {
              const c = state.clubs.find((cl) => cl.id === row.clubId)!;
              const isUser = c.id === userClub.id;
              return (
                <div
                  key={c.id}
                  className={`py-2 flex items-center justify-between gap-2 ${
                    isUser ? 'text-emerald-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono w-5 text-slate-500 tabular-nums">{idx + 1}º</span>
                    <ClubCrest club={c} size={20} className="shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                    <span className="text-slate-400">{row.played}J</span>
                    <span className="font-bold text-white w-7 text-right">{row.points}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onNavigate('locker')}
              className="p-2.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-left transition-colors cursor-pointer"
            >
              <MessagesSquare className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs font-semibold text-white">VestiárioZap</div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {(state.lockerThreads || []).filter((t) => t.unread).length} não lida(s)
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scout')}
              className="p-2.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-left transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-xs font-semibold text-white">Scout Global</div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {activeMissions} em campo
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('staff')}
              className="p-2.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-left transition-colors cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-sky-400 mb-1" />
              <div className="text-xs font-semibold text-white">Comissão & DM</div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {userClub.roster.filter((p) => p.injuredDays > 0).length} no DM
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Latest News & FootSocial Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-lg font-bold text-white">
                Boletim do Clube e Imprensa
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('press')}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Ver tudo
            </button>
          </div>
          <div className="divide-y divide-white/8">
            {state.news.slice(0, 4).map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="text-xs text-slate-400">
                  Dia {item.day} · {item.category}
                </div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">Repercussão no FootSocial</h3>
            <button
              type="button"
              onClick={() => onNavigate('press')}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Abrir rede
            </button>
          </div>
          <div className="divide-y divide-white/8">
            {state.socialFeed.slice(0, 4).map((post) => (
              <div key={post.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-white">{post.author}</span>
                  <span className="text-slate-400">{post.handle}</span>
                  <span className="text-slate-500">· Dia {post.day}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{post.content}</p>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {post.likes} curtidas · {post.reposts} republicações
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
