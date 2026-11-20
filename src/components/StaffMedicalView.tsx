import React, { useState } from 'react';
import { Activity, CalendarDays, HeartPulse, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { computeInjuryRisk, DEFAULT_WEEKLY_TRAINING } from '../data/clubs';
import {
  Club,
  GameState,
  Player,
  StaffMember,
  StaffRole,
  TrainingFocus,
  TrainingIntensity,
  WeeklyTrainingSlot,
} from '../types/game';
import { formatCompactBRL } from '../utils/format';
import { PlayerPortrait } from './PlayerPortrait';

interface StaffMedicalViewProps {
  state: GameState;
  userClub: Club;
  onHireStaff: (staff: StaffMember) => void;
  onUpdateWeeklyTraining: (slots: WeeklyTrainingSlot[]) => void;
  onUpdatePlayerFocus: (playerId: string, focus: TrainingFocus | undefined) => void;
}

type SubTab = 'COMISSAO' | 'TREINOS' | 'DM';

const ROLE_LABELS: Record<StaffRole, string> = {
  AUXILIAR: 'Auxiliar Técnico',
  PREPARADOR: 'Preparador Físico',
  MEDICO: 'Médico Chefe',
  OLHEIRO_CHEFE: 'Chefe de Scout',
};

const FOCUS_OPTIONS: Array<{ value: TrainingFocus; label: string }> = [
  { value: 'EQUILIBRADO', label: 'Equilibrado' },
  { value: 'FISICO', label: 'Físico' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'TATICO', label: 'Tático' },
  { value: 'FINALIZACAO', label: 'Finalização' },
  { value: 'RECUPERACAO', label: 'Recuperação' },
];

const INTENSITY_OPTIONS: Array<{ value: TrainingIntensity; label: string }> = [
  { value: 'LEVE', label: 'Leve' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'INTENSO', label: 'Intenso' },
];

export const StaffMedicalView: React.FC<StaffMedicalViewProps> = ({
  state,
  userClub,
  onHireStaff,
  onUpdateWeeklyTraining,
  onUpdatePlayerFocus,
}) => {
  const [tab, setTab] = useState<SubTab>('COMISSAO');
  const staff = state.staff || [];
  const availableStaff = state.availableStaff || [];
  const weeklyTraining = state.weeklyTraining || DEFAULT_WEEKLY_TRAINING;
  const doctorOvr = staff.find((s) => s.role === 'MEDICO')?.overall || 70;

  const rosterRiskSorted = [...userClub.roster]
    .map((player) => ({
      player,
      risk: computeInjuryRisk(player, userClub.medicalLevel, doctorOvr),
    }))
    .sort((a, b) => {
      if (a.player.injuredDays !== b.player.injuredDays) {
        return b.player.injuredDays - a.player.injuredDays;
      }
      return b.risk.score - a.risk.score;
    });

  const injuredPlayers = rosterRiskSorted.filter((item) => item.player.injuredDays > 0);
  const highRiskCount = rosterRiskSorted.filter(
    (item) => item.risk.level === 'ALTO' || item.risk.level === 'CRITICO',
  ).length;

  const handleSlotChange = (
    dayIndex: number,
    patch: Partial<Pick<WeeklyTrainingSlot, 'focus' | 'intensity'>>,
  ) => {
    const next = weeklyTraining.map((slot) =>
      slot.dayIndex === dayIndex ? { ...slot, ...patch } : slot,
    );
    onUpdateWeeklyTraining(next);
  };

  const renderRiskColor = (level: 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO') => {
    if (level === 'CRITICO') return 'text-rose-400 font-bold';
    if (level === 'ALTO') return 'text-amber-400 font-bold';
    if (level === 'MODERADO') return 'text-sky-300';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">
            Comissão Técnica, Treinos & DM
          </h2>
          <p className="text-xs text-slate-400">
            Contrate especialistas, monte a agenda semanal (Seg–Dom) e previna lesões musculares
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#121B28] rounded-lg border border-white/10">
          {(
            [
              { id: 'COMISSAO', label: 'Comissão Técnica' },
              { id: 'TREINOS', label: 'Agenda Semanal & Individual' },
              { id: 'DM', label: `Departamento Médico (${injuredPlayers.length} DM)` },
            ] as Array<{ id: SubTab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === item.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: COACHING STAFF */}
      {tab === 'COMISSAO' && (
        <div className="space-y-6">
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">Sua Comissão Atual</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-[#0B111A] border border-white/10 rounded-xl space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <PlayerPortrait
                      name={member.name}
                      countryCode={member.countryCode}
                      age={42}
                      faceSeed={member.faceSeed}
                      primaryColor={userClub.primaryColor}
                      secondaryColor={userClub.secondaryColor}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-emerald-400">
                        {ROLE_LABELS[member.role]}
                      </div>
                      <div className="text-sm font-bold text-white truncate">{member.name}</div>
                      <div className="text-[11px] text-slate-400">{member.nationality}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 truncate">{member.specialty}</span>
                    <span className="font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                      OVR {member.overall}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Salário: {formatCompactBRL(member.salary)}/mês
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Mercado de Profissionais
              </h3>
              <p className="text-xs text-slate-400">
                Substitua qualquer cargo contratando especialistas com OVR mais alto para acelerar
                evolução, recuperação médica e entrosamento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableStaff.map((cand) => {
                const currentInRole = staff.find((s) => s.role === cand.role);
                const canAfford = userClub.cash >= cand.hireCost;
                return (
                  <div
                    key={cand.id}
                    className="p-4 bg-[#0B111A] border border-white/10 rounded-xl flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerPortrait
                        name={cand.name}
                        countryCode={cand.countryCode}
                        age={44}
                        faceSeed={cand.faceSeed}
                        primaryColor={userClub.primaryColor}
                        secondaryColor={userClub.secondaryColor}
                        size={42}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          {ROLE_LABELS[cand.role]}
                        </div>
                        <div className="text-sm font-bold text-white truncate">{cand.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cand.nationality} · {cand.specialty}
                        </div>
                      </div>
                      <div className="font-mono text-base font-bold text-emerald-400 tabular-nums shrink-0">
                        {cand.overall}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                      <span>
                        Atual: {currentInRole ? `${currentInRole.overall} OVR` : 'Vago'}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatCompactBRL(cand.salary)}/mês
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onHireStaff(cand)}
                      className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Contratar ({formatCompactBRL(cand.hireCost)})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY TRAINING SCHEDULE + INDIVIDUAL PLAYER FOCUS */}
      {tab === 'TREINOS' && (
        <div className="space-y-6">
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Agenda Semanal de Treinos (Seg–Dom)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Cada dia avançado executa automaticamente o plano configurado abaixo. Treinos intensos
              evoluem atributos mais rápido, mas elevam o risco de lesão muscular.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {weeklyTraining.map((slot) => (
                <div
                  key={slot.dayIndex}
                  className="p-3 bg-[#0B111A] border border-white/10 rounded-xl space-y-2.5 text-xs"
                >
                  <div className="font-display text-base font-bold text-white">{slot.dayLabel}</div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Foco</label>
                    <select
                      value={slot.focus}
                      onChange={(e) =>
                        handleSlotChange(slot.dayIndex, { focus: e.target.value as TrainingFocus })
                      }
                      className="w-full px-2 py-1.5 bg-[#121B28] border border-white/15 rounded-md text-xs text-white focus:outline-none focus:border-emerald-400"
                    >
                      {FOCUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Carga</label>
                    <select
                      value={slot.intensity}
                      onChange={(e) =>
                        handleSlotChange(slot.dayIndex, {
                          intensity: e.target.value as TrainingIntensity,
                        })
                      }
                      className="w-full px-2 py-1.5 bg-[#121B28] border border-white/15 rounded-md text-xs text-white focus:outline-none focus:border-emerald-400"
                    >
                      {INTENSITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Foco Individual por Atleta
              </h3>
            </div>
            <div className="divide-y divide-white/8 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {userClub.roster.map((p: Player) => (
                <div
                  key={p.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerPortrait
                      name={p.name}
                      countryCode={p.countryCode}
                      gender={p.gender}
                      age={p.age}
                      faceSeed={p.faceSeed}
                      primaryColor={userClub.primaryColor}
                      secondaryColor={userClub.secondaryColor}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {p.position} · OVR {p.overall} / POT {p.potential} · Fadiga {p.fatigue}%
                      </div>
                    </div>
                  </div>
                  <select
                    value={p.individualFocus || ''}
                    onChange={(e) =>
                      onUpdatePlayerFocus(
                        p.id,
                        e.target.value ? (e.target.value as TrainingFocus) : undefined,
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">Seguir Agenda do Time</option>
                    {FOCUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        Individual: {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEDICAL DEPARTMENT & INJURY RISK */}
      {tab === 'DM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Nível do DM & Médico</div>
              <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                Nível {userClub.medicalLevel}/5 · OVR {doctorOvr}
              </div>
            </div>
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Atletas no DM</div>
              <div className="font-mono text-2xl font-bold text-rose-400 tabular-nums mt-1">
                {injuredPlayers.length}
              </div>
            </div>
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Alerta de Risco Alto/Crítico</div>
              <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums mt-1">
                {highRiskCount} atletas
              </div>
            </div>
          </div>

          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <h3 className="font-display text-xl font-bold text-white">
                Mapa de Risco de Lesão e Recuperação
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 pr-3 font-medium">Atleta</th>
                    <th className="py-2.5 pr-3 font-medium">Pos</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Idade</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Fadiga</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Status DM</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Risco de Lesão</th>
                    <th className="py-2.5 font-medium text-right">Prevenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {rosterRiskSorted.map(({ player: p, risk }) => {
                    const inRecovery = p.individualFocus === 'RECUPERACAO';
                    return (
                      <tr key={p.id} className="hover:bg-white/5">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
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
                            <span className="font-semibold text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">{p.position}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                          {p.age}
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-mono tabular-nums ${
                            p.fatigue > 70
                              ? 'text-rose-400'
                              : p.fatigue > 45
                                ? 'text-amber-400'
                                : 'text-slate-300'
                          }`}
                        >
                          {p.fatigue}%
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                          {p.injuredDays > 0 ? (
                            <span className="text-rose-400 font-bold">
                              Lesionado ({p.injuredDays}d)
                            </span>
                          ) : (
                            <span className="text-slate-400">Apto</span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-mono tabular-nums ${renderRiskColor(risk.level)}`}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            {(risk.level === 'ALTO' || risk.level === 'CRITICO') && (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            )}
                            {risk.level} ({risk.score}%)
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePlayerFocus(p.id, inRecovery ? undefined : 'RECUPERACAO')
                            }
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                              inRecovery
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-[#0B111A] hover:bg-[#182334] text-slate-300 border border-white/10'
                            }`}
                          >
                            {inRecovery ? 'Em Recuperação' : 'Enviar p/ Recuperação'}
                          </button>
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
