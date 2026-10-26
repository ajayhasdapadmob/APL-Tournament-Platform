
import { db, legacyDb } from "./firebase.js";
import { advanceApplT10Winner } from "./js/appl-t10-advancement.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/*
 * APL LIVE SCORING
 * - Existing tournaments and matches are preserved.
 * - No registrations or matches are deleted.
 * - Ball-by-ball scoring, undo, player selection and score saving.
 */

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
  match: null,
  teams: [],
  players: [],
  innings: [],
  inningsIndex: 0,
  undo: [],
  saving: false,
  saveQueue: Promise.resolve(),
  initialized: false
};

const PLAYER_FIELDS = [
  "captainName",
  ...Array.from({ length: 15 }, (_, i) => `player${i + 1}`)
];
function clean(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function esc(value) {
  return clean(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function currentInnings() {
  return state.innings[state.inningsIndex] || null;
}

function getTeamId(team) {
  return clean(
    team?.teamId ||
    team?.teamID ||
    team?.id ||
    team?.team ||
    ""
  );
}

function getTeamName(team) {
  return clean(
    team?.teamName ||
    team?.name ||
    team?.team ||
    team?.nameOfTeam ||
    ""
  );
}

function getTeamFromMatch(match, side) {
  const upper = side.toUpperCase();

  const id =
    match[`team${upper}Id`] ||
    match[`team${upper}ID`] ||
    match[`team${upper}`] ||
    match[`team${side}Id`] ||
    "";

  const name =
    match[`team${upper}Name`] ||
    match[`team${side}Name`] ||
    (typeof match[`team${upper}`] === "string"
      ? match[`team${upper}`]
      : "") ||
    "";

  return {
    id: clean(id),
    name: clean(name)
  };
}

function teamMatches(player, team) {
  const playerTeamId = norm(
    player.teamId ||
    player.teamID ||
    player.registeredTeamId ||
    player.team ||
    ""
  );

  const playerTeamName = norm(
    player.teamName ||
    player.registeredTeamName ||
    player.team ||
    ""
  );

  return (
    (team.id && playerTeamId && playerTeamId === norm(team.id)) ||
    (team.name && playerTeamName &&
      playerTeamName === norm(team.name))
  );
}

function setMessage(message, isError = false) {
  const el = $("playerMessage") || $("playerLoadMessage");

  if (el) {
    el.textContent = message;
    el.style.color = isError ? "#dc2626" : "";
  }

  console[isError ? "error" : "log"](message);
}

function setMatchHeading(message) {
  const info = $("matchInfo");
  if (!info) return;

  // Do not replace matchInfo.textContent: it contains other IDs.
  const heading = info.querySelector("h2");
  if (heading) heading.textContent = message;
}

function oversText(balls) {
  const n = Math.max(0, Number(balls) || 0);
  return `${Math.floor(n / 6)}.${n % 6}`;
}

function strikeRate(runs, balls) {
  return balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
}

function economy(runs, balls) {
  return balls > 0 ? ((runs * 6) / balls).toFixed(2) : "0.00";
}

function makeInnings(team, index) {
  return {
    inningsNumber: index + 1,
    battingTeamId: team.id || "",
    battingTeamName: team.name || "",
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0
    },
    batters: {},
    bowlers: {},
    deliveries: [],
    fallOfWickets: [],
    yetToBat: [],
    strikerId: "",
    nonStrikerId: "",
    bowlerId: "",
    completed: false
  };
}

function ensureInnings(inn) {
  if (!inn.extras) {
    inn.extras = {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      penalty: 0
    };
  }

  for (const key of ["wides", "noBalls", "byes", "legByes", "penalty"]) {
    if (!Number.isFinite(Number(inn.extras[key]))) {
      inn.extras[key] = 0;
    }
  }

  inn.runs = Number(inn.runs) || 0;
  inn.wickets = Number(inn.wickets) || 0;
  inn.legalBalls = Number(inn.legalBalls) || 0;
  inn.batters ||= {};
  inn.bowlers ||= {};
  inn.deliveries ||= [];
  inn.fallOfWickets ||= [];
  inn.yetToBat ||= [];
  return inn;
}

function ensureBatter(inn, id, name) {
  const key = clean(id || name);
  if (!key) return null;

  if (!inn.batters[key]) {
    inn.batters[key] = {
      playerId: key,
      name: clean(name) || key,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: ""
    };
  }

  return inn.batters[key];
}

function ensureBowler(inn, id, name) {
  const key = clean(id || name);
  if (!key) return null;

  if (!inn.bowlers[key]) {
    inn.bowlers[key] = {
      playerId: key,
      name: clean(name) || key,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      wides: 0,
      noBalls: 0
    };
  }

  return inn.bowlers[key];
}

function getSelectedPlayer(selectId) {
  const select = $(selectId);
  if (!select || !select.value) return null;

  return state.players.find(
    (p) => p.id === select.value
  ) || null;
}

function fillSelect(selectId, players, selectedValue = "") {
  const select = $(selectId);
  if (!select) return;

  const previous = selectedValue || select.value;

  select.innerHTML =
    '<option value="">-- Select Player --</option>' +
    players.map((p) =>
      `<option value="${esc(p.id)}">${esc(p.name)}</option>`
    ).join("");

  if (players.some((p) => p.id === previous)) {
    select.value = previous;
  }
}

function getBattingTeam() {
  const inn = currentInnings();
  if (!inn) return null;

  return state.teams.find(
    (t) =>
      (inn.battingTeamId &&
        norm(getTeamId(t)) === norm(inn.battingTeamId)) ||
      (inn.battingTeamName &&
        norm(getTeamName(t)) === norm(inn.battingTeamName))
  ) || null;
}

function getBowlingTeam() {
  const inn = currentInnings();
  if (!inn) return null;

  const batting = getBattingTeam();

  return state.teams.find(
    (t) => t !== batting
  ) || null;
}

function refreshPlayerDropdowns() {
  const battingTeam = getBattingTeam();
  const bowlingTeam = getBowlingTeam();

  const battingPlayers = state.players.filter(
    (p) => battingTeam && teamMatches(p, {
      id: getTeamId(battingTeam),
      name: getTeamName(battingTeam)
    })
  );

  const bowlingPlayers = state.players.filter(
    (p) => bowlingTeam && teamMatches(p, {
      id: getTeamId(bowlingTeam),
      name: getTeamName(bowlingTeam)
    })
  );

  // Keep selections where possible.
  const strikerValue = $("strikerSelect")?.value || "";
  const nonStrikerValue = $("nonStrikerSelect")?.value || "";
  const bowlerValue = $("bowlerSelect")?.value || "";

  fillSelect("strikerSelect", battingPlayers, strikerValue);
  fillSelect("nonStrikerSelect", battingPlayers, nonStrikerValue);
  fillSelect("bowlerSelect", bowlingPlayers, bowlerValue);

  if (!battingPlayers.length || !bowlingPlayers.length) {
    setMessage(
      "Players match nahi hue. Registration records mein team name aur player name check karein.",
      true
    );
  }
}

function addPlayer(name, teamName, teamId, sourceId = "") {
  name = clean(name);
  if (!name) return;

  const team = state.teams.find((t) =>
    (teamId && norm(getTeamId(t)) === norm(teamId)) ||
    (teamName && norm(getTeamName(t)) === norm(teamName))
  );

  const resolvedTeamId = getTeamId(team) || clean(teamId);
  const resolvedTeamName = getTeamName(team) || clean(teamName);

  const existing = state.players.find((p) =>
    norm(p.name) === norm(name) &&
    (
      norm(p.teamId) === norm(resolvedTeamId) ||
      norm(p.teamName) === norm(resolvedTeamName)
    )
  );

  if (existing) return;

  const id = sourceId
    ? `${sourceId}_${norm(name)}`
    : `${norm(resolvedTeamId || resolvedTeamName)}_${norm(name)}`;

  state.players.push({
    id,
    name,
    teamId: resolvedTeamId,
    teamName: resolvedTeamName
  });
}

function readRegistration(data, documentId) {
  const teamName = clean(
    data.teamName ||
    data.registeredTeamName ||
    data.team ||
    data.nameOfTeam ||
    data.clubName ||
    ""
  );

  const teamId = clean(
    data.teamId ||
    data.registeredTeamId ||
    data.teamID ||
    ""
  );

  // Registrations can store an array of player objects.
  for (const field of [
    "players",
    "playerList",
    "teamPlayers",
    "registeredPlayers"
  ]) {
    if (Array.isArray(data[field])) {
      data[field].forEach((item) => {
        if (typeof item === "string") {
          addPlayer(item, teamName, teamId, documentId);
        } else if (item && typeof item === "object") {
          addPlayer(
            item.playerName || item.fullName || item.name,
            item.teamName || teamName,
            item.teamId || teamId,
            documentId
          );
        }
      });
    }
  }

  // Legacy registration documents may use player1...player15.
  PLAYER_FIELDS.forEach((field) => {
    const value = data[field];

    if (typeof value === "string") {
      addPlayer(value, teamName, teamId, documentId);
    } else if (value && typeof value === "object") {
      addPlayer(
        value.playerName || value.fullName || value.name,
        value.teamName || teamName,
        value.teamId || teamId,
        documentId
      );
    }
  });

  // Single-player registration document.
  addPlayer(
    data.playerName || data.fullName || data.name,
    teamName,
    teamId,
    documentId
  );
}

async function loadTeams() {
  const snapshot = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  state.teams = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  return state.teams;
}

async function loadRegisteredPlayers() {
  state.players = [];

  // Tournament-specific player documents.
  try {
    const snapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "players")
    );

    snapshot.forEach((d) => {
      const data = d.data();
      const teamName = clean(
        data.teamName || data.team || data.registeredTeamName
      );
      const teamId = clean(
        data.teamId || data.registeredTeamId
      );

      addPlayer(
        data.playerName || data.fullName || data.name,
        teamName,
        teamId,
        d.id
      );

      PLAYER_FIELDS.forEach((field) => {
        const value = data[field];
        if (typeof value === "string") {
          addPlayer(value, teamName, teamId, d.id);
        }
      });
    });
  } catch (error) {
    console.warn("Tournament players collection not available:", error);
  }

  // Legacy registrations: preserve the existing source database.
  try {
    const snapshot = await getDocs(
      collection(legacyDb, "registrations")
    );

    snapshot.forEach((d) => readRegistration(d.data(), d.id));
  } catch (error) {
    console.warn("Legacy registrations could not be loaded:", error);
  }

  // Some older projects may also have a players collection.
  try {
    const snapshot = await getDocs(
      collection(legacyDb, "players")
    );

    snapshot.forEach((d) => readRegistration(d.data(), d.id));
  } catch (error) {
    console.warn("Legacy players collection not available:", error);
  }

  refreshPlayerDropdowns();

  if (state.players.length) {
    setMessage(`${state.players.length} registered player(s) loaded.`);
  } else {
    setMessage(
      "Players nahi mile. Firebase rules aur registration field names check karein.",
      true
    );
  }
}

