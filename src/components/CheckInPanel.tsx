import React, { useState } from 'react';
import { SessionData, UserProfile, SessionParticipant } from '../types';
import { checkInToSession, addTempPlayer } from '../lib/api';
import { PlayerAvatar } from './Avatar';
import { MapPin, UserPlus, Clock, Play, Users, CheckCircle, ShieldAlert, Sparkles, Plus } from 'lucide-react';

interface CheckInPanelProps {
  session: SessionData;
  user: UserProfile | null;
  onRefresh: () => void;
  onStartGameClick: () => void;
  onOpenAuth: () => void;
}

export const CheckInPanel: React.FC<CheckInPanelProps> = ({
  session,
  user,
  onRefresh,
  onStartGameClick,
  onOpenAuth,
}) => {
  const [showAddTempModal, setShowAddTempModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current logged in user has already reported arrival
  const userParticipant = user
    ? session.participants.find((p) => p.userId === user.id && p.status !== 'left')
    : null;

  const activeParticipants = session.participants
    .filter((p) => p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const handleSelfCheckIn = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await checkInToSession(session.code, user.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTempPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addTempPlayer(session.code, tempName.trim(), user.id);
      setTempName('');
      setShowAddTempModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add guest player');
    } finally {
      setLoading(false);
    }
  };

  const formatArrival = (timestamp: number) => {
    const diffMin = Math.round((Date.now() - timestamp) / 60000);
    if (diffMin <= 0) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const hours = Math.floor(diffMin / 60);
    return `${hours}h ${diffMin % 60}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Check-in Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4" />
              <span>Meeting Place Check-In</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Arrivals & Pitch Queue
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Report your arrival when you reach the meeting spot. Teams are created automatically based on who arrived first!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Self Arrival Button */}
            {userParticipant ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <span className="block text-xs font-bold">You're Checked In!</span>
                  <span className="block text-[10px] text-emerald-300">
                    Arrived {formatArrival(userParticipant.arrivedAt)}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSelfCheckIn}
                disabled={loading}
                className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
              >
                <MapPin className="w-5 h-5 fill-slate-950" />
                <span>{loading ? 'Checking In...' : 'Report Arrival ("I\'m Here!")'}</span>
              </button>
            )}

            {/* Add Temp Player Button */}
            <button
              onClick={() => {
                if (!user) onOpenAuth();
                else setShowAddTempModal(true);
              }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-bold text-xs px-4 py-3.5 rounded-2xl transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Add Guest Player</span>
            </button>

            {/* Start Game Button */}
            <button
              onClick={onStartGameClick}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs px-4 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Start Match</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}
      </div>

      {/* Arrival Order List (First-Come First-Served) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">First-Come First-Served Queue</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              {activeParticipants.length} Players Arrived
            </span>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Ordered by arrival time (Top = 1st arrived)
          </span>
        </div>

        {activeParticipants.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800/80 p-6">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">No players checked in yet</p>
            <p className="text-xs text-slate-500 mt-1">Be the first to click "Report Arrival" when you get to the venue!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeParticipants.map((participant, index) => {
              const isFirstTen = index < (session.teamSize * 2);
              return (
                <div
                  key={participant.id}
                  className={`relative bg-slate-950/80 border p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                    participant.status === 'playing'
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : participant.status === 'bench'
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <PlayerAvatar
                        src={participant.avatarUrl}
                        name={participant.name}
                        className="w-10 h-10 rounded-full ring-2 ring-slate-800"
                        textClassName="text-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-700 text-[10px] font-black text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-100 truncate">
                          {participant.name}
                        </span>
                        {participant.isTemp && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                            Guest
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatArrival(participant.arrivedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div>
                    {participant.status === 'playing' ? (
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold uppercase rounded-full">
                        On Pitch
                      </span>
                    ) : participant.status === 'bench' ? (
                      <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase rounded-full">
                        Bench
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase rounded-full">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Temporary Player Modal */}
      {showAddTempModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-xl font-bold text-white mb-2">Add Guest / Temp Player</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a friend who doesn't have an account on your phone. They will be added to the arrival queue under your host account!
            </p>

            <form onSubmit={handleAddTempPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Guest Player Name *
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Alex, David, Sam"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTempModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  {loading ? 'Adding...' : 'Add Guest to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
