import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, MessageSquarePlus, Send, Sparkles } from 'lucide-react';
import { Club, GameState, LockerThread, Player } from '../types/game';
import { ClubCrest } from './ClubCrest';
import { PlayerPortrait } from './PlayerPortrait';

interface LockerChatViewProps {
  state: GameState;
  userClub: Club;
  onSelectThread: (threadId: string) => void;
  onStartPlayerThread: (player: Player) => string;
  onSendMessage: (threadId: string, text: string) => Promise<void>;
  onRetryLastMessage?: (threadId: string) => Promise<void>;
  onClearError?: () => void;
  sending: boolean;
  error: string | null;
}

const QUICK_PROMPTS: Record<LockerThread['targetType'], string[]> = {
  GROUP: [
    'Grupo fechado! Quero intensidade total nos treinos dessa semana.',
    'Confio em vocês para buscarmos os 3 pontos na próxima rodada.',
    'Quem estiver mais inteiro fisicamente vai jogar. Vamos rodar o elenco!',
  ],
  PLAYER: [
    'Conto com você como peça-chave. Mantenha o foco nos treinos!',
    'Vou te dar sequência entre os titulares se mantiver essa entrega.',
    'Precisamos melhorar sua recuperação física antes do próximo jogo.',
  ],
  CEO: [
    'Estamos competitivos na liga e peço respaldo da diretoria no projeto.',
    'Precisamos de reforços pontuais para brigar no topo da tabela.',
    'Nosso planejamento financeiro e esportivo está sob controle.',
  ],
  STAFF: [
    'Quero um relatório sobre o desgaste do elenco para o próximo jogo.',
    'Ajuste a carga de treinos para evitar lesões musculares esta semana.',
    'Qual setor do time precisamos reforçar com prioridade no scout?',
  ],
};