function normalizeExistingInnings(raw, index) {
  const inn = ensureInnings({
    ...makeInnings(
      {
        id: raw.battingTeamId || "",
        name: raw.battingTeamName || ""
      },
      index
    ),
    ...raw
  });

  if (!Array.isArray(inn.deliveries)) inn.deliveries = [];
  return inn;
}

async function loadMatch() {
  if (!tournamentId || !matchId) {
    throw new Error(
      "Tournament ID ya Match ID missing hai. Schedule se match open karein."
    );
  }

  localStorage.setItem("aplTournamentId", tournamentId);
  localStorage.setItem("aplMatchId", matchId);

  const matchRef = doc(
    db,
    "tournaments",
    tournamentId,
    "matches",
    matchId
  );

  const snap = await getDoc(matchRef);

  if (!snap.exists()) {
    throw new Error("Match nahi mila. Match ID aur tournament check karein.");
  }

  state.match = {
    id: snap.id,
    ...snap.data()
  };

  const match = state.match;
  const teamA = getTeamFromMatch(match, "A");
  const teamB = getTeamFromMatch(match, "B");

  // Resolve stored match team references against tournament teams.
  const resolvedA = state.teams.find((t) =>
    (teamA.id && norm(getTeamId(t)) === norm(teamA.id)) ||
    (teamA.name && norm(getTeamName(t)) === norm(teamA.name))
  );

  const resolvedB = state.teams.find((t) =>
    (teamB.id && norm(getTeamId(t)) === norm(teamB.id)) ||
    (teamB.name && norm(getTeamName(t)) === norm(teamB.name))
  );

  const fallbackA = {
    id: teamA.id || getTeamId(resolvedA),
    name: teamA.name || getTeamName(resolvedA)
  };

  const fallbackB = {
    id: teamB.id || getTeamId(resolvedB),
    name: teamB.name || getTeamName(resolvedB)
  };

  const inningsData =
    match.innings ||
    match.scorecard?.innings ||
    [];

  if (Array.isArray(inningsData) && inningsData.length) {
    state.innings = inningsData.map(normalizeExistingInnings);
  } else {
    state.innings = [
      makeInnings(fallbackA, 0)
    ];
  }

  state.inningsIndex = Math.min(
    Number(match.currentInningsIndex) || 0,
    Math.max(0, state.innings.length - 1)
  );

  // Keep current innings selected; no existing data is reset.
  state.innings.forEach(ensureInnings);

  if ($("matchId")) $("matchId").textContent = `Match ID: ${matchId}`;

  setMatchHeading(
    `${fallbackA.name || "Team A"} vs ${fallbackB.name || "Team B"}`
  );

  if ($("inningsNumber")) {
    $("inningsNumber").textContent =
      `Innings ${state.inningsIndex + 1}`;
  }

  const linkIds = [
    "tournamentLink",
    "scheduleLink",
    "resultsLink",
    "pointsLink"
  ];

  linkIds.forEach((id) => {
    const el = $(id);
    if (!el) return;

    const url = new URL(el.getAttribute("href") || "#", location.href);
    url.searchParams.set("tournamentId", tournamentId);
    el.href = url.toString();
  });

  render();
}

