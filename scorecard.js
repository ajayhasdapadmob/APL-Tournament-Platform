
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const params = new URLSearchParams(location.search);

const tournamentId =
  params.get("id") ||
  params.get("tournamentId") ||
  localStorage.getItem("selectedTournamentId") ||
  localStorage.getItem("tournamentId") ||
  localStorage.getItem("aplTournamentId") ||
  sessionStorage.getItem("selectedTournamentId") ||
  "";

const matchId =
  params.get("matchId") ||
  params.get("match") ||
  localStorage.getItem("selectedMatchId") ||
  localStorage.getItem("matchId") ||
  localStorage.getItem("aplMatchId") ||
  sessionStorage.getItem("selectedMatchId") ||
  "";

let tournament = null;
let match = null;
let matchRef = null;

let players = { A: [], B: [] };
let history = [];
let innings1 = null;
let innings2 = null;
let state = null;

let saving = false;
let saveAgain = false;
let saveTimer = null;

const BOWLER_WICKETS = new Set([
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit Wicket",
  "Caught and Bowled"
]);

const NO_BALL_DISMISSALS = new Set([
  "Run Out",
  "Obstructing the Field",
  "Hit the Ball Twice"
]);

const WIDE_DISMISSALS = new Set([
  "Run Out",
  "Stumped",
  "Obstructing the Field",
  "Hit the Ball Twice"
]);

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function say(message, type = "info") {
  const el = $(
    "#message, #statusMessage, #scoreMessage, .message"
  );

  if (el) {
    el.textContent = message;
    el.dataset.type = type;
    el.style.display = "block";
  }

  if (type === "error") console.error(message);
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = String(value);
}

function overs(balls) {
  balls = Math.max(0, number(balls));
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(player) {
  return number(player?.balls)
    ? (number(player.runs) * 100 / number(player.balls)).toFixed(2)
    : "0.00";
}

function economy(player) {
  return number(player?.balls)
    ? (number(player.runs) * 6 / number(player.balls)).toFixed(2)
    : "0.00";
}

function newBatter(name = "") {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    dismissal: ""
  };
}

function newBowler(name = "") {
  return {
    name,
    runs: 0,
    balls: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0
  };
}

function newInnings(number = 1, side = "A") {
  return {
    innings: number,
    battingTeam: side,
    runs: 0,
    wickets: 0,
    balls: 0,
    currentOverRuns: [],
    striker: newBatter(),
    nonStriker: newBatter(),
    bowler: newBowler(),
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0
    },
    totalFours: 0,
    totalSixes: 0,
    battingStats: {},
    bowlingStats: {},
    dismissals: [],
    fallOfWickets: [],
    ballLog: [],
    status: "LIVE"
  };
}

function oversLimit() {
  return Math.max(1, number(match?.overs) || number(tournament?.overs) || 20);
}

function inningsEnded() {
  return (
    state.wickets >= 10 ||
    state.balls >= oversLimit() * 6 ||
    state.status === "COMPLETED"
  );
}

function matchEnded() {
  return ["completed", "complete", "finished", "result"]
    .includes(String(match?.status || "").toLowerCase());
}

function teamName(side) {
  if (side === "A") {
    return match?.team1Name ||
      match?.teamAName ||
      match?.teamA ||
      match?.team1 ||
      "Team A";
  }

  return match?.team2Name ||
    match?.teamBName ||
    match?.teamB ||
    match?.team2 ||
    "Team B";
}

function teamId(side) {
  if (side === "A") {
    return match?.team1Id ||
      match?.teamAId ||
      match?.team1?.id ||
      "";
  }

  return match?.team2Id ||
    match?.teamBId ||
    match?.team2?.id ||
    "";
}

function extractNames(list) {
  if (!Array.isArray(list)) return [];

  return [...new Set(list.map(p => {
    if (typeof p === "string") return p.trim();

    return String(
      p?.name ||
      p?.playerName ||
      p?.fullName ||
      p?.displayName ||
      ""
    ).trim();
  }).filter(Boolean))];
}

/*
 * Registered players are read from the tournament's existing team
 * documents. This function does not modify registration records.
 */
