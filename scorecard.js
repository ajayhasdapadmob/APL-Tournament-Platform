
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
   APL TOURNAMENT PLATFORM — COMPLETE SCORECARD
   File: /scorecard.js
   Existing scorecard.html IDs and navigation preserved
====================================================== */

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);

let tournamentId =
  params.get("id") ||
  params.get("tournamentId") ||
  sessionStorage.getItem("aplTournamentId") ||
  localStorage.getItem("aplTournamentId") ||
  "";

let matchId =
  params.get("matchId") ||
  params.get("match") ||
  sessionStorage.getItem("aplMatchId") ||
  localStorage.getItem("aplMatchId") ||
  "";

let tournamentData = {};
let currentMatch = {};
let currentMatchRef = null;

let saving = false;
let saveAgain = false;
let history = [];

const BOWLER_CREDIT_DISMISSALS = new Set([
  "Bowled",
  "Caught",
  "LBW",
  "Stumped",
  "Hit Wicket",
  "Caught and Bowled"
]);

const DISMISSAL_OPTIONS = [
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

/* ---------------- General helpers ---------------- */

function num(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value);
}

function showMessage(message) {
  console.log("[APL Scorecard]", message);

  let element = $("scoringMessage");

  if (!element) {
    element = document.createElement("div");
    element.id = "scoringMessage";
    element.setAttribute("role", "status");

    Object.assign(element.style, {
      position: "fixed",
      left: "50%",
      bottom: "18px",
      transform: "translateX(-50%)",
      zIndex: "20000",
      maxWidth: "90%",
      padding: "11px 16px",
      background: "#172033",
      color: "#ffffff",
      borderRadius: "8px",
      fontSize: "14px",
      boxShadow: "0 4px 16px #0003",
      textAlign: "center"
    });

    document.body.appendChild(element);
  }

  element.textContent = message;
  element.style.display = "block";

  clearTimeout(element._timer);

  element._timer = setTimeout(() => {
    element.style.display = "none";
  }, 3500);
}

function oversText(balls) {
  balls = Math.max(0, Math.floor(num(balls)));
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(runs, balls) {
  return balls > 0
    ? ((runs / balls) * 100).toFixed(2)
    : "0.00";
}

function economy(runs, balls) {
  return balls > 0
    ? ((runs * 6) / balls).toFixed(2)
    : "0.00";
}

/* ---------------- Initial score state ---------------- */

function createBatter(name = "New Batter") {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false
  };
}

function createBowler(name = "Bowler") {
  return {
    name,
    runs: 0,
    balls: 0,
    wickets: 0
  };
}

function createExtras() {
  return {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    total: 0
  };
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
  const batter = value || {};

  return {
    name: batter.name || fallback,
    runs: num(batter.runs),
    balls: num(batter.balls),
    fours: num(batter.fours),
    sixes: num(batter.sixes),
    out: Boolean(batter.out)
  };
}

function normalizeBowler(value) {
  const bowler = value || {};

  return {
    name: bowler.name || "Bowler",
    runs: num(bowler.runs),
    balls: num(bowler.balls),
    wickets: num(bowler.wickets)
  };
}

function normalizeExtras(value) {
  const extras = value || {};

  return {
    wides: num(extras.wides),
    noBalls: num(extras.noBalls),
    byes: num(extras.byes),
    legByes: num(extras.legByes),
    total: num(extras.total)
  };
}

/* ---------------- Team names ---------------- */

function teamName(side) {
  if (side === "A") {
    return (
      currentMatch.teamAName ||
      currentMatch.team1Name ||
      currentMatch.teamA ||
      currentMatch.team1 ||
      currentMatch.team1Id ||
      tournamentData.teamAName ||
      "Team A"
    );
  }

  return (
    currentMatch.teamBName ||
    currentMatch.team2Name ||
    currentMatch.teamB ||
    currentMatch.team2 ||
    currentMatch.team2Id ||
    tournamentData.teamBName ||
    "Team B"
  );
}

function battingTeamName() {
  return teamName(scoreState.battingTeam);
}