function pushUndo() {
  // Keep a bounded history to avoid unbounded memory use.
  state.undo.push(JSON.stringify({
    innings: state.innings,
    inningsIndex: state.inningsIndex
  }));

  if (state.undo.length > 100) state.undo.shift();
}

function swapStrike(inn) {
  const old = inn.strikerId;
  inn.strikerId = inn.nonStrikerId;
  inn.nonStrikerId = old;
}

function recordBall(runs = 0, type = "normal") {
  const inn = currentInnings();
  if (!inn || inn.completed) return;

  const striker = getSelectedPlayer("strikerSelect");
  const nonStriker = getSelectedPlayer("nonStrikerSelect");
  const bowler = getSelectedPlayer("bowlerSelect");

  if (!striker || !nonStriker || !bowler) {
    setMessage("Pehle striker, non-striker aur bowler select karein.", true);
    return;
  }

  if (striker.id === nonStriker.id) {
    setMessage("Striker aur non-striker alag players hone chahiye.", true);
    return;
  }

  pushUndo();

  inn.strikerId = striker.id;
  inn.nonStrikerId = nonStriker.id;
  inn.bowlerId = bowler.id;

  const batter = ensureBatter(inn, striker.id, striker.name);
  const bowlerStats = ensureBowler(inn, bowler.id, bowler.name);

  runs = Math.max(0, Math.floor(Number(runs) || 0));

  const delivery = {
    runs: 0,
    batterRuns: 0,
    extras: 0,
    extraType: "",
    wicket: false,
    legal: true,
    strikerId: striker.id,
    strikerName: striker.name,
    bowlerId: bowler.id,
    bowlerName: bowler.name,
    timestamp: new Date().toISOString()
  };

  if (type === "wide") {
    delivery.legal = false;
    delivery.extraType = "wide";
    delivery.extras = runs || 1;
    delivery.runs = delivery.extras;

    inn.extras.wides += delivery.extras;
    bowlerStats.wides += delivery.extras;
    bowlerStats.runs += delivery.runs;
    inn.runs += delivery.runs;
  } else if (type === "noball") {
    delivery.legal = false;
    delivery.extraType = "noBall";
    delivery.extras = 1;
    delivery.runs = delivery.extras + runs;

    inn.extras.noBalls += 1;
    bowlerStats.noBalls += 1;
    bowlerStats.runs += delivery.runs;
    inn.runs += delivery.runs;

    if (runs > 0) {
      batter.runs += runs;
      delivery.batterRuns = runs;
      if (runs === 4) batter.fours++;
      if (runs === 6) batter.sixes++;
    }

    // No-ball counts as a ball faced, but not a legal ball.
    batter.balls++;
  } else if (type === "bye" || type === "legbye") {
    delivery.extraType = type;
    delivery.extras = runs || 1;
    delivery.runs = delivery.extras;

    if (type === "bye") inn.extras.byes += delivery.extras;
    else inn.extras.legByes += delivery.extras;

    inn.runs += delivery.runs;
    bowlerStats.legalBalls++;
    inn.legalBalls++;

    // Byes/leg-byes do not count against the bowler.
    batter.balls++;
  } else {
    delivery.runs = runs;
    delivery.batterRuns = runs;

    batter.runs += runs;
    batter.balls++;
    if (runs === 4) batter.fours++;
    if (runs === 6) batter.sixes++;

    inn.runs += runs;
    bowlerStats.runs += runs;
    bowlerStats.legalBalls++;
    inn.legalBalls++;
  }

  // Change ends for odd completed runs.
  if (delivery.runs % 2 === 1) swapStrike(inn);

  // Over-end end change is applied after the sixth legal ball.
  if (delivery.legal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
    swapStrike(inn);
  }

  inn.deliveries.push(delivery);

  const maxOvers = Number(state.match.overs || state.match.totalOvers || 0);
  if (
    (maxOvers > 0 && inn.legalBalls >= maxOvers * 6) ||
    inn.wickets >= 10
  ) {
    inn.completed = true;
  }

  render();
  queueSave();
}

