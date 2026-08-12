import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { SessionData, UserProfile, Match, MatchEvent, PlayerStats, SessionParticipant } from "./src/types";

const app = express();
const PORT = 8080;

app.use(express.json({ limit: "10mb" }));

// --- FIREBASE FIRESTORE INITIALIZATION ---
let db: any = null;

try {
  if (fs.existsSync("./firebase-applet-config.json")) {
    const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
    const firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp, config.firestoreDatabaseId || "(default)");
    console.log("Firestore initialized successfully!");
  }
} catch (err) {
  console.error("Failed to initialize Firestore:", err);
}

// In-Memory Data Stores with Firestore synchronization
const users: Record<string, { profile: UserProfile; passwordHash: string }> = {};
const sessions: Record<string, SessionData> = {};
const GLOBAL_SESSION_CODE = "MAIN";

async function loadUsersFromDb() {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "users"));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.profile) {
        users[docSnap.id] = data as any;
      }
    });
    console.log(`Loaded ${Object.keys(users).length} users from Firestore.`);
  } catch (err) {
    console.error("Error loading users from Firestore:", err);
  }
}

async function saveUserToDb(id: string, userEntry: { profile: UserProfile; passwordHash: string }) {
  users[id] = userEntry;
  if (!db) return;
  try {
    await setDoc(doc(db, "users", id), userEntry);
  } catch (err) {
    console.error(`Error saving user ${id} to Firestore:`, err);
  }
}

// Helper to get or create the single global session
function initGlobalSession(): SessionData {
  return {
    id: "s-1",
    code: GLOBAL_SESSION_CODE,
    title: "Pickup Pitch Game",
    sport: "Soccer / Football",
    createdByUserId: "system",
    createdAt: Date.now(),
    teamSize: 5,
    participants: [],
    currentMatch: null,
    matchHistory: [],
    stats: {},
  };
}

async function loadSessionFromDb(): Promise<SessionData> {
  if (sessions[GLOBAL_SESSION_CODE]) return sessions[GLOBAL_SESSION_CODE];

  if (db) {
    try {
      const docSnap = await getDoc(doc(db, "sessions", GLOBAL_SESSION_CODE));
      if (docSnap.exists()) {
        const data = docSnap.data() as SessionData;
        sessions[GLOBAL_SESSION_CODE] = data;
        sessions["PICKUP1"] = data;
        console.log("Loaded global session from Firestore.");
        return data;
      }
    } catch (err) {
      console.error("Error loading session from Firestore:", err);
    }
  }

  const newSession = initGlobalSession();
  sessions[GLOBAL_SESSION_CODE] = newSession;
  sessions["PICKUP1"] = newSession;
  if (db) {
    saveSessionToDb(newSession).catch(() => {});
  }
  return newSession;
}

async function saveSessionToDb(session: SessionData) {
  sessions[GLOBAL_SESSION_CODE] = session;
  sessions["PICKUP1"] = session;
  if (!db) return;
  try {
    await setDoc(doc(db, "sessions", GLOBAL_SESSION_CODE), session);
  } catch (err) {
    console.error("Error saving session to Firestore:", err);
  }
}

function getGlobalSession(): SessionData {
  if (!sessions[GLOBAL_SESSION_CODE]) {
    sessions[GLOBAL_SESSION_CODE] = initGlobalSession();
    sessions["PICKUP1"] = sessions[GLOBAL_SESSION_CODE];
  }
  return sessions[GLOBAL_SESSION_CODE];
}

