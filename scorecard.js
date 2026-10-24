
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/*
  APL Tournament Platform - Live Scorecard
  - Existing registered player records ko read karta hai.
  - Match ke score ko match document mein save karta hai.
  - Missing dropdowns aur scorecard sections ko dynamically add karta hai.
*/

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);

const tournamentId =
  params.get("id") ||
  params.get("tournamentId") ||
  localStorage.getItem("selectedTournamentId") ||
  localStorage.getItem("tournamentId") ||
  localStorage.getItem("aplTournamentId") ||
  sessionStorage.getItem("tournamentId");

const matchId =
  params.get("matchId") ||
  params.get("match") ||
  localStorage.getItem("selectedMatchId") ||
  localStorage.getItem("matchId") ||
  localStorage.getItem("aplMatchId") ||
  sessionStorage.getItem("matchId");

let matchRef;
let tournament = {};
let match = {};
let teams = [];
let playerNames = {};
let state;
let undoStack = [];
let saving = false;

const dismissalTypes = [
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit Wicket",
  "Caught and Bowled",
  "Run Out",
  "Retired Out",
  "Obstructing the Field",
  "Hit the Ball Twice"
];

const bowlerDismissals = [
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit Wicket",
  "Caught and Bowled"
];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(text, error = false) {
  const el = $("message");
  if (!el) return;

  el.textContent = text;
  el.style.color = error ? "#dc2626" : "#15803d";
}

function getTeamName(side) {
  const value = side === 1
    ? (match.team1Name || match.teamAName || match.team1 || match.teamA)
    : (match.team2Name || match.teamBName || match.team2 || match.teamB);

  return typeof value === "object"
    ? value?.name || value?.teamName || `Team ${side}`
    : value || `Team ${side}`;
}

function getTeamId(side) {
  const direct = side === 1
    ? (match.team1Id || match.teamAId)
    : (match.team2Id || match.teamBId);

  const team = side === 1
    ? (match.team1 || match.teamA)
    : (match.team2 || match.teamB);

  return direct || (typeof team === "object" ? team.id || team.teamId : null);
}

function normalizePlayers(value) {
  if (!Array.isArray(value)) return [];

  return value.map((player) => {
    if (typeof player === "string") return player.trim();

    if (player && typeof player === "object") {
      return String(
        player.name ||
        player.playerName ||
        player.fullName ||
        player.displayName ||
        ""
      ).trim();
    }

    return "";
  }).filter(Boolean);
}

function getRegisteredPlayers(teamDoc) {
  const fields = [
    "players",
    "registeredPlayers",
    "playerNames",
    "playersList",
    "squad"
  ];

  for (const field of fields) {
    const players = normalizePlayers(teamDoc[field]);
    if (players.length) return [...new Set(players)];
  }

  return [];
}

function getSideForName(teamName) {
  return teamName === getTeamName(1) ? 1 : 2;
}

function getBattingName() {
  return state.battingSide === 1 ? getTeamName(1) : getTeamName(2);
}

function getFieldingName() {
  return state.battingSide === 1 ? getTeamName(2) : getTeamName(1);
}

function getBattingPlayers() {
  return playerNames[state.battingSide] || [];
}

function getFieldingPlayers() {
  return playerNames[state.battingSide === 1 ? 2 : 1] || [];
}

function newInnings(number, battingSide, striker = "", nonStriker = "", bowler = "") {
  return {
    innings: number,
    battingSide,
    battingTeam: battingSide === 1 ? getTeamName(1) : getTeamName(2),
    runs: 0,
    wickets: 0,
    balls: 0,
    striker,
    nonStriker,
    bowler,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    battingStats: {},
    bowlingStats: {},
    dismissals: [],
    fallOfWickets: [],
    ballLog: [],
    currentOverRuns: [],
    status: "Live"
  };
}