async function loadPlayersForTeam(id) {
  if (!id || !tournamentId) return [];

  const snap = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  for (const item of snap.docs) {
    const team = item.data();

    const matchesId =
      item.id === String(id) ||
      team.id === id ||
      team.teamId === id;

    if (matchesId) {
      const status = String(team.status || "approved").toLowerCase();

      if (status !== "approved") return [];

      return extractNames(
        team.players ||
        team.registeredPlayers ||
        team.playerNames ||
        team.playersList ||
        team.squad ||
        []
      );
    }
  }

  // Some older fixtures may store team names instead of document IDs.
  const wanted = String(id).trim().toLowerCase();

  for (const item of snap.docs) {
    const team = item.data();

    const name = String(
      team.teamName || team.name || team.nameOfTeam || ""
    ).trim().toLowerCase();

    if (
      name === wanted &&
      String(team.status || "approved").toLowerCase() === "approved"
    ) {
      return extractNames(
        team.players ||
        team.registeredPlayers ||
        team.playerNames ||
        team.playersList ||
        team.squad ||
        []
      );
    }
  }

  return [];
}

async function loadPlayers() {
  const [A, B] = await Promise.all([
    loadPlayersForTeam(teamId("A")),
    loadPlayersForTeam(teamId("B"))
  ]);

  players = { A, B };

  if (!A.length || !B.length) {
    say(
      "Players load nahi hue. Match ke team1Id/team2Id aur team registrations ke player fields check karein.",
      "warning"
    );
  }
}

function battingPlayers() {
  return players[state.battingTeam] || [];
}

function bowlingPlayers() {
  return players[state.battingTeam === "A" ? "B" : "A"] || [];
}

function ensureBatter(name) {
  if (name && !state.battingStats[name]) {
    state.battingStats[name] = newBatter(name);
  }
}

function ensureBowler(name) {
  if (name && !state.bowlingStats[name]) {
    state.bowlingStats[name] = newBowler(name);
  }
}

function fillSelect(selector, list, selected = "") {
  const select = $(selector);
  if (!select) return;

  const previous = selected || select.value;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select Player --";
  select.appendChild(placeholder);

  list.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.value = list.includes(previous) ? previous : "";
}

function refreshDropdowns() {
  fillSelect("#strikerSelect", battingPlayers(), state.striker.name);
  fillSelect("#nonStrikerSelect", battingPlayers(), state.nonStriker.name);
  fillSelect("#bowlerSelect", bowlingPlayers(), state.bowler.name);

  fillSelect(
    "#dismissedBatter",
    [state.striker.name, state.nonStriker.name].filter(Boolean)
  );

  [
    "#catcherSelect",
    "#runOutFielderSelect",
    "#wicketkeeperSelect",
    "#assistFielderSelect"
  ].forEach(selector => fillSelect(selector, bowlingPlayers()));
}

function saveUndoPoint() {
  history.push({
    state: copy(state),
    innings1: copy(innings1),
    innings2: copy(innings2)
  });

  if (history.length > 100) history.shift();
}

function rotateStrike() {
  [state.striker, state.nonStriker] =
    [state.nonStriker, state.striker];
}

function addLegalBall() {
  state.balls++;

  const name = state.bowler.name;

  if (name) {
    state.bowler.balls++;
    ensureBowler(name);
    state.bowlingStats[name].balls++;
  }
}

function addBowlerRuns(runs) {
  state.bowler.runs += runs;

  const name = state.bowler.name;

  if (name) {
    ensureBowler(name);
    state.bowlingStats[name].runs += runs;
  }
}

function addBatterBall(player) {
  if (!player?.name) return;

  player.balls++;
  ensureBatter(player.name);
  state.battingStats[player.name].balls++;
}

function addBatterRuns(runs, player) {
  if (!player?.name) return;

  player.runs += runs;
  ensureBatter(player.name);
  state.battingStats[player.name].runs += runs;

  if (runs === 4) {
    player.fours++;
    state.battingStats[player.name].fours++;
    state.totalFours++;
  }

  if (runs === 6) {
    player.sixes++;
    state.battingStats[player.name].sixes++;
    state.totalSixes++;
  }
}

function logBall(entry) {
  state.ballLog.push({
    ...entry,
    legalBalls: state.balls,
    timestamp: new Date().toISOString()
  });
}

function completeOver() {
  if (state.balls > 0 && state.balls % 6 === 0) {
    state.currentOverRuns = [];
    rotateStrike();
  }
}

