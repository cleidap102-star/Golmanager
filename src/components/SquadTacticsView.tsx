import React, { useRef, useState } from 'react';
import { ArrowLeftRight, Move, RefreshCw, Search, ShieldAlert, Sparkles, X } from 'lucide-react';
import { computeInjuryRisk, FORMATION_COORDS, pickBestStarters } from '../data/clubs';
import {
  Club,
  FormationId,
  Mentality,
  PitchSlotCoord,
  Player,
  Position,
  PressingStyle,
  PassingStyle,
  TrainingFocus,
} from '../types/game';
import { formatCompactBRL, getPositionLabel } from '../utils/format';
import { PlayerPortrait } from './PlayerPortrait';

interface SquadTacticsViewProps {
  club: Club;
  doctorOverall?: number;
  onUpdateClub: (updated: Club) => void;
  onSellPlayer: (player: Player) => void;
  onNegotiateRenew: (player: Player) => void;
}

const FORMATIONS: FormationId[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-1-4-1', 'PERSONALIZADA'];
const POSITIONS_FILTER: Array<Position | 'TODOS'> = ['TODOS', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
const SLOT_POSITIONS: Position[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

export const SquadTacticsView: React.FC<SquadTacticsViewProps> = ({
  club,
  doctorOverall = 70,
  onUpdateClub,
  onSellPlayer,
  onNegotiateRenew,
}) => {
  const [selectedStarterSlot, setSelectedStarterSlot] = useState<number | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);
  const [editCustomMode, setEditCustomMode] = useState(false);
  const [dragPayload, setDragPayload] = useState<
    { source: 'PITCH'; slotIdx: number } | { source: 'BENCH'; playerId: string } | null
  >(null);
  const [posFilter, setPosFilter] = useState<Position | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const coords: PitchSlotCoord[] =
    club.tactics.formation === 'PERSONALIZADA' && club.tactics.customCoords?.length === 11
      ? club.tactics.customCoords
      : FORMATION_COORDS[club.tactics.formation];

  const starterIds = club.tactics.starterIds;
  const starters = starterIds.map((id) => club.roster.find((p) => p.id === id) || null);
  const bench = club.roster.filter((p) => !starterIds.includes(p.id));

  const handleFormationChange = (formation: FormationId) => {
    const baseCoords =
      formation === 'PERSONALIZADA'
        ? club.tactics.customCoords?.length === 11
          ? club.tactics.customCoords
          : coords.map((c) => ({ ...c }))
        : club.tactics.customCoords;
    onUpdateClub({
      ...club,
      tactics: {
        ...club.tactics,
        formation,
        customCoords: baseCoords,
      },
    });
    if (formation !== 'PERSONALIZADA') {
      setEditCustomMode(false);
    }
    setSelectedStarterSlot(null);
    setSelectedBenchPlayerId(null);
  };

  const handleAutoPick = () => {
    const best = pickBestStarters(club.roster, club.tactics.formation, club.tactics.customCoords);
    onUpdateClub({
      ...club,
      tactics: {
        ...club.tactics,
        starterIds: best,
      },
    });
    setSelectedStarterSlot(null);
    setSelectedBenchPlayerId(null);
  };

  const swapStarterSlots = (slotA: number, slotB: number) => {
    const next = [...starterIds];
    const tmp = next[slotA];
    next[slotA] = next[slotB];
    next[slotB] = tmp;
    onUpdateClub({
      ...club,
      tactics: { ...club.tactics, starterIds: next },
    });
  };

  const replaceStarterWithBench = (slotIndex: number, benchPlayerId: string) => {
    const p = club.roster.find((pl) => pl.id === benchPlayerId);
    if (!p || p.injuredDays > 0) return;
    const next = [...starterIds];
    next[slotIndex] = benchPlayerId;
    onUpdateClub({
      ...club,
      tactics: { ...club.tactics, starterIds: next },
    });
  };

  const handlePitchSlotClick = (slotIdx: number) => {
    if (editCustomMode && club.tactics.formation === 'PERSONALIZADA') {
      setSelectedStarterSlot((prev) => (prev === slotIdx ? null : slotIdx));
      return;
    }
    if (selectedBenchPlayerId) {
      replaceStarterWithBench(slotIdx, selectedBenchPlayerId);
      setSelectedBenchPlayerId(null);
      setSelectedStarterSlot(null);
      return;
    }
    if (selectedStarterSlot === null) {
      setSelectedStarterSlot(slotIdx);
      return;
    }
    if (selectedStarterSlot === slotIdx) {
      setSelectedStarterSlot(null);
      return;
    }
    swapStarterSlots(selectedStarterSlot, slotIdx);
    setSelectedStarterSlot(null);
  };

  const handlePitchSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editCustomMode || club.tactics.formation !== 'PERSONALIZADA' || selectedStarterSlot === null) {
      return;
    }
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const xPct = Math.round(Math.min(92, Math.max(8, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.min(92, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100)));
    const nextCoords = coords.map((c, idx) =>
      idx === selectedStarterSlot ? { ...c, x: xPct, y: yPct } : c,
    );
    onUpdateClub({
      ...club,
      tactics: {
        ...club.tactics,
        formation: 'PERSONALIZADA',
        customCoords: nextCoords,
      },
    });
  };

  const handleUpdateSlotLabel = (slotIdx: number, label: Position) => {
    const nextCoords = coords.map((c, idx) => (idx === slotIdx ? { ...c, label } : c));
    onUpdateClub({
      ...club,
      tactics: {
        ...club.tactics,
        formation: 'PERSONALIZADA',
        customCoords: nextCoords,
      },
    });
  };

  const handleBenchClick = (player: Player) => {
    if (player.injuredDays > 0) return;
    if (selectedStarterSlot !== null) {
      replaceStarterWithBench(selectedStarterSlot, player.id);
      setSelectedStarterSlot(null);
      setSelectedBenchPlayerId(null);
      return;
    }
    setSelectedBenchPlayerId((prev) => (prev === player.id ? null : player.id));
  };

  const handleDropOnPitchSlot = (targetSlotIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragPayload) return;
    if (dragPayload.source === 'PITCH') {
      if (dragPayload.slotIdx !== targetSlotIdx) {
        swapStarterSlots(dragPayload.slotIdx, targetSlotIdx);
      }
    } else if (dragPayload.source === 'BENCH') {
      replaceStarterWithBench(targetSlotIdx, dragPayload.playerId);
    }
    setDragPayload(null);
    setSelectedStarterSlot(null);
    setSelectedBenchPlayerId(null);
  };

  const handleDropOnBench = (benchPlayer: Player, e: React.DragEvent) => {
    e.preventDefault();
    if (benchPlayer.injuredDays > 0 || !dragPayload) return;
    if (dragPayload.source === 'PITCH') {
      replaceStarterWithBench(dragPayload.slotIdx, benchPlayer.id);
    }
    setDragPayload(null);
    setSelectedStarterSlot(null);
    setSelectedBenchPlayerId(null);
  };

  const filteredRoster = club.roster
    .filter((p) => (posFilter === 'TODOS' ? true : p.position === posFilter))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const aStarter = starterIds.includes(a.id) ? 1 : 0;
      const bStarter = starterIds.includes(b.id) ? 1 : 0;
      if (aStarter !== bStarter) return bStarter - aStarter;
      return b.overall - a.overall;
    });

  const selectedSlotCoord =
    selectedStarterSlot !== null ? coords[selectedStarterSlot] : null;

  return (
    <div className="space-y-6">
      {/* Top Tactics + 2D Pitch Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2D Pitch */}
        <div className="lg:col-span-7 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Prancheta Tática 2D</h2>
              <p className="text-xs text-slate-400">
                Arraste ou clique em dois jogadores para trocar · Escalação automática avalia OVR, fadiga, moral e DM
              </p>
            </div>
            <div className="flex items-center gap-2">
              {club.tactics.formation === 'PERSONALIZADA' && (
                <button
                  type="button"
                  onClick={() => setEditCustomMode((v) => !v)}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    editCustomMode
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-[#182334] text-amber-300 border-white/10 hover:bg-[#1F2E44]'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  {editCustomMode ? 'Concluir Desenho' : 'Mover Posições'}
                </button>
              )}
              <button
                type="button"
                onClick={handleAutoPick}
                className="px-3.5 py-2 bg-[#182334] hover:bg-[#1F2E44] border border-white/10 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Escalar Melhores
              </button>
            </div>
          </div>

          {/* Formation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0B111A] rounded-lg border border-white/10">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleFormationChange(f)}
                className={`flex-1 min-w-[64px] py-1.5 px-2.5 rounded-md font-mono text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  club.tactics.formation === f
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {f === 'PERSONALIZADA' ? 'Custom' : f}
              </button>
            ))}
          </div>

          {/* Interactive Pitch SVG + Overlay Nodes */}
          <div
            ref={pitchRef}
            onClick={handlePitchSurfaceClick}
            className={`relative w-full aspect-[4/3] sm:aspect-[16/11] bg-[#0F3D26] rounded-xl border overflow-hidden select-none ${
              editCustomMode ? 'border-amber-400/60 cursor-crosshair' : 'border-emerald-400/20'
            }`}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-45 pointer-events-none"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="100" height="20" fill="#0B301D" />
              <rect x="0" y="40" width="100" height="20" fill="#0B301D" />
              <rect x="0" y="80" width="100" height="20" fill="#0B301D" />
              <rect x="4" y="4" width="92" height="92" fill="none" stroke="#D1FAE5" strokeWidth="0.6" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="#D1FAE5" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
              <rect x="26" y="4" width="48" height="15" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
              <rect x="26" y="81" width="48" height="15" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
            </svg>

            {coords.map((slot, idx) => {
              const player = starters[idx];
              const isSelected = selectedStarterSlot === idx;
              const outOfPos = player && player.position !== slot.label;
              return (
                <button
                  key={`${slot.label}-${idx}`}
                  type="button"
                  draggable={!editCustomMode && Boolean(player)}
                  onDragStart={() => setDragPayload({ source: 'PITCH', slotIdx: idx })}
                  onDragEnd={() => setDragPayload(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnPitchSlot(idx, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePitchSlotClick(idx);
                  }}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none"
                >
                  <div className="relative">
                    {player ? (
                      <div
                        className={`rounded-full p-0.5 transition-transform ${
                          isSelected
                            ? 'scale-110 ring-2 ring-amber-400 bg-amber-400'
                            : 'group-hover:scale-105 bg-white/80'
                        }`}
                      >
                        <PlayerPortrait
                          name={player.name}
                          countryCode={player.countryCode}
                          gender={player.gender}
                          age={player.age}
                          faceSeed={player.faceSeed}
                          primaryColor={club.primaryColor}
                          secondaryColor={club.secondaryColor}
                          size={38}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/60 text-xs font-mono font-bold text-white"
                        style={{ backgroundColor: club.primaryColor }}
                      >
                        --
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 px-1 rounded bg-[#0B111A] border border-white/25 font-mono text-[9px] font-bold text-emerald-400 tabular-nums">
                      {player ? player.overall : '--'}
                    </span>
                  </div>
                  <div
                    className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold max-w-[92px] truncate ${
                      outOfPos
                        ? 'bg-amber-950/90 text-amber-300'
                        : 'bg-[#0B111A]/85 text-slate-100'
                    }`}
                  >
                    <span className="text-slate-400 font-mono mr-1">{slot.label}</span>
                    {player ? player.name.split(' ').slice(-1)[0] : 'Vazio'}
                  </div>
                </button>
              );
            })}
          </div>

          {editCustomMode && club.tactics.formation === 'PERSONALIZADA' && (
            <div className="p-3 bg-[#0B111A] border border-amber-400/30 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-amber-200">
                {selectedSlotCoord && selectedStarterSlot !== null
                  ? `Slot ${selectedStarterSlot + 1} selecionado (${selectedSlotCoord.label}) — clique no gramado para mover ou altere a função:`
                  : 'Clique em qualquer jogador no campo para reposicioná-lo livremente.'}
              </div>
              {selectedSlotCoord && selectedStarterSlot !== null && (
                <div className="flex items-center gap-1">
                  {SLOT_POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => handleUpdateSlotLabel(selectedStarterSlot, pos)}
                      className={`px-2 py-1 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                        selectedSlotCoord.label === pos
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-[#121B28] text-slate-300 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Tactical Sliders + Bench */}
        <div className="lg:col-span-5 space-y-5">
          {/* Simple 3-axis tactics + training */}
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">Instruções e Treino</h3>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                Entrosamento {club.cohesion ?? 74}%
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-slate-400 mb-1.5">Postura da Equipe</div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B111A] rounded-lg border border-white/10">
                  {(['RETRANCA', 'EQUILIBRADO', 'OFENSIVO'] as Mentality[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        onUpdateClub({ ...club, tactics: { ...club.tactics, mentality: m } })
                      }
                      className={`py-1.5 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
                        club.tactics.mentality === m
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {m === 'RETRANCA' ? 'Retranca' : m === 'EQUILIBRADO' ? 'Equilibrado' : 'Ofensivo'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-400 mb-1.5">Pressão na Marcação</div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B111A] rounded-lg border border-white/10">
                  {(['BAIXA', 'MEDIA', 'ALTA'] as PressingStyle[]).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() =>
                        onUpdateClub({ ...club, tactics: { ...club.tactics, pressing: pr } })
                      }
                      className={`py-1.5 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
                        club.tactics.pressing === pr
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {pr === 'BAIXA' ? 'Bloco Baixo' : pr === 'MEDIA' ? 'Média' : 'Pressão Alta'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-400 mb-1.5">Estilo de Jogo</div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B111A] rounded-lg border border-white/10">
                  {(['POSSE', 'MISTO', 'CONTRA_ATAQUE'] as PassingStyle[]).map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() =>
                        onUpdateClub({ ...club, tactics: { ...club.tactics, passing: ps } })
                      }
                      className={`py-1.5 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
                        club.tactics.passing === ps
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {ps === 'POSSE' ? 'Posse' : ps === 'MISTO' ? 'Misto' : 'Contra-Ataque'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label htmlFor="training-focus" className="block text-slate-400 mb-1.5">
                  Foco Padrão de Treino (CT Nível {club.trainingLevel})
                </label>
                <select
                  id="training-focus"
                  value={club.trainingFocus}
                  onChange={(e) =>
                    onUpdateClub({ ...club, trainingFocus: e.target.value as TrainingFocus })
                  }
                  className="w-full px-3 py-2 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="EQUILIBRADO">Equilibrado (Evolução Geral)</option>
                  <option value="FISICO">Físico (Velocidade e Resistência)</option>
                  <option value="TECNICO">Técnico (Drible e Passe)</option>
                  <option value="TATICO">Tático (Defesa e Leitura)</option>
                  <option value="FINALIZACAO">Finalização (Ataque e Reflexo)</option>
                  <option value="RECUPERACAO">Recuperação Muscular (Reduz Fadiga)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bench & Reserves */}
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">Banco de Reservas</h3>
              <span className="text-xs text-slate-400 tabular-nums">{bench.length} disponíveis</span>
            </div>

            <div className="max-h-[280px] overflow-y-auto divide-y divide-white/8 pr-1">
              {bench.map((p) => {
                const isSel = selectedBenchPlayerId === p.id;
                const injured = p.injuredDays > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={injured}
                    draggable={!injured}
                    onDragStart={() => setDragPayload({ source: 'BENCH', playerId: p.id })}
                    onDragEnd={() => setDragPayload(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnBench(p, e)}
                    onClick={() => handleBenchClick(p)}
                    className={`w-full py-2 px-2.5 flex items-center justify-between gap-2 text-left rounded-lg transition-colors ${
                      injured
                        ? 'opacity-45 cursor-not-allowed'
                        : isSel
                          ? 'bg-amber-500/15 text-amber-200 cursor-pointer'
                          : 'hover:bg-white/5 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerPortrait
                        name={p.name}
                        countryCode={p.countryCode}
                        gender={p.gender}
                        age={p.age}
                        faceSeed={p.faceSeed}
                        primaryColor={club.primaryColor}
                        secondaryColor={club.secondaryColor}
                        size={30}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {p.name}
                          {injured && (
                            <span className="text-rose-400 ml-2">DM ({p.injuredDays}d)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {p.position} · {p.countryCode} · Fadiga {p.fatigue}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                        {p.overall}
                      </span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full Roster Table */}
      <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-bold text-white">Elenco Completo</h3>
            <p className="text-xs text-slate-400 tabular-nums">
              {club.roster.length} atletas registrados · Clique em qualquer jogador para ver atributos, risco de lesão e negociar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar atleta..."
                className="pl-8 pr-3 py-1.5 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 overflow-x-auto">
              {POSITIONS_FILTER.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosFilter(pos)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    posFilter === pos
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-3 font-medium">Pos</th>
                <th className="py-2.5 pr-3 font-medium">Atleta</th>
                <th className="py-2.5 pr-3 font-medium">Nac.</th>
                <th className="py-2.5 pr-3 font-medium text-right">Idade</th>
                <th className="py-2.5 pr-3 font-medium text-right">OVR</th>
                <th className="py-2.5 pr-3 font-medium text-right">POT</th>
                <th className="py-2.5 pr-3 font-medium text-right">Fadiga</th>
                <th className="py-2.5 pr-3 font-medium text-right">Risco DM</th>
                <th className="py-2.5 pr-3 font-medium text-right">Moral</th>
                <th className="py-2.5 pr-3 font-medium text-right">G / A</th>
                <th className="py-2.5 font-medium text-right">Salário/mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filteredRoster.map((p) => {
                const isStarter = starterIds.includes(p.id);
                const risk = computeInjuryRisk(p, club.medicalLevel, doctorOverall);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setInspectPlayer(p)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono font-semibold text-slate-300">{p.position}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerPortrait
                          name={p.name}
                          countryCode={p.countryCode}
                          gender={p.gender}
                          age={p.age}
                          faceSeed={p.faceSeed}
                          primaryColor={club.primaryColor}
                          secondaryColor={club.secondaryColor}
                          size={30}
                        />
                        <div>
                          <div className="font-semibold text-white">
                            {p.name}
                            {isStarter && (
                              <span className="ml-2 text-[11px] font-normal text-emerald-400">
                                Titular
                              </span>
                            )}
                            {p.injuredDays > 0 && (
                              <span className="ml-2 text-[11px] font-normal text-rose-400">
                                DM ({p.injuredDays}d)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{p.archetype}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">{p.nationality}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                      {p.age}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold tabular-nums text-emerald-400">
                      {p.overall}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                      {p.potential}
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
                    <td
                      className={`py-2.5 pr-3 text-right font-mono tabular-nums ${
                        risk.level === 'CRITICO'
                          ? 'text-rose-400'
                          : risk.level === 'ALTO'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {risk.level}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                      {p.morale}%
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-300">
                      {p.goalsSeason}/{p.assistsSeason}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-300">
                      {formatCompactBRL(p.salary)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Inspector Modal */}
      {inspectPlayer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <PlayerPortrait
                  name={inspectPlayer.name}
                  countryCode={inspectPlayer.countryCode}
                  gender={inspectPlayer.gender}
                  age={inspectPlayer.age}
                  faceSeed={inspectPlayer.faceSeed}
                  primaryColor={club.primaryColor}
                  secondaryColor={club.secondaryColor}
                  size={56}
                />
                <div>
                  <div className="text-xs text-emerald-400 font-medium">
                    {getPositionLabel(inspectPlayer.position)} · {inspectPlayer.nationality} ·{' '}
                    {inspectPlayer.age} anos
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                    {inspectPlayer.name}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{inspectPlayer.archetype}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      Risco DM:{' '}
                      {computeInjuryRisk(inspectPlayer, club.medicalLevel, doctorOverall).level}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectPlayer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 py-3 border-y border-white/10 text-xs">
              <div>
                <div className="text-slate-400">Overall / Potencial</div>
                <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                  {inspectPlayer.overall} / {inspectPlayer.potential}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Valor de Mercado</div>
                <div className="font-mono text-lg font-bold text-white tabular-nums">
                  {formatCompactBRL(inspectPlayer.marketValue)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Contrato</div>
                <div className="font-mono text-lg font-bold text-white tabular-nums">
                  {inspectPlayer.contractYears} ano(s)
                </div>
                {inspectPlayer.sellOnClausePct ? (
                  <div className="text-[11px] text-amber-300 tabular-nums">
                    Cláusula revenda: {inspectPlayer.sellOnClausePct}%
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Velocidade (PAC)', val: inspectPlayer.attributes.pac },
                { label: 'Finalização (FIN)', val: inspectPlayer.attributes.fin },
                { label: 'Passe (PAS)', val: inspectPlayer.attributes.pas },
                { label: 'Drible (DRI)', val: inspectPlayer.attributes.dri },
                { label: 'Defesa (DEF)', val: inspectPlayer.attributes.def },
                { label: 'Físico (FIS)', val: inspectPlayer.attributes.fis },
              ].map((attr) => (
                <div key={attr.label} className="bg-[#0B111A] border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">{attr.label}</div>
                  <div className="font-mono text-lg font-bold text-white tabular-nums mt-0.5">
                    {attr.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400 font-mono tabular-nums">
                Temporada: {inspectPlayer.matchesSeason}J · {inspectPlayer.goalsSeason}G ·{' '}
                {inspectPlayer.assistsSeason}A
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNegotiateRenew(inspectPlayer);
                    setInspectPlayer(null);
                  }}
                  className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Renovar Contrato
                </button>
                {club.roster.length > 16 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSellPlayer(inspectPlayer);
                      setInspectPlayer(null);
                    }}
                    className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Vender ({formatCompactBRL(Math.round(inspectPlayer.marketValue * 0.85))})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectPlayer(null)}
                  className="px-4 py-2 bg-[#182334] hover:bg-[#1E2C42] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