function scoreForSide(side) {
  if (scoreState.battingTeam === side) {
    return scoreState.runs;
  }

  const first = currentMatch.innings1;

  if (first && first.battingTeam === side) {
    return num(first.runs);
  }

  return side === "A"
    ? num(currentMatch.scoreA)
    : num(currentMatch.scoreB);
}

function wicketsForSide(side) {
  if (scoreState.battingTeam === side) {
    return scoreState.wickets;
  }

  const first = currentMatch.innings1;

  if (first && first.battingTeam === side) {
    return num(first.wickets);
  }

  return 0;
}

/* ---------------- Load Firebase data ---------------- */

function rememberIds() {
  if (tournamentId) {
    sessionStorage.setItem("aplTournamentId", tournamentId);
    localStorage.setItem("aplTournamentId", tournamentId);
  }

  if (matchId) {
    sessionStorage.setItem("aplMatchId", matchId);
    localStorage.setItem("aplMatchId", matchId);
  }
}

async function loadTournamentAndMatch() {
  if (!tournamentId) {
    showMessage("Tournament ID नहीं मिला। Tournament से Scorecard खोलें।");
    return false;
  }

  const tournamentRef = doc(db, "tournaments", tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);

  if (!tournamentSnap.exists()) {
    showMessage("Tournament नहीं मिला।");
    return false;
  }

  tournamentData = tournamentSnap.data() || {};

  const matchesRef = collection(
    db,
    "tournaments",
    tournamentId,
    "matches"
  );

  if (matchId) {
    currentMatchRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      matchId
    );

    const matchSnap = await getDoc(currentMatchRef);

    if (!matchSnap.exists()) {
      showMessage("Match नहीं मिला।");
      return false;
    }

    currentMatch = matchSnap.data() || {};
  } else {
    const matchesSnap = await getDocs(matchesRef);

    if (matchesSnap.empty) {
      showMessage("इस tournament में कोई match नहीं है।");
      return false;
    }

    const first = matchesSnap.docs[0];

    matchId = first.id;
    currentMatchRef = first.ref;
    currentMatch = first.data() || {};
  }

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
      nonStriker: normalizeBatter(
        saved.nonStriker,
        "Non-Striker"
      ),
      bowler: normalizeBowler(saved.bowler),
      extras: normalizeExtras(saved.extras),
      currentOverRuns: Array.isArray(saved.currentOverRuns)
        ? saved.currentOverRuns
        : [],
      dismissals: Array.isArray(saved.dismissals)
        ? saved.dismissals
        : [],
      totalFours: num(saved.totalFours),
      totalSixes: num(saved.totalSixes)
    };
  } else {
    scoreState = createInitialState();
  }

  displayMatch();
  renderScorecard();

  return true;
}

/* ---------------- Display and rendering ---------------- */

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

  const statusElement = $("matchStatus");
  if (statusElement) {
    statusElement.textContent = scoreState.status || "Live";
  }
}

function renderCurrentOver() {
  const container = $("currentOver");
  if (!container) return;

  container.replaceChildren();

  if (!scoreState.currentOverRuns.length) {
    container.textContent = "No balls yet";
    return;
  }

  scoreState.currentOverRuns.forEach((value) => {
    const item = document.createElement("span");

    item.textContent = value;

    Object.assign(item.style, {
      display: "inline-block",
      margin: "3px",
      padding: "5px 8px",
      borderRadius: "6px",
      background: "#e2e8f0",
      color: "#0f172a"
    });

    container.appendChild(item);
  });
}

function renderDismissalHistory() {
  const container = $("dismissalHistory");

  // Optional existing/new HTML area.
  if (!container) return;

  container.replaceChildren();

  if (!scoreState.dismissals.length) {
    container.textContent = "No wickets recorded yet.";
    return;
  }

  scoreState.dismissals.forEach((item) => {
    const row = document.createElement("div");

    const details = [
      `${item.batterName} — ${item.type}`,
      item.catcher ? `Catch: ${item.catcher}` : "",
      item.wicketkeeper ? `Keeper: ${item.wicketkeeper}` : "",
      item.runOutFielder ? `Run out by: ${item.runOutFielder}` : "",
      item.runOutAssist ? `Assist: ${item.runOutAssist}` : "",
      item.bowler ? `Bowler: ${item.bowler}` : ""
    ].filter(Boolean);

    row.textContent = details.join(" | ");

    Object.assign(row.style, {
      padding: "8px",
      margin: "5px 0",
      borderBottom: "1px solid #e2e8f0"
    });

    container.appendChild(row);
  });
}

