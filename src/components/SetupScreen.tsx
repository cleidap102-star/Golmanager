import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Cloud, Globe2, LogIn, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { getBlueprintsForLeague, WORLD_CLUB_BLUEPRINTS, WORLD_LEAGUES } from '../data/worldLeagues';
import type { CloudSaveSummary } from '../firebase';
import { Confederation, GenderDivision } from '../types/game';
import { formatCompactBRL } from '../utils/format';
import { ClubCrest } from './ClubCrest';

interface SetupScreenProps {
  hasSavedGame: boolean;
  onContinueSave: () => void;
  onStartNewGame: (
    clubId: string,
    managerName: string,
    division: GenderDivision,
    leagueId: string,
  ) => void;
  firebaseUser: User | null;
  cloudSaves: CloudSaveSummary[];
  cloudLoading: boolean;
  cloudError: string | null;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  onLoadCloudSave: (save: CloudSaveSummary) => void;
  onDeleteCloudSave: (saveId: string) => void;
}

const CONFEDERATIONS: Array<{ id: Confederation | 'TODAS'; label: string }> = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'CONMEBOL', label: 'CONMEBOL' },
  { id: 'UEFA', label: 'UEFA' },
  { id: 'CONCACAF', label: 'CONCACAF' },
  { id: 'AFC', label: 'AFC (Ásia)' },
  { id: 'CAF', label: 'CAF (África)' },
  { id: 'OFC', label: 'OFC (Oceania)' },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  hasSavedGame,
  onContinueSave,
  onStartNewGame,
  firebaseUser,
  cloudSaves,
  cloudLoading,
  cloudError,
  onSignInGoogle,
  onSignOutGoogle,
  onLoadCloudSave,
  onDeleteCloudSave,
}) => {
  const [managerName, setManagerName] = useState('Gabriel Silva');
  const [division, setDivision] = useState<GenderDivision>('MASCULINO');
  const [confFilter, setConfFilter] = useState<Confederation | 'TODAS'>('TODAS');
  const [selectedLeagueId, setSelectedLeagueId] = useState('bra_a');

  const filteredLeagues = useMemo(
    () =>
      confFilter === 'TODAS'
        ? WORLD_LEAGUES
        : WORLD_LEAGUES.filter((l) => l.confederation === confFilter),
    [confFilter],
  );

  const selectedLeague =
    WORLD_LEAGUES.find((l) => l.id === selectedLeagueId) || WORLD_LEAGUES[0];

  const leagueBlueprints = useMemo(
    () => getBlueprintsForLeague(selectedLeague.id),
    [selectedLeague.id],
  );

  const [selectedClubId, setSelectedClubId] = useState(leagueBlueprints[0]?.id || 'fla');

  const selectedBp =
    leagueBlueprints.find((c) => c.id === selectedClubId) || leagueBlueprints[0];

  const handleSelectConfederation = (conf: Confederation | 'TODAS') => {
    setConfFilter(conf);
    const list =
      conf === 'TODAS'
        ? WORLD_LEAGUES
        : WORLD_LEAGUES.filter((l) => l.confederation === conf);
    if (list.length > 0 && !list.some((l) => l.id === selectedLeagueId)) {
      const nextLeague = list[0];
      setSelectedLeagueId(nextLeague.id);
      const nextClubs = getBlueprintsForLeague(nextLeague.id);
      if (nextClubs[0]) setSelectedClubId(nextClubs[0].id);
    }
  };

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    const nextClubs = getBlueprintsForLeague(leagueId);
    if (nextClubs[0]) setSelectedClubId(nextClubs[0].id);
  };

  const adjustedCash =
    division === 'FEMININO' ? Math.round(selectedBp.baseCash * 0.45) : selectedBp.baseCash;

  return (
    <div className="min-h-screen bg-[#0B111A] text-slate-100 flex flex-col">
      <header className="border-b border-white/10 px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="font-display text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
            NEXTFOOT
          </div>
          <div className="text-xs text-slate-400 hidden md:block whitespace-nowrap">
            {WORLD_LEAGUES.length} Ligas Mundiais (1ª e 2ª Div.) · {WORLD_CLUB_BLUEPRINTS.length} Clubes · Masculino e Feminino
          </div>
        </div>

        <div className="flex items-center gap-3">
          {firebaseUser ? (
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-emerald-400 font-medium hidden sm:inline">
                {firebaseUser.displayName || firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={onSignOutGoogle}
                className="px-3 py-1.5 bg-[#121B28] hover:bg-[#182334] border border-white/10 rounded-lg text-slate-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignInGoogle}
              className="px-3.5 py-2 bg-[#121B28] hover:bg-[#182334] border border-white/15 rounded-lg text-xs font-semibold text-white flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              Entrar com Google (Nuvem)
            </button>
          )}

          {hasSavedGame && (
            <button
              type="button"
              onClick={onContinueSave}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continuar Save Local
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Intro + Manager Config + Cloud Saves */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-emerald-400 tracking-wide">
              Carreira Global de Técnico · 6 Confederações FIFA
            </p>
            <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-white leading-[1.05] text-balance">
              Comande clubes do mundo todo sem burocracia
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Escolha qualquer liga entre {WORLD_LEAGUES.length} campeonatos (incluindo 2ª
              divisões com acesso e rebaixamento), dispute copas nacionais, continentais e o
              Mundial, negocie com cláusula de revenda e envie olheiros para 23 federações.
            </p>
          </div>

          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="manager-name" className="block text-xs font-medium text-slate-300">
                Nome do Treinador(a)
              </label>
              <input
                id="manager-name"
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                maxLength={32}
                placeholder="Digite seu nome..."
                className="w-full px-3.5 py-2.5 bg-[#0B111A] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-300">
                Divisão / Modalidade
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B111A] rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setDivision('MASCULINO')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    division === 'MASCULINO'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Futebol Masculino
                </button>
                <button
                  type="button"
                  onClick={() => setDivision('FEMININO')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    division === 'FEMININO'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Futebol Feminino
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <ClubCrest club={selectedBp} size={48} />
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">
                    {division === 'FEMININO' ? `${selectedBp.name} Fem.` : selectedBp.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {selectedLeague.name} ({selectedLeague.country}) · {selectedBp.stadiumName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <div className="text-slate-400">Caixa Inicial</div>
                  <div className="font-mono font-semibold text-emerald-400 tabular-nums mt-0.5">
                    {formatCompactBRL(adjustedCash)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Força Base</div>
                  <div className="font-mono font-semibold text-white tabular-nums mt-0.5">
                    OVR {selectedBp.targetOverall}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Estádio</div>
                  <div className="font-mono font-semibold text-white tabular-nums mt-0.5">
                    {(selectedBp.stadiumCapacity / 1000).toFixed(1)}k lug.
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300">
                Meta da Diretoria:{' '}
                <span className="text-white font-semibold">{selectedBp.boardGoalLabel}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onStartNewGame(selectedBp.id, managerName, division, selectedLeague.id)
                }
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors cursor-pointer"
              >
                Iniciar Carreira no Clube
              </button>
            </div>
          </div>

          {/* Cloud Saves Box */}
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display text-lg font-bold text-white">
                  Carreiras na Nuvem (Firebase)
                </h2>
              </div>
              {firebaseUser && (
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {cloudSaves.length} salva(s)
                </span>
              )}
            </div>

            {cloudError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-400/30 rounded-lg text-xs text-rose-200">
                {cloudError}
              </div>
            )}

            {!firebaseUser ? (
              <div className="text-xs text-slate-400 space-y-2">
                <p>
                  Entre com sua conta Google para salvar e carregar suas carreiras em qualquer
                  dispositivo.
                </p>
                <button
                  type="button"
                  onClick={onSignInGoogle}
                  className="px-3.5 py-2 bg-[#0B111A] hover:bg-[#182334] border border-white/15 rounded-lg text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  Conectar Conta Google
                </button>
              </div>
            ) : cloudLoading ? (
              <div className="text-xs text-slate-400 py-3">Carregando saves da nuvem...</div>
            ) : cloudSaves.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">
                Nenhuma carreira salva na nuvem ainda. Inicie uma carreira e clique em &ldquo;Salvar
                na Nuvem&rdquo; no painel lateral.
              </div>
            ) : (
              <div className="divide-y divide-white/8 max-h-[210px] overflow-y-auto pr-1">
                {cloudSaves.map((sv) => (
                  <div
                    key={sv.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{sv.clubName}</div>
                      <div className="text-[11px] text-slate-400 truncate tabular-nums">
                        {sv.leagueName} · Temp. {sv.season} · Dia {sv.currentDay} · {sv.managerName}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadCloudSave(sv)}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md cursor-pointer"
                      >
                        Carregar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCloudSave(sv.id)}
                        className="p-1.5 bg-[#0B111A] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 rounded-md cursor-pointer"
                        title="Excluir save na nuvem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Confederation -> League -> Official Rules -> Club Grid */}
        <section className="lg:col-span-7 space-y-5">
          {/* Confederation Tabs */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display text-2xl font-bold text-white">
                  Escolha Liga e Clube no Mundo
                </h2>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {WORLD_LEAGUES.length} ligas · {WORLD_CLUB_BLUEPRINTS.length} clubes disponíveis
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#121B28] rounded-lg border border-white/10">
              {CONFEDERATIONS.map((cf) => (
                <button
                  key={cf.id}
                  type="button"
                  onClick={() => handleSelectConfederation(cf.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    confFilter === cf.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cf.label}
                </button>
              ))}
            </div>

            {/* League Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[190px] overflow-y-auto pr-1">
              {filteredLeagues.map((lg) => {
                const active = lg.id === selectedLeague.id;
                return (
                  <button
                    key={lg.id}
                    type="button"
                    onClick={() => handleSelectLeague(lg.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#182334] border-emerald-400 text-white'
                        : 'bg-[#121B28] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{lg.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {lg.country} · {lg.confederation} · {lg.tier}ª Div
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Official League Rules Card */}
          <div className="bg-[#121B28] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Regras Oficiais · {selectedLeague.name}
              </div>
              <span className="text-slate-400 font-mono">
                Copas: {selectedLeague.rules.cupName} & {selectedLeague.rules.continentalCupName}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{selectedLeague.rules.summary}</p>
            <div className="text-[11px] text-slate-400">
              Desempate: {selectedLeague.rules.tiebreakers.join(' -> ')} ·{' '}
              {selectedLeague.rules.foreignLimitLabel}
            </div>
          </div>

          {/* 12 Clubs of Selected League */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl font-bold text-white">
                Clubes da {selectedLeague.name}
              </h3>
              <span className="text-xs text-slate-400 tabular-nums">
                {leagueBlueprints.length} clubes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leagueBlueprints.map((bp) => {
                const isSelected = bp.id === selectedBp.id;
                return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => setSelectedClubId(bp.id)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#182334] border-emerald-400'
                        : 'bg-[#121B28] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <ClubCrest club={bp} size={42} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {division === 'FEMININO' ? `${bp.name} Fem.` : bp.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5 tabular-nums">
                        {bp.city} · OVR {bp.targetOverall} · {bp.boardGoalLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
