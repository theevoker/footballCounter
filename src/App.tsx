import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, SessionData } from './types';
import { fetchMe, getSession, setAuthToken } from './lib/api';
import { Header } from './components/Header';
import { CheckInPanel } from './components/CheckInPanel';
import { ActiveMatch } from './components/ActiveMatch';
import { BenchList } from './components/BenchList';
import { TrustTeamEditor } from './components/TrustTeamEditor';
import { MatchHistory } from './components/MatchHistory';
import { Leaderboard } from './components/Leaderboard';
import { AuthModal } from './components/AuthModal';
import { EditProfileModal } from './components/EditProfileModal';
import { StartGameModal } from './components/StartGameModal';
import { PostMatchModal } from './components/PostMatchModal';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);

  // Default tab: Arrivals & Bench
  const [activeTab, setActiveTab] = useState<'queue' | 'match' | 'trust_edit' | 'history' | 'leaderboard'>('queue');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isStartGameOpen, setIsStartGameOpen] = useState(false);
  const [isPostMatchOpen, setIsPostMatchOpen] = useState(false);
  const [penaltyWinner, setPenaltyWinner] = useState<'teamA' | 'teamB' | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user & single session on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const u = await fetchMe();
        if (u) {
          setUser(u);
        } else {
          setUser(null);
        }

        const s = await getSession();
        setSession(s);
      } catch (err) {
        console.error('Failed loading initial data', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Refresh active session data
  const refreshSession = useCallback(async () => {
    try {
      const updated = await getSession();
      setSession(updated);
    } catch (err) {
      console.error('Failed to poll session', err);
    }
  }, []);

  // Live polling every 3s to keep state synced across all player devices
  useEffect(() => {
    const interval = setInterval(refreshSession, 3000);
    return () => clearInterval(interval);
  }, [refreshSession]);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthOpen(true);
  };

  const hasActiveMatch = Boolean(
    session?.currentMatch && session.currentMatch.status === 'in_progress'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs font-bold text-slate-400">Loading SquadPicker...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header
        user={user}
        sessionTitle={session?.title}
        sport={session?.sport}
        hasActiveMatch={hasActiveMatch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onSwitchAccount={() => setIsAuthOpen(true)}
        onEditProfile={() => setIsEditProfileOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 space-y-6">
        {session && (
          <>
            {/* View Switcher Content */}
            {activeTab === 'queue' && (
              <div className="space-y-6">
                <CheckInPanel
                  session={session}
                  user={user}
                  onRefresh={refreshSession}
                  onStartGameClick={() => setIsStartGameOpen(true)}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
                <BenchList
                  session={session}
                  user={user}
                  onRefresh={refreshSession}
                />
              </div>
            )}

            {activeTab === 'match' && (
              <div className="space-y-6">
                <ActiveMatch
                  session={session}
                  user={user}
                  onRefresh={refreshSession}
                  onFinishMatchClick={(pWinner) => {
                    setPenaltyWinner(pWinner || null);
                    setIsPostMatchOpen(true);
                  }}
                  onStartMatchClick={() => setIsStartGameOpen(true)}
                  onSessionEnded={() => setActiveTab('queue')}
                />
                <BenchList
                  session={session}
                  user={user}
                  onRefresh={refreshSession}
                />
              </div>
            )}

            {activeTab === 'trust_edit' && (
              <TrustTeamEditor
                session={session}
                onRefresh={refreshSession}
              />
            )}

            {activeTab === 'history' && (
              <MatchHistory
                session={session}
                onRefresh={refreshSession}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard session={session} />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          setIsAuthOpen(false);
          refreshSession();
        }}
      />

      {user && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          user={user}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            refreshSession();
          }}
        />
      )}

      {session && (
        <StartGameModal
          isOpen={isStartGameOpen}
          session={session}
          onClose={() => setIsStartGameOpen(false)}
          onSuccess={() => {
            refreshSession();
            setActiveTab('match');
          }}
        />
      )}

      {session && (
        <PostMatchModal
          isOpen={isPostMatchOpen}
          session={session}
          penaltyWinner={penaltyWinner}
          onClose={() => {
            setIsPostMatchOpen(false);
            setPenaltyWinner(null);
          }}
          onSuccess={() => {
            refreshSession();
            setActiveTab('match');
            setPenaltyWinner(null);
          }}
        />
      )}
    </div>
  );
}