function recordWicket() {
  const inn = currentInnings();
  if (!inn || inn.completed) return;

  const striker = getSelectedPlayer("strikerSelect");
  const nonStriker = getSelectedPlayer("nonStrikerSelect");
  const bowler = getSelectedPlayer("bowlerSelect");

  if (!striker || !bowler) {
    setMessage("Wicket record karne se pehle striker aur bowler select karein.", true);
    return;
  }

  pushUndo();

  inn.strikerId = striker.id;
  inn.nonStrikerId = nonStriker?.id || "";
  inn.bowlerId = bowler.id;

  const batter = ensureBatter(inn, striker.id, striker.name);
  const bowlerStats = ensureBowler(inn, bowler.id, bowler.name);

  inn.wickets++;
  inn.legalBalls++;
  bowlerStats.legalBalls++;
  bowlerStats.wickets++;
  batter.out = true;
  batter.dismissal = "Wicket";

  inn.fallOfWickets.push({
    wicket: inn.wickets,
    score: inn.runs,
    overs: oversText(inn.legalBalls),
    batter: striker.name
  });

  inn.deliveries.push({
    runs: 0,
    batterRuns: 0,
    extras: 0,
    extraType: "",
    wicket: true,
    legal: true,
    dismissal: "Wicket",
    strikerId: striker.id,
    strikerName: striker.name,
    bowlerId: bowler.id,
    bowlerName: bowler.name,
    timestamp: new Date().toISOString()
  });

  inn.strikerId = "";
  if (inn.wickets >= 10) inn.completed = true;

  if (inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
    swapStrike(inn);
  }

  if ($("strikerSelect")) $("strikerSelect").value = "";

  render();
  queueSave();
}

