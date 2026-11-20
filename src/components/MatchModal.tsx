import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, FastForward, Pause, Play, Trophy } from 'lucide-react';
import { simulateLiveMinute } from '../engine/matchEngine';
import { Club, CupMatch, Fixture, MatchEvent, Mentality } from '../types/game';
import { sfx } from '../utils/sound';
import { ClubCrest } from './ClubCrest';
import { PlayerPortrait } from './PlayerPortrait';

interface MatchModalProps {
  fixture?: Fixture | null;
  cupMatch?: CupMatch | null;
  homeClub: Club;
  awayClub: Club;
  userClubId: string;
  onFinishMatch: (
    matchId: string,
    homeGoals: number,
    awayGoals: number,
    goalScorers: Array<{ clubId: string; scorerId: string; assistId?: string }>,
    playedIds: string[],
    cupContext?: {
      cupId: 'NATIONAL_CUP' | 'CONTINENTAL_CUP' | 'CLUB_WORLD_CUP';
      penHome?: number;
      penAway?: number;
      winnerId?: string;
    },
  ) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  fixture,
  cupMatch,
  homeClub,
  awayClub,
  userClubId,
  onFinishMatch,
}) => {
  const isCup = Boolean(cupMatch);
  const isKnockoutCup = Boolean(cupMatch && !cupMatch.isGroupOrLeagueStage);
  const matchId = cupMatch ? cupMatch.id : fixture?.id || 'match';
  const matchLabel = cupMatch
    ? `${cupMatch.cupName} · ${cupMatch.stageLabel}`
    : `Rodada ${fixture?.round || 1}`;

  const isUserHome = homeClub.id === userClubId;
  const [minute, setMinute] = useState(0);
  const [maxMinute, setMaxMinute] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [homeShots, setHomeShots] = useState(0);
  const [awayShots, setAwayShots] = useState(0);
  const [homePossTicks, setHomePossTicks] = useState(1);
  const [awayPossTicks, setAwayPossTicks] = useState(1);
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });

  // Penalty shootout state for tied cup matches after 120'
  const [inPenalties, setInPenalties] = useState(false);
  const [penHome, setPenHome] = useState(0);
  const [penAway, setPenAway] = useState(0);
  const [penRound, setPenRound] = useState(0);
  const [penLog, setPenLog] = useState<string[]>([]);
  const [penFinished, setPenFinished] = useState(false);

  const [events, setEvents] = useState<MatchEvent[]>([
    {
      minute: 0,
      type: 'APITO',
      team: 'NEUTRAL',
      text: `Tudo pronto no ${homeClub.stadiumName} (${matchLabel})! Aperte Iniciar para rolar a bola.`,
    },
  ]);

  const [homeActiveIds, setHomeActiveIds] = useState<string[]>([...homeClub.tactics.starterIds]);
  const [awayActiveIds, setAwayActiveIds] = useState<string[]>([...awayClub.tactics.starterIds]);
  const [playedIds, setPlayedIds] = useState<string[]>(
    isUserHome ? [...homeClub.tactics.starterIds] : [...awayClub.tactics.starterIds],
  );
  const [subsUsed, setSubsUsed] = useState(0);
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [userMentality, setUserMentality] = useState<Mentality>(
    isUserHome ? homeClub.tactics.mentality : awayClub.tactics.mentality,
  );
  const [goalScorers, setGoalScorers] = useState<
    Array<{ clubId: string; scorerId: string; assistId?: string }>
  >([]);

  const liveHomeClub: Club = isUserHome
    ? { ...homeClub, tactics: { ...homeClub.tactics, mentality: userMentality } }
    : homeClub;
  const liveAwayClub: Club = !isUserHome
    ? { ...awayClub, tactics: { ...awayClub.tactics, mentality: userMentality } }
    : awayClub;

  const userClub = isUserHome ? liveHomeClub : liveAwayClub;
  const userActiveIds = isUserHome ? homeActiveIds : awayActiveIds;
  const userBench = userClub.roster.filter(
    (p) => !userActiveIds.includes(p.id) && p.injuredDays === 0,
  );

  const homeGoalsRef = useRef(homeGoals);
  const awayGoalsRef = useRef(awayGoals);
  homeGoalsRef.current = homeGoals;
  awayGoalsRef.current = awayGoals;

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || minute >= maxMinute) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    const intervalMs = speed === 4 ? 110 : speed === 2 ? 230 : 440;
    timerRef.current = window.setInterval(() => {
      setMinute((prevMin) => {
        const nextMin = prevMin + 1;
        if (nextMin === 1) {
          sfx.whistle();
        }
        if (nextMin > maxMinute) {
          setIsPlaying(false);
          return maxMinute;
        }

        const tick = simulateLiveMinute(
          nextMin,
          liveHomeClub,
          liveAwayClub,
          homeActiveIds,
          awayActiveIds,
        );

        setBallPos({ x: tick.ballX, y: tick.ballY });
        if (tick.possessionSide === 'HOME') setHomePossTicks((v) => v + 1);
        else setAwayPossTicks((v) => v + 1);

        if (tick.homeShot) setHomeShots((v) => v + 1);
        if (tick.awayShot) setAwayShots((v) => v + 1);

        let curHG = homeGoalsRef.current;
        let curAG = awayGoalsRef.current;

        if (tick.homeGoal) {
          curHG += 1;
          setHomeGoals(curHG);
          sfx.goal();
          if (tick.scorerId) {
            setGoalScorers((gs) => [
              ...gs,
              { clubId: homeClub.id, scorerId: tick.scorerId!, assistId: tick.assistId },
            ]);
          }
        }
        if (tick.awayGoal) {
          curAG += 1;
          setAwayGoals(curAG);
          sfx.goal();
          if (tick.scorerId) {
            setGoalScorers((gs) => [
              ...gs,
              { clubId: awayClub.id, scorerId: tick.scorerId!, assistId: tick.assistId },
            ]);
          }
        }

        if (tick.event) {
          setEvents((ev) => [tick.event!, ...ev]);
        }

        if (nextMin === 45) {
          setEvents((ev) => [
            {
              minute: 45,
              type: 'APITO',
              team: 'NEUTRAL',
              text: 'Intervalo de jogo! Aproveite para ajustar a postura ou fazer substituições.',
            },
            ...ev,
          ]);
        }

        if (nextMin === 90) {
          if (isKnockoutCup && curHG === curAG) {
            setMaxMinute(120);
            sfx.whistle();
            setEvents((ev) => [
              {
                minute: 90,
                type: 'APITO',
                team: 'NEUTRAL',
                text: 'Empate no tempo normal! Vamos para a Prorrogação (até 120 min).',
              },
              ...ev,
            ]);
          } else {
            sfx.whistle();
            setIsPlaying(false);
            setEvents((ev) => [
              {
                minute: 90,
                type: 'APITO',
                team: 'NEUTRAL',
                text: 'Fim de partida! Apita o árbitro.',
              },
              ...ev,
            ]);
          }
        }

        if (nextMin === 120) {
          sfx.whistle();
          setIsPlaying(false);
          if (isKnockoutCup && curHG === curAG) {
            setInPenalties(true);
            setEvents((ev) => [
              {
                minute: 120,
                type: 'APITO',
                team: 'NEUTRAL',
                text: 'Fim da prorrogação! Tudo igual — a vaga será decidida nos PÊNALTIS!',
              },
              ...ev,
            ]);
          } else {
            setEvents((ev) => [
              {
                minute: 120,
                type: 'APITO',
                team: 'NEUTRAL',
                text: 'Fim da prorrogação! Apita o árbitro.',
              },
              ...ev,
            ]);
          }
        }

        return nextMin;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, minute, maxMinute, userMentality, homeActiveIds, awayActiveIds, isKnockoutCup]);

  const handlePenaltyStep = () => {
    if (penFinished) return;
    const hScores = Math.random() < 0.76;
    const aScores = Math.random() < 0.74;
    const nextH = penHome + (hScores ? 1 : 0);
    const nextA = penAway + (aScores ? 1 : 0);
    const nextRound = penRound + 1;

    setPenHome(nextH);
    setPenAway(nextA);
    setPenRound(nextRound);
    setPenLog((prev) => [
      `Cobrança ${nextRound}: ${homeClub.shortName} ${hScores ? 'CONVERTEU' : 'PERDEU'} · ${
        awayClub.shortName
      } ${aScores ? 'CONVERTEU' : 'PERDEU'}`,
      ...prev,
    ]);

    if (hScores || aScores) sfx.goal();

    // Standard 5 rounds or sudden death after 5
    const remaining = Math.max(0, 5 - nextRound);
    if (nextRound < 5) {
      if (nextH > nextA + remaining || nextA > nextH + remaining) {
        setPenFinished(true);
        sfx.whistle();
      }
    } else if (nextH !== nextA) {
      setPenFinished(true);
      sfx.whistle();
    }
  };

  const handleSubstitute = (benchPlayerId: string) => {
    if (!subOutId || subsUsed >= 5) return;
    const outPlayer = userClub.roster.find((p) => p.id === subOutId);
    const inPlayer = userClub.roster.find((p) => p.id === benchPlayerId);
    if (!outPlayer || !inPlayer) return;

    const updater = (ids: string[]) => ids.map((id) => (id === subOutId ? benchPlayerId : id));
    if (isUserHome) setHomeActiveIds(updater);
    else setAwayActiveIds(updater);

    setPlayedIds((prev) => (prev.includes(benchPlayerId) ? prev : [...prev, benchPlayerId]));
    setSubsUsed((v) => v + 1);
    setSubOutId(null);

    setEvents((ev) => [
      {
        minute,
        type: 'SUBSTITUICAO',
        team: isUserHome ? 'HOME' : 'AWAY',
        text: `Substituição no ${userClub.shortName}: sai ${outPlayer.name}, entra ${inPlayer.name}.`,
      },
      ...ev,
    ]);
  };

  const totalPoss = homePossTicks + awayPossTicks;
  const homePossPct = Math.round((homePossTicks / totalPoss) * 100);
  const awayPossPct = 100 - homePossPct;

  const isMatchEnded =
    minute >= maxMinute && (!inPenalties || penFinished);

  const handleConfirmFinish = () => {
    if (!cupMatch) {
      onFinishMatch(matchId, homeGoals, awayGoals, goalScorers, playedIds);
      return;
    }
    const isGroupOrLeagueDraw = Boolean(cupMatch.isGroupOrLeagueStage && homeGoals === awayGoals);
    const winnerId = isGroupOrLeagueDraw
      ? undefined
      : homeGoals > awayGoals
        ? homeClub.id
        : awayGoals > homeGoals
          ? awayClub.id
          : penHome > penAway
            ? homeClub.id
            : awayClub.id;
    onFinishMatch(matchId, homeGoals, awayGoals, goalScorers, playedIds, {
      cupId: cupMatch.cupId,
      penHome: inPenalties ? penHome : undefined,
      penAway: inPenalties ? penAway : undefined,
      winnerId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#121B28] border border-white/15 rounded-xl max-w-5xl w-full p-5 sm:p-6 space-y-5 my-auto">
        {/* Match Scoreboard Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ClubCrest club={homeClub} size={44} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-white truncate">
                {homeClub.name}
              </div>
              <div className="text-xs text-slate-400">Mandante</div>
            </div>
          </div>

          <div className="flex flex-col items-center px-4">
            <div className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
              {inPenalties
                ? penFinished
                  ? `Pênaltis (${penHome} - ${penAway})`
                  : 'Disputa de Pênaltis'
                : minute === 0
                  ? 'Pré-Jogo'
                  : minute >= maxMinute
                    ? 'Encerrado'
                    : minute > 90
                      ? `Prorrogação ${minute}'`
                      : `${minute}'`}
            </div>
            <div className="font-display text-4xl font-extrabold text-white tabular-nums tracking-wide">
              {homeGoals} - {awayGoals}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              {isCup && <Trophy className="w-3 h-3 text-amber-400" />}
              {matchLabel}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-white truncate">
                {awayClub.name}
              </div>
              <div className="text-xs text-slate-400">Visitante</div>
            </div>
            <ClubCrest club={awayClub} size={44} className="shrink-0" />
          </div>
        </div>

        {/* Penalty Shootout Overlay Box when tied at 120' */}
        {inPenalties && (
          <div className="bg-[#0B111A] border border-amber-400/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-400">
                  Disputa de Pênaltis · Série {penRound}
                </div>
                <div className="font-mono text-xl font-extrabold text-white tabular-nums mt-0.5">
                  {homeClub.shortName} {penHome} x {penAway} {awayClub.shortName}
                </div>
              </div>
              {!penFinished ? (
                <button
                  type="button"
                  onClick={handlePenaltyStep}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Cobrar Série de Pênaltis
                </button>
              ) : (
                <div className="text-xs font-bold text-emerald-400">
                  Vencedor:{' '}
                  {penHome > penAway ? homeClub.name : awayClub.name}
                </div>
              )}
            </div>
            {penLog.length > 0 && (
              <div className="max-h-[90px] overflow-y-auto text-[11px] text-slate-300 space-y-1">
                {penLog.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2D Live Pitch & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full aspect-[16/9] bg-[#0F3D26] rounded-xl border border-emerald-400/25 overflow-hidden">
              <svg viewBox="0 0 100 60" className="w-full h-full opacity-50" aria-hidden="true">
                <rect x="0" y="0" width="20" height="60" fill="#0B301D" />
                <rect x="40" y="0" width="20" height="60" fill="#0B301D" />
                <rect x="80" y="0" width="20" height="60" fill="#0B301D" />
                <rect x="3" y="3" width="94" height="54" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
                <line x1="50" y1="3" x2="50" y2="57" stroke="#D1FAE5" strokeWidth="0.5" />
                <circle cx="50" cy="30" r="8" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
                <rect x="3" y="16" width="13" height="28" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
                <rect x="84" y="16" width="13" height="28" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
              </svg>

              {[
                { x: 10, y: 50 }, { x: 26, y: 20 }, { x: 24, y: 40 }, { x: 24, y: 60 }, { x: 26, y: 80 },
                { x: 44, y: 30 }, { x: 46, y: 50 }, { x: 44, y: 70 },
                { x: 64, y: 25 }, { x: 68, y: 50 }, { x: 64, y: 75 },
              ].map((pt, i) => {
                const shiftX = (ballPos.x - 50) * (i === 0 ? 0.05 : 0.28);
                return (
                  <div
                    key={`h-${i}`}
                    style={{
                      left: `${Math.min(92, Math.max(6, pt.x + shiftX))}%`,
                      top: `${pt.y}%`,
                      backgroundColor: homeClub.primaryColor,
                    }}
                    className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 transition-all duration-300"
                  />
                );
              })}

              {[
                { x: 90, y: 50 }, { x: 74, y: 20 }, { x: 76, y: 40 }, { x: 76, y: 60 }, { x: 74, y: 80 },
                { x: 56, y: 30 }, { x: 54, y: 50 }, { x: 56, y: 70 },
                { x: 36, y: 25 }, { x: 32, y: 50 }, { x: 36, y: 75 },
              ].map((pt, i) => {
                const shiftX = (ballPos.x - 50) * (i === 0 ? 0.05 : 0.28);
                return (
                  <div
                    key={`a-${i}`}
                    style={{
                      left: `${Math.min(94, Math.max(8, pt.x + shiftX))}%`,
                      top: `${pt.y}%`,
                      backgroundColor: awayClub.primaryColor,
                    }}
                    className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/90 transition-all duration-300"
                  />
                );
              })}

              <div
                style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
                className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-slate-900 shadow-md transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[#0B111A] border border-white/10 rounded-lg p-3 text-xs text-center">
              <div>
                <div className="text-slate-400">Posse de Bola</div>
                <div className="font-mono font-bold text-white tabular-nums mt-0.5">
                  {homePossPct}% · {awayPossPct}%
                </div>
              </div>
              <div>
                <div className="text-slate-400">Finalizações</div>
                <div className="font-mono font-bold text-white tabular-nums mt-0.5">
                  {homeShots} · {awayShots}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Substituições</div>
                <div className="font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                  {subsUsed} / 5
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {minute < maxMinute ? (
                  <button
                    type="button"
                    onClick={() => setIsPlaying((v) => !v)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pausar' : minute === 0 ? 'Iniciar Partida' : 'Continuar'}
                  </button>
                ) : isMatchEnded ? (
                  <button
                    type="button"
                    onClick={handleConfirmFinish}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Encerrar e Ir para Coletiva
                  </button>
                ) : (
                  <div className="text-xs text-amber-300 font-semibold">
                    Conclua a disputa de pênaltis acima para encerrar
                  </div>
                )}

                {minute < maxMinute && (
                  <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10">
                    {([1, 2, 4] as const).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSpeed(sp)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer ${
                          speed === sp ? 'bg-[#182334] text-emerald-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {minute < maxMinute && (
                <div className="flex items-center gap-1 p-1 bg-[#0B111A] rounded-lg border border-white/10 text-xs">
                  {(['RETRANCA', 'EQUILIBRADO', 'OFENSIVO'] as Mentality[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setUserMentality(m)}
                      className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                        userMentality === m
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {m === 'RETRANCA' ? 'Retranca' : m === 'EQUILIBRADO' ? 'Equilibrado' : 'Ataque'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-[#0B111A] border border-white/10 rounded-xl p-4 flex-1 flex flex-col min-h-[210px] max-h-[240px]">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Lance a Lance</span>
                {minute < maxMinute && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <FastForward className="w-3 h-3" /> Tempo Real 2D
                  </span>
                )}
              </div>
              <div className="overflow-y-auto space-y-2 pr-1 text-xs">
                {events.map((ev, i) => (
                  <div
                    key={`${ev.minute}-${i}`}
                    className={`py-1.5 border-b border-white/6 last:border-0 ${
                      ev.type === 'GOL'
                        ? 'text-emerald-300 font-semibold'
                        : ev.type === 'AMARELO'
                          ? 'text-amber-300'
                          : ev.type === 'LESAO'
                            ? 'text-rose-300'
                            : 'text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-slate-500 mr-2 tabular-nums">
                      {ev.minute}&apos;
                    </span>
                    {ev.text}
                  </div>
                ))}
              </div>
            </div>

            {minute < maxMinute && (
              <div className="bg-[#0B111A] border border-white/10 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Substituições Rápidas</span>
                  <span className="text-slate-400">
                    {subOutId
                      ? 'Agora clique em quem entra no banco'
                      : `Selecione quem sai (${5 - subsUsed} restantes)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                    <div className="text-slate-500 font-medium mb-1">Em campo</div>
                    {userActiveIds.map((id) => {
                      const p = userClub.roster.find((pl) => pl.id === id);
                      if (!p) return null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={subsUsed >= 5}
                          onClick={() => setSubOutId((prev) => (prev === p.id ? null : p.id))}
                          className={`w-full px-2 py-1 rounded text-left truncate flex items-center justify-between gap-1.5 cursor-pointer ${
                            subOutId === p.id
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-[#121B28] text-slate-200 hover:bg-[#182334]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <PlayerPortrait
                              name={p.name}
                              countryCode={p.countryCode}
                              gender={p.gender}
                              age={p.age}
                              faceSeed={p.faceSeed}
                              primaryColor={userClub.primaryColor}
                              secondaryColor={userClub.secondaryColor}
                              size={18}
                            />
                            <span className="truncate">{p.name.split(' ').slice(-1)[0]}</span>
                          </span>
                          <span className="font-mono text-slate-400 ml-1">{p.position}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                    <div className="text-slate-500 font-medium mb-1">Banco</div>
                    {userBench.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!subOutId || subsUsed >= 5}
                        onClick={() => handleSubstitute(p.id)}
                        className={`w-full px-2 py-1 rounded text-left truncate flex items-center justify-between gap-1.5 ${
                          subOutId && subsUsed < 5
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 cursor-pointer'
                            : 'bg-[#121B28] text-slate-400 opacity-60'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <PlayerPortrait
                            name={p.name}
                            countryCode={p.countryCode}
                            gender={p.gender}
                            age={p.age}
                            faceSeed={p.faceSeed}
                            primaryColor={userClub.primaryColor}
                            secondaryColor={userClub.secondaryColor}
                            size={18}
                          />
                          <span className="truncate">{p.name.split(' ').slice(-1)[0]}</span>
                        </span>
                        <span className="font-mono flex items-center gap-1 ml-1">
                          {p.overall}
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
