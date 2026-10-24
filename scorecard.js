
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =====================================================
   APL TOURNAMENT PLATFORM - LIVE SCORECARD
   Reads APL League registrations from "players".
   Saves scoring data to the selected match document.
===================================================== */

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const tournamentId =
  params.get("tournamentId") ||
  params.get("id") ||
  localStorage.getItem("aplTournamentId") ||
  sessionStorage.getItem("aplTournamentId");

const matchId =
  params.get("matchId") ||
  params.get("match") ||
  localStorage.getItem("aplMatchId") ||
  sessionStorage.getItem("aplMatchId");

const state = {
  teams: [],
  players: [],
  match: null,
  innings: [],
  currentInnings: 1,
  strikerId: "",
  nonStrikerId: "",
  bowlerId: "",
  undoStack: []
};

const rosterFields = [
  "captainName",
  ...Array.from({ length: 14 }, (_, i) => `player${i + 2}`)
];

function message(text, error = false) {
  const el = $("message");
  if (el) {
    el.textContent = text;
    el.style.color = error ? "#dc2626" : "#15803d";
  }
  console.log("[APL Scorecard]", text);
}

function clean(value) {
  return String(value ?? "").trim();
}

function normaliseName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function makeId() {
  return "event_" + Date.now() + "_" +
    Math.random().toString(36).slice(2, 7);
}

function currentInnings() {
  return state.innings[state.currentInnings - 1];
}

function getPlayer(id) {
  return state.players.find((p) => p.id === id);
}

function playerName(id) {
  return getPlayer(id)?.name || "Not selected";
}

function teamName(id) {
  return state.teams.find((t) => t.id === id)?.name || id || "Team";
}

function oversText(balls = 0) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(runs, balls) {
  return balls ? (runs / balls * 100).toFixed(2) : "0.00";
}

function economy(runs, balls) {
  return balls ? (runs / balls * 6).toFixed(2) : "0.00";
}

function normaliseTeam(data, id) {
  return {
    ...data,
    id,
    name: clean(
      data.teamName ||
      data.name ||
      data.team ||
      data.title ||
      data.team_name ||
      id
    )
  };
}

function normalisePlayer(data, id, fallbackTeamId = "") {
  const name = clean(
    data.name ||
    data.playerName ||
    data.fullName ||
    data.displayName ||
    data.captainName
  );

  if (!name) return null;

  return {
    id: String(id),
    name,
    teamId: clean(
      data.teamId ||
      data.teamID ||
      data.team_id ||
      data.registeredTeamId ||
      data.registeredTeamID ||
      fallbackTeamId
    ),
    teamName: clean(
      data.teamName ||
      data.registeredTeamName ||
      data.team ||
      data.team_name
    ),
    raw: data
  };
}

function addPlayer(map, data, id, fallbackTeamId = "") {
  const player = normalisePlayer(data, id, fallbackTeamId);
  if (!player) return;

  const key = `${player.id}::${normaliseName(player.name)}`;
  if (!map.has(key)) map.set(key, player);
}

function addRegistrationRoster(map, data, docId) {
  const registrationTeamId = clean(
    data.teamId ||
    data.teamID ||
    data.team_id ||
    data.registeredTeamId ||
    data.registeredTeamID
  );

  const registrationTeamName = clean(
    data.teamName ||
    data.registeredTeamName ||
    data.team ||
    data.team_name
  );

  // APL League format: captainName, player2 ... player15.
  rosterFields.forEach((field) => {
    const name = clean(data[field]);
    if (!name) return;

    addPlayer(
      map,
      {
        name,
        teamId: registrationTeamId,
        teamName: registrationTeamName
      },
      `${docId}_${field}`,
      registrationTeamId
    );
  });

  // Also support arrays used by other registration formats.
  const roster =
    data.players ||
    data.registeredPlayers ||
    data.playerNames ||
    data.squad;

  if (Array.isArray(roster)) {
    roster.forEach((entry, index) => {
      if (typeof entry === "string") {
        addPlayer(
          map,
          {
            name: entry,
            teamId: registrationTeamId,
            teamName: registrationTeamName
          },
          `${docId}_roster_${index}`,
          registrationTeamId
        );
      } else if (entry && typeof entry === "object") {
        addPlayer(
          map,
          {
            ...entry,
            teamId: entry.teamId || registrationTeamId,
            teamName: entry.teamName || registrationTeamName
          },
          entry.id || entry.playerId || `${docId}_roster_${index}`,
          registrationTeamId
        );
      }
    });
  }

  // Support a single-player document too.
  addPlayer(map, data, docId, registrationTeamId);
}

