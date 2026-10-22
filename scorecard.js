
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ======================================================
   APL TOURNAMENT PLATFORM — SCORECARD
   Registered player dropdowns + existing scoring
====================================================== */

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

let tournamentId =
  params.get("id") ||
  params.get("tournamentId") ||
  localStorage.getItem("selectedTournamentId") ||
  localStorage.getItem("tournamentId") ||
  sessionStorage.getItem("selectedTournamentId") ||
  sessionStorage.getItem("tournamentId") ||
  sessionStorage.getItem("aplTournamentId") ||
  localStorage.getItem("aplTournamentId") || "";

let matchId =
  params.get("matchId") ||
  params.get("match") ||
  sessionStorage.getItem("selectedMatchId") ||
  localStorage.getItem("selectedMatchId") ||
  sessionStorage.getItem("matchId") ||
  localStorage.getItem("matchId") ||
  sessionStorage.getItem("aplMatchId") ||
  localStorage.getItem("aplMatchId") || "";

let tournamentData = {};
let currentMatch = {};
let currentMatchRef = null;

let team1Id = "";
let team2Id = "";
let team1Players = [];
let team2Players = [];

let saving = false;
let saveAgain = false;
let history = [];

const BOWLER_CREDIT_DISMISSALS = new Set([
  "Bowled", "Caught", "LBW", "Stumped",
  "Hit Wicket", "Caught and Bowled"
]);

const DISMISSAL_OPTIONS = [
  "Bowled", "Caught", "LBW", "Run Out", "Stumped",
  "Hit Wicket", "Caught and Bowled", "Retired Hurt",
  "Retired Out", "Obstructing the Field", "Timed Out",
  "Hit the Ball Twice"
];

/* ---------------- Helpers ---------------- */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function showMessage(message) {
  console.log("[APL Scorecard]", message);

  let el = $("scoringMessage");

  if (!el) {
    el = document.createElement("div");
    el.id = "scoringMessage";
    el.setAttribute("role", "status");

    Object.assign(el.style, {
      position: "fixed",
      left: "50%",
      bottom: "18px",
      transform: "translateX(-50%)",
      zIndex: "20000",
      maxWidth: "90%",
      padding: "11px 16px",
      background: "#172033",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      boxShadow: "0 4px 16px #0003",
      textAlign: "center"
    });

    document.body.appendChild(el);
  }

  el.textContent = message;
  el.style.display = "block";

  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.style.display = "none";
  }, 3500);
}

