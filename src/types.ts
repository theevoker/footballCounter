export type SportType = 'Soccer / Football' | 'Basketball' | 'Volleyball' | 'Futsal' | 'Custom';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  isTemp?: boolean;
  addedByUserId?: string;
  createdAt: number;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  isTemp: boolean;
  addedByUserId?: string;
  arrivedAt: number; // timestamp MS
  status: 'arrived' | 'playing' | 'bench' | 'left';
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'save';
  playerId: string;
  playerName: string;
  team: 'teamA' | 'teamB';
  timestamp: number;
}

export interface Team {
  id: 'teamA' | 'teamB';
  name: string;
  color: string; // Tailwind color class or hex
  playerIds: string[];
}

export interface Match {
  id: string;
  matchNumber: number;
  startTime: number;
  endTime?: number;
  teamSize: number;
  teamA: Team;
  teamB: Team;
  benchPlayerIds: string[]; // Ordered list of players on bench
  events: MatchEvent[];
  scoreA: number;
  scoreB: number;
  status: 'in_progress' | 'completed';
  winner?: 'teamA' | 'teamB' | 'draw';
}

export interface PlayerStats {
  playerId: string;
  name: string;
  avatarUrl: string;
  isTemp?: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  assists: number;
  saves: number;
  points: number; // 3 for win, 1 for draw, +1 per goal/assist
  winRate: number; // percentage 0-100
}

export interface SessionData {
  id: string;
  code: string;
  title: string;
  sport: SportType;
  createdByUserId: string;
  createdAt: number;
  teamSize: number;
  participants: SessionParticipant[];
  currentMatch: Match | null;
  matchHistory: Match[];
  stats: Record<string, PlayerStats>;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
}