/* ------------------ LOAD TEAMS ------------------ */

async function loadTeams() {
  const snap = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  state.teams = snap.docs.map((d) =>
    normaliseTeam(d.data(), d.id)
  );

  console.log("APL teams:", state.teams);
}

/* ------------------ LOAD PLAYERS ------------------ */

async function loadPlayers() {
  const found = new Map();

  // APL League's current registration collection.
  try {
    const snap = await getDocs(collection(db, "players"));

    snap.forEach((d) => {
      addRegistrationRoster(found, d.data(), d.id);
    });

    console.log("APL League registration documents:", snap.size);
  } catch (error) {
    console.error("Could not load APL League players:", error);
    throw new Error(
      "APL League players collection read nahi ho paya: " +
      error.message
    );
  }

  // Optional tournament team rosters.
  for (const team of state.teams) {
    const lists = [
      team.players,
      team.playerNames,
      team.registeredPlayers,
      team.squad
    ];

    lists.forEach((list) => {
      if (!Array.isArray(list)) return;

      list.forEach((entry, index) => {
        if (typeof entry === "string") {
          addPlayer(
            found,
            { name: entry, teamId: team.id, teamName: team.name },
            `${team.id}_roster_${index}`,
            team.id
          );
        } else if (entry && typeof entry === "object") {
          addPlayer(
            found,
            {
              ...entry,
              teamId: entry.teamId || team.id,
              teamName: entry.teamName || team.name
            },
            entry.id || entry.playerId ||
              `${team.id}_roster_${index}`,
            team.id
          );
        }
      });
    });

    try {
      const snap = await getDocs(
        collection(
          db, "tournaments", tournamentId,
          "teams", team.id, "players"
        )
      );

      snap.forEach((d) => {
        addPlayer(
          found,
          {
            ...d.data(),
            teamId: d.data().teamId || team.id,
            teamName: d.data().teamName || team.name
          },
          d.id,
          team.id
        );
      });
    } catch (error) {
      console.warn("Optional team players unavailable:", team.id);
    }
  }

  // Optional tournament-level player collection.
  try {
    const snap = await getDocs(
      collection(db, "tournaments", tournamentId, "players")
    );

    snap.forEach((d) => addPlayer(found, d.data(), d.id));
  } catch (error) {
    console.warn("Optional tournament players unavailable.");
  }

  // Optional tournament registrations.
  try {
    const snap = await getDocs(
      collection(db, "tournaments", tournamentId, "registrations")
    );

    snap.forEach((d) => addRegistrationRoster(found, d.data(), d.id));
  } catch (error) {
    console.warn("Optional tournament registrations unavailable.");
  }

  state.players = [...found.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  console.log("APL registered players:", state.players);
}

/* ------------------ TEAM MATCHING ------------------ */

function playersForTeam(teamId) {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) return [];

  const targetId = clean(team.id);
  const targetName = normaliseName(team.name);

  // First try a shared team ID.
  const exact = state.players.filter((p) =>
    p.teamId && p.teamId === targetId
  );
  if (exact.length) return exact;

  // Then try a shared team name if registration has one.
  const byName = state.players.filter((p) =>
    p.teamName && normaliseName(p.teamName) === targetName
  );
  if (byName.length) return byName;

  // If the match team explicitly stores the registration team ID,
  // use that reference if available.
  const registrationId = clean(
    team.registrationTeamId ||
    team.registeredTeamId ||
    team.aplTeamId ||
    team.sourceTeamId
  );

  if (registrationId) {
    const byRegistrationId = state.players.filter((p) =>
      p.teamId === registrationId
    );
    if (byRegistrationId.length) return byRegistrationId;
  }

  // Do not silently assign every registration to both teams.
  return [];
}

