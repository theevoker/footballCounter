import React, { useState } from 'react';
import { SessionData, Match, MatchEvent } from '../types';
import { editHistoricalMatch } from '../lib/api';
import { History, Calendar, Clock, Lock, Edit3, Trash2, Plus, Shield, Check, X, Award } from 'lucide-react';

interface MatchHistoryProps {
  session: SessionData;
  onRefresh: () => void;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ session, onRefresh }) => {
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editScoreA, setEditScoreA] = useState<number>(0);
  const [editScoreB, setEditScoreB] = useState<number>(0);
  const [editTeamAName, setEditTeamAName] = useState<string>('');
  const [editTeamBName, setEditTeamBName] = useState<string>('');
  const [editEvents, setEditEvents] = useState<MatchEvent[]>([]);

  const [newEventPlayerId, setNewEventPlayerId] = useState<string>('');
  const [newEventTeam, setNewEventTeam] = useState<'teamA' | 'teamB'>('teamA');
  const [newEventType, setNewEventType] = useState<'goal' | 'assist' | 'save'>('goal');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getParticipant = (id: string) =>
    session.participants.find((p) => p.userId === id);

  const handleOpenEdit = (match: Match) => {
    setEditingMatch(match);
    setEditScoreA(match.scoreA);
    setEditScoreB(match.scoreB);
    setEditTeamAName(match.teamA.name);
    setEditTeamBName(match.teamB.name);
    setEditEvents([...match.events]);
    setErrorMsg(null);

    // Default new event player to first teamA player
    if (match.teamA.playerIds.length > 0) {
      setNewEventPlayerId(match.teamA.playerIds[0]);
      setNewEventTeam('teamA');
    }
  };

  const handleAddEvent = () => {
    if (!newEventPlayerId || !editingMatch) return;
    const p = getParticipant(newEventPlayerId);
    const newEv: MatchEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: newEventType,
      playerId: newEventPlayerId,
      playerName: p ? p.name : 'Player',
      team: newEventTeam,
      timestamp: Date.now(),
    };

    setEditEvents([...editEvents, newEv]);

    // Auto-increment score if adding a goal
    if (newEventType === 'goal') {
      if (newEventTeam === 'teamA') setEditScoreA((s) => s + 1);
      else setEditScoreB((s) => s + 1);
    }
  };

  const handleRemoveEvent = (eventId: string) => {
    const ev = editEvents.find((e) => e.id === eventId);
    setEditEvents(editEvents.filter((e) => e.id !== eventId));

    // Auto-decrement score if removing a goal
    if (ev && ev.type === 'goal') {
      if (ev.team === 'teamA' && editScoreA > 0) setEditScoreA((s) => s - 1);
      if (ev.team === 'teamB' && editScoreB > 0) setEditScoreB((s) => s - 1);
    }
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await editHistoricalMatch(session.code, editingMatch.id, {
        scoreA: editScoreA,
        scoreB: editScoreB,
        teamAName: editTeamAName,
        teamBName: editTeamBName,
        events: editEvents,
      });
      onRefresh();
      setEditingMatch(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save match changes');
    } finally {
      setSaving(false);
    }
  };

  const matchHistory = session.matchHistory || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white">Match History</h2>
          </div>
          <p className="text-xs text-slate-400">
            Past pitch results and replay logs. Edits permitted within 12 hours of match completion.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800 text-xs font-bold text-slate-300">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>{matchHistory.length} Total Matches Recorded</span>
        </div>
      </div>

      {/* Match History List */}
      {matchHistory.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3 max-w-lg mx-auto">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-base">No Recorded Matches Yet</h3>
          <p className="text-xs text-slate-500">
            Start a game from the Arrivals & Bench tab to record game logs and stats.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchHistory.map((m) => {
            const matchTime = m.endTime || m.startTime;
            const diffMs = Date.now() - matchTime;
            const diffHours = diffMs / (1000 * 60 * 60);
            const isEditable = diffHours <= 12;
            const remainingHours = Math.max(0, Math.floor(12 - diffHours));

            const formattedDate = new Date(matchTime).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const formattedTime = new Date(matchTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Match Card Top Metadata */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Match #{m.matchNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formattedDate} at {formattedTime}</span>
                    </div>
                  </div>

                  {/* Editability status button */}
                  <div>
                    {isEditable ? (
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Game ({remainingHours}h left)</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1 bg-slate-950 text-slate-500 border border-slate-800 font-medium text-xs rounded-xl flex items-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked (12h limit passed)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Summary Display */}
                <div className="grid grid-cols-11 items-center gap-2 py-2">
                  <div className="col-span-4 text-center">
                    <span className="text-xs font-bold text-slate-300 block truncate">{m.teamA.name}</span>
                    <span className="text-3xl font-black text-red-500 font-mono">{m.scoreA}</span>
                  </div>

                  <div className="col-span-3 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">FT</span>
                    {m.winner === 'draw' ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                        Draw
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                        {m.winner === 'teamA' ? m.teamA.name : m.teamB.name} Won
                      </span>
                    )}
                  </div>

                  <div className="col-span-4 text-center">
                    <span className="text-xs font-bold text-slate-300 block truncate">{m.teamB.name}</span>
                    <span className="text-3xl font-black text-blue-500 font-mono">{m.scoreB}</span>
                  </div>
                </div>

                {/* Rosters & Events List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 text-xs">
                  {/* Team A Roster */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-red-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>{m.teamA.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.teamA.playerIds.map((pid) => {
                        const p = getParticipant(pid);
                        return (
                          <span key={pid} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-slate-300 font-medium">
                            {p ? p.name : 'Player'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Team B Roster */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>{m.teamB.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.teamB.playerIds.map((pid) => {
                        const p = getParticipant(pid);
                        return (
                          <span key={pid} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-slate-300 font-medium">
                            {p ? p.name : 'Player'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Events list if available */}
                {m.events && m.events.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Match Highlights Log
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.events.map((ev) => (
                        <span
                          key={ev.id}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                            ev.team === 'teamA'
                              ? 'bg-red-500/10 border-red-500/30 text-red-300'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          }`}
                        >
                          <span className="capitalize">{ev.type}:</span>
                          <span>{ev.playerName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Historical Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 my-8 text-slate-100 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Edit Match #{editingMatch.matchNumber}</h3>
              </div>
              <button
                onClick={() => setEditingMatch(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Scores & Team Names */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Score & Teams</span>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Team A */}
                <div className="space-y-2">
                  <label className="text-xs text-red-400 font-bold block">Team Red Name</label>
                  <input
                    type="text"
                    value={editTeamAName}
                    onChange={(e) => setEditTeamAName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">Score:</span>
                    <button
                      type="button"
                      onClick={() => setEditScoreA(Math.max(0, editScoreA - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-lg text-white w-6 text-center">{editScoreA}</span>
                    <button
                      type="button"
                      onClick={() => setEditScoreA(editScoreA + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Team B */}
                <div className="space-y-2">
                  <label className="text-xs text-blue-400 font-bold block">Team Blue Name</label>
                  <input
                    type="text"
                    value={editTeamBName}
                    onChange={(e) => setEditTeamBName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">Score:</span>
                    <button
                      type="button"
                      onClick={() => setEditScoreB(Math.max(0, editScoreB - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-lg text-white w-6 text-center">{editScoreB}</span>
                    <button
                      type="button"
                      onClick={() => setEditScoreB(editScoreB + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Manager */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Match Events Log ({editEvents.length})
              </span>

              {/* Event List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {editEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No match events recorded.</p>
                ) : (
                  editEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ev.team === 'teamA' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-bold text-white uppercase">{ev.type}</span>
                        <span className="text-slate-300">by {ev.playerName}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveEvent(ev.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                        title="Remove Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Event Form */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-300 block">+ Add Match Event</span>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Player</label>
                    <select
                      value={newEventPlayerId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setNewEventPlayerId(pid);
                        if (editingMatch.teamA.playerIds.includes(pid)) setNewEventTeam('teamA');
                        if (editingMatch.teamB.playerIds.includes(pid)) setNewEventTeam('teamB');
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-white"
                    >
                      <optgroup label={editTeamAName || 'Team Red'}>
                        {editingMatch.teamA.playerIds.map((pid) => {
                          const p = getParticipant(pid);
                          return (
                            <option key={pid} value={pid}>
                              {p ? p.name : 'Player'}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={editTeamBName || 'Team Blue'}>
                        {editingMatch.teamB.playerIds.map((pid) => {
                          const p = getParticipant(pid);
                          return (
                            <option key={pid} value={pid}>
                              {p ? p.name : 'Player'}
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Event Type</label>
                    <select
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-white"
                    >
                      <option value="goal">Goal</option>
                      <option value="assist">Assist</option>
                      <option value="save">Save</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddEvent}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveMatch}
                disabled={saving}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Match Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