function oversText(balls) {
  balls = Math.max(0, Math.floor(num(balls)));
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(runs, balls) {
  return balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
}

function economy(runs, balls) {
  return balls > 0 ? ((runs * 6) / balls).toFixed(2) : "0.00";
}

function createBatter(name = "New Batter") {
  return {
    name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false
  };
}

function createBowler(name = "Bowler") {
  return { name, runs: 0, balls: 0, wickets: 0 };
}

function createExtras() {
  return { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
}

function createInitialState() {
  return {
    innings: 1,
    battingTeam: "A",
    runs: 0,
    wickets: 0,
    balls: 0,
    currentOverRuns: [],
    striker: createBatter("Striker"),
    nonStriker: createBatter("Non-Striker"),
    bowler: createBowler(),
    extras: createExtras(),
    totalFours: 0,
    totalSixes: 0,
    dismissals: [],
    status: "Live"
  };
}

let scoreState = createInitialState();

function normalizeBatter(value, fallback) {
  const b = value || {};
  return {
    name: b.name || fallback,
    runs: num(b.runs),
    balls: num(b.balls),
    fours: num(b.fours),
    sixes: num(b.sixes),
    out: Boolean(b.out)
  };
}

function normalizeBowler(value) {
  const b = value || {};
  return {
    name: b.name || "Bowler",
    runs: num(b.runs),
    balls: num(b.balls),
    wickets: num(b.wickets)
  };
}

function normalizeExtras(value) {
  const e = value || {};
  return {
    wides: num(e.wides),
    noBalls: num(e.noBalls),
    byes: num(e.byes),
    legByes: num(e.legByes),
    total: num(e.total)
  };
}

/* ---------------- Team names and players ---------------- */

function teamName(side) {
  if (side === "A") {
    return currentMatch.team1Name ||
      currentMatch.teamAName ||
      currentMatch.teamA ||
      currentMatch.team1 ||
      tournamentData.teamAName ||
      "Team A";
  }

  return currentMatch.team2Name ||
    currentMatch.teamBName ||
    currentMatch.teamB ||
    currentMatch.team2 ||
    tournamentData.teamBName ||
    "Team B";
}

function getPlayerNames(teamData) {
  const raw = Array.isArray(teamData?.players) ? teamData.players : [];

  return [...new Set(raw.map(player => {
    if (typeof player === "string") return player.trim();

    if (player && typeof player === "object") {
      return String(player.name || player.playerName || "").trim();
    }

    return "";
  }).filter(Boolean))];
}

function battingPlayers() {
  return scoreState.battingTeam === "A" ? team1Players : team2Players;
}

function bowlingPlayers() {
  return scoreState.battingTeam === "A" ? team2Players : team1Players;
}

function sideForTeamId(id) {
  if (id && id === team1Id) return "A";
  if (id && id === team2Id) return "B";
  return "";
}

async function loadMatchPlayers() {
  team1Id = currentMatch.team1Id || "";
  team2Id = currentMatch.team2Id || "";

  if (!team1Id || !team2Id) {
    showMessage("Match में team1Id/team2Id नहीं मिला।");
    team1Players = [];
    team2Players = [];
    return;
  }

  const [snap1, snap2] = await Promise.all([
    getDoc(doc(db, "tournaments", tournamentId, "teams", team1Id)),
    getDoc(doc(db, "tournaments", tournamentId, "teams", team2Id))
  ]);

  if (!snap1.exists() || !snap2.exists()) {
    throw new Error("Match की दोनों टीमों का record नहीं मिला।");
  }

  team1Players = getPlayerNames(snap1.data());
  team2Players = getPlayerNames(snap2.data());

  if (!team1Players.length || !team2Players.length) {
    showMessage("किसी टीम में registered players की list खाली है।");
  }
}

/* ---------------- Firebase loading ---------------- */

function rememberIds() {
  if (tournamentId) {
    for (const store of [localStorage, sessionStorage]) {
      store.setItem("selectedTournamentId", tournamentId);
      store.setItem("tournamentId", tournamentId);
      store.setItem("aplTournamentId", tournamentId);
    }
  }

  if (matchId) {
    for (const store of [localStorage, sessionStorage]) {
      store.setItem("selectedMatchId", matchId);
      store.setItem("matchId", matchId);
      store.setItem("aplMatchId", matchId);
    }
  }
}

async function loadTournamentAndMatch() {
  if (!tournamentId) {
    showMessage("Tournament ID नहीं मिला। Tournament से Scorecard खोलें।");
    return false;
  }

  const tournamentSnap = await getDoc(
    doc(db, "tournaments", tournamentId)
  );

  if (!tournamentSnap.exists()) {
    showMessage("Tournament नहीं मिला।");
    return false;
  }

  tournamentData = tournamentSnap.data() || {};

  if (matchId) {
    currentMatchRef = doc(
      db, "tournaments", tournamentId, "matches", matchId
    );

    const matchSnap = await getDoc(currentMatchRef);

    if (!matchSnap.exists()) {
      showMessage("Match नहीं मिला।");
      return false;
    }

    currentMatch = matchSnap.data() || {};
  } else {
    const matchesSnap = await getDocs(
      collection(db, "tournaments", tournamentId, "matches")
    );

    if (matchesSnap.empty) {
      showMessage("इस tournament में कोई match नहीं है।");
      return false;
    }

    const first = matchesSnap.docs[0];
    matchId = first.id;
    currentMatchRef = first.ref;
    currentMatch = first.data() || {};
  }

  await loadMatchPlayers();
  rememberIds();

  const saved = currentMatch.scorecard;

  if (saved && typeof saved === "object") {
    scoreState = {
      ...createInitialState(),
      ...saved,
      runs: num(saved.runs),
      wickets: num(saved.wickets),
      balls: num(saved.balls),
      striker: normalizeBatter(saved.striker, "Striker"),
      nonStriker: normalizeBatter(saved.nonStriker, "Non-Striker"),
      bowler: normalizeBowler(saved.bowler),
      extras: normalizeExtras(saved.extras),
      currentOverRuns: Array.isArray(saved.currentOverRuns)
        ? saved.currentOverRuns : [],
      dismissals: Array.isArray(saved.dismissals) ? saved.dismissals : [],
      totalFours: num(saved.totalFours),
      totalSixes: num(saved.totalSixes)
    };
  } else {
    scoreState = createInitialState();
  }

  // For older matches, use the saved innings side if available.
  const savedSide = sideForTeamId(
    scoreState.battingTeam === "A" ? team1Id : team2Id
  );

  if (savedSide) scoreState.battingTeam = savedSide;

  displayMatch();
  renderScorecard();
  return true;
}

/* ---------------- Player selectors ---------------- */

function ensureSelect(id, label, anchorId) {
  let select = $(id);
  if (select) return select;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "margin:10px 0;";

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  labelEl.style.cssText = "display:block;margin-bottom:5px;font-weight:600;";

  select = document.createElement("select");
  select.id = id;
  select.style.cssText =
    "width:100%;max-width:100%;padding:10px;border-radius:6px;";

  wrapper.append(labelEl, select);

  const anchor = $(anchorId) || $("matchInfo") || document.body;
  anchor.insertAdjacentElement("afterend", wrapper);

  return select;
}

function fillSelect(select, names, selectedName, placeholder) {
  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  if (names.includes(selectedName)) {
    select.value = selectedName;
  } else {
    select.value = "";
  }
}

function syncPlayerSelectors() {
  const batters = battingPlayers();
  const bowlers = bowlingPlayers();

  const strikerSelect = ensureSelect(
    "strikerPlayerSelect", "Striker", "matchInfo"
  );

  const nonStrikerSelect = ensureSelect(
    "nonStrikerPlayerSelect", "Non-Striker", "strikerPlayerSelect"
  );

  const bowlerSelect = ensureSelect(
    "bowlerPlayerSelect", "Bowler (opposition)", "nonStrikerPlayerSelect"
  );

  fillSelect(
    strikerSelect, batters,
    scoreState.striker.name, "Select striker"
  );

  fillSelect(
    nonStrikerSelect, batters,
    scoreState.nonStriker.name, "Select non-striker"
  );

  fillSelect(
    bowlerSelect, bowlers,
    scoreState.bowler.name, "Select bowler"
  );

  strikerSelect.onchange = () => {
    if (!strikerSelect.value) return;

    scoreState.striker.name = strikerSelect.value;
    renderScorecard();
    saveInBackground();
  };

  nonStrikerSelect.onchange = () => {
    if (!nonStrikerSelect.value) return;

    scoreState.nonStriker.name = nonStrikerSelect.value;
    renderScorecard();
    saveInBackground();
  };

  bowlerSelect.onchange = () => {
    if (!bowlerSelect.value) return;

    scoreState.bowler.name = bowlerSelect.value;
    renderScorecard();
    saveInBackground();
  };
}

function updateBatterSelectsAfterWicket() {
  syncPlayerSelectors();
}

/* ---------------- Display and rendering ---------------- */

function battingTeamName() {
  return teamName(scoreState.battingTeam);
}

function scoreForSide(side) {
  if (scoreState.battingTeam === side) return scoreState.runs;

  const first = currentMatch.innings1;

  if (first && first.battingTeam === side) return num(first.runs);

  return side === "A" ? num(currentMatch.scoreA) : num(currentMatch.scoreB);
}

function wicketsForSide(side) {
  if (scoreState.battingTeam === side) return scoreState.wickets;

  const first = currentMatch.innings1;

  if (first && first.battingTeam === side) return num(first.wickets);

  return 0;
}

function displayMatch() {
  setText("matchId", matchId || "—");
  setText(
    "matchInfo",
    currentMatch.matchName ||
      currentMatch.name ||
      currentMatch.title ||
      `${teamName("A")} vs ${teamName("B")}`
  );
  setText("battingTeam", battingTeamName());

  const statusEl = $("matchStatus");
  if (statusEl) statusEl.textContent = scoreState.status || "Live";
}

function renderCurrentOver() {
  const container = $("currentOver");
  if (!container) return;

  container.replaceChildren();

  if (!scoreState.currentOverRuns.length) {
    container.textContent = "No balls yet";
    return;
  }

  scoreState.currentOverRuns.forEach(value => {
    const item = document.createElement("span");
    item.textContent = value;
    item.style.cssText =
      "display:inline-block;margin:3px;padding:5px 8px;border-radius:6px;background:#e2e8f0;color:#0f172a;";
    container.appendChild(item);
  });
}

function renderDismissalHistory() {
  const container = $("dismissalHistory");
  if (!container) return;

  container.replaceChildren();

  if (!scoreState.dismissals.length) {
    container.textContent = "No wickets recorded yet.";
    return;
  }

  scoreState.dismissals.forEach(item => {
    const row = document.createElement("div");
    row.textContent = [
      `${item.batterName} — ${item.type}`,
      item.catcher ? `Catch: ${item.catcher}` : "",
      item.wicketkeeper ? `Keeper: ${item.wicketkeeper}` : "",
      item.runOutFielder ? `Run out by: ${item.runOutFielder}` : "",
      item.runOutAssist ? `Assist: ${item.runOutAssist}` : "",
      item.bowler ? `Bowler: ${item.bowler}` : ""
    ].filter(Boolean).join(" | ");

    row.style.cssText = "padding:8px;margin:5px 0;border-bottom:1px solid #e2e8f0;";
    container.appendChild(row);
  });
}

function updateButtonStates() {
  const locked = !currentMatchRef ||
    scoreState.status === "Completed" ||
    scoreState.status === "Innings Completed";

  document.querySelectorAll(
    ".run-btn,#wideBtn,#noBallBtn,#byeBtn,#legByeBtn,#wicketBtn"
  ).forEach(button => {
    button.disabled = locked;
  });
}

function renderScorecard() {
  setText("score", `${scoreState.runs}/${scoreState.wickets}`);
  setText("overs", oversText(scoreState.balls));
  setText(
    "crr",
    scoreState.balls > 0
      ? ((scoreState.runs * 6) / scoreState.balls).toFixed(2)
      : "0.00"
  );

  setText("battingTeam", battingTeamName());

  setText("strikerRuns", scoreState.striker.runs);
  setText("strikerBalls", scoreState.striker.balls);
  setText("strikerSR", strikeRate(scoreState.striker.runs, scoreState.striker.balls));
  setText("strikerName", scoreState.striker.name);
  setText("strikerFours", scoreState.striker.fours);
  setText("strikerSixes", scoreState.striker.sixes);

  setText("nonStrikerRuns", scoreState.nonStriker.runs);
  setText("nonStrikerBalls", scoreState.nonStriker.balls);
  setText("nonStrikerSR", strikeRate(scoreState.nonStriker.runs, scoreState.nonStriker.balls));
  setText("nonStrikerName", scoreState.nonStriker.name);
  setText("nonStrikerFours", scoreState.nonStriker.fours);
  setText("nonStrikerSixes", scoreState.nonStriker.sixes);

  setText("bowlerName", scoreState.bowler.name);
  setText("bowlerOvers", oversText(scoreState.bowler.balls));
  setText("bowlerRuns", scoreState.bowler.runs);
  setText("bowlerWickets", scoreState.bowler.wickets);
  setText("bowlerEconomy", economy(scoreState.bowler.runs, scoreState.bowler.balls));

  setText("totalFours", scoreState.totalFours);
  setText("totalSixes", scoreState.totalSixes);
  setText("extrasTotal", scoreState.extras.total);
  setText("widesTotal", scoreState.extras.wides);
  setText("noBallsTotal", scoreState.extras.noBalls);
  setText("byesTotal", scoreState.extras.byes);
  setText("legByesTotal", scoreState.extras.legByes);

  setText("scoreA", `${scoreForSide("A")}/${wicketsForSide("A")}`);
  setText("scoreB", `${scoreForSide("B")}/${wicketsForSide("B")}`);

  renderCurrentOver();
  renderDismissalHistory();
  displayMatch();
  updateButtonStates();
  syncPlayerSelectors();
}

/* ---------------- Undo ---------------- */

function saveHistory() {
  history.push(clone(scoreState));
  if (history.length > 100) history.shift();
}

async function undoLastBall() {
  if (!history.length) {
    showMessage("इस session में Undo history उपलब्ध नहीं है।");
    return;
  }

  scoreState = history.pop();
  renderScorecard();

  try {
    await autoSave();
    showMessage("Last action Undo हो गई।");
  } catch (error) {
    console.error(error);
    showMessage("Undo हुआ, लेकिन Firebase save failed हुआ।");
  }
}

/* ---------------- Ball helpers ---------------- */

function recordBallDisplay(value) {
  scoreState.currentOverRuns.push(String(value));
}

function swapBattersInternal() {
  [scoreState.striker, scoreState.nonStriker] =
    [scoreState.nonStriker, scoreState.striker];
}

function finishOverIfNeeded() {
  if (scoreState.balls > 0 && scoreState.balls % 6 === 0) {
    scoreState.currentOverRuns = [];
    swapBattersInternal();
    showMessage("Over पूरा हुआ। Strike बदल दी गई है।");
  }
}

function canScore() {
  if (!currentMatchRef) {
    showMessage("Match अभी load नहीं हुआ।");
    return false;
  }

  if (["Completed", "Innings Completed"].includes(scoreState.status)) {
    showMessage("यह innings समाप्त हो चुकी है।");
    return false;
  }

  if (scoreState.wickets >= 10) {
    showMessage("10 wickets गिर चुके हैं।");
    return false;
  }

  return true;
}

/* ---------------- Normal runs ---------------- */

async function addRuns(value) {
  const runs = Number(value);

  if (!Number.isInteger(runs) || runs < 0 || runs > 7 || !canScore()) return;

  saveHistory();

  scoreState.runs += runs;
  scoreState.balls += 1;
  scoreState.striker.runs += runs;
  scoreState.striker.balls += 1;
  scoreState.bowler.runs += runs;
  scoreState.bowler.balls += 1;

  if (runs === 4) {
    scoreState.striker.fours++;
    scoreState.totalFours++;
  }

  if (runs === 6) {
    scoreState.striker.sixes++;
    scoreState.totalSixes++;
  }

  recordBallDisplay(runs === 0 ? "•" : runs);

  if (runs % 2 === 1) swapBattersInternal();

  finishOverIfNeeded();
  renderScorecard();
  saveInBackground();
}

/* ---------------- Extras ---------------- */

async function addExtra(type, amount = 1) {
  if (!canScore()) return;

  amount = Number(amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 7) amount = 1;

  if (!["wide", "noBall", "bye", "legBye"].includes(type)) return;

  saveHistory();

  if (type === "wide") {
    scoreState.runs += amount;
    scoreState.extras.wides += amount;
    scoreState.extras.total += amount;
    scoreState.bowler.runs += amount;
    recordBallDisplay(amount === 1 ? "Wd" : `Wd+${amount - 1}`);

    if ((amount - 1) % 2 === 1) swapBattersInternal();
  }

  if (type === "noBall") {
    scoreState.runs++;
    scoreState.extras.noBalls++;
    scoreState.extras.total++;
    scoreState.bowler.runs++;
    recordBallDisplay("Nb");
  }

  if (type === "bye" || type === "legBye") {
    scoreState.runs += amount;
    scoreState.extras[type === "bye" ? "byes" : "legByes"] += amount;
    scoreState.extras.total += amount;
    scoreState.balls++;
    scoreState.bowler.balls++;
    scoreState.striker.balls++;

    recordBallDisplay(type === "bye"
      ? (amount === 1 ? "B" : `B${amount}`)
      : (amount === 1 ? "Lb" : `Lb${amount}`));

    if (amount % 2 === 1) swapBattersInternal();
  }

  finishOverIfNeeded();
  renderScorecard();
  saveInBackground();
}

/* ---------------- Wicket dialog ---------------- */

function createDismissalForm() {
  let modal = $("dismissalModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dismissalModal";
  modal.style.cssText =
    "position:fixed;inset:0;background:#000b;z-index:20000;display:none;align-items:center;justify-content:center;padding:16px;overflow:auto;";

  modal.innerHTML = `
    <form id="dismissalForm" style="background:#fff;color:#172033;width:100%;max-width:480px;padding:22px;border-radius:14px;box-sizing:border-box;display:grid;gap:11px;max-height:92vh;overflow:auto">
      <h2 style="margin:0">🏏 Record Wicket</h2>

      <label for="dismissalType">Dismissal Type</label>
      <select id="dismissalType" required style="padding:10px">
        ${DISMISSAL_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>

      <label for="dismissedBatter">Dismissed Batter</label>
      <select id="dismissedBatter" required style="padding:10px">
        <option value="striker">Striker</option>
        <option value="nonStriker">Non-Striker</option>
      </select>

      <label for="dismissedBatterName">Batter</label>
      <select id="dismissedBatterName" required style="padding:10px"></select>

      <div id="catcherGroup" style="display:none">
        <label for="catcherName">Catch Taken By</label>
        <select id="catcherName" style="width:100%;padding:10px"></select>
      </div>

      <div id="runOutGroup" style="display:none">
        <label for="runOutFielder">Run Out By</label>
        <select id="runOutFielder" style="width:100%;padding:10px"></select>
        <label for="runOutAssist">Assist By (optional)</label>
        <select id="runOutAssist" style="width:100%;padding:10px"></select>
      </div>

      <div id="keeperGroup" style="display:none">
        <label for="keeperName">Wicketkeeper</label>
        <select id="keeperName" style="width:100%;padding:10px"></select>
      </div>

      <div id="otherDetailsGroup" style="display:none">
        <label for="otherDismissalDetails">Additional Details</label>
        <input id="otherDismissalDetails" placeholder="Optional details" style="padding:10px">
      </div>

      <label for="dismissalBowler">Bowler</label>
      <select id="dismissalBowler" required style="padding:10px"></select>

      <label for="wicketDeliveryType">Delivery Type</label>
      <select id="wicketDeliveryType" style="padding:10px">
        <option value="legal">Legal delivery</option>
        <option value="wide">Wide delivery</option>
        <option value="noBall">No-ball delivery</option>
      </select>

      <div id="wicketExtraRunsGroup" style="display:none">
        <label for="wicketExtraRuns">Additional runs</label>
        <input id="wicketExtraRuns" type="number" min="0" max="6" value="0" style="padding:10px">
      </div>

      <p id="dismissalCreditNote" style="font-size:13px;color:#475569;margin:0"></p>

      <div style="display:flex;gap:10px">
        <button type="button" id="cancelDismissal" style="flex:1;padding:11px">Cancel</button>
        <button type="submit" style="flex:1;padding:11px;background:#15803d;color:white;border:0;border-radius:7px;font-weight:bold">Save Wicket</button>
      </div>
    </form>`;

  document.body.appendChild(modal);
  return modal;
}

function fillNamedSelect(id, names, placeholder, selected = "") {
  const select = $(id);
  if (!select) return;

  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  if (names.includes(selected)) select.value = selected;
}

function updateDismissalFields() {
  const type = $("dismissalType").value;
  const delivery = $("wicketDeliveryType").value;

  $("catcherGroup").style.display = type === "Caught" ? "block" : "none";
  $("runOutGroup").style.display = type === "Run Out" ? "block" : "none";
  $("keeperGroup").style.display = type === "Stumped" ? "block" : "none";

  $("otherDetailsGroup").style.display = [
    "Retired Hurt", "Retired Out", "Obstructing the Field",
    "Timed Out", "Hit the Ball Twice"
  ].includes(type) ? "block" : "none";

  $("catcherName").required = type === "Caught";
  $("runOutFielder").required = type === "Run Out";
  $("keeperName").required = type === "Stumped";

  $("wicketExtraRunsGroup").style.display =
    delivery === "legal" ? "none" : "block";

  if (type === "Caught and Bowled") {
    $("dismissalCreditNote").textContent =
      "Bowler is also the catcher and receives wicket credit.";
  } else if (BOWLER_CREDIT_DISMISSALS.has(type)) {
    $("dismissalCreditNote").textContent =
      "Bowler receives credit for this dismissal.";
  } else {
    $("dismissalCreditNote").textContent =
      "Bowler does not receive credit for this dismissal.";
  }
}

function openDismissalForm() {
  if (!canScore()) return;

  createDismissalForm();

  $("dismissalType").value = "Caught";
  $("dismissedBatter").value = "striker";
  $("wicketDeliveryType").value = "legal";
  $("wicketExtraRuns").value = "0";
  $("otherDismissalDetails").value = "";

  fillNamedSelect(
    "dismissedBatterName",
    [scoreState.striker.name, scoreState.nonStriker.name].filter(Boolean),
    "Select dismissed batter",
    scoreState.striker.name
  );

  const fielders = [...new Set([...team1Players, ...team2Players])];
  fillNamedSelect("catcherName", fielders, "Select catcher");
  fillNamedSelect("runOutFielder", fielders, "Select fielder");
  fillNamedSelect("runOutAssist", fielders, "Select assist (optional)");
  fillNamedSelect("keeperName", fielders, "Select wicketkeeper");
  fillNamedSelect(
    "dismissalBowler",
    bowlingPlayers(),
    "Select bowler",
    scoreState.bowler.name
  );

  $("dismissalType").onchange = updateDismissalFields;
  $("wicketDeliveryType").onchange = updateDismissalFields;

  $("dismissedBatter").onchange = () => {
    const key = $("dismissedBatter").value;
    $("dismissedBatterName").value = scoreState[key]?.name || "";
  };

  $("dismissalBowler").onchange = () => {
    if ($("dismissalType").value === "Caught and Bowled") {
      $("catcherName").value = $("dismissalBowler").value;
    }
  };

  $("cancelDismissal").onclick = () => {
    $("dismissalModal").style.display = "none";
  };

  updateDismissalFields();
  $("dismissalModal").style.display = "flex";

  $("dismissalForm").onsubmit = async event => {
    event.preventDefault();

    const type = $("dismissalType").value;
    const batterKey = $("dismissedBatter").value;
    const batterName = $("dismissedBatterName").value;
    const bowlerName = $("dismissalBowler").value;
    const deliveryType = $("wicketDeliveryType").value;
    const extraRuns = Math.max(
      0, Math.min(6, Math.floor(num($("wicketExtraRuns").value)))
    );

    if (!batterName || !bowlerName) {
      showMessage("Batter और bowler चुनें।");
      return;
    }

    const details = {
      type,
      batterKey,
      batterName,
      bowler: bowlerName,
      catcher: type === "Caught and Bowled"
        ? bowlerName : $("catcherName").value,
      runOutFielder: $("runOutFielder").value,
      runOutAssist: $("runOutAssist").value,
      wicketkeeper: $("keeperName").value,
      otherDetails: $("otherDismissalDetails").value.trim(),
      bowlerCredited: BOWLER_CREDIT_DISMISSALS.has(type),
      deliveryType,
      extraRuns,
      innings: scoreState.innings,
      runsAtDismissal: scoreState.runs,
      timestamp: new Date().toISOString()
    };

    if (type === "Caught" && !details.catcher) {
      showMessage("Catcher चुनें।");
      return;
    }

    if (type === "Run Out" && !details.runOutFielder) {
      showMessage("Run-out fielder चुनें।");
      return;
    }

    if (type === "Stumped" && !details.wicketkeeper) {
      showMessage("Wicketkeeper चुनें।");
      return;
    }

    $("dismissalModal").style.display = "none";
    await recordDismissal(details);
  };
}

/* ---------------- Record wicket ---------------- */

async function recordDismissal(details) {
  if (!canScore()) return;

  const batter = scoreState[details.batterKey];
  if (!batter) {
    showMessage("Dismissed batter नहीं मिला।");
    return;
  }

  saveHistory();

  batter.name = details.batterName;
  batter.out = true;
  scoreState.wickets++;
  scoreState.bowler.name = details.bowler;

  if (details.deliveryType === "wide") {
    const runs = 1 + details.extraRuns;

    scoreState.runs += runs;
    scoreState.extras.wides += runs;
    scoreState.extras.total += runs;
    scoreState.bowler.runs += runs;

    recordBallDisplay(details.extraRuns ? `Wd+${details.extraRuns}` : "Wd");
  } else if (details.deliveryType === "noBall") {
    const runs = 1 + details.extraRuns;

    scoreState.runs += runs;
    scoreState.extras.noBalls++;
    scoreState.extras.total++;
    scoreState.bowler.runs += runs;

    recordBallDisplay(details.extraRuns ? `Nb+${details.extraRuns}` : "Nb");
  } else {
    scoreState.balls++;
    scoreState.bowler.balls++;
    recordBallDisplay("W");
  }

  if (details.bowlerCredited) scoreState.bowler.wickets++;

  details.over = oversText(scoreState.balls);
  scoreState.dismissals.push(details);
  scoreState[details.batterKey] = createBatter("New Batter");

  if (scoreState.wickets >= 10) scoreState.status = "Innings Completed";

  finishOverIfNeeded();
  renderScorecard();

  try {
    await autoSave();
    showMessage(`${details.batterName} out: ${details.type}. Score saved.`);
  } catch (error) {
    console.error(error);
    showMessage("Wicket दर्ज हुआ, लेकिन Firebase save failed हुआ।");
  }
}

/* ---------------- Swap strike ---------------- */

async function swapBatters() {
  if (!canScore()) return;

  saveHistory();
  swapBattersInternal();
  renderScorecard();
  saveInBackground();
}

/* ---------------- Save to Firebase ---------------- */

function makeInningsSnapshot() {
  return {
    innings: scoreState.innings,
    battingTeam: scoreState.battingTeam,
    runs: scoreState.runs,
    wickets: scoreState.wickets,
    balls: scoreState.balls,
    overs: oversText(scoreState.balls),
    striker: clone(scoreState.striker),
    nonStriker: clone(scoreState.nonStriker),
    bowler: clone(scoreState.bowler),
    extras: clone(scoreState.extras),
    totalFours: scoreState.totalFours,
    totalSixes: scoreState.totalSixes,
    currentOverRuns: clone(scoreState.currentOverRuns),
    dismissals: clone(scoreState.dismissals || []),
    status: scoreState.status
  };
}

function makeSavePayload() {
  const snapshot = makeInningsSnapshot();

  const payload = {
    scorecard: snapshot,
    innings: scoreState.innings,
    currentRuns: scoreState.runs,
    currentWickets: scoreState.wickets,
    currentOvers: oversText(scoreState.balls),
    currentBall: scoreState.balls,
    totalRuns: scoreState.runs,
    totalWickets: scoreState.wickets,
    updatedAt: serverTimestamp()
  };

  if (scoreState.battingTeam === "A") {
    payload.scoreA = `${scoreState.runs}/${scoreState.wickets}`;
  } else {
    payload.scoreB = `${scoreState.runs}/${scoreState.wickets}`;
  }

  return payload;
}

async function autoSave() {
  if (!currentMatchRef) throw new Error("Match reference is not ready.");

  if (saving) {
    saveAgain = true;
    return;
  }

  saving = true;

  try {
    do {
      saveAgain = false;
      const payload = makeSavePayload();

      await updateDoc(currentMatchRef, payload);

      currentMatch = {
        ...currentMatch,
        ...payload,
        scorecard: makeInningsSnapshot()
      };
    } while (saveAgain);
  } finally {
    saving = false;
  }
}

function saveInBackground() {
  autoSave().catch(error => {
    console.error("Score save failed:", error);
    showMessage("Score save नहीं हुआ। Internet और Firebase rules जाँचें।");
  });
}

async function manualSave() {
  try {
    await autoSave();
    showMessage("Score Firebase में save हो गया।");
  } catch (error) {
    console.error(error);
    showMessage("Save failed। Firebase connection जाँचें।");
  }
}

/* ---------------- Innings management ---------------- */

async function startSecondInnings() {
  if (!currentMatchRef) return;

  if (scoreState.innings !== 1) {
    showMessage("Second innings पहले से शुरू है।");
    return;
  }

  if (
    scoreState.balls === 0 &&
    scoreState.runs === 0 &&
    scoreState.wickets === 0 &&
    !confirm("पहली innings खाली है। क्या फिर भी आगे बढ़ना है?")
  ) return;

  const firstInnings = makeInningsSnapshot();
  const firstSide = scoreState.battingTeam;
  const secondSide = firstSide === "A" ? "B" : "A";

  scoreState = {
    ...createInitialState(),
    innings: 2,
    battingTeam: secondSide,
    status: "Live"
  };

  history = [];

  try {
    await updateDoc(currentMatchRef, {
      innings1: firstInnings,
      innings: 2,
      scorecard: makeInningsSnapshot(),
      currentRuns: 0,
      currentWickets: 0,
      currentOvers: "0.0",
      currentBall: 0,
      scoreA: firstSide === "A"
        ? `${firstInnings.runs}/${firstInnings.wickets}`
        : (currentMatch.scoreA || "0/0"),
      scoreB: firstSide === "B"
        ? `${firstInnings.runs}/${firstInnings.wickets}`
        : (currentMatch.scoreB || "0/0"),
      updatedAt: serverTimestamp()
    });

    currentMatch.innings1 = firstInnings;
    currentMatch.scoreA = firstSide === "A"
      ? `${firstInnings.runs}/${firstInnings.wickets}`
      : (currentMatch.scoreA || "0/0");
    currentMatch.scoreB = firstSide === "B"
      ? `${firstInnings.runs}/${firstInnings.wickets}`
      : (currentMatch.scoreB || "0/0");

    renderScorecard();
    showMessage("Second innings शुरू हो गई।");
  } catch (error) {
    console.error(error);
    showMessage("Second innings save नहीं हुई।");
  }
}

function calculateWinner() {
  const first = currentMatch.innings1;

  if (!first) {
    return { winner: "", result: "First innings score उपलब्ध नहीं है।" };
  }

  const firstRuns = num(first.runs);
  const secondRuns = num(scoreState.runs);

  if (firstRuns === secondRuns) {
    return { winner: "", result: "Match Tied" };
  }

  if (secondRuns > firstRuns) {
    return {
      winner: teamName(scoreState.battingTeam),
      result: `${teamName(scoreState.battingTeam)} won by ${Math.max(0, 10 - scoreState.wickets)} wickets`
    };
  }

  return {
    winner: teamName(first.battingTeam),
    result: `${teamName(first.battingTeam)} won by ${firstRuns - secondRuns} runs`
  };
}

async function endMatch() {
  if (!currentMatchRef) return;

  if (scoreState.innings === 1) {
    if (!confirm("First innings समाप्त करें?")) return;

    scoreState.status = "Innings Completed";
    const firstInnings = makeInningsSnapshot();

    try {
      await updateDoc(currentMatchRef, {
        innings1: firstInnings,
        scorecard: firstInnings,
        status: "Innings Completed",
        updatedAt: serverTimestamp()
      });

      currentMatch.innings1 = firstInnings;
      currentMatch.status = "Innings Completed";
      renderScorecard();

      showMessage("First innings समाप्त। अब Start Second Innings दबाएँ।");
    } catch (error) {
      console.error(error);
      showMessage("First innings save नहीं हुई।");
    }

    return;
  }

  if (!confirm("Match समाप्त करके result save करें?")) return;

  scoreState.status = "Completed";

  const secondInnings = makeInningsSnapshot();
  const result = calculateWinner();

  try {
    await updateDoc(currentMatchRef, {
      innings2: secondInnings,
      scorecard: secondInnings,
      status: "Completed",
      result: result.result,
      winner: result.winner,
      scoreA: `${scoreForSide("A")}/${wicketsForSide("A")}`,
      scoreB: `${scoreForSide("B")}/${wicketsForSide("B")}`,
      updatedAt: serverTimestamp()
    });

    currentMatch.innings2 = secondInnings;
    currentMatch.status = "Completed";
    currentMatch.result = result.result;
    currentMatch.winner = result.winner;

    renderScorecard();
    showMessage(result.result);
  } catch (error) {
    console.error(error);
    showMessage("Match result save नहीं हुआ।");
  }
}

/* ---------------- Next match ---------------- */

async function openNextMatch() {
  if (!tournamentId) return;

  try {
    const snap = await getDocs(
      collection(db, "tournaments", tournamentId, "matches")
    );

    const matches = snap.docs;
    const index = matches.findIndex(item => item.id === matchId);

    if (index < 0 || index + 1 >= matches.length) {
      showMessage("यह आखिरी match है या कोई अगला match नहीं है।");
      return;
    }

    const next = matches[index + 1];

    location.href =
      `./scorecard.html?id=${encodeURIComponent(tournamentId)}` +
      `&matchId=${encodeURIComponent(next.id)}`;
  } catch (error) {
    console.error(error);
    showMessage("Next match खोलने में समस्या हुई।");
  }
}

/* ---------------- Buttons and navigation ---------------- */

function setupButtons() {
  document.querySelectorAll(".run-btn").forEach(button => {
    button.addEventListener("click", () => addRuns(button.dataset.runs));
  });

  if ($("wideBtn")) $("wideBtn").addEventListener("click", () => addExtra("wide", 1));
  if ($("noBallBtn")) $("noBallBtn").addEventListener("click", () => addExtra("noBall", 1));
  if ($("byeBtn")) $("byeBtn").addEventListener("click", () => addExtra("bye", 1));
  if ($("legByeBtn")) $("legByeBtn").addEventListener("click", () => addExtra("legBye", 1));
  if ($("wicketBtn")) $("wicketBtn").addEventListener("click", openDismissalForm);
  if ($("undoBtn")) $("undoBtn").addEventListener("click", undoLastBall);
  if ($("swapBtn")) $("swapBtn").addEventListener("click", swapBatters);
  if ($("saveBtn")) $("saveBtn").addEventListener("click", manualSave);
  if ($("endMatchBtn")) $("endMatchBtn").addEventListener("click", endMatch);
  if ($("startSecondInningsBtn")) {
    $("startSecondInningsBtn").addEventListener("click", startSecondInnings);
  }
  if ($("nextMatchBtn")) $("nextMatchBtn").addEventListener("click", openNextMatch);

  [
    ["tournamentLink", "tournament.html"],
    ["scheduleLink", "schedule.html"],
    ["resultsLink", "results.html"],
    ["pointsLink", "points.html"]
  ].forEach(([id, page]) => {
    const link = $(id);
    if (link) {
      link.href = `./${page}?id=${encodeURIComponent(tournamentId)}`;
    }
  });
}

/* ---------------- Initialize ---------------- */

async function initScorecard() {
  setupButtons();

  try {
    const loaded = await loadTournamentAndMatch();

    if (!loaded) {
      updateButtonStates();
      return;
    }

    showMessage("APL Scorecard ready");
  } catch (error) {
    console.error("Scorecard initialization failed:", error);
    showMessage("Scorecard load नहीं हुआ। Firebase config, internet और database rules जाँचें।");
  }
}

initScorecard();