/* ------------------ MATCH / INNINGS ------------------ */

function newInnings(battingSide, fieldingSide, number) {
  return {
    number,
    battingSide,
    fieldingSide,
    totalRuns: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    batterStats: {},
    bowlerStats: {},
    fallOfWickets: [],
    deliveries: [],
    currentOverRuns: [],
    completed: false,
    target: null
  };
}

async function loadMatch() {
  const ref = doc(
    db, "tournaments", tournamentId, "matches", matchId
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Match document nahi mila. Match ID check karein.");
  }

  state.match = { ...snap.data(), id: snap.id };

  if (Array.isArray(state.match.innings) && state.match.innings.length) {
    state.innings = state.match.innings;
    state.currentInnings = Number(state.match.currentInnings || 1);
  } else {
    const teamA =
      state.match.teamAId ||
      state.match.team1Id ||
      state.match.homeTeamId;

    const teamB =
      state.match.teamBId ||
      state.match.team2Id ||
      state.match.awayTeamId;

    if (!teamA || !teamB) {
      throw new Error(
        "Match mein teamAId/teamBId ya team1Id/team2Id nahi mila."
      );
    }

    state.innings = [newInnings(teamA, teamB, 1)];
    state.currentInnings = 1;
  }

  state.innings.forEach((inn) => {
    inn.extras ||= { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
    inn.batterStats ||= {};
    inn.bowlerStats ||= {};
    inn.fallOfWickets ||= [];
    inn.deliveries ||= [];
    inn.currentOverRuns ||= [];
    inn.totalRuns ||= 0;
    inn.wickets ||= 0;
    inn.legalBalls ||= 0;
  });

  const inn = currentInnings();
  state.strikerId = inn.strikerId || "";
  state.nonStrikerId = inn.nonStrikerId || "";
  state.bowlerId = inn.bowlerId || "";
}

/* ------------------ PLAYER SELECTORS ------------------ */

function fillSelect(id, list, selectedId, placeholder) {
  const el = $(id);
  if (!el) return;

  el.innerHTML =
    `<option value="">${esc(placeholder)}</option>` +
    list.map((p) =>
      `<option value="${esc(p.id)}" ${
        p.id === selectedId ? "selected" : ""
      }>${esc(p.name)}</option>`
    ).join("");
}

function ensurePlayerControls() {
  let root = $("playerSelectControls");

  if (!root) {
    root = document.createElement("section");
    root.id = "playerSelectControls";
    (
      $("scorecard") ||
      $("scorecardContainer") ||
      document.querySelector("main") ||
      document.body
    ).appendChild(root);
  }

  if (!$("strikerSelect")) {
    root.innerHTML = `
      <h3>👥 Select Registered Players</h3>
      <label for="strikerSelect">⭐ Striker</label>
      <select id="strikerSelect"></select>

      <label for="nonStrikerSelect">Non-Striker</label>
      <select id="nonStrikerSelect"></select>

      <label for="bowlerSelect">🎯 Current Bowler</label>
      <select id="bowlerSelect"></select>

      <button id="applyPlayersBtn" type="button">Apply Players</button>
      <p id="playerLoadInfo"></p>
    `;

    $("applyPlayersBtn").addEventListener("click", applyPlayers);
  }
}

function renderPlayers() {
  ensurePlayerControls();

  const inn = currentInnings();
  if (!inn) return;

  const batters = playersForTeam(inn.battingSide);
  const bowlers = playersForTeam(inn.fieldingSide);

  fillSelect("strikerSelect", batters, state.strikerId, "Select striker");
  fillSelect(
    "nonStrikerSelect", batters,
    state.nonStrikerId, "Select non-striker"
  );
  fillSelect("bowlerSelect", bowlers, state.bowlerId, "Select bowler");

  const info = $("playerLoadInfo");
  if (info) {
    if (!state.players.length) {
      info.textContent = "APL League se koi player load nahi hua.";
    } else if (!batters.length || !bowlers.length) {
      info.textContent =
        `${state.players.length} registered players loaded, lekin team mapping match nahi hui. Registration aur tournament team ke beech shared team ID/name zaroori hai.`;
    } else {
      info.textContent =
        `${batters.length} batting players · ${bowlers.length} bowling players`;
    }
  }

  const dismissed = $("dismissedPlayer");
  if (dismissed) {
    const active = [state.strikerId, state.nonStrikerId]
      .map(getPlayer)
      .filter(Boolean);

    fillSelect(
      "dismissedPlayer", active,
      state.strikerId, "Select dismissed batter"
    );
  }
}

function applyPlayers() {
  const inn = currentInnings();
  if (!inn || inn.completed) return;

  const striker = $("strikerSelect")?.value || "";
  const nonStriker = $("nonStrikerSelect")?.value || "";
  const bowler = $("bowlerSelect")?.value || "";

  if (!striker || !nonStriker || !bowler) {
    message("Striker, non-striker aur bowler select karein.", true);
    return;
  }

  if (striker === nonStriker) {
    message("Striker aur non-striker alag hone chahiye.", true);
    return;
  }

  if (!playersForTeam(inn.battingSide).some((p) => p.id === striker) ||
      !playersForTeam(inn.battingSide).some((p) => p.id === nonStriker)) {
    message("Batting team ke players match nahi hue.", true);
    return;
  }

  if (!playersForTeam(inn.fieldingSide).some((p) => p.id === bowler)) {
    message("Bowler fielding team se match nahi hua.", true);
    return;
  }

  state.strikerId = striker;
  state.nonStrikerId = nonStriker;
  state.bowlerId = bowler;

  inn.strikerId = striker;
  inn.nonStrikerId = nonStriker;
  inn.bowlerId = bowler;

  batter(inn, striker);
  batter(inn, nonStriker);
  bowlerStats(inn, bowler);

  render();
  message("Players selected.");
}

/* ------------------ STATS ------------------ */

function batter(inn, id) {
  if (!inn.batterStats[id]) {
    inn.batterStats[id] = {
      playerId: id,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: ""
    };
  }
  return inn.batterStats[id];
}

function bowlerStats(inn, id) {
  if (!inn.bowlerStats[id]) {
    inn.bowlerStats[id] = {
      playerId: id,
      runs: 0,
      legalBalls: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0
    };
  }
  return inn.bowlerStats[id];
}

function remember() {
  state.undoStack.push(JSON.stringify({
    innings: state.innings,
    currentInnings: state.currentInnings,
    strikerId: state.strikerId,
    nonStrikerId: state.nonStrikerId,
    bowlerId: state.bowlerId
  }));

  if (state.undoStack.length > 30) state.undoStack.shift();
}

function swapStrike() {
  [state.strikerId, state.nonStrikerId] =
    [state.nonStrikerId, state.strikerId];

  const inn = currentInnings();
  if (inn) {
    inn.strikerId = state.strikerId;
    inn.nonStrikerId = state.nonStrikerId;
  }
}

function ready() {
  const inn = currentInnings();

  if (!inn || inn.completed) {
    message("Innings complete hai.", true);
    return false;
  }

  if (!state.strikerId || !state.nonStrikerId || !state.bowlerId) {
    message("Pehle striker, non-striker aur bowler select karein.", true);
    return false;
  }

  return true;
}

function recordDelivery(data) {
  const inn = currentInnings();

  inn.deliveries.push({
    id: makeId(),
    over: Math.floor(inn.legalBalls / 6),
    ball: inn.legalBalls % 6,
    ...data,
    timestamp: new Date().toISOString()
  });

  if (inn.target && inn.totalRuns >= inn.target) {
    inn.completed = true;
    inn.result = `${teamName(inn.battingSide)} won`;
  }

  if (inn.wickets >= 10) inn.completed = true;
}

/* ------------------ RUNS ------------------ */

function addRuns(runs) {
  if (!ready()) return;

  const inn = currentInnings();
  remember();

  const strikerBefore = state.strikerId;
  const batterData = batter(inn, strikerBefore);
  const b = bowlerStats(inn, state.bowlerId);

  batterData.runs += runs;
  batterData.balls += 1;
  if (runs === 4) batterData.fours += 1;
  if (runs === 6) batterData.sixes += 1;

  inn.totalRuns += runs;
  inn.legalBalls += 1;
  b.legalBalls += 1;
  b.runs += runs;

  inn.currentOverRuns.push(String(runs));

  if (runs % 2 === 1) swapStrike();

  if (inn.legalBalls % 6 === 0) {
    inn.currentOverRuns = [];
    swapStrike();
  }

  recordDelivery({
    type: "run",
    batterId: strikerBefore,
    bowlerId: state.bowlerId,
    batterRuns: runs,
    totalRuns: runs,
    legal: true
  });

  render();
  message(`${runs} run(s) recorded.`);
}

/* ------------------ EXTRAS ------------------ */

function addExtra(type) {
  if (!ready()) return;

  const inn = currentInnings();
  remember();

  const strikerBefore = state.strikerId;
  const bowlerBefore = state.bowlerId;
  const b = bowlerStats(inn, bowlerBefore);

  let total = 1;
  let legal = true;
  let label = "";

  if (type === "wide") {
    inn.extras.wides += 1;
    b.wides += 1;
    b.runs += 1;
    inn.totalRuns += 1;
    legal = false;
    label = "Wd";
  } else if (type === "noBall") {
    inn.extras.noBalls += 1;
    b.noBalls += 1;
    b.runs += 1;
    inn.totalRuns += 1;
    legal = false;
    label = "Nb";
  } else if (type === "bye") {
    inn.extras.byes += 1;
    inn.totalRuns += 1;
    inn.legalBalls += 1;
    b.legalBalls += 1;
    legal = true;
    label = "B";
  } else if (type === "legBye") {
    inn.extras.legByes += 1;
    inn.totalRuns += 1;
    inn.legalBalls += 1;
    b.legalBalls += 1;
    legal = true;
    label = "Lb";
  } else {
    return;
  }

  inn.currentOverRuns.push(label);

  if (type === "bye" || type === "legBye") {
    if (inn.legalBalls % 6 === 0) {
      inn.currentOverRuns = [];
      swapStrike();
    }
  }

  recordDelivery({
    type,
    batterId: strikerBefore,
    bowlerId: bowlerBefore,
    batterRuns: 0,
    totalRuns: total,
    legal
  });

  render();
  message(`${label} recorded.`);
}

/* ------------------ WICKET ------------------ */

function openWicket() {
  if (!ready()) return;

  let dialog = $("wicketDialog");

  if (!dialog) {
    dialog = document.createElement("section");
    dialog.id = "wicketDialog";
    document.body.appendChild(dialog);
  }

  dialog.innerHTML = `
    <h3>Record Wicket</h3>
    <label for="wicketType">Dismissal type</label>
    <select id="wicketType">
      ${[
        "Bowled", "Caught", "LBW", "Run Out", "Stumped",
        "Hit Wicket", "Caught and Bowled", "Retired Out",
        "Obstructing the Field"
      ].map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("")}
    </select>

    <label for="dismissedPlayer">Dismissed batter</label>
    <select id="dismissedPlayer">
      <option value="${esc(state.strikerId)}">${esc(playerName(state.strikerId))}</option>
      <option value="${esc(state.nonStrikerId)}">${esc(playerName(state.nonStrikerId))}</option>
    </select>

    <button id="confirmWicketBtn" type="button">Confirm Wicket</button>
    <button id="cancelWicketBtn" type="button">Cancel</button>
  `;

  dialog.style.cssText =
    "display:block;padding:12px;border:1px solid #ccc;margin:12px 0";

  $("confirmWicketBtn").addEventListener("click", confirmWicket);
  $("cancelWicketBtn").addEventListener("click", () => {
    dialog.style.display = "none";
  });
}

function confirmWicket() {
  if (!ready()) return;

  const inn = currentInnings();
  const type = $("wicketType")?.value || "Bowled";
  const dismissedId = $("dismissedPlayer")?.value || state.strikerId;
  const bowlerBefore = state.bowlerId;

  remember();

  const batterData = batter(inn, dismissedId);
  const b = bowlerStats(inn, bowlerBefore);

  inn.legalBalls += 1;
  b.legalBalls += 1;
  inn.wickets += 1;

  batterData.out = true;
  batterData.dismissal = type;

  if ([
    "Bowled", "Caught", "LBW", "Stumped",
    "Hit Wicket", "Caught and Bowled"
  ].includes(type)) {
    b.wickets += 1;
  }

  inn.fallOfWickets.push({
    wicket: inn.wickets,
    score: inn.totalRuns,
    over: oversText(inn.legalBalls),
    batterId: dismissedId,
    batterName: playerName(dismissedId),
    dismissal: type
  });

  recordDelivery({
    type: "wicket",
    wicketType: type,
    dismissedId,
    batterId: dismissedId,
    bowlerId: bowlerBefore,
    totalRuns: 0,
    legal: true
  });

  if (dismissedId === state.strikerId) {
    state.strikerId = "";
  } else {
    state.nonStrikerId = "";
  }

  inn.currentOverRuns.push("W");

  if (inn.legalBalls % 6 === 0) {
    inn.currentOverRuns = [];
    if (state.strikerId && state.nonStrikerId) swapStrike();
  }

  inn.strikerId = state.strikerId;
  inn.nonStrikerId = state.nonStrikerId;

  if ($("wicketDialog")) $("wicketDialog").style.display = "none";

  render();
  message(`${playerName(dismissedId)} out: ${type}. Select replacement batter.`);
}

/* ------------------ UNDO / SAVE ------------------ */

function undoLast() {
  if (!state.undoStack.length) {
    message("Undo karne ke liye action nahi hai.", true);
    return;
  }

  const previous = JSON.parse(state.undoStack.pop());

  state.innings = previous.innings;
  state.currentInnings = previous.currentInnings;
  state.strikerId = previous.strikerId;
  state.nonStrikerId = previous.nonStrikerId;
  state.bowlerId = previous.bowlerId;

  render();
  message("Last action undone. Save Score par click karein.");
}

async function saveScore() {
  if (!tournamentId || !matchId) {
    message("Tournament ID ya Match ID missing hai.", true);
    return;
  }

  try {
    const inn = currentInnings();

    if (inn) {
      inn.strikerId = state.strikerId;
      inn.nonStrikerId = state.nonStrikerId;
      inn.bowlerId = state.bowlerId;
    }

    await updateDoc(
      doc(db, "tournaments", tournamentId, "matches", matchId),
      {
        innings: state.innings,
        currentInnings: state.currentInnings,
        liveScore: {
          innings: state.currentInnings,
          battingSide: inn?.battingSide || "",
          runs: inn?.totalRuns || 0,
          wickets: inn?.wickets || 0,
          overs: oversText(inn?.legalBalls || 0),
          status: inn?.completed ? "Completed" : "Live"
        },
        status: state.innings.every((i) => i.completed)
          ? "Completed"
          : "Live",
        updatedAt: serverTimestamp()
      }
    );

    message("Score successfully saved.");
  } catch (error) {
    console.error("Save score failed:", error);
    message("Save error: " + error.message, true);
  }
}

/* ------------------ SECOND INNINGS ------------------ */

function startSecondInnings() {
  if (state.innings.length >= 2) {
    message("Second innings already started.", true);
    return;
  }

  if (!confirm("Second innings start karein?")) return;

  const first = currentInnings();
  first.completed = true;

  const second = newInnings(
    first.fieldingSide,
    first.battingSide,
    2
  );

  second.target = first.totalRuns + 1;

  state.innings.push(second);
  state.currentInnings = 2;
  state.strikerId = "";
  state.nonStrikerId = "";
  state.bowlerId = "";

  render();
  message(`Second innings started. Target: ${second.target}. Save Score karein.`);
}

/* ------------------ RENDER ------------------ */

function ensureSection(id, title) {
  let el = $(id);

  if (!el) {
    el = document.createElement("section");
    el.id = id;
    (document.querySelector("main") || document.body).appendChild(el);
  }

  el.innerHTML = `<h3>${esc(title)}</h3>`;
  return el;
}

function render() {
  const inn = currentInnings();
  if (!inn) return;

  renderPlayers();

  if ($("matchId")) $("matchId").textContent = matchId;
  if ($("matchInfo")) {
    $("matchInfo").textContent =
      `${teamName(inn.battingSide)} vs ${teamName(inn.fieldingSide)}`;
  }
  if ($("battingTeam")) {
    $("battingTeam").textContent = teamName(inn.battingSide);
  }
  if ($("score")) {
    $("score").textContent = `${inn.totalRuns}/${inn.wickets}`;
  }
  if ($("overs")) $("overs").textContent = oversText(inn.legalBalls);

  if ($("crr")) {
    $("crr").textContent = inn.legalBalls
      ? (inn.totalRuns / inn.legalBalls * 6).toFixed(2)
      : "0.00";
  }

  const striker = inn.batterStats[state.strikerId] || {
    runs: 0, balls: 0, fours: 0, sixes: 0
  };

  const nonStriker = inn.batterStats[state.nonStrikerId] || {
    runs: 0, balls: 0, fours: 0, sixes: 0
  };

  const bowler = inn.bowlerStats[state.bowlerId] || {
    runs: 0, legalBalls: 0, wickets: 0, wides: 0, noBalls: 0
  };

  if ($("strikerRuns")) $("strikerRuns").textContent = striker.runs;
  if ($("strikerBalls")) $("strikerBalls").textContent = striker.balls;
  if ($("strikerSR")) {
    $("strikerSR").textContent = strikeRate(striker.runs, striker.balls);
  }

  if ($("nonStrikerRuns")) $("nonStrikerRuns").textContent = nonStriker.runs;
  if ($("nonStrikerBalls")) $("nonStrikerBalls").textContent = nonStriker.balls;
  if ($("nonStrikerSR")) {
    $("nonStrikerSR").textContent =
      strikeRate(nonStriker.runs, nonStriker.balls);
  }

  if ($("bowlerName")) $("bowlerName").textContent = playerName(state.bowlerId);
  if ($("bowlerOvers")) {
    $("bowlerOvers").textContent = oversText(bowler.legalBalls);
  }
  if ($("bowlerRuns")) $("bowlerRuns").textContent = bowler.runs;
  if ($("bowlerWickets")) $("bowlerWickets").textContent = bowler.wickets;
  if ($("bowlerEconomy")) {
    $("bowlerEconomy").textContent = economy(bowler.runs, bowler.legalBalls);
  }

  if ($("currentOver")) {
    $("currentOver").textContent = inn.currentOverRuns.join(" ") || "—";
  }

  const extrasEl = ensureSection("liveScoreExtras", "Extras");
  extrasEl.innerHTML += `
    <p>
      Wides: ${inn.extras.wides} |
      No-balls: ${inn.extras.noBalls} |
      Byes: ${inn.extras.byes} |
      Leg-byes: ${inn.extras.legByes}
    </p>
  `;

  const fallEl = ensureSection("fallOfWickets", "Fall of Wickets");
  fallEl.innerHTML += inn.fallOfWickets.length
    ? inn.fallOfWickets.map((w) => `
      <p>${w.wicket}-${w.score}: ${esc(w.batterName)}
      (${esc(w.dismissal)}), ${esc(w.over)} overs</p>
    `).join("")
    : "<p>No wickets yet.</p>";

  const battingEl = ensureSection("scorecardBattingTable", "Batting Scorecard");
  battingEl.innerHTML += `
    <div style="overflow-x:auto">
      <table class="apl-score-table">
        <thead>
          <tr>
            <th>Batter</th><th>R</th><th>B</th><th>4s</th>
            <th>6s</th><th>SR</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(inn.batterStats).map((b) => `
            <tr>
              <td>${esc(playerName(b.playerId))}</td>
              <td>${b.runs}</td><td>${b.balls}</td>
              <td>${b.fours}</td><td>${b.sixes}</td>
              <td>${strikeRate(b.runs, b.balls)}</td>
              <td>${b.out ? esc(b.dismissal || "Out") : "Not out"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const bowlingEl = ensureSection("scorecardBowlingTable", "Bowling Scorecard");
  bowlingEl.innerHTML += `
    <div style="overflow-x:auto">
      <table class="apl-score-table">
        <thead>
          <tr>
            <th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Wd</th><th>NB</th><th>Eco</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(inn.bowlerStats).map((b) => `
            <tr>
              <td>${esc(playerName(b.playerId))}</td>
              <td>${oversText(b.legalBalls)}</td>
              <td>${b.runs}</td><td>${b.wickets}</td>
              <td>${b.wides || 0}</td><td>${b.noBalls || 0}</td>
              <td>${economy(b.runs, b.legalBalls)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const yetEl = ensureSection("yetToBat", "Yet to Bat");
  const yetToBat = playersForTeam(inn.battingSide).filter((p) => {
    const stats = inn.batterStats[p.id];
    return !stats && p.id !== state.strikerId &&
      p.id !== state.nonStrikerId;
  });

  yetEl.innerHTML += `<p>${
    yetToBat.length
      ? yetToBat.map((p) => esc(p.name)).join(", ")
      : "No remaining batters"
  }</p>`;

  document.querySelectorAll(".run-btn[data-runs]").forEach((button) => {
    button.disabled = inn.completed;
  });

  [
    "wideBtn", "noBallBtn", "byeBtn", "legByeBtn",
    "wicketBtn", "undoBtn", "swapBtn", "saveBtn", "endMatchBtn"
  ].forEach((id) => {
    if ($(id)) $(id).disabled = inn.completed;
  });

  if ($("startSecondInningsBtn")) {
    $("startSecondInningsBtn").disabled = state.innings.length >= 2;
  }
}

/* ------------------ BUTTONS ------------------ */

function bindEvents() {
  document.querySelectorAll(".run-btn[data-runs]").forEach((button) => {
    button.addEventListener("click", () => addRuns(Number(button.dataset.runs)));
  });

  $("wideBtn")?.addEventListener("click", () => addExtra("wide"));
  $("noBallBtn")?.addEventListener("click", () => addExtra("noBall"));
  $("byeBtn")?.addEventListener("click", () => addExtra("bye"));
  $("legByeBtn")?.addEventListener("click", () => addExtra("legBye"));
  $("wicketBtn")?.addEventListener("click", openWicket);
  $("undoBtn")?.addEventListener("click", undoLast);
  $("saveBtn")?.addEventListener("click", saveScore);
  $("startSecondInningsBtn")?.addEventListener("click", startSecondInnings);

  $("swapBtn")?.addEventListener("click", () => {
    if (!ready()) return;
    remember();
    swapStrike();
    render();
    message("Strike swapped.");
  });

  $("endMatchBtn")?.addEventListener("click", async () => {
    const inn = currentInnings();
    if (!inn) return;
    if (!confirm("Match complete karein?")) return;

    inn.completed = true;
    await saveScore();
    render();
  });
}

/* ------------------ START ------------------ */

async function init() {
  if (!tournamentId || !matchId) {
    message(
      "URL mein tournamentId aur matchId missing hain. Match link check karein.",
      true
    );
    return;
  }

  try {
    message("Loading teams, players and match...");

    await loadTeams();
    await loadPlayers();
    await loadMatch();

    bindEvents();
    render();

    if (!state.players.length) {
      message(
        "Koi registered player nahi mila. Firebase players collection aur permissions check karein.",
        true
      );
    } else {
      message(
        `${state.players.length} registered player records loaded. Dropdown aur team mapping check karein.`
      );
    }
  } catch (error) {
    console.error("APL scorecard load error:", error);
    message(error.message || "Scorecard load nahi hua.", true);
  }
}

init();
