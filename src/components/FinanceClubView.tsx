import React, { useState } from 'react';
import { ArrowUpCircle, Award, Handshake, Shirt, Trophy, Wallet } from 'lucide-react';
import {
  BoardRequestType,
  Club,
  GameState,
  KitConfig,
  KitPattern,
  SponsorDeal,
} from '../types/game';
import { formatCompactBRL } from '../utils/format';
import { JerseySvg } from './JerseySvg';

interface FinanceClubViewProps {
  state: GameState;
  userClub: Club;
  onSignSponsor: (sponsor: SponsorDeal) => void;
  onUpgradeFacility: (type: 'STADIUM' | 'TRAINING' | 'MEDICAL') => void;
  onUpdateKit: (slot: 'HOME' | 'AWAY', kit: KitConfig) => void;
  onBoardRequest: (type: BoardRequestType) => void;
}

const BOARD_REQUEST_OPTIONS: Array<{
  type: BoardRequestType;
  label: string;
  desc: string;
}> = [
  {
    type: 'TRANSFER_BUDGET',
    label: 'Aumento de Verba de Transferências',
    desc: 'Solicita +R$ 6M à diretoria para reforçar o elenco na janela.',
  },
  {
    type: 'WAGE_BUDGET',
    label: 'Fôlego na Folha Salarial',
    desc: 'Solicita aporte de +R$ 2.5M para renovações e salários.',
  },
  {
    type: 'FACILITY_UPGRADE',
    label: 'Subsídio de Infraestrutura (CT)',
    desc: 'Pede à presidência o custeio parcial de melhoria no CT ou DM.',
  },
  {
    type: 'LOWER_PRESSURE',
    label: 'Alinhar Meta & Reduzir Pressão',
    desc: 'Pede mais paciência à diretoria caso o clube esteja em reconstrução.',
  },
];

