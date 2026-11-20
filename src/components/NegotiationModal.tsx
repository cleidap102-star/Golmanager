import React, { useMemo, useState } from 'react';
import { Check, Handshake, RefreshCw, X } from 'lucide-react';
import { Player } from '../types/game';
import { formatCompactBRL, getPositionLabel } from '../utils/format';

export type NegotiationMode = 'BUY_CLUB' | 'FREE_AGENT' | 'RENEW';

export interface NegotiationTerms {
  transferFee: number;
  sellOnClausePct: number;
  salary: number;
  contractYears: number;
}

interface NegotiationModalProps {
  mode: NegotiationMode;
  player: Player;
  sellerLabel?: string;
  userCash: number;
  onClose: () => void;
  onAccept: (terms: NegotiationTerms) => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  mode,
  player,
  sellerLabel,
  userCash,
  onClose,
  onAccept,
}) => {
  const baselineFee = useMemo(() => {
    if (mode === 'BUY_CLUB') return player.marketValue;
    if (mode === 'FREE_AGENT') return Math.round(player.salary * 2);
    return Math.round(player.salary * 1.2); // luvas de renovação
  }, [mode, player.marketValue, player.salary]);

  const targetSalary = useMemo(() => {
    if (mode === 'RENEW') return Math.round(player.salary * 1.12);
    return Math.round(player.salary * 1.05);
  }, [mode, player.salary]);

  const [fee, setFee] = useState<number>(baselineFee);
  const [sellOnPct, setSellOnPct] = useState<number>(mode === 'BUY_CLUB' ? 10 : 0);
  const [salary, setSalary] = useState<number>(targetSalary);
  const [years, setYears] = useState<number>(player.age >= 31 ? 2 : 3);
  const [round, setRound] = useState<number>(1);
  const [status, setStatus] = useState<'IDLE' | 'COUNTER' | 'ACCEPTED' | 'REJECTED'>('IDLE');
  const [feedback, setFeedback] = useState<string>(
    mode === 'BUY_CLUB'
      ? `Defina o valor da transferência, percentual de revenda futura e termos salariais para fechar com ${player.name}.`
      : mode === 'FREE_AGENT'
        ? `Atleta livre no mercado. Negocie luvas de assinatura, salário mensal e tempo de contrato.`
        : `O empresário de ${player.name} aguarda uma proposta de valorização para estender o vínculo.`,
  );
  const [counterTerms, setCounterTerms] = useState<NegotiationTerms | null>(null);

  const minFeeStep = mode === 'BUY_CLUB' ? Math.max(100_000, Math.round(baselineFee * 0.5)) : 0;
  const maxFeeStep =
    mode === 'BUY_CLUB'
      ? Math.max(1_000_000, Math.round(baselineFee * 1.6))
      : Math.max(250_000, Math.round(baselineFee * 2.5));

  const minSalary = Math.max(25_000, Math.round(player.salary * 0.75));
  const maxSalary = Math.max(120_000, Math.round(player.salary * 1.8));

  const evaluateOffer = () => {
    if (fee > userCash) {
      setStatus('COUNTER');
      setFeedback('Saldo em caixa insuficiente para o valor ofertado. Reduza a parcela à vista ou use cláusula de revenda.');
      return;
    }

    // Score offer vs expectations
    const effectiveFee =
      mode === 'BUY_CLUB' ? fee * (1 + sellOnPct * 0.011) : fee;
    const feeRatio = baselineFee > 0 ? effectiveFee / baselineFee : 1;
    const salRatio = targetSalary > 0 ? salary / targetSalary : 1;
    const yearsPenalty = player.age >= 32 && years >= 4 ? -0.06 : 0;
    const composite = feeRatio * 0.62 + salRatio * 0.38 + yearsPenalty;

    if (composite >= 0.96) {
      setStatus('ACCEPTED');
      setCounterTerms(null);
      setFeedback(
        mode === 'BUY_CLUB'
          ? `Proposta aceita por ${sellerLabel || 'clube vendedor'} e pelo estafe de ${player.name}!`
          : `Acordo selado! ${player.name} aceitou os termos apresentados.`,
      );
      return;
    }

    if (round >= 3 || composite < 0.68) {
      setStatus('REJECTED');
      setCounterTerms(null);
      setFeedback(
        composite < 0.68
          ? 'Proposta considerada muito abaixo do valor de mercado. O estafe encerrou as conversas.'
          : 'Limite de rodadas atingido sem acordo. Tente novamente após reavaliar o orçamento.',
      );
      return;
    }

    const askedFee =
      mode === 'BUY_CLUB'
        ? Math.round(Math.max(fee, baselineFee * (1.03 - sellOnPct * 0.008)) / 50_000) * 50_000
        : Math.round(Math.max(fee, baselineFee * 0.95) / 10_000) * 10_000;
    const askedSalary = Math.round(Math.max(salary, targetSalary * 1.02) / 5_000) * 5_000;
    const askedYears = player.age >= 32 ? Math.min(2, years) : Math.max(2, years);

    setRound((r) => r + 1);
    setStatus('COUNTER');
    setCounterTerms({
      transferFee: askedFee,
      sellOnClausePct: sellOnPct,
      salary: askedSalary,
      contractYears: askedYears,
    });
    setFeedback(
      `Contraproposta (Rodada ${round}/3): pedem ${formatCompactBRL(askedFee)} ${
        mode === 'BUY_CLUB' ? `(+${sellOnPct}% revenda)` : 'de luvas'
      } e salário de ${formatCompactBRL(askedSalary)}/mês por ${askedYears} ano(s).`,
    );
  };

  const applyCounterAndAccept = () => {
    if (!counterTerms || counterTerms.transferFee > userCash) return;
    onAccept(counterTerms);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-xl w-full p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-medium text-emerald-400">
              {mode === 'BUY_CLUB'
                ? `Negociação de Transferência · ${sellerLabel || 'Clube'}`
                : mode === 'FREE_AGENT'
                  ? 'Negociação com Jogador Livre'
                  : 'Renovação de Contrato'}
            </div>
            <h3 className="font-display text-2xl font-bold text-white mt-0.5">
              {player.name}
            </h3>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {getPositionLabel(player.position)} · {player.nationality} · {player.age} anos · OVR{' '}
              {player.overall} / POT {player.potential}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs bg-[#0B111A] border border-white/10 rounded-lg p-3.5">
          <div>
            <div className="text-slate-400">Valor de Mercado</div>
            <div className="font-mono font-bold text-white tabular-nums mt-0.5">
              {formatCompactBRL(player.marketValue)}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Salário Atual</div>
            <div className="font-mono font-bold text-white tabular-nums mt-0.5">
              {formatCompactBRL(player.salary)}/mês
            </div>
          </div>
          <div>
            <div className="text-slate-400">Seu Caixa</div>
            <div
              className={`font-mono font-bold tabular-nums mt-0.5 ${
                userCash >= fee ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCompactBRL(userCash)}
            </div>
          </div>
        </div>

        {/* Offer Sliders */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">
                {mode === 'BUY_CLUB' ? 'Valor da Transferência' : 'Luvas de Assinatura'}
              </span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {formatCompactBRL(fee)}
              </span>
            </div>
            <input
              type="range"
              min={minFeeStep}
              max={maxFeeStep}
              step={mode === 'BUY_CLUB' ? 100_000 : 10_000}
              value={fee}
              disabled={status === 'ACCEPTED' || status === 'REJECTED'}
              onChange={(e) => setFee(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {mode === 'BUY_CLUB' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">
                  Cláusula de Revenda Futura (reduz preço à vista)
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{sellOnPct}%</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 5, 10, 15, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={status === 'ACCEPTED' || status === 'REJECTED'}
                    onClick={() => setSellOnPct(pct)}
                    className={`py-1.5 rounded-md font-mono font-semibold border transition-colors cursor-pointer ${
                      sellOnPct === pct
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-[#0B111A] text-slate-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Salário Mensal Proposto</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {formatCompactBRL(salary)}/mês
              </span>
            </div>
            <input
              type="range"
              min={minSalary}
              max={maxSalary}
              step={5_000}
              value={salary}
              disabled={status === 'ACCEPTED' || status === 'REJECTED'}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Duração do Contrato</span>
              <span className="font-mono font-bold text-white tabular-nums">{years} ano(s)</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((y) => (
                <button
                  key={y}
                  type="button"
                  disabled={status === 'ACCEPTED' || status === 'REJECTED'}
                  onClick={() => setYears(y)}
                  className={`py-1.5 rounded-md font-mono font-semibold border transition-colors cursor-pointer ${
                    years === y
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-[#0B111A] text-slate-300 border-white/10 hover:border-white/25'
                  }`}
                >
                  {y}A
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback Box */}
        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
            status === 'ACCEPTED'
              ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
              : status === 'REJECTED'
                ? 'bg-rose-500/10 border-rose-400/30 text-rose-200'
                : status === 'COUNTER'
                  ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                  : 'bg-[#0B111A] border-white/10 text-slate-300'
          }`}
        >
          {feedback}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#182334] hover:bg-[#1E2C42] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            {status === 'REJECTED' ? 'Fechar' : 'Cancelar'}
          </button>

          {counterTerms && status === 'COUNTER' && (
            <button
              type="button"
              disabled={counterTerms.transferFee > userCash}
              onClick={applyCounterAndAccept}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Aceitar Contraproposta
            </button>
          )}

          {status === 'ACCEPTED' ? (
            <button
              type="button"
              onClick={() =>
                onAccept({
                  transferFee: fee,
                  sellOnClausePct: sellOnPct,
                  salary,
                  contractYears: years,
                })
              }
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Assinar Contrato Agora
            </button>
          ) : (
            status !== 'REJECTED' && (
              <button
                type="button"
                disabled={fee > userCash}
                onClick={evaluateOffer}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Handshake className="w-4 h-4" />
                Enviar Proposta ({round}/3)
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
