import React from 'react';
import { SessionData, UserProfile } from '../types';
import { leaveSession } from '../lib/api';
import { PlayerAvatar } from './Avatar';
import { Users, Clock, ArrowUpRight, LogOut, Shield } from 'lucide-react';

interface BenchListProps {
  session: SessionData;
  user: UserProfile | null;
  onRefresh: () => void;
}

export const BenchList: React.FC<BenchListProps> = ({ session, user, onRefresh }) => {
  const match = session.currentMatch;
  const benchIds = match ? match.benchPlayerIds : [];

  const getParticipant = (id: string) =>
    session.participants.find((p) => p.userId === id && p.status !== 'left');

  const benchParticipants = benchIds
    .map((id) => getParticipant(id))
    .filter(Boolean) as any[];

  // Also show off-pitch arrived players if no active match
  const arrivedList = !match
    ? session.participants.filter((p) => p.status !== 'left').sort((a, b) => a.arrivedAt - b.arrivedAt)
    : [];

  const listToRender = match ? benchParticipants : arrivedList;

  const handleLeaveSession = async (userId: string) => {
    try {
      await leaveSession(session.code, userId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const formatArrival = (timestamp: number) => {
    const diffMin = Math.round((Date.now() - timestamp) / 60000);
    if (diffMin <= 0) return 'Just arrived';
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Bench Queue (Rotation Line)</h3>
            <p className="text-xs text-slate-400">
              Ordered by arrival timestamp. Top players enter the pitch first when match ends.
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          {listToRender.length} Waiting
        </span>
      </div>

      {listToRender.length === 0 ? (
        <div className="text-center py-10 text-slate-500 space-y-2">
          <Users className="w-10 h-10 mx-auto opacity-50" />
          <p className="text-xs font-bold">Bench is currently empty</p>
          <p className="text-[11px] text-slate-600">All checked-in players are currently on the pitch!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listToRender.map((p, idx) => {
            const isNextUp = idx < session.teamSize;
            return (
              <div
                key={p.userId}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 bg-slate-950/80 transition-all ${
                  isNextUp ? 'border-amber-500/50' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-10 h-10 rounded-full ring-2 ring-slate-800" textClassName="text-sm" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="font-bold text-sm text-white block truncate">{p.name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatArrival(p.arrivedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isNextUp ? (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Next In Line
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">
                      In Queue
                    </span>
                  )}

                  {(user?.id === p.userId || p.addedByUserId === user?.id) && (
                    <button
                      onClick={() => handleLeaveSession(p.userId)}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5 mt-0.5"
                      title="Leave Session"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Leave</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
