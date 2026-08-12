import React, { useState } from 'react';
import { SessionData, UserProfile } from '../types';
import { editTeams } from '../lib/api';
import { PlayerAvatar } from './Avatar';
import { Shuffle, ArrowLeftRight, Check, ArrowRight, Shield, Users, HelpCircle, Sparkles } from 'lucide-react';

interface TrustTeamEditorProps {
  session: SessionData;
  onRefresh: () => void;
}

export const TrustTeamEditor: React.FC<TrustTeamEditorProps> = ({ session, onRefresh }) => {
  const match = session.currentMatch;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!match) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
        <Shield className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Active Match</h3>
        <p className="text-xs text-slate-400">
          Start a match first to edit teams or move players between teams and the bench.
        </p>
      </div>
    );
  }

  const allParticipants = session.participants.filter((p) => p.status !== 'left');
  const getParticipant = (id: string) => allParticipants.find((p) => p.userId === id);

  const teamAIds = match.teamA.playerIds;
  const teamBIds = match.teamB.playerIds;
  const benchIds = match.benchPlayerIds;

  const handleMovePlayer = async (targetContainer: 'teamA' | 'teamB' | 'bench') => {
    if (!selectedPlayerId) return;

    let newA = teamAIds.filter((id) => id !== selectedPlayerId);
    let newB = teamBIds.filter((id) => id !== selectedPlayerId);
    let newBench = benchIds.filter((id) => id !== selectedPlayerId);

    if (targetContainer === 'teamA') newA.push(selectedPlayerId);
    else if (targetContainer === 'teamB') newB.push(selectedPlayerId);
    else if (targetContainer === 'bench') newBench.push(selectedPlayerId);

    setLoading(true);
    try {
      await editTeams(session.code, newA, newB, newBench);
      setSelectedPlayerId(null);
      setSuccessMessage('Teams updated!');
      setTimeout(() => setSuccessMessage(null), 2000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShuffleTeams = async () => {
    const onPitch = [...teamAIds, ...teamBIds].sort(() => Math.random() - 0.5);
    const half = Math.ceil(onPitch.length / 2);
    const newA = onPitch.slice(0, half);
    const newB = onPitch.slice(half);

    setLoading(true);
    try {
      await editTeams(session.code, newA, newB, benchIds);
      setSuccessMessage('Pitch players re-randomized!');
      setTimeout(() => setSuccessMessage(null), 2000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trust Mode Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trust-Based Open Editor</span>
            </div>
            <h2 className="text-2xl font-black text-white">Edit Teams & Bench</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tap any player to select them, then tap where you want to move them (Red Team, Blue Team, or Bench).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShuffleTeams}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <span>Reshuffle Pitch Players</span>
            </button>
          </div>
        </div>

        {selectedPlayerId && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-emerald-400">
              Selected: {getParticipant(selectedPlayerId)?.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMovePlayer('teamA')}
                className="px-3 py-1.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Move to {match.teamA.name}
              </button>
              <button
                onClick={() => handleMovePlayer('teamB')}
                className="px-3 py-1.5 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
              >
                Move to {match.teamB.name}
              </button>
              <button
                onClick={() => handleMovePlayer('bench')}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                Move to Bench
              </button>
              <button
                onClick={() => setSelectedPlayerId(null)}
                className="px-2 py-1.5 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* 3 Column Drag / Tap Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Team A Column */}
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50" />
              <h3 className="font-bold text-white text-base">{match.teamA.name}</h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
              {teamAIds.length} Players
            </span>
          </div>

          <div className="space-y-2 min-h-[220px]">
            {teamAIds.map((id) => {
              const p = getParticipant(id);
              if (!p) return null;
              const isSelected = selectedPlayerId === id;
              return (
                <div
                  key={id}
                  onClick={() => setSelectedPlayerId(isSelected ? null : id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-500/20 border-red-400 ring-2 ring-red-500 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-8 h-8 rounded-full" textClassName="text-xs" />
                    <div>
                      <span className="block font-bold text-xs text-white">{p.name}</span>
                      {p.isTemp && <span className="text-[9px] text-amber-400">Guest</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-red-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Team B Column */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
              <h3 className="font-bold text-white text-base">{match.teamB.name}</h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              {teamBIds.length} Players
            </span>
          </div>

          <div className="space-y-2 min-h-[220px]">
            {teamBIds.map((id) => {
              const p = getParticipant(id);
              if (!p) return null;
              const isSelected = selectedPlayerId === id;
              return (
                <div
                  key={id}
                  onClick={() => setSelectedPlayerId(isSelected ? null : id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-500 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-8 h-8 rounded-full" textClassName="text-xs" />
                    <div>
                      <span className="block font-bold text-xs text-white">{p.name}</span>
                      {p.isTemp && <span className="text-[9px] text-amber-400">Guest</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench Column */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
              <h3 className="font-bold text-white text-base">Bench (Queue)</h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
              {benchIds.length} Waiting
            </span>
          </div>

          <div className="space-y-2 min-h-[220px]">
            {benchIds.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Bench is currently empty</p>
            ) : (
              benchIds.map((id, index) => {
                const p = getParticipant(id);
                if (!p) return null;
                const isSelected = selectedPlayerId === id;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedPlayerId(isSelected ? null : id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-500 scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-amber-400 w-4">#{index + 1}</span>
                      <PlayerAvatar src={p.avatarUrl} name={p.name} className="w-8 h-8 rounded-full" textClassName="text-xs" />
                      <div>
                        <span className="block font-bold text-xs text-white">{p.name}</span>
                        {p.isTemp && <span className="text-[9px] text-amber-400">Guest</span>}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