export const LockerChatView: React.FC<LockerChatViewProps> = ({
  state,
  userClub,
  onSelectThread,
  onStartPlayerThread,
  onSendMessage,
  onRetryLastMessage,
  onClearError,
  sending,
  error,
}) => {
  const threads = state.lockerThreads || [];
  const promises = state.lockerPromises || [];
  const staff = state.staff || [];

  const [activeThreadId, setActiveThreadId] = useState<string>(threads[0]?.id || 'thread-group');
  const [draft, setDraft] = useState('');
  const [showNewPlayerPicker, setShowNewPlayerPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || null;

  useEffect(() => {
    if (activeThread && activeThread.unread) {
      onSelectThread(activeThread.id);
    }
  }, [activeThread?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, sending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !draft.trim() || sending) return;
    const msg = draft.trim();
    setDraft('');
    await onSendMessage(activeThread.id, msg);
  };

  const resolveThreadAvatar = (thread: LockerThread) => {
    if (thread.targetType === 'PLAYER' && thread.targetId) {
      const p = userClub.roster.find((pl) => pl.id === thread.targetId);
      if (p) {
        return (
          <PlayerPortrait
            name={p.name}
            countryCode={p.countryCode}
            gender={p.gender}
            age={p.age}
            faceSeed={p.faceSeed}
            primaryColor={userClub.primaryColor}
            secondaryColor={userClub.secondaryColor}
            size={38}
          />
        );
      }
    }
    if (thread.targetType === 'STAFF' && thread.targetId) {
      const st = staff.find((s) => s.id === thread.targetId);
      if (st) {
        return (
          <PlayerPortrait
            name={st.name}
            countryCode={st.countryCode}
            age={41}
            faceSeed={st.faceSeed}
            primaryColor={userClub.primaryColor}
            secondaryColor={userClub.secondaryColor}
            size={38}
          />
        );
      }
    }
    return <ClubCrest club={userClub} size={38} className="shrink-0" />;
  };

  const activePromises = promises.filter((pr) => pr.status === 'ATIVA');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">VestiárioZap</h2>
          <p className="text-xs text-slate-400">
            Conversas em tempo real com elenco, capitão, comissão técnica e diretoria · Entrosamento{' '}
            <span className="font-mono font-bold text-emerald-400 tabular-nums">
              {userClub.cohesion ?? 74}%
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewPlayerPicker((v) => !v)}
          className="px-3.5 py-2 bg-[#121B28] hover:bg-[#182334] border border-white/10 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Chamar Atleta no Privado
        </button>
      </div>

      {showNewPlayerPicker && (
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-white">
            Escolha qualquer atleta do elenco para abrir conversa direta:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[210px] overflow-y-auto pr-1">
            {userClub.roster.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const id = onStartPlayerThread(p);
                  setActiveThreadId(id);
                  setShowNewPlayerPicker(false);
                }}
                className="p-2 bg-[#0B111A] hover:bg-[#182334] border border-white/10 rounded-lg flex items-center gap-2.5 text-left cursor-pointer"
              >
                <PlayerPortrait
                  name={p.name}
                  countryCode={p.countryCode}
                  gender={p.gender}
                  age={p.age}
                  faceSeed={p.faceSeed}
                  primaryColor={userClub.primaryColor}
                  secondaryColor={userClub.secondaryColor}
                  size={30}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {p.position} · OVR {p.overall} · Moral {p.morale}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePromises.length > 0 && (
        <div className="bg-[#121B28] border border-amber-400/25 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Promessas Ativas no Vestiário ({activePromises.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {activePromises.map((pr) => (
              <div
                key={pr.id}
                className="p-2.5 bg-[#0B111A] border border-white/10 rounded-lg flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{pr.summary}</div>
                  <div className="text-[11px] text-slate-400">Com: {pr.targetName}</div>
                </div>
                <span className="font-mono text-[11px] text-amber-400 shrink-0 tabular-nums">
                  Prazo: Dia {pr.dueDay}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Contacts / Threads */}
        <div className="lg:col-span-4 bg-[#121B28] border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
          <div className="px-4 py-3 border-b border-white/10 text-xs font-semibold text-slate-300">
            Conversas do Clube ({threads.length})
          </div>
          <div className="divide-y divide-white/8 overflow-y-auto flex-1">
            {threads.map((thread) => {
              const active = activeThread?.id === thread.id;
              const lastMsg = thread.messages[thread.messages.length - 1];
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    onClearError?.();
                    onSelectThread(thread.id);
                  }}
                  className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    active ? 'bg-[#182334]' : 'hover:bg-white/5'
                  }`}
                >
                  {resolveThreadAvatar(thread)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{thread.title}</span>
                      {thread.unread && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : thread.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat */}
        <div className="lg:col-span-8 bg-[#121B28] border border-white/10 rounded-xl flex flex-col h-[600px] overflow-hidden">
          {activeThread ? (
            <>
              <div className="px-5 py-3.5 border-b border-white/10 bg-[#0F1724] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {resolveThreadAvatar(activeThread)}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{activeThread.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{activeThread.subtitle}</div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" />
                  IA Vestiário
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#0B111A]">
                {activeThread.messages.map((m) => {
                  const isManager = m.senderType === 'MANAGER';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isManager ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs space-y-1 border ${
                          isManager
                            ? 'bg-emerald-500/15 border-emerald-400/30 text-slate-100'
                            : 'bg-[#121B28] border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                          <span className="font-semibold text-emerald-300">
                            {m.senderName} · {m.senderRole}
                          </span>
                          <span className="font-mono tabular-nums">Dia {m.day}</span>
                        </div>
                        <p className="leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="text-xs text-slate-400 italic">Digitando no vestiário...</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="px-4 py-2.5 bg-rose-500/10 border-t border-rose-400/30 text-xs text-rose-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="truncate">{error}</span>
                  </div>
                  {onRetryLastMessage &&
                    activeThread.messages.some((m) => m.senderType === 'MANAGER') && (
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => onRetryLastMessage(activeThread.id)}
                        className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 rounded text-[11px] font-semibold text-white whitespace-nowrap cursor-pointer shrink-0"
                      >
                        Tentar novamente
                      </button>
                    )}
                </div>
              )}

              <div className="px-4 pt-2.5 pb-2 border-t border-white/10 bg-[#0F1724] flex flex-wrap gap-1.5">
                {QUICK_PROMPTS[activeThread.targetType].map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    disabled={sending}
                    onClick={() => setDraft(qp)}
                    className="px-2.5 py-1 bg-[#121B28] hover:bg-[#182334] border border-white/10 rounded-md text-[11px] text-slate-300 hover:text-white transition-colors truncate max-w-[260px] cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-3.5 border-t border-white/10 bg-[#0F1724] flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (error) onClearError?.();
                  }}
                  disabled={sending}
                  placeholder="Escreva uma mensagem para o vestiário..."
                  className="flex-1 px-3.5 py-2.5 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Selecione uma conversa ao lado para iniciar.
            </div>
          )}
        </div>
      </div>

      {promises.some((p) => p.status !== 'ATIVA') && (
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
          <div className="font-bold text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Histórico de Promessas
          </div>
          <div className="divide-y divide-white/8">
            {promises
              .filter((p) => p.status !== 'ATIVA')
              .slice(0, 5)
              .map((pr) => (
                <div key={pr.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-slate-300">
                    {pr.summary} ({pr.targetName})
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      pr.status === 'CUMPRIDA' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pr.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