function ensurePlayerStats(innings) {
  for (const name of getBattingPlayers()) {
    innings.battingStats[name] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      dismissal: ""
    };
  }

  for (const name of getFieldingPlayers()) {
    innings.bowlingStats[name] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0
    };
  }

  if (innings.striker) {
    innings.battingStats[innings.striker] ||= {
      runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: ""
    };
  }

  if (innings.nonStriker) {
    innings.battingStats[innings.nonStriker] ||= {
      runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: ""
    };
  }

  if (innings.bowler) {
    innings.bowlingStats[innings.bowler] ||= {
      balls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0
    };
  }
}

function currentInnings() {
  return state.inningsData[state.currentInnings - 1];
}

function ballsToOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(runs, balls) {
  return balls ? (runs * 100 / balls).toFixed(2) : "0.00";
}

function economy(stats) {
  return stats.balls ? (stats.runs * 6 / stats.balls).toFixed(2) : "0.00";
}

function makeSelect(id, label, options, selected = "") {
  const items = options.map((name) =>
    `<option value="${escapeHTML(name)}" ${name === selected ? "selected" : ""}>${escapeHTML(name)}</option>`
  ).join("");

  return `
    <label class="apl-field">
      <span>${escapeHTML(label)}</span>
      <select id="${id}">
        <option value="">Select ${escapeHTML(label)}</option>
        ${items}
      </select>
    </label>`;
}

function ensureUI() {
  if (!$("message")) {
    const message = document.createElement("p");
    message.id = "message";
    document.body.prepend(message);
  }

  if (!$("playerSelection")) {
    const panel = document.createElement("section");
    panel.id = "playerSelection";
    panel.className = "apl-score-panel";
    panel.innerHTML = `<h3>Players & Bowling</h3><div id="playerSelectControls"></div>`;
    ($("matchInfo") || document.body).insertAdjacentElement("afterend", panel);
  }

  if (!$("extraControls")) {
    const panel = document.createElement("section");
    panel.id = "extraControls";
    panel.className = "apl-score-panel";
    panel.innerHTML = `
      <h3>Wicket & Extras</h3>
      <div class="apl-controls">
        <label class="apl-field">
          <span>Wicket Type</span>
          <select id="dismissalType">
            ${dismissalTypes.map(x => `<option>${escapeHTML(x)}</option>`).join("")}
          </select>
        </label>
        <label class="apl-field">
          <span>Dismissed Batter</span>
          <select id="dismissedBatter"></select>
        </label>
        <button id="confirmWicketBtn" type="button">Confirm Wicket</button>
      </div>`;
    $("playerSelection").insertAdjacentElement("afterend", panel);
  }

  if (!$("yetToBat")) {
    const panel = document.createElement("section");
    panel.className = "apl-score-panel";
    panel.innerHTML = `<h3>Yet to Bat</h3><div id="yetToBat"></div>`;
    $("extraControls").insertAdjacentElement("afterend", panel);
  }

  if (!$("fallOfWickets")) {
    const panel = document.createElement("section");
    panel.className = "apl-score-panel";
    panel.innerHTML = `<h3>Fall of Wickets</h3><div id="fallOfWickets"></div>`;
    $("yetToBat").parentElement.insertAdjacentElement("afterend", panel);
  }

  if (!$("battingTable")) {
    const panel = document.createElement("section");
    panel.className = "apl-score-panel";
    panel.innerHTML = `
      <h3>Batting Scorecard</h3>
      <div class="apl-table-wrap">
        <table id="battingTable">
          <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Status</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    $("fallOfWickets").parentElement.insertAdjacentElement("afterend", panel);
  }

  if (!$("bowlingTable")) {
    const panel = document.createElement("section");
    panel.className = "apl-score-panel";
    panel.innerHTML = `
      <h3>Bowling Scorecard</h3>
      <div class="apl-table-wrap">
        <table id="bowlingTable">
          <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>WD</th><th>NB</th><th>Econ</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    $("battingTable").closest("section").insertAdjacentElement("afterend", panel);
  }

  if (!$("aplDynamicStyles")) {
    const style = document.createElement("style");
    style.id = "aplDynamicStyles";
    style.textContent = `
      .apl-score-panel{background:#fff;border:1px solid #dbe3ea;border-radius:12px;padding:16px;margin:14px 0;color:#17212b}
      .apl-score-panel h3{margin:0 0 12px;font-size:18px}
      .apl-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:end}
      .apl-field{display:flex;flex-direction:column;gap:6px;min-width:150px;flex:1}
      .apl-field span{font-size:13px;font-weight:600}
      .apl-field select{padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#17212b}
      .apl-score-panel button{padding:10px 14px;border:0;border-radius:8px;background:#087f3c;color:#fff;cursor:pointer}
      .apl-table-wrap{overflow-x:auto}
      .apl-score-panel table{width:100%;border-collapse:collapse;min-width:480px}
      .apl-score-panel th,.apl-score-panel td{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left;white-space:nowrap}
      .apl-score-panel th{background:#f1f5f9}
      .apl-muted{color:#64748b}
      @media(max-width:600px){.apl-score-panel{padding:12px}.apl-field{min-width:120px}}
    `;
    document.head.appendChild(style);
  }
}

