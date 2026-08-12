import React, { useState } from 'react';
import { SessionData, PlayerStats } from '../types';
import { Trophy, Flame, Target, Shield, Sparkles, Clock, ChevronDown, ChevronUp, ArrowUpDown, Filter } from 'lucide-react';

interface LeaderboardProps {
  session: SessionData;
}

type SortKey = 'wins' | 'goals' | 'assists' | 'saves' | 'winRate' | 'matchesPlayed';

export const Leaderboard: React.FC<LeaderboardProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('wins');

  const rawStats = (Object.values(session.stats || {}) as PlayerStats[]);

  const statsList = [...rawStats].sort((a, b) => {
    if (sortBy === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.goals - a.goals;
    }
    if (sortBy === 'goals') {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return b.wins - a.wins;
    }
    if (sortBy === 'assists') {
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.goals - a.goals;
    }
    if (sortBy === 'saves') {
      if (b.saves !== a.saves) return b.saves - a.saves;
      return b.wins - a.wins;
    }
    if (sortBy === 'winRate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    }
    if (sortBy === 'matchesPlayed') {
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      return b.wins - a.wins;
    }
    return 0;
  });

  // Calculate Badges
  const topScorer = [...rawStats].sort((a, b) => b.goals - a.goals)[0];
  const topWins = [...rawStats].sort((a, b) => b.wins - a.wins)[0];
  const topAssists = [...rawStats].sort((a, b) => b.assists - a.assists)[0];
  const topSaves = [...rawStats].sort((a, b) => b.saves - a.saves)[0];

  const firstArrived = session.participants
    .filter((p) => p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt)[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard & Badges</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Match History ({session.matchHistory.length})</span>
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <>
          {/* Badge Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Top Scorer */}
            <div className="bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-amber-400">
                <Flame className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider">Top Scorer</span>
              </div>
              {topScorer && topScorer.goals > 0 ? (
                <div className="flex items-center gap-2">
                  <img src={topScorer.avatarUrl} alt={topScorer.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-amber-500/40" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">{topScorer.name}</span>
                    <span className="text-[10px] sm:text-[11px] font-black text-amber-400">{topScorer.goals} Goals</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No goals yet</p>
              )}
            </div>

            {/* King of Pitch */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-slate-900 border border-emerald-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <Trophy className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider">Most Wins</span>
              </div>
              {topWins && topWins.wins > 0 ? (
                <div className="flex items-center gap-2">
                  <img src={topWins.avatarUrl} alt={topWins.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/40" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">{topWins.name}</span>
                    <span className="text-[10px] sm:text-[11px] font-black text-emerald-400">{topWins.wins} Wins ({topWins.winRate}%)</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No wins yet</p>
              )}
            </div>

            {/* Playmaker */}
            <div className="bg-gradient-to-br from-blue-500/10 to-slate-900 border border-blue-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-blue-400">
                <Target className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider">Playmaker</span>
              </div>
              {topAssists && topAssists.assists > 0 ? (
                <div className="flex items-center gap-2">
                  <img src={topAssists.avatarUrl} alt={topAssists.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-blue-500/40" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">{topAssists.name}</span>
                    <span className="text-[10px] sm:text-[11px] font-black text-blue-400">{topAssists.assists} Assists</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No assists yet</p>
              )}
            </div>

            {/* Early Bird */}
            <div className="bg-gradient-to-br from-purple-500/10 to-slate-900 border border-purple-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider">Early Bird #1</span>
              </div>
              {firstArrived ? (
                <div className="flex items-center gap-2">
                  <img src={firstArrived.avatarUrl} alt={firstArrived.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-purple-500/40" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">{firstArrived.name}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-purple-400">1st Arrived</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">No arrivals</p>
              )}
            </div>
          </div>

          {/* Leaderboard Card Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            {/* Header & Sort Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">Session Leaderboard</h3>
                <p className="text-[11px] text-slate-400">Live stats from active and completed matches</p>
              </div>

              {/* Sort Selector Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  Sort:
                </span>
                {[
                  { key: 'wins', label: 'Wins' },
                  { key: 'goals', label: 'Goals ⚽' },
                  { key: 'assists', label: 'Assists 🎯' },
                  { key: 'saves', label: 'Saves 🛡️' },
                  { key: 'winRate', label: 'Win %' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSortBy(item.key as SortKey)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                      sortBy === item.key
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MOBILE PORTRAIT VIEW: Responsive Cards Stack */}
            <div className="block sm:hidden space-y-2.5">
              {statsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  No match history or stats recorded yet
                </div>
              ) : (
                statsList.map((st, idx) => (
                  <div
                    key={st.playerId}
                    className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border-amber-500/40'
                        : idx === 1
                        ? 'bg-gradient-to-r from-slate-300/10 via-slate-950 to-slate-950 border-slate-400/40'
                        : idx === 2
                        ? 'bg-gradient-to-r from-amber-700/10 via-slate-950 to-slate-950 border-amber-600/40'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    {/* Top Row: Rank Badge, Avatar, Name, Win Rate */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={st.avatarUrl}
                            alt={st.name}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">{st.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {st.matchesPlayed} match{st.matchesPlayed !== 1 ? 'es' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Win Rate Badge */}
                      <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-extrabold text-[11px] shrink-0">
                        {st.winRate}% Win
                      </div>
                    </div>

                    {/* Bottom Row: Stats Summary Chips */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80 text-center">
                      <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Record</span>
                        <span className="text-[11px] font-black text-white">
                          <span className="text-emerald-400">{st.wins}</span>-
                          <span className="text-red-400">{st.losses}</span>-
                          <span className="text-amber-400">{st.draws}</span>
                        </span>
                      </div>

                      <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Goals</span>
                        <span className="text-xs font-black text-amber-400">⚽ {st.goals}</span>
                      </div>

                      <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Assists</span>
                        <span className="text-xs font-black text-blue-400">🎯 {st.assists}</span>
                      </div>

                      <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Saves</span>
                        <span className="text-xs font-black text-purple-400">🛡️ {st.saves}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP / TABLET VIEW: Structured Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Player</th>
                    <th className="py-3 px-3 text-center">Played</th>
                    <th className="py-3 px-3 text-center">W - L - D</th>
                    <th className="py-3 px-3 text-center">Win %</th>
                    <th className="py-3 px-3 text-center">Goals ⚽</th>
                    <th className="py-3 px-3 text-center">Assists 🎯</th>
                    <th className="py-3 px-3 text-center">Saves 🛡️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {statsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No match history or stats recorded yet
                      </td>
                    </tr>
                  ) : (
                    statsList.map((st, idx) => (
                      <tr key={st.playerId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-black text-slate-400">
                          {idx === 0 ? (
                            <span className="text-amber-400 text-sm font-black">🥇 #1</span>
                          ) : idx === 1 ? (
                            <span className="text-slate-300 text-sm font-black">🥈 #2</span>
                          ) : idx === 2 ? (
                            <span className="text-amber-600 text-sm font-black">🥉 #3</span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img src={st.avatarUrl} alt={st.name} className="w-7 h-7 rounded-full object-cover" />
                            <span className="font-bold text-white text-xs">{st.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-300">{st.matchesPlayed}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-emerald-400 font-bold">{st.wins}</span> -{' '}
                          <span className="text-red-400">{st.losses}</span> -{' '}
                          <span className="text-amber-400">{st.draws}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-400">
                          {st.winRate}%
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-amber-400">{st.goals}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-blue-400">{st.assists}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-purple-400">{st.saves}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <h3 className="font-black text-white text-sm sm:text-base">Completed Match Box Scores</h3>
          {session.matchHistory.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center italic">No completed matches yet.</p>
          ) : (
            <div className="space-y-2.5">
              {session.matchHistory.map((m) => {
                const isExpanded = expandedMatchId === m.id;
                return (
                  <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div
                      onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
                          #{m.matchNumber}
                        </span>
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-white min-w-0 truncate">
                          <span className="text-red-400 truncate max-w-[80px] sm:max-w-none">{m.teamA.name}</span>
                          <span className="text-emerald-400 font-mono px-1 bg-slate-900 rounded">{m.scoreA} - {m.scoreB}</span>
                          <span className="text-blue-400 truncate max-w-[80px] sm:max-w-none">{m.teamB.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                        <span className="text-[10px] text-slate-500 font-bold hidden sm:inline">{m.events.length} Events</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-xs space-y-2">
                        <span className="font-bold text-slate-300 text-[11px] block">Match Events Log:</span>
                        {m.events.length === 0 ? (
                          <p className="text-slate-500 italic text-[11px]">No goals or stats logged during match.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.events.map((e) => (
                              <div key={e.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-[11px]">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${e.team === 'teamA' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <span className="font-bold text-white capitalize">{e.type}:</span>
                                <span className="text-slate-300 truncate">{e.playerName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
