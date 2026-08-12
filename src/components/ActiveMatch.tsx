import React, { useState, useEffect } from 'react';
import { SessionData, UserProfile } from '../types';
import { logEvent, undoEvent, subPlayer, endSession } from '../lib/api';
import { PlayerAvatar } from './Avatar';
import {
  Play,
  Pause,
  ArrowRightLeft,
  Trophy,
  Undo2,
  X,
  Shuffle,
  LogOut,
  CheckCircle2,
  Volume2,
  Zap,
  RotateCcw,
  Clock,
  Pencil,
} from 'lucide-react';

interface ActiveMatchProps {
  session: SessionData;
  user: UserProfile | null;
  onRefresh: () => void;
  onFinishMatchClick: (penaltyWinner?: 'teamA' | 'teamB' | null) => void;
  onStartMatchClick: () => void;
  onSessionEnded?: () => void;
}

export const ActiveMatch: React.FC<ActiveMatchProps> = ({
  session,
  user,
  onRefresh,
  onFinishMatchClick,
  onStartMatchClick,
  onSessionEnded,
}) => {
  const match = session.currentMatch;

  // Timer Modes: 'regular' (7m = 420s), 'extra_time' (1m = 60s), 'penalties'
  const [timerMode, setTimerMode] = useState<'regular' | 'extra_time' | 'penalties'>('regular');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(420);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [hasVibratedOneMinute, setHasVibratedOneMinute] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);

  // Edit Timer Modal state
  const [isTimerEditOpen, setIsTimerEditOpen] = useState<boolean>(false);
  const [editMinutesInput, setEditMinutesInput] = useState<number>(7);
  const [editSecondsInput, setEditSecondsInput] = useState<number>(0);

  // Penalty Shootout State (separate from stats tab)
  const [teamAPenaltyKicks, setTeamAPenaltyKicks] = useState<boolean[]>([]);
  const [teamBPenaltyKicks, setTeamBPenaltyKicks] = useState<boolean[]>([]);

  const [loading, setLoading] = useState(false);
  const [subMessage, setSubMessage] = useState<string | null>(null);

  // Sub Pop-up state
  const [subTarget, setSubTarget] = useState<{
    playerId: string;
    team: 'teamA' | 'teamB';
  } | null>(null);

  // End Session confirmation modal state
  const [isEndSessionConfirmOpen, setIsEndSessionConfirmOpen] = useState(false);

  // Sound Synth Generator
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1100, now + i * 0.25);
        gain.gain.setValueAtTime(0.3, now + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.25);
        osc.stop(now + i * 0.25 + 0.2);
      }
    } catch (err) {
      console.error('Audio alarm error:', err);
    }
  };

  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 400]);
      } catch (err) {
        console.error('Vibration error:', err);
      }
    }
  };

  // Reset timer on new match
  useEffect(() => {
    if (!match) return;
    setTimerMode('regular');
    setSecondsRemaining(420); // 7 minutes
    setIsTimerRunning(true);
    setHasVibratedOneMinute(false);
    setIsAlarmRinging(false);
    setTeamAPenaltyKicks([]);
    setTeamBPenaltyKicks([]);
  }, [match?.id]);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && match && match.status === 'in_progress' && timerMode !== 'penalties' && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          const nextSec = prev - 1;

          // Vibration at 1m (60 seconds) remaining
          if (nextSec === 60 && !hasVibratedOneMinute) {
            triggerVibration();
            setHasVibratedOneMinute(true);
          }

          // Alarm at 0:00
          if (nextSec <= 0) {
            setIsTimerRunning(false);
            setIsAlarmRinging(true);
            triggerVibration();
            playAlarmSound();
            return 0;
          }

          return nextSec;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, match, timerMode, secondsRemaining, hasVibratedOneMinute]);

  if (!match) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">No Match Currently In Progress</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Report your arrival first, then click "Start Game" to divide players into 2 teams based on arrival time!
        </p>
        <button
          onClick={onStartMatchClick}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 inline-flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Start Match Now</span>
        </button>
      </div>
    );
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getParticipant = (id: string) =>
    session.participants.find((p) => p.userId === id);

  const handleLogEvent = async (
    playerId: string,
    type: 'goal' | 'assist' | 'save',
    team: 'teamA' | 'teamB'
  ) => {
    setLoading(true);
    try {
      await logEvent(session.code, playerId, type, team);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoEvent = async (eventId: string) => {
    setLoading(true);
    try {
      await undoEvent(session.code, eventId);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubModal = (playerId: string, team: 'teamA' | 'teamB') => {
    setSubTarget({ playerId, team });
  };

  const handleExecuteSub = async (replacementPlayerId?: string, isRandom?: boolean) => {
    if (!subTarget) return;
    const leavingName = getParticipant(subTarget.playerId)?.name || 'Player';
    setLoading(true);
    try {
      const res = await subPlayer(
        session.code,
        subTarget.playerId,
        subTarget.team,
        replacementPlayerId,
        isRandom
      );

      if (res.replacementId) {
        const repName = getParticipant(res.replacementId)?.name || 'Replacement';
        setSubMessage(`${leavingName} subbed out! ${repName} subbed in.`);
      } else {
        setSubMessage(`${leavingName} went to bench.`);
      }
      setTimeout(() => setSubMessage(null), 3500);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSubTarget(null);
    }
  };

  const handleConfirmEndSession = async () => {
    setLoading(true);
    try {
      await endSession(session.code);
      onRefresh();
      setIsEndSessionConfirmOpen(false);
      if (onSessionEnded) onSessionEnded();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Timer Edit handlers
  const handleOpenTimerEditModal = () => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    setEditMinutesInput(mins);
    setEditSecondsInput(secs);
    setIsTimerEditOpen(true);
  };

  const handleApplyTimerEdit = (m: number, s: number) => {
    const total = Math.max(0, m * 60 + s);
    setSecondsRemaining(total);
    if (total > 60) setHasVibratedOneMinute(false);
    if (total > 0) setIsAlarmRinging(false);
    setIsTimerEditOpen(false);
  };

  // Penalties calculation
  const teamAPenaltyScore = teamAPenaltyKicks.filter(Boolean).length;
  const teamBPenaltyScore = teamBPenaltyKicks.filter(Boolean).length;

  let penaltyWinner: 'teamA' | 'teamB' | null = null;
  const minKicks = Math.min(teamAPenaltyKicks.length, teamBPenaltyKicks.length);

  if (minKicks >= 2) {
    if (teamAPenaltyScore > teamBPenaltyScore) penaltyWinner = 'teamA';
    else if (teamBPenaltyScore > teamAPenaltyScore) penaltyWinner = 'teamB';
  } else if (teamAPenaltyKicks.length === 2 && teamBPenaltyKicks.length === 1) {
    if (teamAPenaltyScore === 2 && teamBPenaltyScore === 0) penaltyWinner = 'teamA';
  } else if (teamBPenaltyKicks.length === 2 && teamAPenaltyKicks.length === 1) {
    if (teamBPenaltyScore === 2 && teamAPenaltyScore === 0) penaltyWinner = 'teamB';
  }

  const isDraw = match.scoreA === match.scoreB;

  // List bench participants
  const benchParticipants = session.participants
    .filter((p) => match.benchPlayerIds.includes(p.userId))
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const subbingParticipant = subTarget ? getParticipant(subTarget.playerId) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Scoreboard Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 mb-4 text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-[10px] sm:text-xs">
              Match #{match.matchNumber}
            </span>
            <span className="font-bold text-slate-300 text-xs">{match.teamSize}v{match.teamSize} Format</span>
            {timerMode === 'extra_time' && (
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                Extra Time (1m)
              </span>
            )}
            {timerMode === 'penalties' && (
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                Penalties
              </span>
            )}
          </div>

          {/* TIMER AREA */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {/* Alarm Ringing Banner */}
            {isAlarmRinging && (
              <button
                onClick={() => setIsAlarmRinging(false)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse rounded-xl text-xs font-bold"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Stop Alarm</span>
              </button>
            )}

            {/* Timer controls or Transition Buttons */}
            {timerMode === 'regular' && secondsRemaining === 0 && isDraw ? (
              <button
                onClick={() => {
                  setTimerMode('extra_time');
                  setSecondsRemaining(60);
                  setIsTimerRunning(true);
                  setHasVibratedOneMinute(false);
                  setIsAlarmRinging(false);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all animate-bounce flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Extra Time (1m)</span>
              </button>
            ) : timerMode === 'extra_time' && secondsRemaining === 0 && isDraw ? (
              <button
                onClick={() => {
                  setTimerMode('penalties');
                  setIsAlarmRinging(false);
                }}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs rounded-xl shadow-lg transition-all animate-bounce flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Start Penalties</span>
              </button>
            ) : timerMode !== 'penalties' ? (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span
                  className={`font-mono font-black text-sm sm:text-base ${
                    secondsRemaining <= 60 ? 'text-amber-400 animate-pulse' : 'text-white'
                  }`}
                >
                  {formatTimer(secondsRemaining)}
                </span>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleOpenTimerEditModal}
                  className="p-1 text-slate-400 hover:text-emerald-400 transition-colors border-l border-slate-800 pl-1.5"
                  title="Edit Timer"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-xl text-purple-300 font-bold text-xs">
                <span>Penalties Mode</span>
              </div>
            )}

            {/* End Session button */}
            <button
              onClick={() => setIsEndSessionConfirmOpen(true)}
              className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              title="End session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Session</span>
            </button>
          </div>
        </div>

        {/* Live Score Display */}
        <div className="grid grid-cols-11 items-center gap-1 sm:gap-2 py-2">
          {/* Team A Score */}
          <div className="col-span-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <h3 className="text-sm sm:text-xl font-black text-white truncate max-w-[100px] sm:max-w-none">{match.teamA.name}</h3>
            </div>
            <span className="text-4xl sm:text-6xl font-black text-red-500 tracking-tight font-mono block">
              {match.scoreA}
            </span>
          </div>

          {/* VS Divider */}
          <div className="col-span-3 text-center">
            <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-widest block">VS</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 block mt-0.5">Live Pitch</span>
          </div>

          {/* Team B Score */}
          <div className="col-span-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <h3 className="text-sm sm:text-xl font-black text-white truncate max-w-[100px] sm:max-w-none">{match.teamB.name}</h3>
            </div>
            <span className="text-4xl sm:text-6xl font-black text-blue-500 tracking-tight font-mono block">
              {match.scoreB}
            </span>
          </div>
        </div>

        {/* PENALTY SHOOTOUT CONTROLLER PANEL */}
        {timerMode === 'penalties' && (
          <div className="mt-3 p-3 sm:p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/20 pb-2 gap-2">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-purple-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Penalty Shootout (2 Kicks Each + Sudden Death)</span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Note: Penalty goals do NOT count towards regular match goals in the Stats tab.
                </p>
              </div>

              {penaltyWinner && (
                <div className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    Winner: {penaltyWinner === 'teamA' ? match.teamA.name : match.teamB.name}!
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Team A Penalties */}
              <div className="bg-slate-950 border border-red-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between font-bold text-red-400">
                  <span>{match.teamA.name} Penalties</span>
                  <span className="font-mono text-sm">{teamAPenaltyScore} Scored</span>
                </div>

                <div className="flex items-center gap-1 min-h-[28px] flex-wrap">
                  {teamAPenaltyKicks.map((scored, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-[10px] ${
                        scored ? 'bg-emerald-500 text-slate-950' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {scored ? '⚽' : '❌'}
                    </span>
                  ))}
                  {teamAPenaltyKicks.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No kicks logged yet</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setTeamAPenaltyKicks((prev) => [...prev, true])}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg"
                  >
                    + Goal ⚽
                  </button>
                  <button
                    onClick={() => setTeamAPenaltyKicks((prev) => [...prev, false])}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 font-extrabold text-xs rounded-lg"
                  >
                    Missed ❌
                  </button>
                  {teamAPenaltyKicks.length > 0 && (
                    <button
                      onClick={() => setTeamAPenaltyKicks((prev) => prev.slice(0, -1))}
                      className="p-1 text-slate-500 hover:text-slate-300"
                      title="Undo last kick"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Team B Penalties */}
              <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between font-bold text-blue-400">
                  <span>{match.teamB.name} Penalties</span>
                  <span className="font-mono text-sm">{teamBPenaltyScore} Scored</span>
                </div>

                <div className="flex items-center gap-1 min-h-[28px] flex-wrap">
                  {teamBPenaltyKicks.map((scored, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-[10px] ${
                        scored ? 'bg-emerald-500 text-slate-950' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {scored ? '⚽' : '❌'}
                    </span>
                  ))}
                  {teamBPenaltyKicks.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No kicks logged yet</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setTeamBPenaltyKicks((prev) => [...prev, true])}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg"
                  >
                    + Goal ⚽
                  </button>
                  <button
                    onClick={() => setTeamBPenaltyKicks((prev) => [...prev, false])}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 font-extrabold text-xs rounded-lg"
                  >
                    Missed ❌
                  </button>
                  {teamBPenaltyKicks.length > 0 && (
                    <button
                      onClick={() => setTeamBPenaltyKicks((prev) => prev.slice(0, -1))}
                      className="p-1 text-slate-500 hover:text-slate-300"
                      title="Undo last kick"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {subMessage && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{subMessage}</span>
          </div>
        )}

        {/* Finish Match Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-center">
          <button
            onClick={() => onFinishMatchClick(penaltyWinner)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
          >
            End Match & Apply Bench Rotation
          </button>
        </div>
      </div>

      {/* Teams & In-Game Stat Reporting Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Team A Roster & Control */}
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <h3 className="font-extrabold text-white text-sm sm:text-base">{match.teamA.name}</h3>
            </div>
            <span className="text-[10px] sm:text-xs text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              {match.teamA.playerIds.length} Players
            </span>
          </div>

          <div className="space-y-2.5">
            {match.teamA.playerIds.map((pid) => {
              const p = getParticipant(pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl space-y-2.5"
                >
                  {/* Row 1: Player Avatar, Name + Sub Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-8 h-8 rounded-full ring-2 ring-red-500/30 shrink-0" textClassName="text-xs" />
                      <div className="min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-white block truncate">{p.name}</span>
                        {p.isTemp && <span className="text-[9px] text-amber-400 font-bold">Guest</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenSubModal(pid, 'teamA')}
                      className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs"
                      title="Sub Out Player"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold text-amber-400 hidden sm:inline">Sub</span>
                    </button>
                  </div>

                  {/* Row 2: Touch Stat Buttons Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleLogEvent(pid, 'goal', 'teamA')}
                      className="py-1.5 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-red-500/20 text-center"
                      title="Log Goal (+1 Score)"
                    >
                      + Goal
                    </button>
                    <button
                      onClick={() => handleLogEvent(pid, 'assist', 'teamA')}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all text-center"
                      title="Log Assist"
                    >
                      + Assist
                    </button>
                    <button
                      onClick={() => handleLogEvent(pid, 'save', 'teamA')}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all text-center"
                      title="Log Save"
                    >
                      + Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team B Roster & Control */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h3 className="font-extrabold text-white text-sm sm:text-base">{match.teamB.name}</h3>
            </div>
            <span className="text-[10px] sm:text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              {match.teamB.playerIds.length} Players
            </span>
          </div>

          <div className="space-y-2.5">
            {match.teamB.playerIds.map((pid) => {
              const p = getParticipant(pid);
              if (!p) return null;
              return (
                <div
                  key={pid}
                  className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl space-y-2.5"
                >
                  {/* Row 1: Player Avatar, Name + Sub Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 shrink-0" textClassName="text-xs" />
                      <div className="min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-white block truncate">{p.name}</span>
                        {p.isTemp && <span className="text-[9px] text-amber-400 font-bold">Guest</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenSubModal(pid, 'teamB')}
                      className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs"
                      title="Sub Out Player"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold text-amber-400 hidden sm:inline">Sub</span>
                    </button>
                  </div>

                  {/* Row 2: Touch Stat Buttons Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleLogEvent(pid, 'goal', 'teamB')}
                      className="py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-blue-500/20 text-center"
                      title="Log Goal (+1 Score)"
                    >
                      + Goal
                    </button>
                    <button
                      onClick={() => handleLogEvent(pid, 'assist', 'teamB')}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all text-center"
                      title="Log Assist"
                    >
                      + Assist
                    </button>
                    <button
                      onClick={() => handleLogEvent(pid, 'save', 'teamB')}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all text-center"
                      title="Log Save"
                    >
                      + Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Timeline & Match Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-sm sm:text-base">Match Events Timeline</h3>
        {match.events.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No match events logged yet. Tap +Goal, +Assist, or +Save on any player card above.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {match.events.slice().reverse().map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ev.team === 'teamA' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <span className="font-extrabold text-white capitalize">{ev.type}</span>
                  <span className="text-slate-300 font-semibold truncate">by {ev.playerName}</span>
                </div>

                <button
                  onClick={() => handleUndoEvent(ev.id)}
                  className="p-1 text-slate-500 hover:text-red-400 flex items-center gap-1 text-[10px] shrink-0"
                  title="Undo Event"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Match Timer Modal */}
      {isTimerEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Edit Match Timer</h3>
              </div>

              <button
                onClick={() => setIsTimerEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Quick Preset Duration
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[7, 5, 3, 1, 10, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setEditMinutesInput(m);
                      setEditSecondsInput(0);
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      editMinutesInput === m && editSecondsInput === 0
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {m} Minutes
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Adjustments */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Quick Adjustments
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                <button
                  onClick={() => handleApplyTimerEdit(Math.floor(secondsRemaining / 60) + 1, secondsRemaining % 60)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-center"
                >
                  +1 Min
                </button>
                <button
                  onClick={() => handleApplyTimerEdit(Math.max(0, Math.floor(secondsRemaining / 60) - 1), secondsRemaining % 60)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 rounded-xl text-center"
                >
                  -1 Min
                </button>
                <button
                  onClick={() => handleApplyTimerEdit(Math.floor((secondsRemaining + 30) / 60), (secondsRemaining + 30) % 60)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-center"
                >
                  +30 Sec
                </button>
                <button
                  onClick={() => handleApplyTimerEdit(Math.floor(Math.max(0, secondsRemaining - 30) / 60), Math.max(0, secondsRemaining - 30) % 60)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 rounded-xl text-center"
                >
                  -30 Sec
                </button>
              </div>
            </div>

            {/* Custom Inputs */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Set Custom Time (MM : SS)
              </span>
              <div className="flex items-center justify-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-bold mb-1">Minutes</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={editMinutesInput}
                    onChange={(e) => setEditMinutesInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-12 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-black text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <span className="text-2xl font-black text-slate-500 mt-4">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-bold mb-1">Seconds</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={editSecondsInput}
                    onChange={(e) => setEditSecondsInput(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-16 h-12 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-black text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsTimerEditOpen(false)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyTimerEdit(editMinutesInput, editSecondsInput)}
                className="w-2/3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Apply Custom Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Pop-Up Modal */}
      {subTarget && subbingParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Substitute Out</h3>
                  <p className="text-xs text-slate-400">
                    Leaving: <span className="font-bold text-white">{subbingParticipant.name}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSubTarget(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Option 1: Random pick from bench */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Option 1: Quick Auto / Random
              </span>
              <button
                onClick={() => handleExecuteSub(undefined, true)}
                className="w-full p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-between font-bold text-xs transition-all active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <Shuffle className="w-4 h-4" />
                  <span>Random Pick from Bench Queue</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-black">
                  Random
                </span>
              </button>
            </div>

            {/* Option 2: Choose specific player from bench */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Option 2: Select Specific Bench Player ({benchParticipants.length})
              </span>

              {benchParticipants.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center text-xs text-slate-500 italic">
                  Bench queue is currently empty.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {benchParticipants.map((bp, idx) => (
                    <div
                      key={bp.userId}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 text-xs hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-slate-500 font-bold text-[11px]">#{idx + 1}</span>
                        <img src={bp.avatarUrl} alt={bp.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-white block truncate">{bp.name}</span>
                          <span className="text-[10px] text-slate-500">
                            Arrived {new Date(bp.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecuteSub(bp.userId, false)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Sub In
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Option 3: Sub out without replacement */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleExecuteSub(undefined, false)}
                className="text-xs text-amber-400 hover:underline font-medium"
              >
                Sub out without replacement
              </button>

              <button
                onClick={() => setSubTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      {isEndSessionConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-lg text-white">End Pickup Session?</h3>
              <p className="text-xs text-slate-400">
                This will save the active match to history and set the pitch state back to Arrivals & Bench.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsEndSessionConfirmOpen(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndSession}
                className="w-1/2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl shadow-lg shadow-red-500/20"
              >
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