// Recalculates stats based on matchHistory
function recalculateStats(session: SessionData) {
  const statsMap: Record<string, PlayerStats> = {};

  // Ensure all participants exist in stats
  session.participants.forEach((p) => {
    statsMap[p.userId] = {
      playerId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl,
      isTemp: p.isTemp,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goals: 0,
      assists: 0,
      saves: 0,
      points: 0,
      winRate: 0,
    };
  });

  // Process history matches
  session.matchHistory.forEach((m) => {
    if (m.status !== "completed") return;

    const teamAPlayerIds = m.teamA.playerIds;
    const teamBPlayerIds = m.teamB.playerIds;
    const winner = m.winner;

    const allMatchPlayers = new Set([...teamAPlayerIds, ...teamBPlayerIds]);

    allMatchPlayers.forEach((pid) => {
      if (!statsMap[pid]) {
        statsMap[pid] = {
          playerId: pid,
          name: pid,
          avatarUrl: "",
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goals: 0,
          assists: 0,
          saves: 0,
          points: 0,
          winRate: 0,
        };
      }
      const st = statsMap[pid];
      st.matchesPlayed += 1;

      const isTeamA = teamAPlayerIds.includes(pid);
      if (winner === "draw") {
        st.draws += 1;
        st.points += 1;
      } else if ((winner === "teamA" && isTeamA) || (winner === "teamB" && !isTeamA)) {
        st.wins += 1;
        st.points += 3;
      } else {
        st.losses += 1;
      }
    });

    // Add match events (goals, assists, saves)
    m.events.forEach((e) => {
      if (!statsMap[e.playerId]) return;
      if (e.type === "goal") {
        statsMap[e.playerId].goals += 1;
        statsMap[e.playerId].points += 1;
      } else if (e.type === "assist") {
        statsMap[e.playerId].assists += 1;
        statsMap[e.playerId].points += 1;
      } else if (e.type === "save") {
        statsMap[e.playerId].saves += 1;
        statsMap[e.playerId].points += 1;
      }
    });
  });

  // Calculate win rates
  Object.values(statsMap).forEach((st) => {
    if (st.matchesPlayed > 0) {
      st.winRate = Math.round((st.wins / st.matchesPlayed) * 100);
    } else {
      st.winRate = 0;
    }
  });

  session.stats = statsMap;
}

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { username, name, password, avatarUrl } = req.body;
  if (!username || !name || !password) {
    return res.status(400).json({ error: "Username, name, and password are required" });
  }

  const existing = Object.values(users).find(
    (u) => u.profile.username.toLowerCase() === username.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: "Username already taken" });
  }

  const id = `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const defaultAvatar = avatarUrl || "";
  const profile: UserProfile = {
    id,
    username,
    name,
    avatarUrl: defaultAvatar,
    createdAt: Date.now(),
  };

  const userEntry = { profile, passwordHash: password };
  await saveUserToDb(id, userEntry);
  res.json({ user: profile, token: id });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const userEntry = Object.values(users).find(
    (u) => u.profile.username.toLowerCase() === username.toLowerCase()
  );

  if (!userEntry || userEntry.passwordHash !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({ user: userEntry.profile, token: userEntry.profile.id });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !users[token]) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ user: users[token].profile });
});

app.post("/api/users/profile", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !users[token]) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, avatarUrl } = req.body;
  if (name !== undefined) users[token].profile.name = name;
  if (avatarUrl !== undefined) users[token].profile.avatarUrl = avatarUrl;

  await saveUserToDb(token, users[token]);

  // Sync to current session participants & stats
  const session = await loadSessionFromDb();
  const participant = session.participants.find((p) => p.userId === token);
  if (participant) {
    if (name !== undefined) participant.name = name;
    if (avatarUrl !== undefined) participant.avatarUrl = avatarUrl;
  }
  recalculateStats(session);
  await saveSessionToDb(session);

  res.json({ user: users[token].profile });
});

// --- SESSION ROUTES ---

// Single Global Session Endpoint
app.get("/api/session", async (req, res) => {
  const session = await loadSessionFromDb();
  res.json(session);
});

// Create Session (Updates global session parameters)
app.post("/api/sessions", async (req, res) => {
  const { title, sport, teamSize } = req.body;
  const session = await loadSessionFromDb();
  if (title) session.title = title;
  if (sport) session.sport = sport;
  if (teamSize) session.teamSize = Number(teamSize);
  await saveSessionToDb(session);
  res.json(session);
});

// Get Session by Code (Always returns single global session)
app.get("/api/sessions/:code", async (req, res) => {
  const session = await loadSessionFromDb();
  res.json(session);
});

// Join / Check-in to Session
app.post("/api/sessions/:code/checkin", async (req, res) => {
  const { userId } = req.body;
  const session = await loadSessionFromDb();

  const userProfile = users[userId]?.profile;
  if (!userProfile) {
    return res.status(404).json({ error: "User account not found" });
  }

  // Check if participant already in session
  let p = session.participants.find((p) => p.userId === userId);
  if (p) {
    p.status = 'arrived';
    p.arrivedAt = Date.now(); // Updated arrival
  } else {
    p = {
      id: `p-${userId}-${Date.now()}`,
      userId,
      name: userProfile.name,
      avatarUrl: userProfile.avatarUrl,
      isTemp: false,
      arrivedAt: Date.now(),
      status: 'arrived',
    };
    session.participants.push(p);
  }

  // If a match is in progress, newcomer goes to bench
  if (session.currentMatch) {
    if (!session.currentMatch.benchPlayerIds.includes(userId)) {
      session.currentMatch.benchPlayerIds.push(userId);
    }
  }

  recalculateStats(session);
  await saveSessionToDb(session);
  res.json(session);
});

// Add Temporary / Guest Player (no account required)
app.post("/api/sessions/:code/add-temp-player", async (req, res) => {
  const { name, hostUserId, avatarUrl } = req.body;
  const session = await loadSessionFromDb();

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Temporary player name required" });
  }

  const hostUser = users[hostUserId]?.profile;
  const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const defaultAvatar = avatarUrl || "";

  const tempProfile: UserProfile = {
    id: tempUserId,
    username: `guest_${name.toLowerCase().replace(/\s+/g, '')}`,
    name: hostUser ? `${name.trim()} (Guest of ${hostUser.name.split(' ')[0]})` : `${name.trim()} (Guest)`,
    avatarUrl: defaultAvatar,
    isTemp: true,
    addedByUserId: hostUserId,
    createdAt: Date.now(),
  };

  // Save temp user profile
  const userEntry = { profile: tempProfile, passwordHash: 'guest' };
  await saveUserToDb(tempUserId, userEntry);

  const p: SessionParticipant = {
    id: `p-${tempUserId}`,
    userId: tempUserId,
    name: tempProfile.name,
    avatarUrl: tempProfile.avatarUrl,
    isTemp: true,
    addedByUserId: hostUserId,
    arrivedAt: Date.now(),
    status: 'arrived',
  };

  session.participants.push(p);

  if (session.currentMatch) {
    session.currentMatch.benchPlayerIds.push(tempUserId);
  }

  recalculateStats(session);
  await saveSessionToDb(session);
  res.json({ session, tempUser: tempProfile });
});

// Start Game / Divide Teams randomly based on top arrived players
app.post("/api/sessions/:code/start-game", async (req, res) => {
  const { teamSize } = req.body;
  const session = await loadSessionFromDb();

  const requestedSize = Number(teamSize) || session.teamSize || 5;
  session.teamSize = requestedSize;

  // Filter available participants (status !== 'left') sorted by arrivedAt ascending (first come first served)
  const available = session.participants
    .filter((p) => p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const requiredPlayers = requestedSize * 2;
  if (available.length < 2) {
    return res.status(400).json({ error: "At least 2 arrived players required to start a match" });
  }

  // Select top players (up to requiredPlayers)
  const selectedForPitch = available.slice(0, requiredPlayers);
  const benchParticipants = available.slice(requiredPlayers);

  // Randomly shuffle selected players to divide into 2 teams
  const shuffled = [...selectedForPitch].sort(() => Math.random() - 0.5);

  const teamAPlayers = shuffled.slice(0, Math.ceil(shuffled.length / 2));
  const teamBPlayers = shuffled.slice(Math.ceil(shuffled.length / 2));

  // Update participant status
  session.participants.forEach((p) => {
    if (selectedForPitch.some((s) => s.userId === p.userId)) {
      p.status = 'playing';
    } else if (p.status !== 'left') {
      p.status = 'bench';
    }
  });

  const nextMatchNum = (session.matchHistory.length || 0) + 1;

  const newMatch: Match = {
    id: `m_${Date.now()}`,
    matchNumber: nextMatchNum,
    startTime: Date.now(),
    teamSize: requestedSize,
    teamA: {
      id: "teamA",
      name: "Team Red",
      color: "#ef4444",
      playerIds: teamAPlayers.map((p) => p.userId),
    },
    teamB: {
      id: "teamB",
      name: "Team Blue",
      color: "#3b82f6",
      playerIds: teamBPlayers.map((p) => p.userId),
    },
    benchPlayerIds: benchParticipants.map((p) => p.userId),
    events: [],
    scoreA: 0,
    scoreB: 0,
    status: "in_progress",
  };

  session.currentMatch = newMatch;
  recalculateStats(session);
  await saveSessionToDb(session);
  res.json(session);
});

// Edit Teams (Trust-based direct modification of teamA, teamB, bench)
app.post("/api/sessions/:code/edit-teams", async (req, res) => {
  const { teamAPlayerIds, teamBPlayerIds, benchPlayerIds } = req.body;
  const session = await loadSessionFromDb();

  if (!session.currentMatch) {
    return res.status(400).json({ error: "No active match to edit" });
  }

  if (Array.isArray(teamAPlayerIds)) {
    session.currentMatch.teamA.playerIds = teamAPlayerIds;
  }
  if (Array.isArray(teamBPlayerIds)) {
    session.currentMatch.teamB.playerIds = teamBPlayerIds;
  }
  if (Array.isArray(benchPlayerIds)) {
    session.currentMatch.benchPlayerIds = benchPlayerIds;
  }

  // Update statuses
  const playingIds = new Set([
    ...session.currentMatch.teamA.playerIds,
    ...session.currentMatch.teamB.playerIds,
  ]);
  const benchIds = new Set(session.currentMatch.benchPlayerIds);

  session.participants.forEach((p) => {
    if (playingIds.has(p.userId)) {
      p.status = 'playing';
    } else if (benchIds.has(p.userId)) {
      p.status = 'bench';
    }
  });

  await saveSessionToDb(session);
  res.json(session);
});

// Sub / Replace a Player Mid-Match
app.post("/api/sessions/:code/sub-player", async (req, res) => {
  const { leavingPlayerId, targetTeam, replacementPlayerId, isRandom } = req.body; // targetTeam: 'teamA' | 'teamB'
  const session = await loadSessionFromDb();

  if (!session.currentMatch) {
    return res.status(400).json({ error: "No active match" });
  }

  const match = session.currentMatch;
  const team = targetTeam === "teamA" ? match.teamA : match.teamB;

  // Remove leaving player from team
  team.playerIds = team.playerIds.filter((id) => id !== leavingPlayerId);

  // Send leaving player to bench
  if (!match.benchPlayerIds.includes(leavingPlayerId)) {
    match.benchPlayerIds.push(leavingPlayerId);
  }

  let replacementId: string | null = null;
  const availableBenchIds = match.benchPlayerIds.filter((id) => id !== leavingPlayerId);

  if (replacementPlayerId && availableBenchIds.includes(replacementPlayerId)) {
    replacementId = replacementPlayerId;
  } else if (isRandom && availableBenchIds.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableBenchIds.length);
    replacementId = availableBenchIds[randomIndex];
  } else if (availableBenchIds.length > 0) {
    // Order by arrival time
    const benchParticipants = session.participants
      .filter((p) => availableBenchIds.includes(p.userId))
      .sort((a, b) => a.arrivedAt - b.arrivedAt);

    if (benchParticipants.length > 0) {
      replacementId = benchParticipants[0].userId;
    }
  }

  if (replacementId) {
    // Remove replacement from bench
    match.benchPlayerIds = match.benchPlayerIds.filter((id) => id !== replacementId);
    // Add replacement to team
    if (!team.playerIds.includes(replacementId)) {
      team.playerIds.push(replacementId);
    }
  }

  // Update participant statuses
  const playingSet = new Set([...match.teamA.playerIds, ...match.teamB.playerIds]);
  const benchSet = new Set(match.benchPlayerIds);

  session.participants.forEach((p) => {
    if (playingSet.has(p.userId)) {
      p.status = 'playing';
    } else if (benchSet.has(p.userId)) {
      p.status = 'bench';
    }
  });

  await saveSessionToDb(session);
  res.json({ session, replacementId });
});

// Log Match Event (Goal, Assist, Save)
app.post("/api/sessions/:code/log-event", async (req, res) => {
  const { playerId, type, team } = req.body;
  const session = await loadSessionFromDb();

  if (!session.currentMatch) {
    return res.status(400).json({ error: "No active match" });
  }

  const match = session.currentMatch;
  const user = users[playerId]?.profile || session.participants.find((p) => p.userId === playerId);
  const playerName = user ? user.name : "Unknown Player";

  const event: MatchEvent = {
    id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type,
    playerId,
    playerName,
    team,
    timestamp: Date.now(),
  };

  match.events.push(event);

  if (type === "goal") {
    if (team === "teamA") match.scoreA += 1;
    else if (team === "teamB") match.scoreB += 1;
  }

  await saveSessionToDb(session);
  res.json(session);
});

// Undo Match Event
app.post("/api/sessions/:code/undo-event", async (req, res) => {
  const { eventId } = req.body;
  const session = await loadSessionFromDb();

  if (!session.currentMatch) {
    return res.status(400).json({ error: "No active match" });
  }

  const match = session.currentMatch;
  const idx = match.events.findIndex((e) => e.id === eventId);
  if (idx !== -1) {
    const ev = match.events[idx];
    if (ev.type === "goal") {
      if (ev.team === "teamA" && match.scoreA > 0) match.scoreA -= 1;
      if (ev.team === "teamB" && match.scoreB > 0) match.scoreB -= 1;
    }
    match.events.splice(idx, 1);
  }

  await saveSessionToDb(session);
  res.json(session);
});

// Finish Match & Execute Bench Rotation Rules
app.post("/api/sessions/:code/finish-match", async (req, res) => {
  const session = await loadSessionFromDb();

  if (!session.currentMatch) {
    return res.status(400).json({ error: "No active match to finish" });
  }

  const { winnerOverride } = req.body || {};
  const match = session.currentMatch;
  match.endTime = Date.now();
  match.status = "completed";

  if (match.scoreA > match.scoreB) {
    match.winner = "teamA";
  } else if (match.scoreB > match.scoreA) {
    match.winner = "teamB";
  } else if (winnerOverride === 'teamA' || winnerOverride === 'teamB') {
    match.winner = winnerOverride;
  } else {
    match.winner = "draw";
  }

  // Push into match history
  session.matchHistory.unshift(match);

  // EXECUTE BENCH ROTATION ALGORITHM:
  // 1. Identify Winners and Losers
  let winningPlayerIds: string[] = [];
  let losingPlayerIds: string[] = [];

  if (match.winner === "teamA") {
    winningPlayerIds = [...match.teamA.playerIds];
    losingPlayerIds = [...match.teamB.playerIds];
  } else if (match.winner === "teamB") {
    winningPlayerIds = [...match.teamB.playerIds];
    losingPlayerIds = [...match.teamA.playerIds];
  } else {
    // In case of a draw, randomize who stays or coinflip teamA as "winners"
    if (Math.random() > 0.5) {
      winningPlayerIds = [...match.teamA.playerIds];
      losingPlayerIds = [...match.teamB.playerIds];
    } else {
      winningPlayerIds = [...match.teamB.playerIds];
      losingPlayerIds = [...match.teamA.playerIds];
    }
  }

  // 2. Bench Rotation setup
  const targetTeamSize = session.teamSize;
  const currentBenchPlayerIds = match.benchPlayerIds;

  // Order bench players by arrival time
  const benchParticipants = session.participants
    .filter((p) => currentBenchPlayerIds.includes(p.userId) && p.status !== 'left')
    .sort((a, b) => a.arrivedAt - b.arrivedAt);

  const sortedBenchIds = benchParticipants.map((p) => p.userId);

  // New challenger team from bench (takes up to targetTeamSize)
  let newChallengerPlayerIds = sortedBenchIds.slice(0, targetTeamSize);
  let remainingBenchFromCurrent = sortedBenchIds.slice(targetTeamSize);

  // If bench didn't have enough players (newChallengerPlayerIds.length < targetTeamSize):
  // Fill the missing spots with random players from losing team!
  const neededFillers = targetTeamSize - newChallengerPlayerIds.length;
  let losingTeamStayers: string[] = [];
  let losingTeamToBench: string[] = [];

  if (neededFillers > 0 && losingPlayerIds.length > 0) {
    const shuffledLosing = [...losingPlayerIds].sort(() => Math.random() - 0.5);
    losingTeamStayers = shuffledLosing.slice(0, neededFillers);
    losingTeamToBench = shuffledLosing.slice(neededFillers);
  } else {
    losingTeamToBench = [...losingPlayerIds];
  }

  // Assemble full challenger team
  newChallengerPlayerIds = [...newChallengerPlayerIds, ...losingTeamStayers];

  // New bench queue: remaining previous bench + losing players who went to bench
  const newBenchPlayerIds = [...remainingBenchFromCurrent, ...losingTeamToBench];

  // Prepare next ready match
  const nextMatchNum = session.matchHistory.length + 1;
  const nextMatch: Match = {
    id: `m_${Date.now()}`,
    matchNumber: nextMatchNum,
    startTime: Date.now(),
    teamSize: targetTeamSize,
    teamA: {
      id: "teamA",
      name: "Kings (Winners)",
      color: "#ef4444",
      playerIds: winningPlayerIds,
    },
    teamB: {
      id: "teamB",
      name: "Challengers (Bench)",
      color: "#3b82f6",
      playerIds: newChallengerPlayerIds,
    },
    benchPlayerIds: newBenchPlayerIds,
    events: [],
    scoreA: 0,
    scoreB: 0,
    status: "in_progress",
  };

  session.currentMatch = nextMatch;

  // Update participant statuses
  const playingIds = new Set([...winningPlayerIds, ...newChallengerPlayerIds]);
  session.participants.forEach((p) => {
    if (playingIds.has(p.userId)) {
      p.status = 'playing';
    } else if (p.status !== 'left') {
      p.status = 'bench';
    }
  });

  recalculateStats(session);
  await saveSessionToDb(session);
  res.json(session);
});

// Leave Session / Mark Away
app.post("/api/sessions/:code/leave-session", async (req, res) => {
  const { userId } = req.body;
  const session = await loadSessionFromDb();

  const p = session.participants.find((p) => p.userId === userId);
  if (p) {
    p.status = 'left';
  }

  if (session.currentMatch) {
    session.currentMatch.teamA.playerIds = session.currentMatch.teamA.playerIds.filter((id) => id !== userId);
    session.currentMatch.teamB.playerIds = session.currentMatch.teamB.playerIds.filter((id) => id !== userId);
    session.currentMatch.benchPlayerIds = session.currentMatch.benchPlayerIds.filter((id) => id !== userId);
  }

  await saveSessionToDb(session);
  res.json(session);
});

// End Session / Close active match without auto-starting new one
app.post("/api/sessions/:code/end-session", async (req, res) => {
  const session = await loadSessionFromDb();

  if (session.currentMatch) {
    const match = session.currentMatch;
    match.endTime = Date.now();
    match.status = "completed";

    if (match.scoreA > match.scoreB) {
      match.winner = "teamA";
    } else if (match.scoreB > match.scoreA) {
      match.winner = "teamB";
    } else {
      match.winner = "draw";
    }

    session.matchHistory.unshift(match);
    session.currentMatch = null;
  }

  session.participants.forEach((p) => {
    if (p.status !== 'left') {
      p.status = 'arrived';
    }
  });

  recalculateStats(session);
  await saveSessionToDb(session);
  res.json(session);
});

// Edit Historical Match (12-hour edit window)
app.post("/api/sessions/:code/matches/:matchId/edit", async (req, res) => {
  const { matchId } = req.params;
  const { scoreA, scoreB, teamAName, teamBName, events } = req.body;
  const session = await loadSessionFromDb();

  const match = session.matchHistory.find((m) => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found in history" });
  }

  // Enforce 12h edit window limit
  const matchTime = match.endTime || match.startTime;
  const hoursElapsed = (Date.now() - matchTime) / (1000 * 60 * 60);
  if (hoursElapsed > 12) {
    return res.status(403).json({
      error: "Match edits are restricted to within 12 hours of match completion."
    });
  }

  if (typeof scoreA === 'number') match.scoreA = scoreA;
  if (typeof scoreB === 'number') match.scoreB = scoreB;
  if (teamAName) match.teamA.name = teamAName;
  if (teamBName) match.teamB.name = teamBName;
  if (Array.isArray(events)) match.events = events;

  // Recalculate winner
  if (match.scoreA > match.scoreB) match.winner = "teamA";
  else if (match.scoreB > match.scoreA) match.winner = "teamB";
  else match.winner = "draw";

  recalculateStats(session);
  await saveSessionToDb(session);
  res.json(session);
});

// Serve Vite dev or production static build
async function startServer() {
  await loadUsersFromDb();
  await loadSessionFromDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