function undoLast() {
  if (!state.undo.length) {
    setMessage("Undo ke liye koi previous action nahi hai.");
    return;
  }

  const previous = state.undo.pop();

  try {
    const parsed = JSON.parse(previous);
    state.innings = parsed.innings;
    state.inningsIndex = parsed.inningsIndex;
    render();
    queueSave();
    setMessage("Last scoring action undo ho gaya.");
  } catch (error) {
    console.error(error);
    setMessage("Undo nahi ho saka.", true);
  }
}

function renderBattingTable(inn) {
  const body = $("battingTableBody");
  if (!body) return;

  const batters = Object.values(inn.batters || {});

  body.innerHTML = batters.map((b) => `
    <tr>
      <td>${esc(b.name)}${b.out ? " (out)" : " (not out)"}</td>
      <td>${Number(b.runs) || 0}</td>
      <td>${Number(b.balls) || 0}</td>
      <td>${Number(b.fours) || 0}</td>
      <td>${Number(b.sixes) || 0}</td>
      <td>${strikeRate(Number(b.runs) || 0, Number(b.balls) || 0)}</td>
    </tr>
  `).join("");
}

function renderBowlingTable(inn) {
  const body = $("bowlingTableBody");
  if (!body) return;

  body.innerHTML = Object.values(inn.bowlers || {}).map((b) => `
    <tr>
      <td>${esc(b.name)}</td>
      <td>${oversText(b.legalBalls || 0)}</td>
      <td>${Number(b.runs) || 0}</td>
      <td>${Number(b.wickets) || 0}</td>
      <td>${economy(Number(b.runs) || 0, Number(b.legalBalls) || 0)}</td>
    </tr>
  `).join("");
}