function checkInnings() {
  if (state.wickets >= 10 || state.balls >= oversLimit() * 6) {
    state.status = "COMPLETED";
    say("Innings complete.", "success");
  }
}

function canScore() {
  if (!match) return false;

  if (matchEnded()) {
    say("Match completed; scoring is locked.", "warning");
    return false;
  }

  if (inningsEnded()) {
    say("Innings complete. Start the next innings.", "warning");
    return false;
  }

  if (!state.striker.name || !state.nonStriker.name) {
    say("Striker aur non-striker select karein.", "warning");
    return false;
  }

  if (state.striker.name === state.nonStriker.name) {
    say("Dono batters alag hone chahiye.", "warning");
    return false;
  }

  if (!state.bowler.name) {
    say("Bowler select karein.", "warning");
    return false;
  }

  return true;
}

function renderTable(selector, rows, fields) {
  const body = $(selector);
  if (!body) return;

  body.replaceChildren();

  rows.forEach(row => {
    const tr = document.createElement("tr");

    fields.forEach(field => {
      const td = document.createElement("td");
      let value = row[field] ?? 0;

      if (field === "overs") value = overs(row.balls);
      if (field === "economy") value = economy(row);
      if (field === "strikeRate") value = strikeRate(row);

      td.textContent = String(value);
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function refreshUI() {
  const values = {
    "#totalRuns": state.runs,
    "#runs": state.runs,
    "#score": state.runs,
    "#totalWickets": state.wickets,
    "#wickets": state.wickets,
    "#overs": overs(state.balls),
    "#currentOvers": overs(state.balls),
    "#currentBall": state.balls % 6,
    "#inningsNumber": state.innings,
    "#innings": state.innings,
    "#battingTeamName": teamName(state.battingTeam),
    "#battingTeam": teamName(state.battingTeam),
    "#currentOverRuns": state.currentOverRuns.join(" "),
    "#totalFours": state.totalFours,
    "#totalSixes": state.totalSixes,
    "#strikerName": state.striker.name || "Select striker",
    "#strikerRuns": state.striker.runs,
    "#strikerBalls": state.striker.balls,
    "#strikerSR": strikeRate(state.striker),
    "#nonStrikerName": state.nonStriker.name || "Select non-striker",
    "#nonStrikerRuns": state.nonStriker.runs,
    "#nonStrikerBalls": state.nonStriker.balls,
    "#nonStrikerSR": strikeRate(state.nonStriker),
    "#bowlerName": state.bowler.name || "Select bowler",
    "#bowlerRuns": state.bowler.runs,
    "#bowlerBalls": state.bowler.balls,
    "#bowlerOvers": overs(state.bowler.balls),
    "#bowlerWickets": state.bowler.wickets,
    "#bowlerEconomy": economy(state.bowler),
    "#wides": state.extras.wides,
    "#noBalls": state.extras.noBalls,
    "#byes": state.extras.byes,
    "#legByes": state.extras.legByes,
    "#totalExtras": state.extras.total,
    "#matchStatus": match?.status || "SCHEDULED",
    "#matchResult": match?.result || "Match in progress",
    "#matchInfo": `${teamName("A")} vs ${teamName("B")}`,
    "#matchId": matchId
  };

  Object.entries(values).forEach(([selector, value]) =>
    setText(selector, value)
  );

  refreshDropdowns();

  renderTable(
    "#battingTable tbody",
    Object.values(state.battingStats),
    ["name", "runs", "balls", "fours", "sixes", "strikeRate"]
  );

  renderTable(
    "#bowlingTable tbody",
    Object.values(state.bowlingStats),
    ["name", "overs", "runs", "wickets", "economy"]
  );
}

function inningsSnapshot() {
  return {
    ...copy(state),
    overs: overs(state.balls),
    totalRuns: state.runs,
    totalWickets: state.wickets,
    legalBalls: state.balls
  };
}

function sideScores() {
  let scoreA = 0;
  let scoreB = 0;

  for (const inn of [innings1, innings2]) {
    if (!inn) continue;
    if (inn.battingTeam === "A") scoreA += number(inn.runs);
    else scoreB += number(inn.runs);
  }

  const active = state.battingTeam === "A" ? scoreA : scoreB;

  if (state.battingTeam === "A") {
    scoreA = state.runs;
  } else {
    scoreB = state.runs;
  }

  return { scoreA, scoreB };
}

function calculateResult() {
  if (!innings1 || !innings2) {
    return { winner: "", result: "Second innings pending." };
  }

  const first = number(innings1.runs);
  const second = number(innings2.runs);

  if (second > first) {
    const left = Math.max(0, 10 - number(innings2.wickets));
    return {
      winner: teamName(innings2.battingTeam),
      result: `${teamName(innings2.battingTeam)} won by ${left} wickets.`
    };
  }

  if (first > second) {
    return {
      winner: teamName(innings1.battingTeam),
      result: `${teamName(innings1.battingTeam)} won by ${first - second} runs.`
    };
  }

  return { winner: "", result: "Match tied." };
}

function makePayload(status) {
  return {
    status,
    scorecard: inningsSnapshot(),
    innings: state.innings,
    currentInnings: state.innings,
    currentOver: Math.floor(state.balls / 6),
    currentBall: state.balls % 6,
    totalRuns: state.runs,
    totalWickets: state.wickets,
    currentRuns: state.runs,
    currentWickets: state.wickets,
    currentOvers: overs(state.balls),
    ...sideScores(),
    updatedAt: serverTimestamp()
  };
}

async function persist(status = "LIVE", extra = {}) {
  if (!matchRef) throw new Error("Match document missing.");

  const payload = {
    ...makePayload(status),
    ...extra,
    updatedAt: serverTimestamp()
  };

  await updateDoc(matchRef, payload);
  match = { ...match, ...payload, status };
}

async function autosave() {
  if (!matchRef || !match) return;

  if (saving) {
    saveAgain = true;
    return;
  }

  saving = true;

  try {
    await persist(matchEnded() ? "COMPLETED" : "LIVE");
    say("Score saved.", "success");
  } catch (error) {
    console.error(error);
    say(
      "Save fail hua. Internet, Firebase rules aur match document check karein.",
      "error"
    );
  } finally {
    saving = false;

    if (saveAgain) {
      saveAgain = false;
      autosave();
    }
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 400);
}

function addRuns(rawRuns) {
  if (!canScore()) return;

  const runs = Math.max(0, Math.min(6, number(rawRuns)));
  saveUndoPoint();

  const batterName = state.striker.name;

  state.runs += runs;
  addBatterRuns(runs, state.striker);
  addBatterBall(state.striker);
  addBowlerRuns(runs);
  addLegalBall();

  state.currentOverRuns.push(String(runs));

  if (runs % 2) rotateStrike();

  logBall({
    type: "runs",
    runs,
    batter: batterName,
    total: state.runs
  });

  completeOver();
  checkInnings();
  refreshUI();
  scheduleSave();
}

function addExtra(type, rawValue = 1) {
  if (!canScore()) return;

  const value = Math.max(1, Math.min(6, number(rawValue)));
  saveUndoPoint();

  if (type === "wide") {
    state.runs += value;
    state.extras.wides += value;
    state.extras.total += value;

    addBowlerRuns(value);
    state.bowler.wides += value;

    if (state.bowler.name) {
      ensureBowler(state.bowler.name);
      state.bowlingStats[state.bowler.name].wides += value;
    }

    if ((value - 1) % 2) rotateStrike();

  } else if (type === "noBall") {
    state.runs += 1;
    state.extras.noBalls++;
    state.extras.total++;

    addBowlerRuns(1);
    state.bowler.noBalls++;

    if (state.bowler.name) {
      ensureBowler(state.bowler.name);
      state.bowlingStats[state.bowler.name].noBalls++;
    }

  } else if (type === "bye" || type === "legBye") {
    state.runs += value;
    state.extras[type === "bye" ? "byes" : "legByes"] += value;
    state.extras.total += value;

    addLegalBall();

    if (value % 2) rotateStrike();

  } else {
    say("Unknown extra type.", "error");
    return;
  }

  state.currentOverRuns.push(type);
  logBall({ type, runs: value, total: state.runs });

  completeOver();
  checkInnings();
  refreshUI();
  scheduleSave();
}

function dismissBatter(type, name, delivery = "legal", completedRuns = 0) {
  if (!canScore()) return;

  if (![state.striker.name, state.nonStriker.name].includes(name)) {
    say("Dismissed batter select karein.", "warning");
    return;
  }

  if (delivery === "noBall" && !NO_BALL_DISMISSALS.has(type)) {
    say("No-ball par yeh dismissal valid nahi hai.", "warning");
    return;
  }

  if (delivery === "wide" && !WIDE_DISMISSALS.has(type)) {
    say("Wide par yeh dismissal valid nahi hai.", "warning");
    return;
  }

  saveUndoPoint();

  const runs = Math.max(0, Math.min(6, number(completedRuns)));
  const dismissed = state.striker.name === name
    ? state.striker
    : state.nonStriker;

  const otherName = state.striker.name === name
    ? state.nonStriker.name
    : state.striker.name;

  if (delivery === "wide") {
    const total = runs + 1;
    state.runs += total;
    state.extras.wides += total;
    state.extras.total += total;
    addBowlerRuns(total);
    state.bowler.wides += total;
  } else if (delivery === "noBall") {
    const total = runs + 1;
    state.runs += total;
    state.extras.noBalls++;
    state.extras.total++;
    addBowlerRuns(total);
    state.bowler.noBalls++;
  } else {
    addLegalBall();
  }

  if (runs % 2) rotateStrike();

  dismissed.out = true;
  dismissed.dismissal = type;

  ensureBatter(name);
  Object.assign(state.battingStats[name], dismissed);

  state.wickets++;

  if (BOWLER_WICKETS.has(type)) {
    state.bowler.wickets++;
    ensureBowler(state.bowler.name);

    if (state.bowler.name) {
      state.bowlingStats[state.bowler.name].wickets++;
    }
  }

  state.dismissals.push({
    batter: name,
    type,
    bowler: state.bowler.name,
    wicketNumber: state.wickets,
    over: overs(state.balls)
  });

  state.fallOfWickets.push({
    wicket: state.wickets,
    score: state.runs,
    batter: name,
    overs: overs(state.balls)
  });

  const used = new Set([
    name,
    otherName,
    state.striker.name,
    state.nonStriker.name
  ]);

  const replacementName =
    battingPlayers().find(p => !used.has(p)) || "";

  const replacement = newBatter(replacementName);

  if (state.striker.name === name) {
    state.striker = replacement;
  } else {
    state.nonStriker = replacement;
  }

  if (replacementName) ensureBatter(replacementName);

  logBall({
    type: "wicket",
    batter: name,
    dismissal: type,
    total: state.runs
  });

  completeOver();
  checkInnings();
  refreshUI();
  scheduleSave();

  say(`${name} — ${type}`, "success");
}

function showWicketDialog() {
  let dialog = $("#dismissalDialog");

  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "dismissalDialog";
    dialog.style.cssText =
      "position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";

    const panel = document.createElement("div");
    panel.style.cssText =
      "background:white;color:#111;padding:20px;border-radius:12px;width:min(480px,100%)";

    panel.innerHTML = `
      <h2>Record Wicket</h2>
      <label>Dismissal</label>
      <select id="dismissalType" style="width:100%;padding:10px">
        <option>Bowled</option><option>Caught</option><option>LBW</option>
        <option>Run Out</option><option>Stumped</option><option>Hit Wicket</option>
        <option>Caught and Bowled</option><option>Retired Out</option>
        <option>Timed Out</option><option>Obstructing the Field</option>
        <option>Hit the Ball Twice</option>
      </select>
      <label>Batter</label>
      <select id="dismissedBatter" style="width:100%;padding:10px"></select>
      <label>Delivery</label>
      <select id="dismissalDeliveryType" style="width:100%;padding:10px">
        <option value="legal">Legal ball</option>
        <option value="wide">Wide</option>
        <option value="noBall">No-ball</option>
      </select>
      <label>Completed runs</label>
      <input id="dismissalRuns" type="number" min="0" max="6" value="0" style="width:100%;padding:10px">
      <button id="confirmWicket" type="button">Confirm Wicket</button>
      <button id="cancelWicket" type="button">Cancel</button>
    `;

    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    $("#confirmWicket").addEventListener("click", () => {
      dismissBatter(
        $("#dismissalType").value,
        $("#dismissedBatter").value,
        $("#dismissalDeliveryType").value,
        $("#dismissalRuns").value
      );

      dialog.style.display = "none";
    });

    $("#cancelWicket").addEventListener("click", () => {
      dialog.style.display = "none";
    });
  }

  fillSelect(
    "#dismissedBatter",
    [state.striker.name, state.nonStriker.name].filter(Boolean)
  );

  dialog.style.display = "flex";
}

function undoLastAction() {
  if (!history.length) {
    say("Undo karne ke liye action nahi hai.", "warning");
    return;
  }

  const previous = history.pop();

  state = previous.state;
  innings1 = previous.innings1;
  innings2 = previous.innings2;

  refreshUI();
  scheduleSave();
  say("Last action undo ho gaya.", "success");
}

async function startSecondInnings() {
  if (!match || matchEnded()) return;

  if (state.innings !== 1) {
    say("Second innings already started.", "warning");
    return;
  }

  if (
    !inningsEnded() &&
    !confirm("First innings abhi complete nahi hui. Phir bhi start karein?")
  ) return;

  state.status = "COMPLETED";
  innings1 = inningsSnapshot();

  const secondSide = innings1.battingTeam === "A" ? "B" : "A";

  state = newInnings(2, secondSide);
  state.striker = newBatter(players[secondSide][0] || "");
  state.nonStriker = newBatter(players[secondSide][1] || "");

  const fieldingSide = secondSide === "A" ? "B" : "A";
  state.bowler = newBowler(players[fieldingSide][0] || "");

  innings2 = null;
  history = [];

  try {
    await persist("LIVE", {
      innings1,
      innings2: null,
      winner: "",
      result: "Second innings in progress."
    });

    refreshUI();
    say("Second innings started.", "success");
  } catch (error) {
    console.error(error);
    say("Second innings save nahi hua. Firebase rules check karein.", "error");
  }
}

async function endMatch() {
  if (!match || matchEnded()) return;

  if (state.innings === 1) {
    if (!confirm("First innings end karein?")) return;

    state.status = "COMPLETED";
    innings1 = inningsSnapshot();

    try {
      await persist("LIVE", {
        innings1,
        innings2: null,
        winner: "",
        result: "First innings completed."
      });

      say("First innings complete. Start Second Innings dabayein.", "success");
    } catch (error) {
      console.error(error);
      say("Innings save nahi hua.", "error");
    }

    return;
  }

  if (!confirm("Match complete karke result publish karein?")) return;

  state.status = "COMPLETED";
  innings2 = inningsSnapshot();

  const result = calculateResult();

  try {
    await persist("COMPLETED", {
      innings1,
      innings2,
      winner: result.winner,
      result: result.result,
      completedAt: serverTimestamp()
    });

    match.status = "COMPLETED";
    match.winner = result.winner;
    match.result = result.result;

    refreshUI();
    say(result.result, "success");
  } catch (error) {
    console.error(error);
    say("Match result save nahi hua. Retry karein.", "error");
  }
}

async function saveNow() {
  await autosave();
}

async function loadScorecard() {
  if (!tournamentId || !matchId) {
    say("Tournament ID ya Match ID missing. Schedule se scorecard kholein.", "error");
    return;
  }

  try {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);

    const [tSnap, mSnap] = await Promise.all([
      getDoc(tournamentRef),
      getDoc(matchRef)
    ]);

    if (!tSnap.exists()) throw new Error("Tournament document nahi mila.");
    if (!mSnap.exists()) throw new Error("Match document nahi mila.");

    tournament = { id: tSnap.id, ...tSnap.data() };
    match = { id: mSnap.id, ...mSnap.data() };

    await loadPlayers();

    innings1 = match.innings1 || null;
    innings2 = match.innings2 || null;

    if (match.scorecard) {
      const raw = match.scorecard;

      state = {
        ...newInnings(number(raw.innings) || 1, raw.battingTeam || "A"),
        ...raw,
        striker: { ...newBatter(), ...(raw.striker || {}) },
        nonStriker: { ...newBatter(), ...(raw.nonStriker || {}) },
        bowler: { ...newBowler(), ...(raw.bowler || {}) },
        extras: { ...newInnings().extras, ...(raw.extras || {}) },
        battingStats: raw.battingStats || {},
        bowlingStats: raw.bowlingStats || {},
        ballLog: raw.ballLog || [],
        dismissals: raw.dismissals || [],
        fallOfWickets: raw.fallOfWickets || [],
        currentOverRuns: raw.currentOverRuns || []
      };
    } else if (innings2) {
      state = { ...newInnings(2, innings2.battingTeam), ...innings2 };
    } else if (innings1) {
      state = { ...newInnings(1, innings1.battingTeam), ...innings1 };
    } else {
      state = newInnings(1, match.firstBattingTeam || "A");
    }

    if (state.striker.name) {
      ensureBatter(state.striker.name);
      Object.assign(state.battingStats[state.striker.name], state.striker);
    }

    if (state.nonStriker.name) {
      ensureBatter(state.nonStriker.name);
      Object.assign(state.battingStats[state.nonStriker.name], state.nonStriker);
    }

    if (state.bowler.name) {
      ensureBowler(state.bowler.name);
      Object.assign(state.bowlingStats[state.bowler.name], state.bowler);
    }

    refreshUI();

    say(
      matchEnded() ? "Match complete; scoring locked." : "Scorecard loaded.",
      "success"
    );
  } catch (error) {
    console.error("Scorecard load failed:", error);
    say(`Scorecard load failed: ${error.message}`, "error");
  }
}

function setupButtons() {
  $$(".run-btn").forEach(button => {
    button.addEventListener("click", () => addRuns(button.dataset.runs));
  });

  $("#wideBtn")?.addEventListener("click", () => addExtra("wide"));
  $("#noBallBtn")?.addEventListener("click", () => addExtra("noBall"));
  $("#byeBtn")?.addEventListener("click", () => addExtra("bye"));
  $("#legByeBtn")?.addEventListener("click", () => addExtra("legBye"));
  $("#wicketBtn")?.addEventListener("click", showWicketDialog);
  $("#undoBtn")?.addEventListener("click", undoLastAction);
  $("#swapBtn")?.addEventListener("click", () => {
    if (!match || matchEnded()) return;
    saveUndoPoint();
    rotateStrike();
    refreshUI();
    scheduleSave();
  });

  $("#saveBtn")?.addEventListener("click", saveNow);
  $("#endMatchBtn")?.addEventListener("click", endMatch);
  $("#startSecondInningsBtn")?.addEventListener("click", startSecondInnings);

  $("#nextMatchBtn")?.addEventListener("click", () => {
    location.href = `schedule.html?id=${encodeURIComponent(tournamentId)}`;
  });

  $("#strikerSelect")?.addEventListener("change", e => {
    const name = e.target.value;

    if (name && name === state.nonStriker.name) {
      say("Striker aur non-striker alag hone chahiye.", "warning");
      refreshDropdowns();
      return;
    }

    state.striker = state.battingStats[name]
      ? copy(state.battingStats[name])
      : newBatter(name);

    if (name) ensureBatter(name);

    refreshUI();
    scheduleSave();
  });

  $("#nonStrikerSelect")?.addEventListener("change", e => {
    const name = e.target.value;

    if (name && name === state.striker.name) {
      say("Striker aur non-striker alag hone chahiye.", "warning");
      refreshDropdowns();
      return;
    }

    state.nonStriker = state.battingStats[name]
      ? copy(state.battingStats[name])
      : newBatter(name);

    if (name) ensureBatter(name);

    refreshUI();
    scheduleSave();
  });

  $("#bowlerSelect")?.addEventListener("change", e => {
    const name = e.target.value;
    if (!name || name === state.bowler.name) return;

    saveUndoPoint();

    state.bowler = state.bowlingStats[name]
      ? copy(state.bowlingStats[name])
      : newBowler(name);

    ensureBowler(name);
    refreshUI();
    scheduleSave();
  });

  const links = {
    "#tournamentLink": "tournament.html",
    "#scheduleLink": "schedule.html",
    "#resultsLink": "results.html",
    "#pointsLink": "points.html"
  };

  Object.entries(links).forEach(([selector, page]) => {
    $(selector)?.addEventListener("click", event => {
      event.preventDefault();

      location.href =
        `${page}?id=${encodeURIComponent(tournamentId)}`;
    });
  });
}

setupButtons();
say("Loading APL scorecard...", "info");
loadScorecard();