async function loadData() {
  if (!tournamentId || !matchId) {
    throw new Error("Tournament ID ya Match ID nahi mila. Schedule se match open karein.");
  }

  matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);

  const [matchSnap, tournamentSnap, teamSnap] = await Promise.all([
    getDoc(matchRef),
    getDoc(doc(db, "tournaments", tournamentId)),
    getDocs(collection(db, "tournaments", tournamentId, "teams"))
  ]);

  if (!matchSnap.exists()) {
    throw new Error("Match document Firestore mein nahi mila.");
  }

  match = matchSnap.data();
  tournament = tournamentSnap.exists() ? tournamentSnap.data() : {};
  teams = teamSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  playerNames = { 1: [], 2: [] };

  for (const side of [1, 2]) {
    const teamId = getTeamId(side);
    const teamName = getTeamName(side);

    let team = teamId ? teams.find(t => t.id === teamId) : null;
    if (!team) {
      team = teams.find(t =>
        (t.teamName || t.name || t.nameOfTeam) === teamName
      );
    }

    if (team) {
      const status = String(team.status || "approved").toLowerCase();
      if (status === "approved" || status === "active") {
        playerNames[side] = getRegisteredPlayers(team);
      }
    }
  }

  // Backward-compatible: older match documents may already contain registered rosters.
  if (!playerNames[1].length) {
    playerNames[1] = normalizePlayers(match.team1Players || match.teamAPlayers);
  }
  if (!playerNames[2].length) {
    playerNames[2] = normalizePlayers(match.team2Players || match.teamBPlayers);
  }

  const saved = Array.isArray(match.inningsData) ? match.inningsData : null;

  if (saved?.length) {
    state = {
      currentInnings: Number(match.currentInnings || saved.length),
      inningsData: saved,
      completed: match.status === "Completed"
    };
  } else {
    const side = Number(match.battingSide || 1);
    const innings = newInnings(1, side);
    ensurePlayerStats(innings);

    state = {
      currentInnings: 1,
      inningsData: [innings],
      completed: match.status === "Completed"
    };

    if (match.score && typeof match.score === "object") {
      const current = currentInnings();
      current.runs = Number(match.score.runs || 0);
      current.wickets = Number(match.score.wickets || 0);
      current.balls = Number(match.score.balls || 0);
    }
  }

  for (const innings of state.inningsData) {
    innings.extras ||= { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
    innings.battingStats ||= {};
    innings.bowlingStats ||= {};
    innings.dismissals ||= [];
    innings.fallOfWickets ||= [];
    innings.ballLog ||= [];
    innings.currentOverRuns ||= [];
    innings.battingSide ||= innings.battingTeam === getTeamName(2) ? 2 : 1;
    ensurePlayerStats(innings);
  }
}