function updateButtonStates() {
  const locked =
    !currentMatchRef ||
    scoreState.status === "Completed" ||
    scoreState.status === "Innings Completed";

  document.querySelectorAll(
    ".run-btn, #wideBtn, #noBallBtn, #byeBtn, #legByeBtn, #wicketBtn"
  ).forEach((button) => {
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
  setText(
    "strikerSR",
    strikeRate(scoreState.striker.runs, scoreState.striker.balls)
  );

  setText("nonStrikerRuns", scoreState.nonStriker.runs);
  setText("nonStrikerBalls", scoreState.nonStriker.balls);
  setText(
    "nonStrikerSR",
    strikeRate(
      scoreState.nonStriker.runs,
      scoreState.nonStriker.balls
    )
  );

  setText("strikerName", scoreState.striker.name);
  setText("nonStrikerName", scoreState.nonStriker.name);

  setText("strikerFours", scoreState.striker.fours);
  setText("strikerSixes", scoreState.striker.sixes);
  setText("nonStrikerFours", scoreState.nonStriker.fours);
  setText("nonStrikerSixes", scoreState.nonStriker.sixes);

  setText("bowlerName", scoreState.bowler.name);
  setText("bowlerOvers", oversText(scoreState.bowler.balls));
  setText("bowlerRuns", scoreState.bowler.runs);
  setText("bowlerWickets", scoreState.bowler.wickets);

  setText(
    "bowlerEconomy",
    economy(scoreState.bowler.runs, scoreState.bowler.balls)
  );

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
}

/* ---------------- History / Undo ---------------- */

function saveHistory() {
  history.push(clone(scoreState));

  if (history.length > 100) {
    history.shift();
  }
}

async function undoLastBall() {
  if (!history.length) {
    showMessage(
      "Undo history उपलब्ध नहीं है। Refresh के बाद पुरानी actions Undo नहीं की जा सकतीं।"
    );
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

/* ---------------- Ball / over helpers ---------------- */

function recordBallDisplay(value) {
  scoreState.currentOverRuns.push(String(value));
}

function swapBattersInternal() {
  const temp = scoreState.striker;
  scoreState.striker = scoreState.nonStriker;
  scoreState.nonStriker = temp;
}

function finishOverIfNeeded() {
  if (
    scoreState.balls > 0 &&
    scoreState.balls % 6 === 0
  ) {
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

  if (
    scoreState.status === "Completed" ||
    scoreState.status === "Innings Completed"
  ) {
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

  if (
    !Number.isInteger(runs) ||
    runs < 0 ||
    runs > 7 ||
    !canScore()
  ) {
    return;
  }

  saveHistory();

  scoreState.runs += runs;
  scoreState.balls += 1;

  scoreState.striker.runs += runs;
  scoreState.striker.balls += 1;

  scoreState.bowler.runs += runs;
  scoreState.bowler.balls += 1;

  if (runs === 4) {
    scoreState.striker.fours += 1;
    scoreState.totalFours += 1;
  }

  if (runs === 6) {
    scoreState.striker.sixes += 1;
    scoreState.totalSixes += 1;
  }

  recordBallDisplay(runs === 0 ? "•" : runs);

  if (runs % 2 === 1) {
    swapBattersInternal();
  }

  finishOverIfNeeded();
  renderScorecard();
  saveInBackground();
}

/* ---------------- Extras ---------------- */

async function addExtra(type, amount = 1) {
  if (!canScore()) return;

  amount = Number(amount);

  if (!Number.isInteger(amount) || amount < 1 || amount > 7) {
    amount = 1;
  }

  if (!["wide", "noBall", "bye", "legBye"].includes(type)) {
    return;
  }

  saveHistory();

  if (type === "wide") {
    const total = Math.max(1, amount);

    scoreState.runs += total;
    scoreState.extras.wides += total;
    scoreState.extras.total += total;
    scoreState.bowler.runs += total;

    recordBallDisplay(total === 1 ? "Wd" : `Wd+${total - 1}`);

    if ((total - 1) % 2 === 1) {
      swapBattersInternal();
    }
  }

  if (type === "noBall") {
    scoreState.runs += 1;
    scoreState.extras.noBalls += 1;
    scoreState.extras.total += 1;
    scoreState.bowler.runs += 1;

    recordBallDisplay("Nb");
  }

  if (type === "bye") {
    scoreState.runs += amount;
    scoreState.extras.byes += amount;
    scoreState.extras.total += amount;
    scoreState.balls += 1;
    scoreState.bowler.balls += 1;
    scoreState.striker.balls += 1;

    recordBallDisplay(amount === 1 ? "B" : `B${amount}`);

    if (amount % 2 === 1) {
      swapBattersInternal();
    }
  }

  if (type === "legBye") {
    scoreState.runs += amount;
    scoreState.extras.legByes += amount;
    scoreState.extras.total += amount;
    scoreState.balls += 1;
    scoreState.bowler.balls += 1;
    scoreState.striker.balls += 1;

    recordBallDisplay(amount === 1 ? "Lb" : `Lb${amount}`);

    if (amount % 2 === 1) {
      swapBattersInternal();
    }
  }

  finishOverIfNeeded();
  renderScorecard();
  saveInBackground();
}

/* ---------------- Dynamic dismissal form ---------------- */

function createDismissalForm() {
  let modal = $("dismissalModal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dismissalModal";

  Object.assign(modal.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,.68)",
    zIndex: "20000",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflowY: "auto"
  });

  modal.innerHTML = `
    <form id="dismissalForm"
      style="
        background:#fff;color:#172033;
        width:100%;max-width:480px;
        padding:22px;border-radius:14px;
        box-sizing:border-box;display:grid;
        gap:11px;max-height:92vh;overflow-y:auto
      ">

      <h2 style="margin:0">🏏 Record Wicket</h2>

      <label for="dismissalType">Dismissal Type</label>
      <select id="dismissalType" required style="padding:10px">
        ${DISMISSAL_OPTIONS.map(type =>
          `<option value="${type}">${type}</option>`
        ).join("")}
      </select>

      <label for="dismissedBatter">Dismissed Batter</label>
      <select id="dismissedBatter" required style="padding:10px">
        <option value="striker">Striker</option>
        <option value="nonStriker">Non-Striker</option>
      </select>

      <label for="dismissedBatterName">Batter Name</label>
      <input id="dismissedBatterName" required
        placeholder="Batter name" style="padding:10px">

      <div id="catcherGroup" style="display:none">
        <label for="catcherName">Catch Taken By</label>
        <input id="catcherName" placeholder="Fielder name"
          style="width:100%;box-sizing:border-box;padding:10px">
      </div>

      <div id="runOutGroup" style="display:none">
        <label for="runOutFielder">Run Out By</label>
        <input id="runOutFielder" placeholder="Fielder name"
          style="width:100%;box-sizing:border-box;padding:10px">

        <label for="runOutAssist" style="display:block;margin-top:8px">
          Assist By (optional)
        </label>
        <input id="runOutAssist" placeholder="Second fielder"
          style="width:100%;box-sizing:border-box;padding:10px">
      </div>

      <div id="keeperGroup" style="display:none">
        <label for="keeperName">Wicketkeeper</label>
        <input id="keeperName" placeholder="Wicketkeeper name"
          style="width:100%;box-sizing:border-box;padding:10px">
      </div>

      <div id="otherDetailsGroup" style="display:none">
        <label for="otherDismissalDetails">Additional Details</label>
        <input id="otherDismissalDetails"
          placeholder="Details, if applicable"
          style="width:100%;box-sizing:border-box;padding:10px">
      </div>

      <label for="dismissalBowler">Bowler</label>
      <input id="dismissalBowler" required
        placeholder="Bowler name" style="padding:10px">

      <label for="wicketDeliveryType">Delivery Type</label>
      <select id="wicketDeliveryType" style="padding:10px">
        <option value="legal">Legal delivery</option>
        <option value="wide">Wide delivery</option>
        <option value="noBall">No-ball delivery</option>
      </select>

      <div id="wicketExtraRunsGroup" style="display:none">
        <label for="wicketExtraRuns">Extra runs on this delivery</label>
        <input id="wicketExtraRuns" type="number"
          min="0" max="6" value="0"
          style="padding:10px">
        <small>These are additional running/penalty runs, not batter runs.</small>
      </div>

      <p id="dismissalCreditNote"
        style="font-size:13px;color:#475569;margin:0"></p>

      <div style="display:flex;gap:10px">
        <button type="button" id="cancelDismissal"
          style="flex:1;padding:11px;border:0;border-radius:7px">
          Cancel
        </button>

        <button type="submit"
          style="flex:1;padding:11px;background:#15803d;color:#fff;
          border:0;border-radius:7px;font-weight:bold">
          Save Wicket
        </button>
      </div>
    </form>
  `;

  document.body.appendChild(modal);

  return modal;
}

function updateDismissalFields() {
  const type = $("dismissalType").value;

  $("catcherGroup").style.display =
    type === "Caught" ? "block" : "none";

  $("runOutGroup").style.display =
    type === "Run Out" ? "block" : "none";

  $("keeperGroup").style.display =
    type === "Stumped" ? "block" : "none";

  const otherTypes = [
    "Retired Hurt",
    "Retired Out",
    "Obstructing the Field",
    "Timed Out",
    "Hit the Ball Twice"
  ];

  $("otherDetailsGroup").style.display =
    otherTypes.includes(type) ? "block" : "none";

  $("catcherName").required = type === "Caught";
  $("runOutFielder").required = type === "Run Out";
  $("keeperName").required = type === "Stumped";

  if (type === "Caught and Bowled") {
    $("dismissalCreditNote").textContent =
      "Bowler is also the catcher and receives the wicket.";
    $("catcherName").value = $("dismissalBowler").value.trim();
  } else if (BOWLER_CREDIT_DISMISSALS.has(type)) {
    $("dismissalCreditNote").textContent =
      "Bowler receives credit for this dismissal.";
  } else {
    $("dismissalCreditNote").textContent =
      "Bowler does not receive credit for this dismissal.";
  }

  const delivery = $("wicketDeliveryType").value;

  $("wicketExtraRunsGroup").style.display =
    delivery === "legal" ? "none" : "block";
}

function openDismissalForm() {
  if (!canScore()) return;

  const modal = createDismissalForm();
  const form = $("dismissalForm");

  $("dismissalType").value = "Caught";
  $("dismissedBatter").value = "striker";

  $("dismissedBatterName").value =
    scoreState.striker.name || "";

  $("catcherName").value = "";
  $("runOutFielder").value = "";
  $("runOutAssist").value = "";
  $("keeperName").value = "";
  $("otherDismissalDetails").value = "";

  $("dismissalBowler").value =
    scoreState.bowler.name === "Bowler"
      ? ""
      : scoreState.bowler.name;

  $("wicketDeliveryType").value = "legal";
  $("wicketExtraRuns").value = "0";

  updateDismissalFields();
  modal.style.display = "flex";

  $("dismissalType").onchange = updateDismissalFields;

  $("wicketDeliveryType").onchange = updateDismissalFields;

  $("dismissedBatter").onchange = () => {
    const key = $("dismissedBatter").value;
    $("dismissedBatterName").value =
      scoreState[key]?.name || "";
  };

  $("dismissalBowler").oninput = () => {
    if ($("dismissalType").value === "Caught and Bowled") {
      $("catcherName").value =
        $("dismissalBowler").value.trim();
    }
  };

  $("cancelDismissal").onclick = () => {
    modal.style.display = "none";
  };

  form.onsubmit = async (event) => {
    event.preventDefault();

    const type = $("dismissalType").value;
    const batterKey = $("dismissedBatter").value;

    const batterName =
      $("dismissedBatterName").value.trim();

    const bowlerName =
      $("dismissalBowler").value.trim();

    const deliveryType = $("wicketDeliveryType").value;
    const extraRuns = Math.max(
      0,
      Math.min(6, Math.floor(num($("wicketExtraRuns").value)))
    );

    if (!batterName || !bowlerName) {
      showMessage("Batter और bowler का नाम भरें।");
      return;
    }

    const details = {
      type,
      batterKey,
      batterName,
      bowler: bowlerName,
      catcher: "",
      runOutFielder: "",
      runOutAssist: "",
      wicketkeeper: "",
      otherDetails: "",
      bowlerCredited: BOWLER_CREDIT_DISMISSALS.has(type),
      deliveryType,
      extraRuns,
      innings: scoreState.innings,
      runsAtDismissal: scoreState.runs,
      timestamp: new Date().toISOString()
    };

    if (type === "Caught") {
      details.catcher = $("catcherName").value.trim();

      if (!details.catcher) {
        showMessage("Catch pakadne wale fielder ka naam bharen.");
        return;
      }
    }

    if (type === "Caught and Bowled") {
      details.catcher = bowlerName;
    }

    if (type === "Run Out") {
      details.runOutFielder =
        $("runOutFielder").value.trim();

      details.runOutAssist =
        $("runOutAssist").value.trim();

      if (!details.runOutFielder) {
        showMessage("Run-out karne wale fielder ka naam bharen.");
        return;
      }
    }

    if (type === "Stumped") {
      details.wicketkeeper = $("keeperName").value.trim();

      if (!details.wicketkeeper) {
        showMessage("Wicketkeeper ka naam bharen.");
        return;
      }
    }

    details.otherDetails =
      $("otherDismissalDetails").value.trim();

    modal.style.display = "none";

    await recordDismissal(details);
  };
}

/* ---------------- Record dismissal ---------------- */

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

  scoreState.wickets += 1;
  scoreState.bowler.name = details.bowler;

  // A wide/no-ball is not a legal ball.
  // Its penalty and any entered extra running runs are charged
  // to the bowler and included in the team total.
  if (details.deliveryType === "wide") {
    const widePenalty = 1;

    scoreState.runs += widePenalty + details.extraRuns;
    scoreState.extras.wides += widePenalty + details.extraRuns;
    scoreState.extras.total += widePenalty + details.extraRuns;
    scoreState.bowler.runs += widePenalty + details.extraRuns;

    recordBallDisplay(
      details.extraRuns ? `Wd+${details.extraRuns}` : "Wd"
    );
  } else if (details.deliveryType === "noBall") {
    const noBallPenalty = 1;

    scoreState.runs += noBallPenalty + details.extraRuns;
    scoreState.extras.noBalls += noBallPenalty;
    scoreState.extras.total += noBallPenalty;

    // Running runs off a no-ball are also charged to the bowler.
    scoreState.bowler.runs += noBallPenalty + details.extraRuns;

    recordBallDisplay(
      details.extraRuns ? `Nb+${details.extraRuns}` : "Nb"
    );
  } else {
    scoreState.balls += 1;
    scoreState.bowler.balls += 1;
    recordBallDisplay("W");
  }

  if (details.bowlerCredited) {
    scoreState.bowler.wickets += 1;
  }

  details.over = oversText(scoreState.balls);

  if (!Array.isArray(scoreState.dismissals)) {
    scoreState.dismissals = [];
  }

  scoreState.dismissals.push(details);

  // Replace only the dismissed batter with a placeholder.
  scoreState[details.batterKey] = createBatter("New Batter");

  if (scoreState.wickets >= 10) {
    scoreState.status = "Innings Completed";
  }

  finishOverIfNeeded();
  renderScorecard();

  try {
    await autoSave();

    showMessage(
      `${details.batterName} out: ${details.type}. Score saved.`
    );
  } catch (error) {
    console.error("Dismissal save failed:", error);
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

/* ---------------- Save score to Firebase ---------------- */

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
    updatedAt: serverTimestamp()
  };

  if (scoreState.battingTeam === "A") {
    payload.scoreA = scoreState.runs;
  } else {
    payload.scoreB = scoreState.runs;
  }

  return payload;
}

async function autoSave() {
  if (!currentMatchRef) {
    throw new Error("Match reference is not ready.");
  }

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
  autoSave().catch((error) => {
    console.error("Score save failed:", error);

    showMessage(
      "Score save नहीं हुआ। Internet और Firebase rules जाँचें।"
    );
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
  ) {
    return;
  }

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
        ? firstInnings.runs
        : num(currentMatch.scoreA),
      scoreB: firstSide === "B"
        ? firstInnings.runs
        : num(currentMatch.scoreB),
      updatedAt: serverTimestamp()
    });

    currentMatch.innings1 = firstInnings;
    currentMatch.scoreA = firstSide === "A"
      ? firstInnings.runs
      : num(currentMatch.scoreA);
    currentMatch.scoreB = firstSide === "B"
      ? firstInnings.runs
      : num(currentMatch.scoreB);

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
    return {
      winner: "",
      result: "First innings score उपलब्ध नहीं है।"
    };
  }

  const firstRuns = num(first.runs);
  const secondRuns = num(scoreState.runs);

  if (firstRuns === secondRuns) {
    return {
      winner: "",
      result: "Match Tied"
    };
  }

  if (secondRuns > firstRuns) {
    const remainingWickets = Math.max(0, 10 - scoreState.wickets);

    return {
      winner: teamName(scoreState.battingTeam),
      result:
        `${teamName(scoreState.battingTeam)} won by ` +
        `${remainingWickets} wickets`
    };
  }

  return {
    winner: teamName(first.battingTeam),
    result:
      `${teamName(first.battingTeam)} won by ` +
      `${firstRuns - secondRuns} runs`
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
    const matchesRef = collection(
      db,
      "tournaments",
      tournamentId,
      "matches"
    );

    const matchesSnap = await getDocs(matchesRef);
    const matches = matchesSnap.docs;

    if (!matches.length) {
      showMessage("कोई match उपलब्ध नहीं है।");
      return;
    }

    const index = matches.findIndex((item) => item.id === matchId);

    if (index < 0 || index + 1 >= matches.length) {
      showMessage("यह आखिरी match है।");
      return;
    }

    const nextMatch = matches[index + 1];

    location.href =
      `./scorecard.html?id=${encodeURIComponent(tournamentId)}` +
      `&matchId=${encodeURIComponent(nextMatch.id)}`;
  } catch (error) {
    console.error(error);
    showMessage("Next match खोलने में समस्या हुई।");
  }
}

/* ---------------- Existing buttons and links ---------------- */

function setupButtons() {
  document.querySelectorAll(".run-btn").forEach((button) => {
    button.addEventListener("click", () => {
      addRuns(button.dataset.runs);
    });
  });

  if ($("wideBtn")) {
    $("wideBtn").addEventListener("click", () => addExtra("wide", 1));
  }

  if ($("noBallBtn")) {
    $("noBallBtn").addEventListener("click", () => addExtra("noBall", 1));
  }

  if ($("byeBtn")) {
    $("byeBtn").addEventListener("click", () => addExtra("bye", 1));
  }

  if ($("legByeBtn")) {
    $("legByeBtn").addEventListener("click", () => addExtra("legBye", 1));
  }

  if ($("wicketBtn")) {
    $("wicketBtn").addEventListener("click", openDismissalForm);
  }

  if ($("undoBtn")) {
    $("undoBtn").addEventListener("click", undoLastBall);
  }

  if ($("swapBtn")) {
    $("swapBtn").addEventListener("click", swapBatters);
  }

  if ($("saveBtn")) {
    $("saveBtn").addEventListener("click", manualSave);
  }

  if ($("endMatchBtn")) {
    $("endMatchBtn").addEventListener("click", endMatch);
  }

  if ($("startSecondInningsBtn")) {
    $("startSecondInningsBtn").addEventListener(
      "click",
      startSecondInnings
    );
  }

  if ($("nextMatchBtn")) {
    $("nextMatchBtn").addEventListener("click", openNextMatch);
  }

  // Keep the existing page names and navigation IDs.
  const navLinks = [
    ["tournamentLink", "tournament.html"],
    ["scheduleLink", "schedule.html"],
    ["resultsLink", "results.html"],
    ["pointsLink", "points.html"]
  ];

  navLinks.forEach(([id, page]) => {
    const link = $(id);
    if (!link) return;

    link.href = `./${page}?id=${encodeURIComponent(tournamentId)}`;
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

    showMessage(
      "Scorecard load नहीं हुआ। Firebase config, internet और database rules जाँचें।"
    );
  }
}

initScorecard();
