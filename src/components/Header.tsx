import React from 'react';
import { UserProfile } from '../types';
import { PlayerAvatar } from './Avatar';
import { Users, Trophy, LogOut, UserPlus, Shield, Shuffle, History, Edit3 } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  sessionTitle?: string;
  sport?: string;
  hasActiveMatch?: boolean;
  activeTab: 'queue' | 'match' | 'trust_edit' | 'history' | 'leaderboard';
  setActiveTab: (tab: 'queue' | 'match' | 'trust_edit' | 'history' | 'leaderboard') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSwitchAccount: () => void;
  onEditProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  sessionTitle,
  hasActiveMatch = false,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onSwitchAccount,
  onEditProfile,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 px-3 sm:px-4 py-2.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Top bar branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0 text-base sm:text-lg">
              ⚽
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white truncate">SquadPicker</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Open Pitch
                </span>
              </div>
              {sessionTitle && (
                <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[280px]">
                  {sessionTitle}
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Desktop / Tablet view) */}
          <div className="hidden md:flex items-center justify-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'queue'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Arrivals & Bench</span>
            </button>

            <button
              disabled={!hasActiveMatch}
              onClick={() => {
                if (hasActiveMatch) setActiveTab('match');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'match'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : hasActiveMatch
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'opacity-40 text-slate-600 cursor-not-allowed bg-slate-900/40'
              }`}
              title={!hasActiveMatch ? 'No match currently in progress' : 'View Live Match'}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Match</span>
              {!hasActiveMatch && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-600 font-mono font-bold">
                  Inactive
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('trust_edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'trust_edit'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Edit Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Match History</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>
          </div>

          {/* Account & Profile Menu */}
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 pr-2 rounded-full border border-slate-700/70">
                <button
                  onClick={onEditProfile}
                  className="flex items-center gap-1.5 hover:opacity-85 transition-opacity text-left group"
                  title="Click to edit profile (name & picture)"
                >
                  <PlayerAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-emerald-500/50 group-hover:ring-emerald-400"
                    textClassName="text-[10px]"
                  />
                  <div className="hidden sm:flex flex-col text-left text-xs max-w-[90px] truncate">
                    <span className="font-semibold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">
                      {user.name}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate">@{user.username}</span>
                  </div>
                  <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors hidden sm:block" />
                </button>

                <div className="hidden sm:block h-4 w-px bg-slate-700 mx-0.5" />

                <button
                  onClick={onSwitchAccount}
                  className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Sign In as Different Account"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Portrait Bottom Dock Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-1 py-1 shadow-2xl">
        <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto">
          {/* Tab 1: Arrivals */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'queue'
                ? 'bg-emerald-500/15 text-emerald-400 font-extrabold border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight tracking-tight">Arrivals</span>
          </button>

          {/* Tab 2: Match */}
          <button
            disabled={!hasActiveMatch}
            onClick={() => {
              if (hasActiveMatch) setActiveTab('match');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative ${
              activeTab === 'match'
                ? 'bg-emerald-500/15 text-emerald-400 font-extrabold border-t-2 border-emerald-400'
                : hasActiveMatch
                ? 'text-slate-300 hover:text-slate-100'
                : 'opacity-40 text-slate-600 cursor-not-allowed'
            }`}
          >
            {hasActiveMatch && (
              <span className="absolute top-1.5 right-2 sm:right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
            <Shield className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight tracking-tight">Match</span>
          </button>

          {/* Tab 3: Teams */}
          <button
            onClick={() => setActiveTab('trust_edit')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'trust_edit'
                ? 'bg-emerald-500/15 text-emerald-400 font-extrabold border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight tracking-tight">Teams</span>
          </button>

          {/* Tab 4: History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-500/15 text-emerald-400 font-extrabold border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight tracking-tight">History</span>
          </button>

          {/* Tab 5: Stats */}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-500/15 text-emerald-400 font-extrabold border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight tracking-tight">Stats</span>
          </button>
        </div>
      </nav>
    </>
  );
};

