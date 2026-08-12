import { UserProfile, SessionData, SportType } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('squad_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('squad_token', token);
  } else {
    localStorage.removeItem('squad_token');
  }
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}

export async function registerAccount(
  username: string,
  name: string,
  password: string,
  avatarUrl: string
): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, name, password, avatarUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create account');
  setAuthToken(data.token);
  return data;
}

export async function loginAccount(
  username: string,
  password: string
): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to login');
  setAuthToken(data.token);
  return data;
}

export async function updateProfile(
  name: string,
  avatarUrl: string
): Promise<UserProfile> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, avatarUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  return data.user;
}

export async function createSession(
  title: string,
  sport: SportType,
  teamSize: number,
  userId: string
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, sport, teamSize, userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create session');
  return data;
}

export async function getSession(code: string = 'MAIN'): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/session`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Session not found');
  return data;
}

export async function checkInToSession(
  code: string = 'MAIN',
  userId: string
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Check-in failed');
  return data;
}

export async function addTempPlayer(
  code: string,
  name: string,
  hostUserId: string,
  avatarUrl?: string
): Promise<{ session: SessionData; tempUser: UserProfile }> {
  const res = await fetch(`${API_BASE}/sessions/${code}/add-temp-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, hostUserId, avatarUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add guest player');
  return data;
}

export async function startGame(
  code: string,
  teamSize: number
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/start-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamSize }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start game');
  return data;
}

export async function editTeams(
  code: string,
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
  benchPlayerIds: string[]
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/edit-teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamAPlayerIds, teamBPlayerIds, benchPlayerIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update teams');
  return data;
}

export async function subPlayer(
  code: string,
  leavingPlayerId: string,
  targetTeam: 'teamA' | 'teamB',
  replacementPlayerId?: string,
  isRandom?: boolean
): Promise<{ session: SessionData; replacementId: string | null }> {
  const res = await fetch(`${API_BASE}/sessions/${code}/sub-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leavingPlayerId, targetTeam, replacementPlayerId, isRandom }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to sub player');
  return data;
}

export async function endSession(code: string = 'MAIN'): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/end-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to end session');
  return data;
}

export async function editHistoricalMatch(
  code: string,
  matchId: string,
  matchData: {
    scoreA?: number;
    scoreB?: number;
    teamAName?: string;
    teamBName?: string;
    events?: any[];
  }
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/matches/${matchId}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to edit match');
  return data;
}

export async function logEvent(
  code: string,
  playerId: string,
  type: 'goal' | 'assist' | 'save',
  team: 'teamA' | 'teamB'
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/log-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, type, team }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to log event');
  return data;
}

export async function undoEvent(
  code: string,
  eventId: string
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/undo-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to undo event');
  return data;
}

export async function finishMatch(code: string, winnerOverride?: 'teamA' | 'teamB'): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/finish-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerOverride }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to finish match');
  return data;
}

export async function leaveSession(
  code: string,
  userId: string
): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/sessions/${code}/leave-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to leave session');
  return data;
}
