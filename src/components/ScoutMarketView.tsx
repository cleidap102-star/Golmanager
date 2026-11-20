import React, { useMemo, useState } from 'react';
import { Building2, Compass, Globe, Search, UserPlus } from 'lucide-react';
import { FEDERATIONS, getFederationById } from '../data/federations';
import { getLeagueById } from '../data/worldLeagues';
import { Club, GameState, Player, Position } from '../types/game';
import { formatCompactBRL } from '../utils/format';
import { PlayerPortrait } from './PlayerPortrait';

interface ScoutMarketViewProps {
  state: GameState;
  userClub: Club;
  onDispatchScout: (
    federationId: string,
    targetPosition: Position | 'QUALQUER',
    focusProfile: 'EQUILIBRADO' | 'VELOCIDADE' | 'TECNICA' | 'FISICO' | 'PROMESSA',
  ) => void;
  onSignScoutedPlayer: (missionId: string, player: Player) => void;
  onOpenAcademy: (federationId: string) => void;
  onPromoteYouth: (playerId: string) => void;
  onOpenNegotiation: (
    mode: 'BUY_CLUB' | 'FREE_AGENT',
    player: Player,
    meta?: { sellerClubId?: string; sellerLabel?: string; isExternal?: boolean },
  ) => void;
}

type SubTab = 'SCOUT' | 'ACADEMIAS' | 'BASE' | 'MERCADO';