export const FinanceClubView: React.FC<FinanceClubViewProps> = ({
  state,
  userClub,
  onSignSponsor,
  onUpgradeFacility,
  onUpdateKit,
  onBoardRequest,
}) => {
  const [kitSlot, setKitSlot] = useState<'HOME' | 'AWAY'>('HOME');

  const weeklyPayroll = Math.round(userClub.roster.reduce((s, p) => s + p.salary, 0) / 4);
  const weeklySponsors = userClub.activeSponsors.reduce((s, sp) => s + sp.weeklyIncome, 0);

  const activeKit = kitSlot === 'HOME' ? userClub.homeKit : userClub.awayKit;

  const stadiumUpgradeCost = userClub.stadiumLevel * 4500000;
  const trainingUpgradeCost = userClub.trainingLevel * 2800000;
  const medicalUpgradeCost = userClub.medicalLevel * 2200000;

  const boardRequests = state.boardRequests || [];
  const trophies = state.trophies || [];
  const lastRequestDay = boardRequests[0]?.day ?? -99;
  const cooldownRemaining = Math.max(0, 12 - (state.currentDay - lastRequestDay));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-white">
          Finanças, Diretoria, Troféus & Kits
        </h2>
        <p className="text-xs text-slate-400">
          Equilibre folha salarial, faça pedidos à diretoria, consulte a sala de troféus e
          personalize os uniformes da temporada
        </p>
      </div>

      {/* Top Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Saldo em Caixa</div>
          <div
            className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
              userClub.cash >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCompactBRL(userClub.cash)}
          </div>
        </div>
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Receita Semanal (Patrocínios)</div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums mt-1">
            +{formatCompactBRL(weeklySponsors)}
          </div>
        </div>
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
          <div className="text-xs text-slate-400">Folha Salarial Semanal</div>
          <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums mt-1">
            -{formatCompactBRL(weeklyPayroll)}
          </div>
        </div>
      </div>

      {/* Sponsors & Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display text-xl font-bold text-white">Patrocínios Disponíveis</h3>
          </div>

          <div className="space-y-3">
            {state.availableSponsors.map((sp) => {
              const isActive = userClub.activeSponsors.some((a) => a.id === sp.id);
              return (
                <div
                  key={sp.id}
                  className="p-4 bg-[#0B111A] border border-white/10 rounded-lg flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      {sp.name} ·{' '}
                      <span className="text-xs font-normal text-emerald-400">{sp.slot}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {sp.sector} · Fixo {formatCompactBRL(sp.weeklyIncome)}/sem · Vitória +
                      {formatCompactBRL(sp.winBonus)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isActive}
                    onClick={() => onSignSponsor(sp)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer'
                    }`}
                  >
                    {isActive ? 'Contrato Ativo' : 'Assinar Contrato'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-white">
            Estádio e Infraestrutura ({userClub.stadiumName})
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-[#0B111A] border border-white/10 rounded-lg flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">
                  Estádio · Nível {userClub.stadiumLevel}/5
                </div>
                <div className="text-slate-400 mt-0.5 tabular-nums">
                  Capacidade atual: {userClub.stadiumCapacity.toLocaleString('pt-BR')} lugares ·
                  Aumenta bilheteria em +7.500 lugares
                </div>
              </div>
              <button
                type="button"
                disabled={userClub.stadiumLevel >= 5 || userClub.cash < stadiumUpgradeCost}
                onClick={() => onUpgradeFacility('STADIUM')}
                className="px-3.5 py-2 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 border border-white/10 rounded-lg text-white font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                {userClub.stadiumLevel >= 5 ? 'Máximo' : formatCompactBRL(stadiumUpgradeCost)}
              </button>
            </div>

            <div className="p-4 bg-[#0B111A] border border-white/10 rounded-lg flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">
                  Centro de Treinamento · Nível {userClub.trainingLevel}/5
                </div>
                <div className="text-slate-400 mt-0.5">
                  Acelera a evolução dos atributos e jovens talentos nos treinos diários
                </div>
              </div>
              <button
                type="button"
                disabled={userClub.trainingLevel >= 5 || userClub.cash < trainingUpgradeCost}
                onClick={() => onUpgradeFacility('TRAINING')}
                className="px-3.5 py-2 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 border border-white/10 rounded-lg text-white font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                {userClub.trainingLevel >= 5 ? 'Máximo' : formatCompactBRL(trainingUpgradeCost)}
              </button>
            </div>

            <div className="p-4 bg-[#0B111A] border border-white/10 rounded-lg flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">
                  Departamento Médico · Nível {userClub.medicalLevel}/5
                </div>
                <div className="text-slate-400 mt-0.5">
                  Acelera recuperação muscular e reduz risco de lesão entre rodadas
                </div>
              </div>
              <button
                type="button"
                disabled={userClub.medicalLevel >= 5 || userClub.cash < medicalUpgradeCost}
                onClick={() => onUpgradeFacility('MEDICAL')}
                className="px-3.5 py-2 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 border border-white/10 rounded-lg text-white font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                {userClub.medicalLevel >= 5 ? 'Máximo' : formatCompactBRL(medicalUpgradeCost)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Requests + Trophy Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">Pedidos à Diretoria</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Confiança: {userClub.boardConfidence}%
              {cooldownRemaining > 0 ? ` · Aguarde ${cooldownRemaining}d` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {BOARD_REQUEST_OPTIONS.map((opt) => (
              <div
                key={opt.type}
                className="p-3.5 bg-[#0B111A] border border-white/10 rounded-lg flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-white">{opt.label}</div>
                  <p className="text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
                <button
                  type="button"
                  disabled={cooldownRemaining > 0}
                  onClick={() => onBoardRequest(opt.type)}
                  className="w-full py-2 px-3 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 border border-white/10 rounded-lg font-semibold text-white transition-colors cursor-pointer"
                >
                  {cooldownRemaining > 0 ? `Disponível em ${cooldownRemaining}d` : 'Solicitar'}
                </button>
              </div>
            ))}
          </div>

          {boardRequests.length > 0 && (
            <div className="pt-2 border-t border-white/10 divide-y divide-white/8 max-h-[160px] overflow-y-auto text-xs">
              {boardRequests.slice(0, 6).map((req) => (
                <div key={req.id} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">
                      Dia {req.day} · {req.label}
                    </div>
                    <div className="text-slate-400">{req.responseText}</div>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      req.approved ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {req.approved ? 'Aprovado' : 'Recusado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sala de Troféus */}
        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-xl font-bold text-white">Sala de Troféus</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {trophies.length} conquista(s) na carreira
            </span>
          </div>

          {trophies.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-xs text-slate-400 bg-[#0B111A] border border-dashed border-white/10 rounded-lg">
              <Award className="w-6 h-6 text-slate-500 mx-auto" />
              <p>A galeria ainda aguarda sua primeira taça oficial nesta carreira.</p>
              <p>Conquiste Ligas, Copas Nacionais, Continentais ou o Mundial para exibi-las aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[290px] overflow-y-auto pr-1">
              {trophies.map((tr) => (
                <div
                  key={tr.id}
                  className="p-3.5 bg-[#0B111A] border border-amber-400/30 rounded-lg flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{tr.title}</div>
                    <div className="text-[11px] text-amber-300 truncate">{tr.competition}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Temp. {tr.season} · {tr.clubName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kit / Jersey Customizer + Financial Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Estúdio de Kits e Camisas
              </h3>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setKitSlot('HOME')}
                className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                  kitSlot === 'HOME' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Uniforme 1
              </button>
              <button
                type="button"
                onClick={() => setKitSlot('AWAY')}
                className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                  kitSlot === 'AWAY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Uniforme 2
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="p-4 bg-[#0B111A] border border-white/10 rounded-xl shrink-0">
              <JerseySvg
                kit={activeKit}
                size={132}
                label={kitSlot === 'HOME' ? 'Camisa Titular' : 'Camisa Reserva'}
              />
            </div>

            <div className="flex-1 w-full space-y-4 text-xs">
              <div>
                <div className="text-slate-400 mb-1.5">Desenho da Camisa</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'LISO', label: 'Lisa' },
                      { id: 'LISTRADO', label: 'Listrada' },
                      { id: 'FAIXA', label: 'Faixa Horizontal' },
                      { id: 'METADE', label: 'Meio a Meio' },
                    ] as Array<{ id: KitPattern; label: string }>
                  ).map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => onUpdateKit(kitSlot, { ...activeKit, pattern: pt.id })}
                      className={`py-2 px-3 rounded-lg border font-semibold cursor-pointer transition-colors ${
                        activeKit.pattern === pt.id
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                          : 'bg-[#0B111A] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="space-y-1 block">
                  <span className="text-slate-400 block">Principal</span>
                  <input
                    type="color"
                    value={activeKit.primary}
                    onChange={(e) => onUpdateKit(kitSlot, { ...activeKit, primary: e.target.value })}
                    className="w-full h-9 rounded bg-transparent cursor-pointer"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-slate-400 block">Secundária</span>
                  <input
                    type="color"
                    value={activeKit.secondary}
                    onChange={(e) =>
                      onUpdateKit(kitSlot, { ...activeKit, secondary: e.target.value })
                    }
                    className="w-full h-9 rounded bg-transparent cursor-pointer"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-slate-400 block">Gola / Detalhe</span>
                  <input
                    type="color"
                    value={activeKit.accent}
                    onChange={(e) => onUpdateKit(kitSlot, { ...activeKit, accent: e.target.value })}
                    className="w-full h-9 rounded bg-transparent cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Ledger */}
        <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="font-display text-xl font-bold text-white">Extrato Financeiro</h3>
          {state.financeLedger.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Nenhuma movimentação registrada ainda. Avance os dias ou dispute a primeira partida.
            </div>
          ) : (
            <div className="divide-y divide-white/8 max-h-[290px] overflow-y-auto pr-1 text-xs">
              {state.financeLedger.map((entry) => (
                <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{entry.category}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Dia {entry.day} · {entry.description}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold tabular-nums shrink-0 ${
                      entry.type === 'RECEITA' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {entry.type === 'RECEITA' ? '+' : '-'}
                    {formatCompactBRL(entry.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
