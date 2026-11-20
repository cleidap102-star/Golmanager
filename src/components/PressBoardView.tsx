import React, { useState } from 'react';
import { Award, LogOut, MessageSquare, Newspaper, ShieldAlert, Sparkles } from 'lucide-react';
import { getLeagueById } from '../data/worldLeagues';
import { Club, GameState } from '../types/game';
import { sortStandings } from '../utils/format';

interface PressBoardViewProps {
  state: GameState;
  userClub: Club;
  onManagerStatement: (tone: 'OFENSIVO' | 'APOIO_TORCIDA' | 'COBRAR_ELENCO') => void;
  onResignClub: (newClubId: string) => void;
  onGenerateAiSocial: () => Promise<void>;
  aiSocialLoading: boolean;
  aiSocialError: string | null;
}

export const PressBoardView: React.FC<PressBoardViewProps> = ({
  state,
  userClub,
  onManagerStatement,
  onResignClub,
  onGenerateAiSocial,
  aiSocialLoading,
  aiSocialError,
}) => {
  const [showResignModal, setShowResignModal] = useState(false);

  const league = getLeagueById(state.leagueId);
  const sorted = sortStandings(state.standings, league.rules);
  const rank = sorted.findIndex((r) => r.clubId === userClub.id) + 1;
  const otherClubs = state.clubs.filter((c) => c.id !== userClub.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-white">
          Imprensa, Rede Social e Diretoria
        </h2>
        <p className="text-xs text-slate-400">
          Gerencie a pressão externa, acompanhe repercussões geradas com IA e veja seu histórico de
          carreira
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FootSocial */}
        <div className="lg:col-span-5 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">FootSocial</h3>
            </div>
            <button
              type="button"
              disabled={aiSocialLoading}
              onClick={onGenerateAiSocial}
              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 border border-emerald-400/30 text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiSocialLoading ? 'Gerando...' : 'Gerar Repercussão IA'}
            </button>
          </div>

          {aiSocialError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-400/30 rounded-lg text-xs text-rose-200">
              {aiSocialError}
            </div>
          )}

          <div className="space-y-2 pb-3 border-b border-white/10">
            <div className="text-xs text-slate-400">Pronunciamento Rápido do Técnico:</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onManagerStatement('APOIO_TORCIDA')}
                className="px-3 py-1.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-xs text-white cursor-pointer"
              >
                Convocar Torcida
              </button>
              <button
                type="button"
                onClick={() => onManagerStatement('OFENSIVO')}
                className="px-3 py-1.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-xs text-white cursor-pointer"
              >
                Prometer Ataque
              </button>
              <button
                type="button"
                onClick={() => onManagerStatement('COBRAR_ELENCO')}
                className="px-3 py-1.5 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg text-xs text-white cursor-pointer"
              >
                Cobrar Elenco
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/8 max-h-[460px] overflow-y-auto pr-1">
            {state.socialFeed.map((post) => (
              <div key={post.id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-white">{post.author}</span>{' '}
                    <span className="text-slate-400">{post.handle}</span>
                  </div>
                  <span className="text-slate-500 font-mono tabular-nums">Dia {post.day}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{post.content}</p>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {post.likes} curtidas · {post.reposts} republicações
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Press, Board & Career History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="font-display text-xl font-bold text-white">Avaliação da Diretoria</h3>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                {userClub.boardConfidence}% confiança
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#0B111A] rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all ${
                  userClub.boardConfidence >= 65
                    ? 'bg-emerald-500'
                    : userClub.boardConfidence >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${userClub.boardConfidence}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-[#0B111A] border border-white/10 rounded-lg">
                <div className="text-slate-400">Meta Oficial</div>
                <div className="font-semibold text-white mt-0.5">{userClub.boardGoalLabel}</div>
              </div>
              <div className="p-3 bg-[#0B111A] border border-white/10 rounded-lg">
                <div className="text-slate-400">Posição Atual</div>
                <div className="font-mono font-bold text-white mt-0.5 tabular-nums">
                  {rank}º lugar (Meta Top {userClub.boardGoalRank})
                </div>
              </div>
              <div className="p-3 bg-[#0B111A] border border-white/10 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-slate-400">Carreira</div>
                  <div className="font-semibold text-white mt-0.5">Trocar de Clube</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResignModal(true)}
                  className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Demitir-se
                </button>
              </div>
            </div>
          </div>

          {state.careerHistory.length > 0 && (
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="font-display text-xl font-bold text-white">
                  Histórico da Carreira
                </h3>
              </div>
              <div className="divide-y divide-white/8 text-xs">
                {state.careerHistory.map((h, i) => (
                  <div key={`${h.season}-${i}`} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        Temp. {h.season} · {h.clubName} ({h.leagueName})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {h.finalPosition}º lugar ({h.points} pts)
                        {h.champion ? ' · Campeão da Liga' : ''}
                        {h.cupsWon.length > 0 ? ` · Copas: ${h.cupsWon.join(', ')}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">Arquivo de Imprensa</h3>
            </div>

            <div className="divide-y divide-white/8 max-h-[340px] overflow-y-auto pr-1">
              {state.news.map((item) => (
                <div key={item.id} className="py-3 space-y-1">
                  <div className="text-[11px] text-slate-400">
                    Dia {item.day} · {item.category}
                  </div>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resign & Pick New Club Modal */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-display text-2xl font-bold text-white">
              Pedir Demissão e Assumir Novo Clube
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você pode encerrar seu ciclo no {userClub.name} no meio da temporada e assumir outro
              clube da {league.name} mantendo o campeonato em andamento.
            </p>

            <div className="max-h-[280px] overflow-y-auto divide-y divide-white/8 border border-white/10 rounded-lg bg-[#0B111A]">
              {otherClubs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onResignClub(c.id);
                    setShowResignModal(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-slate-400">{c.boardGoalLabel}</div>
                  </div>
                  <span className="text-emerald-400 font-semibold">Assumir</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowResignModal(false)}
                className="px-4 py-2 bg-[#182334] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
