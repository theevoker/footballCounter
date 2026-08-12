import React, { useState } from 'react';
import { SessionData } from '../types';
import { finishMatch } from '../lib/api';
import { Trophy, Flame, Users, ArrowRight, CheckCircle, Sparkles, Shuffle } from 'lucide-react';

interface PostMatchModalProps {
  isOpen: boolean;
  session: SessionData;
  penaltyWinner?: 'teamA' | 'teamB' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  isOpen,
  session,
  penaltyWinner,
  onClose,
  onSuccess,
}) => {
  const match = session.currentMatch;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !match) return null;

  const winner = match.scoreA > match.scoreB
    ? 'teamA'
    : match.scoreB > match.scoreA
    ? 'teamB'
    : penaltyWinner || 'draw';

  const winningTeam = winner === 'teamA' ? match.teamA : winner === 'teamB' ? match.teamB : null;
  const losingTeam = winner === 'teamA' ? match.teamB : winner === 'teamB' ? match.teamA : null;

  const getParticipant = (id: string) =>
    session.participants.find((p) => p.userId === id);

  const benchIds = match.benchPlayerIds;
  const targetTeamSize = session.teamSize;

  const benchParticipants = session.participants
    .filter((p) => benchIds.includes(p.userId) && p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const benchStarters = benchParticipants.slice(0, targetTeamSize);
  const neededFillers = Math.max(0, targetTeamSize - benchStarters.length);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      await finishMatch(session.code, penaltyWinner || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative text-slate-100 my-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-slate-950 font-black shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Match Complete & Bench Rotation</h2>
          <p className="text-xs text-slate-400">
            Confirm match result and apply automatic rotation rules for the next game!
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Score Summary Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-around text-center">
          <div>
            <span className="text-xs font-bold text-red-400 block">{match.teamA.name}</span>
            <span className="text-4xl font-mono font-black text-white">{match.scoreA}</span>
          </div>

          <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            {winner === 'draw' ? 'DRAW' : 'FINAL'}
          </div>

          <div>
            <span className="text-xs font-bold text-blue-400 block">{match.teamB.name}</span>
            <span className="text-4xl font-mono font-black text-white">{match.scoreB}</span>
          </div>
        </div>

        {/* Rotation Explanation Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <h3 className="font-extrabold text-white flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-emerald-400" />
            <span>Automatic Bench Rotation Outcome:</span>
          </h3>

          <div className="space-y-2 text-slate-300">
            {winningTeam ? (
              <div className="flex items-start gap-2 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold block">Winners Stay ({winningTeam.name})</span>
                  <span className="text-[11px] opacity-90">
                    All {winningTeam.playerIds.length} players remain on the pitch for the next game!
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-amber-400">
                <span className="font-bold block">Draw / Coinflip</span>
                <span className="text-[11px]">One team will stay on pitch and challenger team enters.</span>
              </div>
            )}

            <div className="flex items-start gap-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-300">
              <Users className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">Bench Enters ({benchStarters.length} Players)</span>
                <span className="text-[11px] opacity-90">
                  {benchStarters.length > 0
                    ? `${benchStarters.map((p) => p.name).join(', ')} enter in arrival order.`
                    : 'No bench players waiting.'}
                </span>
              </div>
            </div>

            {neededFillers > 0 && losingTeam && (
              <div className="flex items-start gap-2 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-300">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold block">Bench Fillers ({neededFillers} Needed)</span>
                  <span className="text-[11px] opacity-90">
                    Bench didn't have enough players for a full team ({benchStarters.length}/{targetTeamSize}).
                    {neededFillers} random players from {losingTeam.name} will fill in the remaining spots!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleFinish}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
        >
          {loading ? 'Processing Rotation...' : 'Confirm & Launch Next Match'}
        </button>
      </div>
    </div>
  );
};