function renderList(id, items, formatter) {
  const el = $(id);
  if (!el) return;

  el.innerHTML = items.length
    ? items.map((item) => `<li>${formatter(item)}</li>`).join("")
    : "<li>None</li>";
}

function render() {
  const inn = currentInnings();
  if (!inn) return;

  ensureInnings(inn);

  if ($("inningsNumber")) {
    $("inningsNumber").textContent = `Innings ${state.inningsIndex + 1}`;
  }

  if ($("battingTeam")) {
    $("battingTeam").textContent = inn.battingTeamName || "Batting Team";
  }

  if ($("score")) {
    $("score").textContent = `${inn.runs}/${inn.wickets}`;
  }

  if ($("overs")) {
    $("overs").textContent = oversText(inn.legalBalls);
  }

  if ($("crr")) {
    $("crr").textContent =
      inn.legalBalls > 0
        ? ((inn.runs * 6) / inn.legalBalls).toFixed(2)
        : "0.00";
  }

  const extras = inn.extras || {};
  if ($("wides")) $("wides").textContent = extras.wides || 0;
  if ($("noBalls")) $("noBalls").textContent = extras.noBalls || 0;

  const striker = inn.batters?.[inn.strikerId];
  const nonStriker = inn.batters?.[inn.nonStrikerId];
  const bowler = inn.bowlers?.[inn.bowlerId];

  if ($("strikerName")) $("strikerName").textContent = striker?.name || "—";
  if ($("strikerRuns")) $("strikerRuns").textContent = striker?.runs ?? 0;
  if ($("strikerBalls")) $("strikerBalls").textContent = striker?.balls ?? 0;
  if ($("strikerSR")) {
    $("strikerSR").textContent = strikeRate(
      striker?.runs || 0,
      striker?.balls || 0
    );
  }

  if ($("nonStrikerName")) $("nonStrikerName").textContent = nonStriker?.name || "—";
  if ($("nonStrikerRuns")) $("nonStrikerRuns").textContent = nonStriker?.runs ?? 0;
  if ($("nonStrikerBalls")) $("nonStrikerBalls").textContent = nonStriker?.balls ?? 0;
  if ($("nonStrikerSR")) {
    $("nonStrikerSR").textContent = strikeRate(
      nonStriker?.runs || 0,
      nonStriker?.balls || 0
    );
  }

  if ($("bowlerName")) $("bowlerName").textContent = bowler?.name || "—";
  if ($("bowlerOvers")) $("bowlerOvers").textContent = oversText(bowler?.legalBalls || 0);
  if ($("bowlerRuns")) $("bowlerRuns").textContent = bowler?.runs ?? 0;
  if ($("bowlerWickets")) $("bowlerWickets").textContent = bowler?.wickets ?? 0;
  if ($("bowlerEconomy")) {
    $("bowlerEconomy").textContent = economy(
      bowler?.runs || 0,
      bowler?.legalBalls || 0
    );
  }

  if ($("teamFours")) {
    $("teamFours").textContent = Object.values(inn.batters)
      .reduce((sum, b) => sum + (Number(b.fours) || 0), 0);
  }

  if ($("totalFours")) {
    $("totalFours").textContent = Object.values(inn.batters)
      .reduce((sum, b) => sum + (Number(b.fours) || 0), 0);
  }

  if ($("totalSixes")) {
    $("totalSixes").textContent = Object.values(inn.batters)
      .reduce((sum, b) => sum + (Number(b.sixes) || 0), 0);
  }

  if ($("matchStatus")) {
    $("matchStatus").textContent = inn.completed ? "Innings Completed" : "Live";
  }

  if ($("targetInfo")) {
    const previous = state.innings[state.inningsIndex - 1];
    $("targetInfo").textContent = previous
      ? `Target: ${previous.runs + 1}`
      : "";
  }

  if ($("currentOver")) {
    const lastSix = (inn.deliveries || []).slice(-6);
    $("currentOver").textContent = lastSix.map((d) => {
      if (d.wicket) return "W";
      if (d.extraType === "wide") return "Wd";
      if (d.extraType === "noBall") return "Nb";
      if (d.extraType === "bye") return `B${d.runs}`;
      if (d.extraType === "legbye") return `Lb${d.runs}`;
      return String(d.runs);
    }).join("  ");
  }

  renderList(
    "fallOfWicketsList",
    inn.fallOfWickets || [],
    (f) => `${f.wicket} - ${f.score} (${f.overs}), ${esc(f.batter)}`
  );

  renderList(
    "yetToBatList",
    inn.yetToBat || [],
    (p) => esc(typeof p === "string" ? p : p.name || p.playerName || "")
  );

  renderBattingTable(inn);
  renderBowlingTable(inn);
}