export const ScoutMarketView: React.FC<ScoutMarketViewProps> = ({
  state,
  userClub,
  onDispatchScout,
  onSignScoutedPlayer,
  onOpenAcademy,
  onPromoteYouth,
  onOpenNegotiation,
}) => {
  const [tab, setTab] = useState<SubTab>('SCOUT');
  const [selectedFedId, setSelectedFedId] = useState('som');
  const [targetPos, setTargetPos] = useState<Position | 'QUALQUER'>('QUALQUER');
  const [focusProfile, setFocusProfile] = useState<
    'EQUILIBRADO' | 'VELOCIDADE' | 'TECNICA' | 'FISICO' | 'PROMESSA'
  >('VELOCIDADE');
  const [marketSearch, setMarketSearch] = useState('');
  const [marketScope, setMarketScope] = useState<'TODOS' | 'LIGA' | 'MUNDIAL'>('TODOS');

  const selectedFed = getFederationById(selectedFedId);
  const activeLeague = getLeagueById(state.leagueId);

  const marketPlayers = useMemo(() => {
    const localItems =
      marketScope === 'MUNDIAL'
        ? []
        : state.clubs
            .filter((c) => c.id !== userClub.id)
            .flatMap((c) =>
              c.roster.map((p) => ({
                player: p,
                clubId: c.id,
                clubLabel: `${c.shortName} · ${activeLeague.name}`,
                isExternal: false,
              })),
            );

    const externalItems =
      marketScope === 'LIGA'
        ? []
        : (state.externalMarket || []).map((ext) => ({
            player: ext.player,
            clubId: ext.clubId,
            clubLabel: `${ext.clubName} · ${ext.leagueName}`,
            isExternal: true,
          }));

    const q = marketSearch.toLowerCase().trim();
    return [...localItems, ...externalItems]
      .filter(
        (item) =>
          !q ||
          item.player.name.toLowerCase().includes(q) ||
          item.player.nationality.toLowerCase().includes(q) ||
          item.clubLabel.toLowerCase().includes(q),
      )
      .sort((a, b) => b.player.overall - a.player.overall)
      .slice(0, 40);
  }, [state.clubs, state.externalMarket, userClub.id, activeLeague.name, marketScope, marketSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">
            Scout Global, Base e Mercado Mundial
          </h2>
          <p className="text-xs text-slate-400">
            23 federações para envio de olheiros, academias no exterior e negociação com jogadores de
            todas as ligas
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#121B28] rounded-lg border border-white/10 overflow-x-auto">
          {(
            [
              { id: 'SCOUT', label: 'Olheiros por País' },
              { id: 'ACADEMIAS', label: 'Academias no Exterior' },
              { id: 'BASE', label: `Base Sub-20 (${userClub.youthAcademy.length})` },
              { id: 'MERCADO', label: 'Mercado Mundial & Livres' },
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

      {/* TAB 1: GLOBAL SCOUTING BY FEDERATION */}
      {tab === 'SCOUT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display text-xl font-bold text-white">
                  Base de Conhecimento ({FEDERATIONS.length} Federações)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {FEDERATIONS.map((fed) => {
                const active = fed.id === selectedFedId;
                return (
                  <button
                    key={fed.id}
                    type="button"
                    onClick={() => setSelectedFedId(fed.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#182334] border-emerald-400 text-white'
                        : 'bg-[#0B111A] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{fed.country}</div>
                    <div className="text-[11px] text-slate-400 truncate">{fed.region}</div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-[#0B111A] border border-white/10 rounded-lg space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-bold text-white">{selectedFed.federationName}</div>
                <span className="font-mono text-xs text-emerald-400 tabular-nums shrink-0">
                  {selectedFed.scoutDays} dias · {formatCompactBRL(selectedFed.scoutCost)}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedFed.summary}</p>
              <div className="text-[11px] text-slate-400">
                Perfis comuns: {selectedFed.archetypes.join(' · ')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Posição Alvo</label>
                <select
                  value={targetPos}
                  onChange={(e) => setTargetPos(e.target.value as Position | 'QUALQUER')}
                  className="w-full px-3 py-2 bg-[#0B111A] border border-white/15 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="QUALQUER">Qualquer Posição</option>
                  <option value="GOL">Goleiro (GOL)</option>
                  <option value="ZAG">Zagueiro (ZAG)</option>
                  <option value="LAT">Lateral (LAT)</option>
                  <option value="VOL">Volante (VOL)</option>
                  <option value="MEI">Meia (MEI)</option>
                  <option value="ATA">Atacante (ATA)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5">Perfil Desejado</label>
                <select
                  value={focusProfile}
                  onChange={(e) =>
                    setFocusProfile(
                      e.target.value as
                        | 'EQUILIBRADO'
                        | 'VELOCIDADE'
                        | 'TECNICA'
                        | 'FISICO'
                        | 'PROMESSA',
                    )
                  }
                  className="w-full px-3 py-2 bg-[#0B111A] border border-white/15 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="VELOCIDADE">Velocidade & Transição</option>
                  <option value="TECNICA">Técnica & Criatividade</option>
                  <option value="FISICO">Força Física & Marcação</option>
                  <option value="PROMESSA">Jovem Promessa (17-21 anos)</option>
                  <option value="EQUILIBRADO">Equilibrado</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={userClub.cash < selectedFed.scoutCost}
              onClick={() => onDispatchScout(selectedFed.id, targetPos, focusProfile)}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              Enviar Olheiro para {selectedFed.country} ({formatCompactBRL(selectedFed.scoutCost)})
            </button>
          </div>

          <div className="lg:col-span-6 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="font-display text-xl font-bold text-white">Missões e Relatórios</h3>

            {state.scoutMissions.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-xs text-slate-400">
                <p>Nenhuma missão de scout disparada ainda.</p>
                <p>
                  Envie um olheiro para Somália, Coreia do Sul, Nigéria, Espanha ou Japão para
                  descobrir talentos com DNA de cada federação!
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                {state.scoutMissions.map((m) => {
                  const fed = getFederationById(m.federationId);
                  return (
                    <div
                      key={m.id}
                      className="p-4 bg-[#0B111A] border border-white/10 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-white">
                          Missão {fed.country} · {m.targetPosition} · {m.focusProfile}
                        </div>
                        <span
                          className={`font-mono ${
                            m.completed ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {m.completed ? 'Concluída' : `${m.daysRemaining}d restantes`}
                        </span>
                      </div>

                      {m.completed && m.foundPlayers.length > 0 && (
                        <div className="divide-y divide-white/8">
                          {m.foundPlayers.map((p) => {
                            const cost = Math.round(p.marketValue * 0.75);
                            const alreadySigned = userClub.roster.some((r) => r.id === p.id);
                            return (
                              <div
                                key={p.id}
                                className="py-2.5 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <PlayerPortrait
                                    name={p.name}
                                    countryCode={p.countryCode}
                                    gender={p.gender}
                                    age={p.age}
                                    faceSeed={p.faceSeed}
                                    size={32}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white truncate">
                                      {p.name} ·{' '}
                                      <span className="text-emerald-400 font-mono">
                                        OVR {p.overall}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 tabular-nums">
                                      {p.position} · {p.age} anos · POT {p.potential} · {p.archetype}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={alreadySigned || userClub.cash < cost}
                                  onClick={() => onSignScoutedPlayer(m.id, p)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  {alreadySigned
                                    ? 'Contratado'
                                    : `Contratar (${formatCompactBRL(cost)})`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OVERSEAS ACADEMIES */}
      {tab === 'ACADEMIAS' && (
        <div className="space-y-6">
          {state.overseasAcademies.length > 0 && (
            <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-xl font-bold text-white">
                Suas Bases de Extração Ativas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {state.overseasAcademies.map((ac) => {
                  const fed = getFederationById(ac.federationId);
                  return (
                    <div
                      key={ac.id}
                      className="p-4 bg-[#0B111A] border border-emerald-400/30 rounded-lg space-y-1.5 text-xs"
                    >
                      <div className="font-bold text-white text-sm">
                        Núcleo {fed.country} ({fed.region})
                      </div>
                      <div className="text-slate-400 font-mono tabular-nums">
                        Próxima joia em {ac.daysUntilNextIntake} dias · {ac.totalGraduates}{' '}
                        revelados
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Manutenção: {formatCompactBRL(fed.academyMaintenanceWeekly)}/sem
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEDERATIONS.map((fed) => {
              const alreadyOpen = state.overseasAcademies.some((a) => a.federationId === fed.id);
              return (
                <div
                  key={fed.id}
                  className="bg-[#121B28] border border-white/10 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-medium">{fed.region}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatCompactBRL(fed.academyCost)}
                      </span>
                    </div>
                    <h4 className="font-display text-xl font-bold text-white">
                      Base em {fed.country}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{fed.summary}</p>
                  </div>

                  <button
                    type="button"
                    disabled={alreadyOpen || userClub.cash < fed.academyCost}
                    onClick={() => onOpenAcademy(fed.id)}
                    className="w-full py-2 px-3 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-45 border border-white/10 text-xs font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {alreadyOpen
                      ? 'Academia Ativa'
                      : `Abrir Base (${formatCompactBRL(fed.academyCost)})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CLUB YOUTH SUB-20 */}
      {tab === 'BASE' && (
        <div className="bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Categorias de Base (Sub-20)
            </h3>
            <p className="text-xs text-slate-400">
              Promova jovens talentos diretamente para o elenco principal sem custo de transferência
            </p>
          </div>

          {userClub.youthAcademy.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Todas as joias da base já foram promovidas. Abra academias no exterior para gerar
              novas promessas!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userClub.youthAcademy.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-[#0B111A] border border-white/10 rounded-lg flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <PlayerPortrait
                      name={p.name}
                      countryCode={p.countryCode}
                      gender={p.gender}
                      age={p.age}
                      faceSeed={p.faceSeed}
                      primaryColor={userClub.primaryColor}
                      secondaryColor={userClub.secondaryColor}
                      size={42}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-slate-300">
                          {p.position} · {p.nationality}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          OVR {p.overall} / POT {p.potential}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5 truncate">{p.name}</div>
                      <div className="text-xs text-slate-400">
                        {p.age} anos · {p.archetype}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPromoteYouth(p.id)}
                    className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Promover ao Profissional
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GLOBAL TRANSFER MARKET & FREE AGENTS */}
      {tab === 'MERCADO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Free Agents */}
          <div className="lg:col-span-5 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Jogadores Livres</h3>
              <p className="text-xs text-slate-400">
                Negocie luvas, salário e tempo de contrato diretamente com o empresário
              </p>
            </div>
            <div className="divide-y divide-white/8 max-h-[520px] overflow-y-auto pr-1">
              {state.freeAgents.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerPortrait
                      name={p.name}
                      countryCode={p.countryCode}
                      gender={p.gender}
                      age={p.age}
                      faceSeed={p.faceSeed}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {p.name} · <span className="font-mono text-emerald-400">OVR {p.overall}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.position} · {p.nationality} · {p.age}a · Salário {formatCompactBRL(p.salary)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenNegotiation('FREE_AGENT', p)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Negociar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Local + World Transfer Market */}
          <div className="lg:col-span-7 bg-[#121B28] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Mercado Global de Clubes
                </h3>
                <p className="text-[11px] text-slate-400">
                  Negocie com cláusula de revenda futura para baratear a compra à vista
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 text-[11px]">
                  {(['TODOS', 'LIGA', 'MUNDIAL'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setMarketScope(sc)}
                      className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                        marketScope === sc
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {sc === 'TODOS' ? 'Todos' : sc === 'LIGA' ? 'Minha Liga' : 'Exterior'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="Atleta, clube ou país..."
                    className="pl-8 pr-3 py-1.5 bg-[#0B111A] border border-white/15 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-white/8 max-h-[520px] overflow-y-auto pr-1">
              {marketPlayers.map((item) => (
                <div
                  key={`${item.clubId}-${item.player.id}`}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerPortrait
                      name={item.player.name}
                      countryCode={item.player.countryCode}
                      gender={item.player.gender}
                      age={item.player.age}
                      faceSeed={item.player.faceSeed}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {item.player.name} ·{' '}
                        <span className="font-mono text-emerald-400">OVR {item.player.overall}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.player.position} · {item.clubLabel} · {item.player.nationality} ·{' '}
                        {item.player.age}a
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenNegotiation('BUY_CLUB', item.player, {
                        sellerClubId: item.clubId,
                        sellerLabel: item.clubLabel,
                        isExternal: item.isExternal,
                      })
                    }
                    className="px-3 py-1.5 bg-[#182334] hover:bg-emerald-500 hover:text-slate-950 border border-white/10 text-white font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Negociar ({formatCompactBRL(item.player.marketValue)})
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