function renderPlayerControls() {
  const innings = currentInnings();
  ensurePlayerStats(innings);

  const batting = getBattingPlayers();
  const fielding = getFieldingPlayers();

  $("playerSelectControls").innerHTML = `
    <div class="apl-controls">
      ${makeSelect("strikerSelect", "Striker", batting, innings.striker)}
      ${makeSelect("nonStrikerSelect", "Non-Striker", batting, innings.nonStriker)}
      ${makeSelect("bowlerSelect", "Bowler", fielding, innings.bowler)}
      <button id="applyPlayersBtn" type="button">Apply Players</button>
    </div>
    <p class="apl-muted">Batting: ${escapeHTML(getBattingName())} | Bowling: ${escapeHTML(getFieldingName())}</p>`;

  $("dismissedBatter").innerHTML = `
    <option value="">Select batter</option>
    ${[innings.striker, innings.nonStriker].filter(Boolean).map(name =>
      `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
    ).join("")}`;

  $("applyPlayersBtn").addEventListener("click", async () => {
    const striker = $("strikerSelect").value;
    const nonStriker = $("nonStrikerSelect").value;
    const bowler = $("bowlerSelect").value;

    if (striker && striker === nonStriker) {
      showMessage("Striker aur non-striker alag players hone chahiye.", true);
      return;
    }

    if (striker && innings.battingStats[striker]?.out) {
      showMessage("Dismissed player ko dobara select nahi kar sakte.", true);
      return;
    }

    if (nonStriker && innings.battingStats[nonStriker]?.out) {
      showMessage("Dismissed player ko dobara select nahi kar sakte.", true);
      return;
    }

    innings.striker = striker;
    innings.nonStriker = nonStriker;
    innings.bowler = bowler;

    ensurePlayerStats(innings);
    await saveState("Players updated");
    render();
  });
}

function render() {
  if (!state) return;

  const innings = currentInnings();
  ensurePlayerStats(innings);

  if ($("matchId")) $("matchId").textContent = matchId;
  if ($("matchInfo")) {
    $("matchInfo").textContent =
      `${getTeamName(1)} vs ${getTeamName(2)} — Innings ${state.currentInnings}`;
  }
  if ($("battingTeam")) $("battingTeam").textContent = innings.battingTeam || getBattingName();
  if ($("score")) $("score").textContent = `${innings.runs}/${innings.wickets}`;
  if ($("overs")) $("overs").textContent = ballsToOvers(innings.balls);

  const maxOvers = Number(match.overs || tournament.overs || 20);
  const crr = innings.balls
    ? (innings.runs * 6 / innings.balls).toFixed(2)
    : "0.00";

  if ($("crr")) $("crr").textContent = crr;

  const striker = innings.battingStats[innings.striker] || {};
  const nonStriker = innings.battingStats[innings.nonStriker] || {};
  const bowler = innings.bowlingStats[innings.bowler] || {};

  if ($("strikerRuns")) $("strikerRuns").textContent = striker.runs || 0;
  if ($("strikerBalls")) $("strikerBalls").textContent = striker.balls || 0;
  if ($("strikerSR")) $("strikerSR").textContent = strikeRate(striker.runs || 0, striker.balls || 0);

  if ($("nonStrikerRuns")) $("nonStrikerRuns").textContent = nonStriker.runs || 0;
  if ($("nonStrikerBalls")) $("nonStrikerBalls").textContent = nonStriker.balls || 0;
  if ($("nonStrikerSR")) $("nonStrikerSR").textContent = strikeRate(nonStriker.runs || 0, nonStriker.balls || 0);

  if ($("bowlerName")) $("bowlerName").textContent = innings.bowler || "Select bowler";
  if ($("bowlerOvers")) $("bowlerOvers").textContent = ballsToOvers(bowler.balls || 0);
  if ($("bowlerRuns")) $("bowlerRuns").textContent = bowler.runs || 0;
  if ($("bowlerWickets")) $("bowlerWickets").textContent = bowler.wickets || 0;

  if ($("currentOver")) {
    $("currentOver").textContent = innings.currentOverRuns.length
      ? innings.currentOverRuns.join(" · ")
      : "No balls yet";
  }

  $("yetToBat").innerHTML = getBattingPlayers()
    .filter(name =>
      name !== innings.striker &&
      name !== innings.nonStriker &&
      !innings.battingStats[name]?.out
    )
    .map(name => `<span>${escapeHTML(name)}</span>`)
    .join(", ") || '<span class="apl-muted">No players remaining</span>';

  $("fallOfWickets").innerHTML = innings.fallOfWickets.length
    ? innings.fallOfWickets.map(w =>
      `<p>${w.wickets}-${w.runs} (${escapeHTML(w.player)}, ${ballsToOvers(w.balls)} ov)</p>`
    ).join("")
    : '<p class="apl-muted">No wickets yet</p>';

  $("battingTable").querySelector("tbody").innerHTML =
    Object.entries(innings.battingStats).map(([name, stats]) => `
      <tr>
        <td>${escapeHTML(name)}</td>
        <td>${stats.runs || 0}</td>
        <td>${stats.balls || 0}</td>
        <td>${stats.fours || 0}</td>
        <td>${stats.sixes || 0}</td>
        <td>${strikeRate(stats.runs || 0, stats.balls || 0)}</td>
        <td>${stats.out ? escapeHTML(stats.dismissal || "Out") : (name === innings.striker || name === innings.nonStriker ? "Batting" : "Not out")}</td>
      </tr>`).join("");

  $("bowlingTable").querySelector("tbody").innerHTML =
    Object.entries(innings.bowlingStats).map(([name, stats]) => `
      <tr>
        <td>${escapeHTML(name)}</td>
        <td>${ballsToOvers(stats.balls || 0)}</td>
        <td>${stats.runs || 0}</td>
        <td>${stats.wickets || 0}</td>
        <td>${stats.wides || 0}</td>
        <td>${stats.noBalls || 0}</td>
        <td>${economy(stats)}</td>
      </tr>`).join("");

  renderPlayerControls();

  const disabled = state.completed || innings.status === "Completed";
  document.querySelectorAll(".run-btn, #wideBtn, #noBallBtn, #byeBtn, #legByeBtn, #wicketBtn, #swapBtn, #saveBtn, #endMatchBtn")
    .forEach(button => button.disabled = disabled || saving);

  const secondButton = $("startSecondInningsBtn");
  if (secondButton) {
    secondButton.hidden = state.currentInnings !== 1 || state.inningsData.length > 1;
  }

  const nextButton = $("nextMatchBtn");
  if (nextButton) nextButton.hidden = !state.completed;
}

function snapshot() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 50) undoStack.shift();
}

async function saveState(message = "Score saved") {
  if (saving) return;
  saving = true;

  try {
    const innings = currentInnings();

    await updateDoc(matchRef, {
      inningsData: state.inningsData,
      currentInnings: state.currentInnings,
      battingSide: innings.battingSide,
      score: {
        runs: innings.runs,
        wickets: innings.wickets,
        balls: innings.balls,
        overs: ballsToOvers(innings.balls)
      },
      battingTeam: innings.battingTeam,
      status: state.completed ? "Completed" : "Live",
      updatedAt: serverTimestamp()
    });

    showMessage(message);
  } catch (error) {
    console.error("Score save failed:", error);
    showMessage("Score save nahi hua: " + error.message, true);
  } finally {
    saving = false;
    render();
  }
}

function legalBall(innings) {
  innings.balls += 1;

  if (innings.balls % 6 === 0) {
    innings.currentOverRuns = [];
    // Over complete: strike changes.
    [innings.striker, innings.nonStriker] = [
      innings.nonStriker,
      innings.striker
    ];
  }
}

function swapStrike(innings) {
  [innings.striker, innings.nonStriker] = [
    innings.nonStriker,
    innings.striker
  ];
}

async function addDelivery(type, value = 0) {
  const innings = currentInnings();

  if (state.completed || innings.status === "Completed") {
    showMessage("Match completed hai.", true);
    return;
  }

  if (!innings.striker || !innings.nonStriker || !innings.bowler) {
    showMessage("Pehle striker, non-striker aur bowler select karein.", true);
    return;
  }

  if (innings.striker === innings.nonStriker) {
    showMessage("Striker aur non-striker alag hone chahiye.", true);
    return;
  }

  snapshot();

  const batterName = innings.striker;
  const bowlerName = innings.bowler;
  const batter = innings.battingStats[batterName];
  const bowl = innings.bowlingStats[bowlerName];

  let totalRuns = 0;
  let legal = true;
  let batterRuns = 0;
  let extraRuns = 0;
  let label = "";

  if (type === "run") {
    batterRuns = Number(value);
    totalRuns = batterRuns;
    batter.runs += batterRuns;
    batter.balls += 1;
    if (batterRuns === 4) batter.fours += 1;
    if (batterRuns === 6) batter.sixes += 1;

    bowl.runs += batterRuns;
    legalBall(innings);
    label = String(batterRuns);

    if (batterRuns % 2 === 1) swapStrike(innings);
  } else if (type === "wide") {
    legal = false;
    extraRuns = 1 + Number(value || 0);
    totalRuns = extraRuns;
    innings.extras.wides += extraRuns;
    bowl.runs += extraRuns;
    bowl.wides += 1;
    label = extraRuns === 1 ? "Wd" : `Wd+${extraRuns - 1}`;

    if (Number(value || 0) % 2 === 1) swapStrike(innings);
  } else if (type === "noBall") {
    legal = false;
    extraRuns = 1;
    totalRuns = 1 + Number(value || 0);
    innings.extras.noBalls += 1;
    batter.runs += Number(value || 0);
    bowl.runs += totalRuns;
    bowl.noBalls += 1;
    label = Number(value || 0) ? `Nb+${value}` : "Nb";

    if (Number(value || 0) > 0) {
      batter.balls += 0;
      if (Number(value) === 4) batter.fours += 1;
      if (Number(value) === 6) batter.sixes += 1;
    }
  } else if (type === "bye" || type === "legBye") {
    legal = true;
    extraRuns = Number(value || 1);
    totalRuns = extraRuns;
    if (type === "bye") innings.extras.byes += extraRuns;
    else innings.extras.legByes += extraRuns;

    batter.balls += 1;
    legalBall(innings);
    label = type === "bye" ? `B${extraRuns}` : `Lb${extraRuns}`;

    // Byes and leg-byes are not charged to bowler.
    if (extraRuns % 2 === 1) swapStrike(innings);
  }

  innings.runs += totalRuns;

  if (legal) bowl.balls += 1;

  innings.currentOverRuns.push(label);
  innings.ballLog.push({
    type,
    runs: totalRuns,
    batterRuns,
    extras: extraRuns,
    batter: batterName,
    bowler: bowlerName,
    legal,
    label,
    timestamp: new Date().toISOString()
  });

  const maxOvers = Number(match.overs || tournament.overs || 20);
  if (innings.balls >= maxOvers * 6) innings.status = "Completed";

  await saveState("Ball saved");
}

async function recordWicket() {
  const innings = currentInnings();
  const batterName = $("dismissedBatter").value || innings.striker;
  const dismissal = $("dismissalType").value;

  if (state.completed || innings.status === "Completed") {
    showMessage("Match completed hai.", true);
    return;
  }

  if (!batterName || !innings.battingStats[batterName]) {
    showMessage("Dismissed batter select karein.", true);
    return;
  }

  if (innings.battingStats[batterName].out) {
    showMessage("Yeh batter pehle hi out hai.", true);
    return;
  }

  if (!innings.bowler) {
    showMessage("Pehle bowler select karein.", true);
    return;
  }

  snapshot();

  const stats = innings.battingStats[batterName];
  const bowlerStats = innings.bowlingStats[innings.bowler];

  stats.out = true;
  stats.dismissal = dismissal;
  innings.wickets += 1;

  if (bowlerDismissals.includes(dismissal)) {
    bowlerStats.wickets += 1;
  }

  // Run out / retired out / other dismissal details are recorded separately.
  innings.dismissals.push({
    player: batterName,
    type: dismissal,
    bowler: innings.bowler,
    runs: innings.runs,
    balls: innings.balls
  });

  innings.fallOfWickets.push({
    wickets: innings.wickets,
    runs: innings.runs,
    player: batterName,
    balls: innings.balls
  });

  innings.ballLog.push({
    type: "wicket",
    player: batterName,
    dismissal,
    bowler: innings.bowler,
    runs: innings.runs,
    balls: innings.balls,
    timestamp: new Date().toISOString()
  });

  // A wicket is a legal ball except for run-out/other non-ball events only
  // when the delivery was already counted. This button records a wicket
  // without adding an extra delivery.
  if (batterName === innings.striker) {
    innings.striker = "";
  } else if (batterName === innings.nonStriker) {
    innings.nonStriker = "";
  }

  const remaining = getBattingPlayers().filter(name =>
    !innings.battingStats[name]?.out &&
    name !== innings.striker &&
    name !== innings.nonStriker
  );

  if (remaining.length && !innings.striker) {
    innings.striker = remaining[0];
  } else if (remaining.length && !innings.nonStriker) {
    innings.nonStriker = remaining[0];
  }

  if (innings.wickets >= Math.max(1, getBattingPlayers().length - 1) ||
      (!innings.striker && !innings.nonStriker && !remaining.length)) {
    innings.status = "Completed";
  }

  await saveState("Wicket saved");
}

async function undoLastAction() {
  if (!undoStack.length) {
    showMessage("Undo karne ke liye koi action nahi hai.", true);
    return;
  }

  state = JSON.parse(undoStack.pop());
  await saveState("Last action undone");
}

async function startSecondInnings() {
  if (state.currentInnings !== 1 || state.inningsData.length > 1) return;

  const first = currentInnings();
  first.status = "Completed";

  const battingSide = first.battingSide === 1 ? 2 : 1;
  const innings = newInnings(2, battingSide);
  ensurePlayerStats(innings);

  state.inningsData.push(innings);
  state.currentInnings = 2;

  await saveState("Second innings started");
}

async function endMatch() {
  const innings = currentInnings();
  innings.status = "Completed";
  state.completed = true;

  await saveState("Match completed");
}

function bindButton(id, handler) {
  const el = $(id);
  if (el) el.addEventListener("click", handler);
}

function bindEvents() {
  document.querySelectorAll(".run-btn[data-runs]").forEach(button => {
    button.addEventListener("click", () =>
      addDelivery("run", Number(button.dataset.runs))
    );
  });

  bindButton("wideBtn", () => addDelivery("wide"));
  bindButton("noBallBtn", () => addDelivery("noBall"));
  bindButton("byeBtn", () => addDelivery("bye", 1));
  bindButton("legByeBtn", () => addDelivery("legBye", 1));
  bindButton("wicketBtn", recordWicket);
  bindButton("confirmWicketBtn", recordWicket);
  bindButton("undoBtn", undoLastAction);
  bindButton("swapBtn", async () => {
    const innings = currentInnings();
    snapshot();
    swapStrike(innings);
    await saveState("Strike swapped");
  });
  bindButton("saveBtn", () => saveState("Score saved"));
  bindButton("endMatchBtn", endMatch);
  bindButton("startSecondInningsBtn", startSecondInnings);

  const links = {
    tournamentLink: `./tournament.html?id=${encodeURIComponent(tournamentId || "")}`,
    scheduleLink: `./schedule.html?id=${encodeURIComponent(tournamentId || "")}`,
    resultsLink: `./results.html?id=${encodeURIComponent(tournamentId || "")}`,
    pointsLink: `./points-table.html?id=${encodeURIComponent(tournamentId || "")}`
  };

  for (const [id, href] of Object.entries(links)) {
    const el = $(id);
    if (el) el.href = href;
  }
}

async function init() {
  try {
    ensureUI();
    await loadData();
    bindEvents();
    render();

    showMessage("Scorecard ready. Players select karke scoring shuru karein.");
  } catch (error) {
    console.error("Scorecard initialization error:", error);
    showMessage(error.message || "Scorecard load nahi hua.", true);
  }
}

init();
