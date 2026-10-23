
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/*
 * APL TOURNAMENT PLATFORM — SCORECARD
 * Features:
 * - Registered player dropdowns
 * - Batting / bowling statistics
 * - Runs, extras, wickets, undo
 * - Firebase autosave
 * - Innings 1 and innings 2
 * - Winner, result, scoreA and scoreB
 * - LIVE / COMPLETED / SCHEDULED status compatibility
 *
 * Important:
 * - Uses updateDoc; does not delete existing registration data.
 * - This is an umpire-assisting scorer, not a replacement for the
 *   official umpire's judgement in unusual Law-specific situations.
 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

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
let currentMatch = null;
let matchRef = null;
let teamPlayers = { A: [], B: [] };
let history = [];
let saving = false;
let saveAgain = false;
let saveTimer = null;
let initialized = false;
let inningsOne = null;
let inningsTwo = null;

const BOWLER_WICKET_TYPES = new Set([
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit Wicket",
  "Caught and Bowled"
]);

const NO_BALL_ALLOWED_DISMISSALS = new Set([
  "Run Out",
  "Obstructing the Field",
  "Hit the Ball Twice"
]);

const WIDE_ALLOWED_DISMISSALS = new Set([
  "Run Out",
  "Stumped",
  "Hit Wicket",
  "Obstructing the Field",
  "Hit the Ball Twice"
]);

function num(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "info") {
  const element =
    $("#message") ||
    $("#statusMessage") ||
    $("#scoreMessage") ||
    $(".message");

  if (element) {
    element.textContent = message;
    element.dataset.type = type;
    element.style.display = "block";
  } else if (type === "error") {
    console.error(message);
  }
}

function oversText(balls) {
  const legalBalls = Math.max(0, num(balls));
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function strikeRate(batter) {
  return num(batter?.balls)
    ? ((num(batter.runs) / num(batter.balls)) * 100).toFixed(2)
    : "0.00";
}

function economy(bowler) {
  const balls = num(bowler?.balls);
  return balls
    ? (num(bowler.runs) / (balls / 6)).toFixed(2)
    : "0.00";
}

function createBatter(name = "") {
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

function createBowler(name = "") {
  return {
    name,
    runs: 0,
    balls: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0,
    maidens: 0
  };
}

function createExtras() {
  return {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalty: 0,
    total: 0
  };
}

function createInnings(number = 1, battingTeam = "A") {
  return {
    innings: number,
    battingTeam,
    runs: 0,
    wickets: 0,
    balls: 0,
    currentOverRuns: [],
    striker: createBatter(""),
    nonStriker: createBatter(""),
    bowler: createBowler(""),
    extras: createExtras(),
    totalFours: 0,
    totalSixes: 0,
    dismissals: [],
    status: "LIVE",
    fallOfWickets: [],
    battingStats: {},
    bowlingStats: {},
    ballLog: []
  };
}

let scoreState = createInnings();

function oversLimit() {
  return Math.max(1, num(currentMatch?.overs) || 20);
}

function maxBalls() {
  return oversLimit() * 6;
}

function legalBallsRemaining() {
  return Math.max(0, maxBalls() - scoreState.balls);
}

function isCompleted() {
  return (
    String(currentMatch?.status || "").toLowerCase() === "completed" ||
    String(currentMatch?.status || "").toLowerCase() === "complete" ||
    String(scoreState.status || "").toLowerCase() === "completed"
  );
}

function inningsFinished() {
  return (
    scoreState.wickets >= 10 ||
    scoreState.balls >= maxBalls() ||
    scoreState.status === "COMPLETED" ||
    scoreState.status === "Innings Completed"
  );
}

function canScore() {
  if (!currentMatch) return false;

  if (isCompleted()) {
    showMessage("Match already completed. Scoring is locked.", "warning");
    return false;
  }

  if (inningsFinished()) {
    showMessage(
      "Innings completed. Use Start Second Innings or End Match.",
      "warning"
    );
    return false;
  }

  if (!scoreState.striker?.name || !scoreState.nonStriker?.name) {
    showMessage("Please select both striker and non-striker.", "warning");
    return false;
  }

  if (
    scoreState.striker.name === scoreState.nonStriker.name
  ) {
    showMessage("Striker and non-striker must be different players.", "warning");
    return false;
  }

  if (!scoreState.bowler?.name) {
    showMessage("Please select the bowler.", "warning");
    return false;
  }

  return true;
}

function getTeamName(team) {
  if (!currentMatch) return team;

  if (team === "A") {
    return (
      currentMatch.team1Name ||
      currentMatch.teamA ||
      currentMatch.team1 ||
      "Team A"
    );
  }

  return (
    currentMatch.team2Name ||
    currentMatch.teamB ||
    currentMatch.team2 ||
    "Team B"
  );
}

function getBattingTeamForInnings(number) {
  if (number === 1) {
    return currentMatch?.firstBattingTeam || "A";
  }

  const first = inningsOne?.battingTeam || "A";
  return first === "A" ? "B" : "A";
}

function activePlayers() {
  return teamPlayers[scoreState.battingTeam] || [];
}

function fieldingPlayers() {
  const side = scoreState.battingTeam === "A" ? "B" : "A";
  return teamPlayers[side] || [];
}

function playerNames(players) {
  return [...new Set(
    (players || [])
      .map(player => {
        if (typeof player === "string") return player.trim();

        return String(
          player?.name ||
          player?.playerName ||
          player?.fullName ||
          player?.displayName ||
          ""
        ).trim();
      })
      .filter(Boolean)
  )];
}

function findUnusedBatter(excluded = []) {
  const used = new Set(
    [
      scoreState.striker?.name,
      scoreState.nonStriker?.name,
      ...excluded
    ].filter(Boolean)
  );

  return playerNames(activePlayers()).find(name => !used.has(name)) || "";
}

function normaliseStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  if (
    value === "completed" ||
    value === "complete" ||
    value === "finished" ||
    value === "result"
  ) {
    return "COMPLETED";
  }

  if (
    value === "live" ||
    value === "in progress" ||
    value === "innings completed"
  ) {
    return "LIVE";
  }

  return "SCHEDULED";
}

function normaliseInnings(raw, number, battingTeam) {
  const base = createInnings(number, battingTeam);

  if (!raw || typeof raw !== "object") return base;

  const state = { ...base, ...raw };
  state.innings = number;
  state.battingTeam = raw.battingTeam || battingTeam;
  state.runs = num(raw.runs ?? raw.totalRuns);
  state.wickets = num(raw.wickets ?? raw.totalWickets);
  state.balls = num(raw.balls ?? raw.legalBalls);
  state.currentOverRuns = Array.isArray(raw.currentOverRuns)
    ? raw.currentOverRuns
    : [];
  state.striker = { ...createBatter(""), ...(raw.striker || {}) };
  state.nonStriker = { ...createBatter(""), ...(raw.nonStriker || {}) };
  state.bowler = { ...createBowler(""), ...(raw.bowler || {}) };
  state.extras = { ...createExtras(), ...(raw.extras || {}) };
  state.dismissals = Array.isArray(raw.dismissals) ? raw.dismissals : [];
  state.ballLog = Array.isArray(raw.ballLog) ? raw.ballLog : [];
  state.fallOfWickets = Array.isArray(raw.fallOfWickets)
    ? raw.fallOfWickets
    : [];
  state.status = raw.status || "LIVE";

  return state;
}

async function loadPlayersForTeam(teamId) {
  if (!teamId || !tournamentId) return [];

  try {
    const snapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "teams")
    );

    for (const teamDoc of snapshot.docs) {
      const team = teamDoc.data();

      if (
        teamDoc.id === teamId ||
        team.id === teamId ||
        team.teamId === teamId
      ) {
        return playerNames(
          team.players ||
          team.registeredPlayers ||
          team.playerNames ||
          team.squad ||
          []
        );
      }
    }

    return [];
  } catch (error) {
    console.error("Unable to load registered players:", error);
    return [];
  }
}

async function loadTeamPlayers() {
  const [playersA, playersB] = await Promise.all([
    loadPlayersForTeam(currentMatch?.team1Id),
    loadPlayersForTeam(currentMatch?.team2Id)
  ]);

  teamPlayers = {
    A: playersA,
    B: playersB
  };

  if (!playersA.length || !playersB.length) {
    showMessage(
      "Some registered players could not be loaded. Check team1Id/team2Id and team registrations.",
      "warning"
    );
  }
}

function populateSelect(selector, names, selected = "") {
  const select = $(selector);
  if (!select) return;

  const previous = selected || select.value;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select Player --";
  select.appendChild(placeholder);

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  if (previous && names.includes(previous)) {
    select.value = previous;
  } else {
    select.value = "";
  }
}

function refreshPlayerDropdowns() {
  const batting = playerNames(activePlayers());
  const fielding = playerNames(fieldingPlayers());

  populateSelect(
    "#strikerSelect",
    batting,
    scoreState.striker?.name || ""
  );

  populateSelect(
    "#nonStrikerSelect",
    batting,
    scoreState.nonStriker?.name || ""
  );

  populateSelect(
    "#bowlerSelect",
    fielding,
    scoreState.bowler?.name || ""
  );

  populateSelect("#dismissedBatter", [
    scoreState.striker?.name,
    scoreState.nonStriker?.name
  ].filter(Boolean));

  [
    "#catcherSelect",
    "#runOutFielderSelect",
    "#wicketkeeperSelect",
    "#assistFielderSelect"
  ].forEach(selector => {
    populateSelect(selector, fielding);
  });
}

function syncSelectedPlayers() {
  const striker = $("#strikerSelect")?.value;
  const nonStriker = $("#nonStrikerSelect")?.value;
  const bowler = $("#bowlerSelect")?.value;

  if (striker) {
    scoreState.striker.name = striker;
    ensurePlayerStats(striker);
  }

  if (nonStriker) {
    scoreState.nonStriker.name = nonStriker;
    ensurePlayerStats(nonStriker);
  }

  if (bowler) {
    scoreState.bowler.name = bowler;
    ensureBowlerStats(bowler);
  }
}

function ensurePlayerStats(name) {
  if (!name) return;

  if (!scoreState.battingStats[name]) {
    scoreState.battingStats[name] = createBatter(name);
  }
}

function ensureBowlerStats(name) {
  if (!name) return;

  if (!scoreState.bowlingStats[name]) {
    scoreState.bowlingStats[name] = createBowler(name);
  }
}

function snapshotForUndo() {
  history.push({
    scoreState: clone(scoreState),
    inningsOne: clone(inningsOne),
    inningsTwo: clone(inningsTwo),
    currentMatch: {
      status: currentMatch?.status,
      winner: currentMatch?.winner,
      result: currentMatch?.result
    }
  });

  if (history.length > 100) history.shift();
}

function rotateStrike() {
  const oldStriker = scoreState.striker;
  scoreState.striker = scoreState.nonStriker;
  scoreState.nonStriker = oldStriker;
}

function addTeamRuns(runs) {
  scoreState.runs += runs;
}

function addBowlerRuns(runs) {
  ensureBowlerStats(scoreState.bowler.name);
  scoreState.bowler.runs += runs;

  const name = scoreState.bowler.name;
  if (name) {
    ensureBowlerStats(name);
    scoreState.bowlingStats[name].runs += runs;
  }
}

function addBowlerLegalBall() {
  scoreState.balls += 1;

  if (scoreState.bowler.name) {
    ensureBowlerStats(scoreState.bowler.name);
    scoreState.bowler.balls += 1;
    scoreState.bowlingStats[scoreState.bowler.name].balls += 1;
  }
}

function addBatterBall(batter = scoreState.striker) {
  if (!batter?.name) return;

  ensurePlayerStats(batter.name);
  batter.balls += 1;
  scoreState.battingStats[batter.name].balls += 1;
}

function addBatterRuns(runs, batter = scoreState.striker) {
  if (!batter?.name) return;

  ensurePlayerStats(batter.name);
  batter.runs += runs;
  scoreState.battingStats[batter.name].runs += runs;

  if (runs === 4) {
    batter.fours += 1;
    scoreState.battingStats[batter.name].fours += 1;
    scoreState.totalFours += 1;
  }

  if (runs === 6) {
    batter.sixes += 1;
    scoreState.battingStats[batter.name].sixes += 1;
    scoreState.totalSixes += 1;
  }
}

function addBallLog(entry) {
  scoreState.ballLog.push({
    ...entry,
    over: Math.floor(scoreState.balls / 6),
    ball: (scoreState.balls % 6) + 1,
    timestamp: new Date().toISOString()
  });
}

function completeOverIfNeeded() {
  if (scoreState.balls > 0 && scoreState.balls % 6 === 0) {
    scoreState.currentOverRuns = [];
    rotateStrike();
  }
}

function checkInningsLimit() {
  if (scoreState.wickets >= 10 || scoreState.balls >= maxBalls()) {
    scoreState.status = "COMPLETED";
    showMessage("Innings completed. Confirm or start the next innings.", "success");
  }
}

function refreshUI() {
  setText("#totalRuns", scoreState.runs);
  setText("#runs", scoreState.runs);
  setText("#totalWickets", scoreState.wickets);
  setText("#wickets", scoreState.wickets);
  setText("#overs", oversText(scoreState.balls));
  setText("#currentOvers", oversText(scoreState.balls));
  setText("#currentBall", scoreState.balls % 6);
  setText("#inningsNumber", scoreState.innings);
  setText("#innings", scoreState.innings);
  setText("#battingTeamName", getTeamName(scoreState.battingTeam));
  setText("#currentOverRuns", scoreState.currentOverRuns.join(" "));
  setText("#totalFours", scoreState.totalFours);
  setText("#totalSixes", scoreState.totalSixes);

  setText("#strikerName", scoreState.striker.name || "Select striker");
  setText("#strikerRuns", scoreState.striker.runs);
  setText("#strikerBalls", scoreState.striker.balls);
  setText("#strikerSR", strikeRate(scoreState.striker));

  setText("#nonStrikerName", scoreState.nonStriker.name || "Select non-striker");
  setText("#nonStrikerRuns", scoreState.nonStriker.runs);
  setText("#nonStrikerBalls", scoreState.nonStriker.balls);
  setText("#nonStrikerSR", strikeRate(scoreState.nonStriker));

  setText("#bowlerName", scoreState.bowler.name || "Select bowler");
  setText("#bowlerRuns", scoreState.bowler.runs);
  setText("#bowlerBalls", scoreState.bowler.balls);
  setText("#bowlerOvers", oversText(scoreState.bowler.balls));
  setText("#bowlerWickets", scoreState.bowler.wickets);
  setText("#bowlerEconomy", economy(scoreState.bowler));

  setText("#wides", scoreState.extras.wides);
  setText("#noBalls", scoreState.extras.noBalls);
  setText("#byes", scoreState.extras.byes);
  setText("#legByes", scoreState.extras.legByes);
  setText("#totalExtras", scoreState.extras.total);

  setText("#matchStatus", currentMatch?.status || "SCHEDULED");
  setText("#matchResult", currentMatch?.result || "Match in progress");

  refreshPlayerDropdowns();
  renderScorecardTables();
}

function renderScorecardTables() {
  renderTable(
    "#battingTable tbody",
    Object.values(scoreState.battingStats),
    ["name", "runs", "balls", "fours", "sixes"],
    ["Player", "Runs", "Balls", "4s", "6s"]
  );

  renderTable(
    "#bowlingTable tbody",
    Object.values(scoreState.bowlingStats),
    ["name", "overs", "runs", "wickets", "economy"],
    ["Bowler", "Overs", "Runs", "Wickets", "Economy"],
    true
  );
}

function renderTable(selector, rows, fields, headers, bowling = false) {
  const body = $(selector);
  if (!body) return;

  body.replaceChildren();

  rows.forEach(row => {
    const tr = document.createElement("tr");

    fields.forEach(field => {
      const td = document.createElement("td");

      let value = row[field] ?? 0;
      if (field === "overs") value = oversText(row.balls);
      if (field === "economy") value = economy(row);

      td.textContent = String(value);
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function makeInningsSnapshot() {
  return {
    ...clone(scoreState),
    overs: oversText(scoreState.balls),
    totalRuns: scoreState.runs,
    totalWickets: scoreState.wickets,
    legalBalls: scoreState.balls
  };
}

function calculateSideScores() {
  const first = inningsOne || currentMatch?.innings1 || null;
  const second = inningsTwo || currentMatch?.innings2 || null;

  const scoreFor = (team) => {
    const totals = [];

    if (first?.battingTeam === team) totals.push(num(first.runs));
    if (second?.battingTeam === team) totals.push(num(second.runs));

    if (scoreState.battingTeam === team) {
      if (!second || scoreState.innings === 1) {
        if (!first) return scoreState.runs;
      } else {
        return scoreState.runs;
      }
    }

    return totals.length ? totals.reduce((a, b) => a + b, 0) : 0;
  };

  return {
    scoreA: scoreFor("A"),
    scoreB: scoreFor("B")
  };
}

function getResult() {
  if (!inningsOne || !inningsTwo) {
    return {
      winner: "",
      result: "First innings completed; second innings pending."
    };
  }

  const firstRuns = num(inningsOne.runs);
  const secondRuns = num(inningsTwo.runs);
  const chasingTeam = inningsTwo.battingTeam;
  const defendingTeam = inningsOne.battingTeam;

  if (secondRuns > firstRuns) {
    const wicketsLeft = Math.max(0, 10 - num(inningsTwo.wickets));
    return {
      winner: getTeamName(chasingTeam),
      result: `${getTeamName(chasingTeam)} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}.`
    };
  }

  if (secondRuns < firstRuns) {
    const margin = firstRuns - secondRuns;
    return {
      winner: getTeamName(defendingTeam),
      result: `${getTeamName(defendingTeam)} won by ${margin} run${margin === 1 ? "" : "s"}.`
    };
  }

  return {
    winner: "",
    result: "Match tied."
  };
}

function makeSavePayload(status = "LIVE") {
  const sides = calculateSideScores();

  return {
    status,
    scorecard: makeInningsSnapshot(),
    innings: scoreState.innings,
    currentInnings: scoreState.innings,
    currentOver: Math.floor(scoreState.balls / 6),
    currentBall: scoreState.balls % 6,
    totalRuns: scoreState.runs,
    totalWickets: scoreState.wickets,
    currentRuns: scoreState.runs,
    currentWickets: scoreState.wickets,
    currentOvers: oversText(scoreState.balls),
    scoreA: sides.scoreA,
    scoreB: sides.scoreB,
    updatedAt: serverTimestamp()
  };
}

async function persistScore(status = "LIVE", extra = {}) {
  if (!matchRef) return;

  const payload = {
    ...makeSavePayload(status),
    ...extra,
    updatedAt: serverTimestamp()
  };

  await updateDoc(matchRef, payload);

  currentMatch = {
    ...currentMatch,
    ...extra,
    ...payload,
    status
  };
}

async function autoSave() {
  if (!matchRef || !currentMatch) return;

  if (saving) {
    saveAgain = true;
    return;
  }

  saving = true;

  try {
    const status = isCompleted()
      ? "COMPLETED"
      : scoreState.status === "COMPLETED"
        ? "LIVE"
        : "LIVE";

    await persistScore(status);
    showMessage("Score saved successfully.", "success");
  } catch (error) {
    console.error("Score autosave failed:", error);
    showMessage(
      "Autosave failed. Check your internet/Firebase permissions and press Save.",
      "error"
    );
  } finally {
    saving = false;

    if (saveAgain) {
      saveAgain = false;
      autoSave();
    }
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autoSave, 350);
}

function updatePlayerOnDismissal(name, type) {
  const batter =
    scoreState.striker.name === name
      ? scoreState.striker
      : scoreState.nonStriker.name === name
        ? scoreState.nonStriker
        : null;

  if (!batter) return;

  batter.out = true;
  batter.dismissal = type;

  ensurePlayerStats(name);
  scoreState.battingStats[name].out = true;
  scoreState.battingStats[name].dismissal = type;
}

function recordWicketCredit(type) {
  if (!BOWLER_WICKET_TYPES.has(type)) return;

  scoreState.bowler.wickets += 1;

  const bowlerName = scoreState.bowler.name;
  if (bowlerName) {
    ensureBowlerStats(bowlerName);
    scoreState.bowlingStats[bowlerName].wickets += 1;
  }
}

function showDismissalDialog() {
  const dialog = $("#dismissalDialog");

  if (dialog) {
    dialog.style.display = "block";
    dialog.setAttribute("aria-hidden", "false");
    return;
  }

  const types = [
    "Bowled",
    "Caught",
    "LBW",
    "Run Out",
    "Stumped",
    "Hit Wicket",
    "Caught and Bowled",
    "Retired Hurt",
    "Retired Out",
    "Obstructing the Field",
    "Timed Out",
    "Hit the Ball Twice"
  ];

  const wrapper = document.createElement("div");
  wrapper.id = "dismissalDialog";
  wrapper.style.cssText =
    "position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";

  const panel = document.createElement("div");
  panel.style.cssText =
    "background:white;color:#111;padding:20px;border-radius:12px;width:min(500px,100%);max-height:90vh;overflow:auto;";

  const title = document.createElement("h2");
  title.textContent = "Record Dismissal";
  panel.appendChild(title);

  const typeSelect = document.createElement("select");
  typeSelect.id = "dismissalType";
  typeSelect.style.cssText = "width:100%;padding:10px;margin:8px 0;";

  types.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  panel.appendChild(typeSelect);

  const batterSelect = document.createElement("select");
  batterSelect.id = "dismissedBatter";
  batterSelect.style.cssText = "width:100%;padding:10px;margin:8px 0;";

  [scoreState.striker.name, scoreState.nonStriker.name]
    .filter(Boolean)
    .forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      batterSelect.appendChild(option);
    });

  panel.appendChild(batterSelect);

  const deliverySelect = document.createElement("select");
  deliverySelect.id = "dismissalDeliveryType";
  deliverySelect.style.cssText = "width:100%;padding:10px;margin:8px 0;";

  [
    ["legal", "Legal delivery"],
    ["wide", "Wide"],
    ["noBall", "No-ball"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    deliverySelect.appendChild(option);
  });

  panel.appendChild(deliverySelect);

  const extraLabel = document.createElement("label");
  extraLabel.textContent = "Completed runs on this delivery (excluding penalty):";
  extraLabel.style.display = "block";
  panel.appendChild(extraLabel);

  const extraInput = document.createElement("input");
  extraInput.id = "dismissalRuns";
  extraInput.type = "number";
  extraInput.min = "0";
  extraInput.max = "6";
  extraInput.value = "0";
  extraInput.style.cssText = "width:100%;padding:10px;margin:8px 0;";
  panel.appendChild(extraInput);

  const help = document.createElement("p");
  help.textContent =
    "For caught dismissals, select catcher if your existing HTML provides #catcherSelect. Verify run-out ends and completed runs with the umpire.";
  panel.appendChild(help);

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.textContent = "Confirm Wicket";
  confirm.addEventListener("click", () => {
    const type = typeSelect.value;
    const batter = batterSelect.value;
    const delivery = deliverySelect.value;
    const runs = Math.max(0, Math.min(6, num(extraInput.value)));

    wrapper.remove();
    recordDismissal(type, batter, {
      delivery,
      completedRuns: runs
    });
  });

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => wrapper.remove());

  actions.append(confirm, cancel);
  panel.appendChild(actions);
  wrapper.appendChild(panel);
  document.body.appendChild(wrapper);
}

function recordDismissal(type, dismissedName, options = {}) {
  if (!canScore()) return;

  const delivery = options.delivery || "legal";
  const completedRuns = Math.max(0, num(options.completedRuns));

  if (!dismissedName) {
    showMessage("Select the dismissed batter.", "warning");
    return;
  }

  if (delivery === "noBall" && !NO_BALL_ALLOWED_DISMISSALS.has(type)) {
    showMessage(
      `On a no-ball, ${type} is not a valid dismissal in the standard Laws. Choose a permitted dismissal.`,
      "warning"
    );
    return;
  }

  if (delivery === "wide" && !WIDE_ALLOWED_DISMISSALS.has(type)) {
    showMessage(
      `On a wide, ${type} is not a valid dismissal in the standard Laws. Choose a permitted dismissal.`,
      "warning"
    );
    return;
  }

  if (
    type === "Retired Hurt" ||
    type === "Retired Out" ||
    type === "Timed Out"
  ) {
    if (type === "Retired Hurt") {
      showMessage(
        "Retired Hurt is not a wicket. This scorer requires the umpire to manage the batter's return/replacement manually.",
        "warning"
      );
      return;
    }

    if (type === "Retired Out" || type === "Timed Out") {
      // These are dismissals, but special replacement/ball rules may apply.
      // Confirm the official decision with the umpire before proceeding.
    }
  }

  snapshotForUndo();

  const dismissed =
    scoreState.striker.name === dismissedName
      ? scoreState.striker
      : scoreState.nonStriker;

  const otherBatter =
    scoreState.striker.name === dismissedName
      ? scoreState.nonStriker
      : scoreState.striker;

  if (delivery === "wide") {
    const penalty = 1;
    const totalWideRuns = penalty + completedRuns;

    scoreState.runs += totalWideRuns;
    scoreState.extras.wides += totalWideRuns;
    scoreState.extras.total += totalWideRuns;
    scoreState.bowler.runs += totalWideRuns;

    if (scoreState.bowler.name) {
      ensureBowlerStats(scoreState.bowler.name);
      scoreState.bowlingStats[scoreState.bowler.name].runs += totalWideRuns;
      scoreState.bowler.wides += totalWideRuns;
      scoreState.bowlingStats[scoreState.bowler.name].wides += totalWideRuns;
    }
  } else if (delivery === "noBall") {
    const penalty = 1;
    const totalNoBallRuns = penalty + completedRuns;

    scoreState.runs += totalNoBallRuns;
    scoreState.extras.noBalls += 1;
    scoreState.extras.total += 1;
    scoreState.bowler.runs += totalNoBallRuns;

    if (scoreState.bowler.name) {
      ensureBowlerStats(scoreState.bowler.name);
      scoreState.bowlingStats[scoreState.bowler.name].runs += totalNoBallRuns;
      scoreState.bowler.noBalls += 1;
      scoreState.bowlingStats[scoreState.bowler.name].noBalls += 1;
    }
  } else {
    addBowlerLegalBall();
  }

  if (completedRuns % 2 === 1) rotateStrike();

  // Retired Out and Timed Out are dismissals; bowler does not receive credit.
  updatePlayerOnDismissal(dismissedName, type);

  scoreState.wickets += 1;

  recordWicketCredit(type);

  scoreState.dismissals.push({
    batter: dismissedName,
    type,
    bowler: scoreState.bowler.name,
    runs: completedRuns,
    delivery,
    wicketNumber: scoreState.wickets,
    over: oversText(scoreState.balls)
  });

  scoreState.fallOfWickets.push({
    wicket: scoreState.wickets,
    score: scoreState.runs,
    batter: dismissedName,
    overs: oversText(scoreState.balls)
  });

  const newBatter = findUnusedBatter([
    dismissedName,
    otherBatter.name
  ]);

  const replacement = createBatter(newBatter);

  if (scoreState.striker.name === dismissedName) {
    scoreState.striker = replacement;
  } else if (scoreState.nonStriker.name === dismissedName) {
    scoreState.nonStriker = replacement;
  }

  if (newBatter) ensurePlayerStats(newBatter);

  addBallLog({
    type: "wicket",
    dismissal: type,
    batter: dismissedName,
    completedRuns,
    delivery,
    total: scoreState.runs
  });

  completeOverIfNeeded();
  checkInningsLimit();
  refreshUI();
  scheduleSave();

  showMessage(`${dismissedName} — ${type}`, "success");
}

function addRuns(runs) {
  if (!canScore()) return;

  const value = Math.max(0, Math.min(6, num(runs)));
  snapshotForUndo();

  addTeamRuns(value);
  addBatterRuns(value);
  addBatterBall(scoreState.striker);
  addBowlerRuns(value);
  addBowlerLegalBall();

  scoreState.currentOverRuns.push(String(value));

  if (value % 2 === 1) rotateStrike();

  addBallLog({
    type: "runs",
    runs: value,
    batter: scoreState.striker.name,
    total: scoreState.runs
  });

  completeOverIfNeeded();
  checkInningsLimit();
  refreshUI();
  scheduleSave();
}

function addExtra(type, amount = 1) {
  if (!canScore()) return;

  const value = Math.max(1, Math.min(6, num(amount)));
  snapshotForUndo();

  if (type === "wide") {
    // A wide includes the one-run penalty. Additional completed runs
    // should be entered via a dedicated wide-runs control if needed.
    scoreState.runs += value;
    scoreState.extras.wides += value;
    scoreState.extras.total += value;

    scoreState.bowler.runs += value;
    scoreState.bowler.wides += value;

    const name = scoreState.bowler.name;
    if (name) {
      ensureBowlerStats(name);
      scoreState.bowlingStats[name].runs += value;
      scoreState.bowlingStats[name].wides += value;
    }

    if ((value - 1) % 2 === 1) rotateStrike();

    addBallLog({ type: "wide", runs: value, total: scoreState.runs });
  } else if (type === "noBall") {
    // Standard no-ball button records the one-run penalty only.
    // Batter runs off a no-ball require a separate explicit scoring action.
    scoreState.runs += 1;
    scoreState.extras.noBalls += 1;
    scoreState.extras.total += 1;

    scoreState.bowler.runs += 1;
    scoreState.bowler.noBalls += 1;

    const name = scoreState.bowler.name;
    if (name) {
      ensureBowlerStats(name);
      scoreState.bowlingStats[name].runs += 1;
      scoreState.bowlingStats[name].noBalls += 1;
    }

    addBallLog({ type: "noBall", runs: 1, total: scoreState.runs });
  } else if (type === "bye" || type === "legBye") {
    scoreState.runs += value;

    if (type === "bye") {
      scoreState.extras.byes += value;
    } else {
      scoreState.extras.legByes += value;
    }

    scoreState.extras.total += value;
    addBowlerLegalBall();

    if (value % 2 === 1) rotateStrike();

    addBallLog({
      type,
      runs: value,
      total: scoreState.runs
    });
  } else {
    showMessage("Unknown extra type.", "error");
    return;
  }

  scoreState.currentOverRuns.push(type);
  completeOverIfNeeded();
  checkInningsLimit();
  refreshUI();
  scheduleSave();
}

function undoLastAction() {
  if (!history.length) {
    showMessage("No action available to undo.", "warning");
    return;
  }

  const previous = history.pop();

  scoreState = previous.scoreState;
  inningsOne = previous.inningsOne;
  inningsTwo = previous.inningsTwo;

  if (previous.currentMatch) {
    currentMatch.status = previous.currentMatch.status || currentMatch.status;
    currentMatch.winner = previous.currentMatch.winner || "";
    currentMatch.result = previous.currentMatch.result || "";
  }

  refreshUI();
  scheduleSave();
  showMessage("Last scoring action undone.", "success");
}

function swapStrike() {
  if (!currentMatch || isCompleted()) return;

  snapshotForUndo();
  rotateStrike();
  refreshUI();
  scheduleSave();
}

async function startSecondInnings() {
  if (!currentMatch || isCompleted()) return;

  if (scoreState.innings !== 1) {
    showMessage("Second innings has already started.", "warning");
    return;
  }

  if (!inningsFinished()) {
    const confirmed = confirm(
      "First innings has not reached its over/wicket limit. End it and start the second innings?"
    );

    if (!confirmed) return;
  }

  snapshotForUndo();

  scoreState.status = "COMPLETED";
  inningsOne = makeInningsSnapshot();

  const secondTeam = inningsOne.battingTeam === "A" ? "B" : "A";
  inningsTwo = null;

  scoreState = createInnings(2, secondTeam);

  const battingNames = playerNames(teamPlayers[secondTeam]);
  const bowlingNames = playerNames(
    teamPlayers[secondTeam === "A" ? "B" : "A"]
  );

  scoreState.striker = createBatter(battingNames[0] || "");
  scoreState.nonStriker = createBatter(battingNames[1] || "");
  scoreState.bowler = createBowler(bowlingNames[0] || "");

  inningsTwo = null;
  history = [];

  try {
    await persistScore("LIVE", {
      innings1: inningsOne,
      innings2: null,
      winner: "",
      result: "Second innings in progress."
    });

    refreshUI();
    showMessage("Second innings started.", "success");
  } catch (error) {
    console.error(error);
    showMessage("Could not save second innings. Check Firebase permissions.", "error");
  }
}

async function endMatch() {
  if (!currentMatch || isCompleted()) return;

  if (scoreState.innings === 1) {
    const confirmed = confirm(
      "End the first innings? You can then start the second innings."
    );

    if (!confirmed) return;

    snapshotForUndo();
    scoreState.status = "COMPLETED";
    inningsOne = makeInningsSnapshot();

    try {
      await persistScore("LIVE", {
        innings1: inningsOne,
        innings2: null,
        winner: "",
        result: "First innings completed."
      });

      refreshUI();
      showMessage(
        "First innings completed. Select Start Second Innings.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showMessage("Could not save innings. Please retry.", "error");
    }

    return;
  }

  const confirmed = confirm(
    "Complete this match and publish the result?"
  );

  if (!confirmed) return;

  snapshotForUndo();

  scoreState.status = "COMPLETED";
  inningsTwo = makeInningsSnapshot();

  const resultData = getResult();
  const sides = calculateSideScores();

  try {
    await persistScore("COMPLETED", {
      innings1: inningsOne,
      innings2: inningsTwo,
      winner: resultData.winner,
      result: resultData.result,
      scoreA: sides.scoreA,
      scoreB: sides.scoreB,
      completedAt: serverTimestamp()
    });

    currentMatch.status = "COMPLETED";
    currentMatch.winner = resultData.winner;
    currentMatch.result = resultData.result;

    refreshUI();
    showMessage(resultData.result, "success");
  } catch (error) {
    console.error(error);
    showMessage("Match result could not be saved. Please retry.", "error");
  }
}

async function saveNow() {
  try {
    syncSelectedPlayers();
    await autoSave();
  } catch (error) {
    console.error(error);
    showMessage("Manual save failed.", "error");
  }
}

async function loadTournamentAndMatch() {
  if (!tournamentId || !matchId) {
    showMessage(
      "Tournament ID or Match ID missing. Open the scorecard from the schedule page.",
      "error"
    );
    return;
  }

  try {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    const matchDocumentRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      matchId
    );

    const [tournamentSnap, matchSnap] = await Promise.all([
      getDoc(tournamentRef),
      getDoc(matchDocumentRef)
    ]);

    if (!tournamentSnap.exists()) {
      throw new Error("Tournament document not found.");
    }

    if (!matchSnap.exists()) {
      throw new Error("Match document not found.");
    }

    tournament = {
      id: tournamentSnap.id,
      ...tournamentSnap.data()
    };

    currentMatch = {
      id: matchSnap.id,
      ...matchSnap.data()
    };

    matchRef = matchDocumentRef;

    await loadTeamPlayers();

    const storedStatus = normaliseStatus(currentMatch.status);

    inningsOne = currentMatch.innings1
      ? normaliseInnings(
          currentMatch.innings1,
          1,
          currentMatch.innings1.battingTeam || "A"
        )
      : null;

    inningsTwo = currentMatch.innings2
      ? normaliseInnings(
          currentMatch.innings2,
          2,
          currentMatch.innings2.battingTeam ||
            (inningsOne?.battingTeam === "A" ? "B" : "A")
        )
      : null;

    const savedScorecard = currentMatch.scorecard;

    if (savedScorecard) {
      scoreState = normaliseInnings(
        savedScorecard,
        num(savedScorecard.innings) || 1,
        savedScorecard.battingTeam || "A"
      );
    } else if (inningsTwo) {
      scoreState = normaliseInnings(inningsTwo, 2, inningsTwo.battingTeam);
    } else if (inningsOne) {
      scoreState = normaliseInnings(inningsOne, 1, inningsOne.battingTeam);
    } else {
      const battingTeam = currentMatch.firstBattingTeam || "A";
      scoreState = createInnings(1, battingTeam);
    }

    // Keep terminal match status consistent with the saved innings.
    if (storedStatus === "COMPLETED") {
      currentMatch.status = "COMPLETED";
    } else if (scoreState.status === "COMPLETED" && scoreState.innings === 1) {
      currentMatch.status = "LIVE";
    } else {
      currentMatch.status = storedStatus;
    }

    refreshPlayerDropdowns();
    refreshUI();

    if (currentMatch.status === "COMPLETED") {
      showMessage("Match completed. Scoring is locked.", "info");
    } else {
      showMessage("Scorecard loaded.", "success");
    }

    initialized = true;
  } catch (error) {
    console.error("Scorecard initialization failed:", error);
    showMessage(
      `Scorecard load failed: ${error.message || "Unknown error"}`,
      "error"
    );
  }
}

function setupButtons() {
  $$(".run-btn").forEach(button => {
    button.addEventListener("click", () => {
      addRuns(button.dataset.runs);
    });
  });

  $("#wideBtn")?.addEventListener("click", () => addExtra("wide", 1));
  $("#noBallBtn")?.addEventListener("click", () => addExtra("noBall", 1));
  $("#byeBtn")?.addEventListener("click", () => addExtra("bye", 1));
  $("#legByeBtn")?.addEventListener("click", () => addExtra("legBye", 1));

  $("#wicketBtn")?.addEventListener("click", showDismissalDialog);
  $("#undoBtn")?.addEventListener("click", undoLastAction);
  $("#swapBtn")?.addEventListener("click", swapStrike);
  $("#saveBtn")?.addEventListener("click", saveNow);
  $("#endMatchBtn")?.addEventListener("click", endMatch);
  $("#startSecondInningsBtn")?.addEventListener(
    "click",
    startSecondInnings
  );

  $("#nextMatchBtn")?.addEventListener("click", () => {
    location.href = `schedule.html?id=${encodeURIComponent(tournamentId)}`;
  });

  $("#strikerSelect")?.addEventListener("change", event => {
    const name = event.target.value;

    if (name && name === scoreState.nonStriker.name) {
      showMessage("Striker and non-striker must be different players.", "warning");
      event.target.value = scoreState.striker.name || "";
      return;
    }

    scoreState.striker.name = name;
    ensurePlayerStats(name);
    refreshUI();
    scheduleSave();
  });

  $("#nonStrikerSelect")?.addEventListener("change", event => {
    const name = event.target.value;

    if (name && name === scoreState.striker.name) {
      showMessage("Striker and non-striker must be different players.", "warning");
      event.target.value = scoreState.nonStriker.name || "";
      return;
    }

    scoreState.nonStriker.name = name;
    ensurePlayerStats(name);
    refreshUI();
    scheduleSave();
  });

  $("#bowlerSelect")?.addEventListener("change", event => {
    const name = event.target.value;

    if (name && name === scoreState.bowler.name) return;

    if (name) {
      snapshotForUndo();
      scoreState.bowler = scoreState.bowlingStats[name]
        ? clone(scoreState.bowlingStats[name])
        : createBowler(name);

      ensureBowlerStats(name);
      refreshUI();
      scheduleSave();
    }
  });

  $("#dismissalCancel")?.addEventListener("click", () => {
    const dialog = $("#dismissalDialog");
    if (dialog) dialog.style.display = "none";
  });

  $("#dismissalConfirm")?.addEventListener("click", () => {
    const type = $("#dismissalType")?.value;
    const batter = $("#dismissedBatter")?.value;

    if (type && batter) recordDismissal(type, batter);
  });
}

function setupNavigation() {
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
setupNavigation();

showMessage("Loading APL scorecard...", "info");
loadTournamentAndMatch();