function buildScorePayload() {
  const inn = currentInnings();

  const teamA = getTeamFromMatch(state.match, "A");
  const teamB = getTeamFromMatch(state.match, "B");

  const innings = state.innings.map((item) => ({
    ...item,
    batters: { ...item.batters },
    bowlers: { ...item.bowlers },
    deliveries: [...item.deliveries],
    fallOfWickets: [...item.fallOfWickets],
    extras: { ...item.extras }
  }));

  const first = innings[0] || null;
  const second = innings[1] || null;

 let winner = state.match.winner || "";
let winnerTeamId = state.match.winnerTeamId || "";
let winnerTeamName = state.match.winnerTeamName || "";
let result = state.match.result || "";
let status = "Live";

  if (first?.completed && second?.completed) {
  status = "Completed";

  if (first.runs > second.runs) {
    winner = first.battingTeamName;
    winnerTeamId = first.battingTeamId || "";
    winnerTeamName = first.battingTeamName || winner;
    result = `${winner} won by ${first.runs - second.runs} runs`;
  } else if (second.runs > first.runs) {
    winner = second.battingTeamName;
    winnerTeamId = second.battingTeamId || "";
    winnerTeamName = second.battingTeamName || winner;
    result = `${winner} won by ${10 - second.wickets} wickets`;
  } else {
    winner = "";
    winnerTeamId = "";
    winnerTeamName = "";
    result = "Scores tied";
  }
}
  const teamAScore = innings.find((item) =>
    (teamA.id && norm(item.battingTeamId) === norm(teamA.id)) ||
    (teamA.name && norm(item.battingTeamName) === norm(teamA.name))
  );

  const teamBScore = innings.find((item) =>
    (teamB.id && norm(item.battingTeamId) === norm(teamB.id)) ||
    (teamB.name && norm(item.battingTeamName) === norm(teamB.name))
  );

  return {
    innings,
    currentInningsIndex: state.inningsIndex,
    scorecard: { innings },
    scoreA: teamAScore ? `${teamAScore.runs}/${teamAScore.wickets}` : (state.match.scoreA || "0/0"),
    scoreB: teamBScore ? `${teamBScore.runs}/${teamBScore.wickets}` : (state.match.scoreB || "0/0"),
    winner,
    winnerTeamId,
    winnerTeamName,
    result,
    status,
    updatedAt: serverTimestamp()
  };
}

async function saveScore(showMessage = true) {
  if (!state.match || !tournamentId || !matchId) return;

  const matchRef = doc(
    db,
    "tournaments",
    tournamentId,
    "matches",
    matchId
  );

  state.saving = true;

  try {
    const payload = buildScorePayload();
    await updateDoc(matchRef, payload);

state.match = {
  ...state.match,
  ...payload
};

if (
  payload.status === "Completed" &&
  payload.winnerTeamId &&
  payload.winnerTeamName
) {
  try {
    const advancement = await advanceApplT10Winner({
      tournamentId,
      matchId,
      winnerTeamId: payload.winnerTeamId,
      winnerTeamName: payload.winnerTeamName
    });

    if (advancement.championDeclared) {
      setMessage(
        `🏆 Champion: ${advancement.championTeamName}`
      );
    } else if (advancement.advanced) {
      setMessage(
        `Winner ${advancement.winnerTeamName} next round mein pahunch gaya.`
      );
    } else if (advancement.skipped) {
      setMessage("Score saved. Knockout advancement apply nahi hua.");
    }
  } catch (error) {
    console.error("APPL T10 advancement failed:", error);
    setMessage(
      "Score save ho gaya, lekin next round update nahi hua. Admin se match aur next-round slot check karwayein.",
      true
    );
  }
} else if (payload.status === "Completed" && !payload.winnerTeamId) {
  setMessage(
    "Scores tied hain. Advancement se pehle winner manually decide karein.",
    true
  );
} else if (showMessage) {
  setMessage("Score successfully saved.");
}
  } catch (error) {
    console.error("Save score failed:", error);
    setMessage(
      "Score save nahi hua. Firebase permissions aur connection check karein.",
      true
    );
  } finally {
    state.saving = false;
  }
}

