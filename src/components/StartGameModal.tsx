import React, { useState } from 'react';
import { SessionData } from '../types';
import { startGame } from '../lib/api';
import { X, Play, Users, Shuffle, Clock, Shield } from 'lucide-react';

interface StartGameModalProps {
  isOpen: boolean;
  session: SessionData;
  onClose: () => void;
  onSuccess: () => void;
}

export const StartGameModal: React.FC<StartGameModalProps> = ({
  isOpen,
  session,
  onClose,
  onSuccess,
}) => {
  const [teamSize, setTeamSize] = useState<number>(session.teamSize || 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const arrivedParticipants = session.participants
    .filter((p) => p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const totalPlayersNeeded = teamSize * 2;
  const starters = arrivedParticipants.slice(0, totalPlayersNeeded);
  const bench = arrivedParticipants.slice(totalPlayersNeeded);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await startGame(session.code, teamSize);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-slate-100 my-8 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <Shuffle className="w-3.5 h-3.5" />
            <span>Automated Team Generator</span>
          </div>
          <h2 className="text-2xl font-black text-white">Start New Match</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose format size. The top arrived players will be randomly divided into 2 teams, and the rest join the bench!
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Team Size Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Choose Format (Players per Team):
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTeamSize(size)}
                className={`py-3 rounded-2xl font-black text-sm border transition-all ${
                  teamSize === size
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                {size}v{size}
                <span className="block text-[10px] font-normal opacity-80">{size * 2} Total</span>
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown preview */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>1st Come 1st Served Pitch Allocation</span>
            </span>
            <span className="font-bold text-emerald-400">
              {arrivedParticipants.length} Available Arrived
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Going on Pitch</span>
              <span className="text-lg font-black text-white">
                {Math.min(starters.length, totalPlayersNeeded)} / {totalPlayersNeeded} Players
              </span>
              <p className="text-[10px] text-emerald-400 mt-1">
                Top {totalPlayersNeeded} arrived players randomly split into Red vs Blue
              </p>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Going to Bench</span>
              <span className="text-lg font-black text-amber-400">
                {bench.length} Players
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Waiting for 2nd match in arrival order
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading || arrivedParticipants.length < 2}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
        >
          {loading ? 'Creating Match...' : `Randomly Divide Top ${totalPlayersNeeded} Players & Start`}
        </button>
      </div>
    </div>
  );
};