function queueSave() {
  state.saveQueue = state.saveQueue
    .then(() => saveScore(false))
    .catch((error) => console.error("Queued save error:", error));

  return state.saveQueue;
}

function startSecondInnings() {
  const first = currentInnings();

  if (!first?.completed) {
    setMessage("Pehle current innings complete karein.", true);
    return;
  }

  if (state.innings.length >= 2) {
    state.inningsIndex = 1;
    render();
    return;
  }

  const bowling = getBowlingTeam();

  if (!bowling) {
    setMessage("Doosri team identify nahi hui.", true);
    return;
  }

  pushUndo();

  state.innings.push(
    makeInnings({
      id: getTeamId(bowling),
      name: getTeamName(bowling)
    }, 1)
  );

  state.inningsIndex = 1;
  state.undo = [];
  refreshPlayerDropdowns();
  render();
  queueSave();
}

function endMatch() {
  const inn = currentInnings();
  if (!inn) return;

  if (!confirm("Kya aap current innings complete karna chahte hain?")) {
    return;
  }

  pushUndo();
  inn.completed = true;

  render();
  queueSave();
}

function swapPlayers() {
  const inn = currentInnings();
  if (!inn) return;

  pushUndo();
  swapStrike(inn);

  const striker = $("strikerSelect");
  const nonStriker = $("nonStrikerSelect");

  if (striker && nonStriker) {
    const old = striker.value;
    striker.value = nonStriker.value;
    nonStriker.value = old;
  }

  render();
  queueSave();
}

function applyPlayers() {
  const inn = currentInnings();
  if (!inn) return;

  const striker = getSelectedPlayer("strikerSelect");
  const nonStriker = getSelectedPlayer("nonStrikerSelect");
  const bowler = getSelectedPlayer("bowlerSelect");

  if (striker && nonStriker && striker.id === nonStriker.id) {
    setMessage("Striker aur non-striker alag hone chahiye.", true);
    return;
  }

  pushUndo();

  if (striker) {
    inn.strikerId = striker.id;
    ensureBatter(inn, striker.id, striker.name);
  }

  if (nonStriker) {
    inn.nonStrikerId = nonStriker.id;
    ensureBatter(inn, nonStriker.id, nonStriker.name);
  }

  if (bowler) {
    inn.bowlerId = bowler.id;
    ensureBowler(inn, bowler.id, bowler.name);
  }

  render();
  queueSave();
}

function bindEvents() {
  document.querySelectorAll("[data-runs]").forEach((button) => {
    button.addEventListener("click", () => {
      recordBall(Number(button.dataset.runs) || 0, "normal");
    });
  });

  $("wideBtn")?.addEventListener("click", () => recordBall(1, "wide"));
  $("noBallBtn")?.addEventListener("click", () => recordBall(0, "noball"));
  $("byeBtn")?.addEventListener("click", () => recordBall(1, "bye"));
  $("legByeBtn")?.addEventListener("click", () => recordBall(1, "legbye"));
  $("wicketBtn")?.addEventListener("click", recordWicket);

  $("undoBtn")?.addEventListener("click", undoLast);
  $("swapBtn")?.addEventListener("click", swapPlayers);
  $("saveBtn")?.addEventListener("click", () => saveScore(true));
  $("endMatchBtn")?.addEventListener("click", endMatch);
  $("startSecondInningsBtn")?.addEventListener("click", startSecondInnings);

  $("nextMatchBtn")?.addEventListener("click", async () => {
    await saveScore(true);
    setMessage("Agla match Schedule page se select karein.");
  });

  $("strikerSelect")?.addEventListener("change", applyPlayers);
  $("nonStrikerSelect")?.addEventListener("change", applyPlayers);
  $("bowlerSelect")?.addEventListener("change", applyPlayers);
}

async function init() {
  if (state.initialized) return;
  state.initialized = true;

  bindEvents();

  try {
    if (!tournamentId || !matchId) {
      throw new Error(
        "Tournament/Match ID missing. Schedule page se match open karein."
      );
    }

    await loadTeams();
    await loadMatch();
    await loadRegisteredPlayers();

    refreshPlayerDropdowns();
    render();
  } catch (error) {
    console.error("APL scorecard initialization failed:", error);
    setMatchHeading("Unable to Load Match");
    setMessage(error.message || "Scorecard load nahi hua.", true);
  }
}

init();
