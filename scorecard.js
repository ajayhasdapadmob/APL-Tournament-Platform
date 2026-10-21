
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =====================================================
   APL LIVE SCORING
   File: /scorecard.js
   Existing HTML IDs and navigation links preserved
===================================================== */

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(window.location.search);

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

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showMessage(message) {
  console.log("[APL Scoring]", message);

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
      zIndex: "9999",
      maxWidth: "90%",
      padding: "10px 16px",
      background: "#172033",
      color: "#ffffff",
      borderRadius: "8px",
      fontSize: "14px",
      boxShadow: "0 4px 16px #0003",
      textAlign: "center"
    });

    document.body.appendChild(el);
  }

  el.textContent = message;
  el.style.display = "block";

  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function oversText(balls) {
  balls = Math.max(0, number(balls));
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

function normalizeBatter(batter, fallbackName) {
  const b = batter || {};

  return {
    name: b.name || fallbackName,
    runs: number(b.runs),
    balls: number(b.balls),
    fours: number(b.fours),
    sixes: number(b.sixes),
    out: Boolean(b.out)
  };
}

function normalizeBowler(bowler) {
  const b = bowler || {};

  return {
    name: b.name || "Bowler",
    runs: number(b.runs),
    balls: number(b.balls),
    wickets: number(b.wickets)
  };
}

function normalizeExtras(extras) {
  const e = extras || {};

  return {
    wides: number(e.wides),
    noBalls: number(e.noBalls),
    byes: number(e.byes),
    legByes: number(e.legByes),
    total: number(e.total)
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
    status: "Live"
  };
}

let scoreState = createInitialState();

function teamName(side) {
  const match = currentMatch || {};
  const tournament = tournamentData || {};

  if (side === "A") {
    return (
      match.teamAName ||
      match.team1Name ||
      match.teamA ||
      match.team1 ||
      match.team1Id ||
      tournament.teamAName ||
      "Team A"
    );
  }

  return (
    match.teamBName ||
    match.team2Name ||
    match.teamB ||
    match.team2 ||
    match.team2Id ||
    tournament.teamBName ||
    "Team B"
  );
}

function battingTeamName() {
  return teamName(scoreState.battingTeam);
}

function battingTeamScore(state = scoreState) {
  return state.runs;
}

function scoreForSide(side) {
  if (scoreState.battingTeam === side) {
    return scoreState.runs;
  }

  const innings1 = currentMatch.innings1;

  if (innings1 && innings1.battingTeam === side) {
    return number(innings1.runs);
  }

  if (side === "A") {
    return number(currentMatch.scoreA);
  }

  return number(currentMatch.scoreB);
}

function wicketsForSide(side) {
  if (scoreState.battingTeam === side) {
    return scoreState.wickets;
  }

  const innings1 = currentMatch.innings1;

  if (innings1 && innings1.battingTeam === side) {
    return number(innings1.wickets);
  }

  return 0;
}

function syncMatchQuery() {
  if (tournamentId) {
    sessionStorage.setItem("aplTournamentId", tournamentId);
    localStorage.setItem("aplTournamentId", tournamentId);
  }

  if (matchId) {
    sessionStorage.setItem("aplMatchId", matchId);
    localStorage.setItem("aplMatchId", matchId);
  }
}

function getScorecardFromMatch(match) {
  const saved = match && match.scorecard;

  if (!saved || typeof saved !== "object") {
    return null;
  }

  return saved;
}

function loadStateFromSavedScore(saved) {
  if (!saved) return;

  scoreState = {
    ...createInitialState(),
    ...saved,
    runs: number(saved.runs),
    wickets: number(saved.wickets),
    balls: number(saved.balls),
    currentOverRuns: Array.isArray(saved.currentOverRuns)
      ? saved.currentOverRuns
      : [],
    striker: normalizeBatter(saved.striker, "Striker"),
    nonStriker: normalizeBatter(saved.nonStriker, "Non-Striker"),
    bowler: normalizeBowler(saved.bowler),
    extras: normalizeExtras(saved.extras),
    totalFours: number(saved.totalFours),
    totalSixes: number(saved.totalSixes)
  };

  if (!scoreState.battingTeam) {
    scoreState.battingTeam = "A";
  }

  if (!scoreState.innings) {
    scoreState.innings = 1;
  }
}

/* ---------------- Load tournament and match ---------------- */

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
      showMessage("यह match नहीं मिला।");
      return false;
    }

    currentMatch = matchSnap.data() || {};
  } else {
    const matchesSnap = await getDocs(matchesRef);

    if (matchesSnap.empty) {
      showMessage("इस tournament में कोई match नहीं मिला।");
      return false;
    }

    const firstMatch = matchesSnap.docs[0];

    matchId = firstMatch.id;
    currentMatchRef = firstMatch.ref;
    currentMatch = firstMatch.data() || {};
  }

  syncMatchQuery();

  const saved = getScorecardFromMatch(currentMatch);

  if (saved) {
    loadStateFromSavedScore(saved);
  } else {
    scoreState = createInitialState();
  }

  // Preserve previously saved first-innings information.
  if (currentMatch.innings1) {
    scoreState.innings1Saved = currentMatch.innings1;
  }

  displayMatch();
  renderScorecard();

  return true;
}

/* ---------------- Match display ---------------- */

function displayMatch() {
  setText("matchId", matchId || "—");

  const info = $("matchInfo");

  if (info) {
    const title =
      currentMatch.matchName ||
      currentMatch.name ||
      currentMatch.title ||
      `${teamName("A")} vs ${teamName("B")}`;

    info.textContent = title;
  }

  setText("battingTeam", battingTeamName());

  const status = $("matchStatus");
  if (status) status.textContent = scoreState.status || "Live";
}

/* ---------------- Render scorecard ---------------- */

function renderScorecard() {
  const runs = scoreState.runs;
  const wickets = scoreState.wickets;
  const balls = scoreState.balls;

  setText("score", `${runs}/${wickets}`);
  setText("overs", oversText(balls));
  setText("crr", balls > 0 ? ((runs * 6) / balls).toFixed(2) : "0.00");
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
    strikeRate(scoreState.nonStriker.runs, scoreState.nonStriker.balls)
  );

  setText("bowlerName", scoreState.bowler.name);
  setText("bowlerOvers", oversText(scoreState.bowler.balls));
  setText("bowlerRuns", scoreState.bowler.runs);
  setText("bowlerWickets", scoreState.bowler.wickets);

  // Optional fields: update them if the HTML already contains them.
  setText("strikerName", scoreState.striker.name);
  setText("nonStrikerName", scoreState.nonStriker.name);
  setText("strikerFours", scoreState.striker.fours);
  setText("strikerSixes", scoreState.striker.sixes);
  setText("nonStrikerFours", scoreState.nonStriker.fours);
  setText("nonStrikerSixes", scoreState.nonStriker.sixes);
  setText("bowlerEconomy", economy(scoreState.bowler.runs, scoreState.bowler.balls));

  setText("totalFours", scoreState.totalFours);
  setText("totalSixes", scoreState.totalSixes);
  setText("extrasTotal", scoreState.extras.total);
  setText("widesTotal", scoreState.extras.wides);
  setText("noBallsTotal", scoreState.extras.noBalls);
  setText("byesTotal", scoreState.extras.byes);
  setText("legByesTotal", scoreState.extras.legByes);

  setText(
    "scoreA",
    `${scoreForSide("A")}/${wicketsForSide("A")}`
  );

  setText(
    "scoreB",
    `${scoreForSide("B")}/${wicketsForSide("B")}`
  );

  renderCurrentOver();
  displayMatch();
  updateButtonStates();
}

function renderCurrentOver() {
  const container = $("currentOver");
  if (!container) return;

  container.textContent = "";

  if (!scoreState.currentOverRuns.length) {
    container.textContent = "No balls yet";
    return;
  }

  scoreState.currentOverRuns.forEach((ball) => {
    const span = document.createElement("span");

    span.textContent = ball;
    span.style.display = "inline-block";
    span.style.margin = "3px";
    span.style.padding = "5px 8px";
    span.style.borderRadius = "6px";
    span.style.background = "#e2e8f0";
    span.style.color = "#0f172a";

    container.appendChild(span);
  });
}

function updateButtonStates() {
  const locked =
    scoreState.status === "Completed" ||
    !currentMatchRef;

  document.querySelectorAll(
    ".run-btn, #wideBtn, #noBallBtn, #byeBtn, #legByeBtn, #wicketBtn"
  ).forEach((button) => {
    button.disabled = locked;
  });
}

/* ---------------- History / Undo ---------------- */

function saveHistory() {
  history.push(clone(scoreState));

  // Keep the most recent 100 actions in this browser session.
  if (history.length > 100) {
    history.shift();
  }
}

async function undoLastBall() {
  if (!history.length) {
    showMessage("Undo करने के लिए कोई पिछली action उपलब्ध नहीं है।");
    return;
  }

  scoreState = history.pop();

  renderScorecard();

  try {
    await autoSave();
    showMessage("पिछली action Undo हो गई।");
  } catch (error) {
    console.error(error);
    showMessage("Undo हुआ, लेकिन Firebase save नहीं हो पाया।");
  }
}

/* ---------------- Strike and over management ---------------- */

function swapBattersInternal() {
  const temp = scoreState.striker;
  scoreState.striker = scoreState.nonStriker;
  scoreState.nonStriker = temp;
}

function finishOverIfNeeded() {
  if (scoreState.balls > 0 && scoreState.balls % 6 === 0) {
    scoreState.currentOverRuns = [];
    swapBattersInternal();
    showMessage("Over पूरा हुआ। Strike बदल दी गई है।");
  }
}

function recordBallDisplay(value) {
  scoreState.currentOverRuns.push(String(value));
}

/* ---------------- Normal runs ---------------- */

async function addRuns(runs) {
  runs = Number(runs);

  if (!Number.isInteger(runs) || runs < 0 || runs > 7) {
    return;
  }

  if (!canScore()) return;

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

  // Odd runs rotate the strike.
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

  let display = "";

  if (type === "wide") {
    // A wide is an illegal delivery. At least one run is added.
    const total = Math.max(1, amount);

    scoreState.runs += total;
    scoreState.extras.wides += total;
    scoreState.extras.total += total;
    scoreState.bowler.runs += total;

    display = total === 1 ? "Wd" : `Wd+${total - 1}`;

    // Extra runs beyond the penalty run rotate strike if odd.
    if ((total - 1) % 2 === 1) {
      swapBattersInternal();
    }
  } else if (type === "noBall") {
    // This button records a standard one-run no-ball penalty.
    scoreState.runs += 1;
    scoreState.extras.noBalls += 1;
    scoreState.extras.total += 1;
    scoreState.bowler.runs += 1;

    display = "Nb";
  } else if (type === "bye") {
    scoreState.runs += amount;
    scoreState.extras.byes += amount;
    scoreState.extras.total += amount;

    // Byes are legal deliveries and are not charged to the bowler.
    scoreState.balls += 1;
    scoreState.bowler.balls += 1;
    scoreState.striker.balls += 1;

    display = amount === 1 ? "B" : `B${amount}`;

    if (amount % 2 === 1) {
      swapBattersInternal();
    }
  } else if (type === "legBye") {
    scoreState.runs += amount;
    scoreState.extras.legByes += amount;
    scoreState.extras.total += amount;

    scoreState.balls += 1;
    scoreState.bowler.balls += 1;
    scoreState.striker.balls += 1;

    display = amount === 1 ? "Lb" : `Lb${amount}`;

    if (amount % 2 === 1) {
      swapBattersInternal();
    }
  }

  recordBallDisplay(display);
  finishOverIfNeeded();

  renderScorecard();
  saveInBackground();
}

/* ---------------- Wicket ---------------- */

async function addWicket() {
  if (!canScore()) return;

  const dismissal = prompt(
    "Dismissal type लिखें (उदाहरण: Bowled, Caught, LBW, Run Out):",
    "Bowled"
  );

  if (dismissal === null) return;

  const dismissalType = dismissal.trim() || "Bowled";

  saveHistory();

  scoreState.wickets += 1;
  scoreState.balls += 1;

  // Run outs and some other dismissals are not credited to the bowler.
  const dismissalKey = dismissalType.toLowerCase();
  const bowlerGetsWicket = [
    "bowled",
    "caught",
    "lbw",
    "stumped",
    "hit wicket",
    "caught and bowled"
  ].includes(dismissalKey);

  if (bowlerGetsWicket) {
    scoreState.bowler.wickets += 1;
  }

  scoreState.bowler.balls += 1;

  scoreState.striker.out = true;

  recordBallDisplay("W");

  // This UI does not include a player selector, so create a placeholder.
  scoreState.striker = createBatter("New Batter");

  if (scoreState.wickets >= 10) {
    scoreState.status = "Innings Completed";
    showMessage("10 wickets गिर गए। Innings पूरा हो गया।");
  }

  finishOverIfNeeded();

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
    status: scoreState.status
  };
}

function matchUpdatePayload() {
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

  // Keep existing Team A / Team B summary fields.
  if (scoreState.battingTeam === "A") {
    payload.scoreA = scoreState.runs;
  } else {
    payload.scoreB = scoreState.runs;
  }

  if (currentMatch.innings1) {
    payload.innings1 = currentMatch.innings1;
  }

  if (currentMatch.innings2) {
    payload.innings2 = currentMatch.innings2;
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

      const payload = matchUpdatePayload();

      await updateDoc(currentMatchRef, payload);

      // Keep the local copy consistent with the saved score.
      currentMatch = {
        ...currentMatch,
        scorecard: makeInningsSnapshot(),
        innings: scoreState.innings,
        currentRuns: scoreState.runs,
        currentWickets: scoreState.wickets,
        currentOvers: oversText(scoreState.balls)
      };
    } while (saveAgain);
  } finally {
    saving = false;
  }
}

function saveInBackground() {
  autoSave()
    .then(() => showMessage("Score saved"))
    .catch((error) => {
      console.error("Score save failed:", error);
      showMessage("Score save नहीं हुआ। Internet/Firebase rules जाँचें।");
    });
}

/* ---------------- Manual Save ---------------- */

async function manualSave() {
  try {
    await autoSave();
    showMessage("Score Firebase में save हो गया।");
  } catch (error) {
    console.error(error);
    showMessage("Save failed: Firebase connection जाँचें।");
  }
}

/* ---------------- Innings and match result ---------------- */

async function startSecondInnings() {
  if (!currentMatchRef) return;

  if (scoreState.innings !== 1) {
    showMessage("Second innings पहले से शुरू है।");
    return;
  }

  if (
    scoreState.balls === 0 &&
    scoreState.runs === 0 &&
    scoreState.wickets === 0
  ) {
    const confirmStart = confirm(
      "पहली innings में अभी कोई score नहीं है। क्या फिर भी second innings शुरू करनी है?"
    );

    if (!confirmStart) return;
  }

  const firstInnings = makeInningsSnapshot();

  const firstBattingTeam = scoreState.battingTeam;
  const secondBattingTeam = firstBattingTeam === "A" ? "B" : "A";

  currentMatch.innings1 = firstInnings;

  scoreState = {
    ...createInitialState(),
    innings: 2,
    battingTeam: secondBattingTeam,
    status: "Live",
    striker: createBatter("Striker"),
    nonStriker: createBatter("Non-Striker"),
    bowler: createBowler()
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
      updatedAt: serverTimestamp()
    });

    currentMatch = {
      ...currentMatch,
      innings1: firstInnings,
      innings: 2,
      scorecard: makeInningsSnapshot(),
      scoreA:
        firstBattingTeam === "A"
          ? firstInnings.runs
          : number(currentMatch.scoreA),
      scoreB:
        firstBattingTeam === "B"
          ? firstInnings.runs
          : number(currentMatch.scoreB)
    };

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
      result: "First innings का score उपलब्ध नहीं है।"
    };
  }

  const firstRuns = number(first.runs);
  const secondRuns = number(scoreState.runs);

  if (firstRuns === secondRuns) {
    return {
      winner: "",
      result: "Match Tied"
    };
  }

  if (secondRuns > firstRuns) {
    const wicketsRemaining = Math.max(0, 10 - scoreState.wickets);

    return {
      winner: teamName(scoreState.battingTeam),
      result: `${teamName(scoreState.battingTeam)} won by ${wicketsRemaining} wickets`
    };
  }

  const firstBattingTeam = first.battingTeam;
  const winningSide = firstBattingTeam;
  const runsWonBy = firstRuns - secondRuns;

  return {
    winner: teamName(winningSide),
    result: `${teamName(winningSide)} won by ${runsWonBy} runs`
  };
}

async function endMatch() {
  if (!currentMatchRef) return;

  if (scoreState.innings === 1) {
    const ok = confirm(
      "First innings समाप्त करें? इसके बाद Start Second Innings दबा सकते हैं।"
    );

    if (!ok) return;

    scoreState.status = "Innings Completed";
    currentMatch.innings1 = makeInningsSnapshot();

    try {
      await updateDoc(currentMatchRef, {
        innings1: currentMatch.innings1,
        scorecard: makeInningsSnapshot(),
        status: "Innings Completed",
        updatedAt: serverTimestamp()
      });

      currentMatch.status = "Innings Completed";
      renderScorecard();

      showMessage("First innings समाप्त। अब Start Second Innings दबाएँ।");
    } catch (error) {
      console.error(error);
      showMessage("Innings save नहीं हुई।");
    }

    return;
  }

  const ok = confirm("Match समाप्त करके result save करें?");
  if (!ok) return;

  scoreState.status = "Completed";

  const result = calculateWinner();
  const secondInnings = makeInningsSnapshot();

  try {
    await updateDoc(currentMatchRef, {
      innings1: currentMatch.innings1 || null,
      innings2: secondInnings,
      scorecard: secondInnings,
      status: "Completed",
      result: result.result,
      winner: result.winner,
      updatedAt: serverTimestamp()
    });

    currentMatch = {
      ...currentMatch,
      innings2: secondInnings,
      status: "Completed",
      result: result.result,
      winner: result.winner
    };

    renderScorecard();
    showMessage(result.result);
  } catch (error) {
    console.error(error);
    showMessage("Match result save नहीं हुआ।");
  }
}

/* ---------------- Open next match ---------------- */

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

    if (matchesSnap.empty) {
      showMessage("कोई match उपलब्ध नहीं है।");
      return;
    }

    const matches = matchesSnap.docs;

    const currentIndex = matches.findIndex(
      (item) => item.id === matchId
    );

    if (currentIndex < 0 || currentIndex + 1 >= matches.length) {
      showMessage("यह आखिरी match है।");
      return;
    }

    const nextMatch = matches[currentIndex + 1];

    window.location.href =
      `./scorecard.html?id=${encodeURIComponent(tournamentId)}` +
      `&matchId=${encodeURIComponent(nextMatch.id)}`;
  } catch (error) {
    console.error(error);
    showMessage("Next match खोलने में समस्या हुई।");
  }
}

/* ---------------- Button setup ---------------- */

function canScore() {
  if (!currentMatchRef) {
    showMessage("पहले match load होने दें।");
    return false;
  }

  if (
    scoreState.status === "Completed" ||
    scoreState.status === "Innings Completed"
  ) {
    showMessage("यह innings समाप्त है।");
    return false;
  }

  if (scoreState.wickets >= 10) {
    showMessage("सभी 10 wickets गिर चुके हैं।");
    return false;
  }

  return true;
}

function setupButtons() {
  document.querySelectorAll(".run-btn").forEach((button) => {
    button.addEventListener("click", () => {
      addRuns(button.dataset.runs);
    });
  });

  const wideBtn = $("wideBtn");
  if (wideBtn) {
    wideBtn.addEventListener("click", () => addExtra("wide", 1));
  }

  const noBallBtn = $("noBallBtn");
  if (noBallBtn) {
    noBallBtn.addEventListener("click", () => addExtra("noBall", 1));
  }

  const byeBtn = $("byeBtn");
  if (byeBtn) {
    byeBtn.addEventListener("click", () => addExtra("bye", 1));
  }

  const legByeBtn = $("legByeBtn");
  if (legByeBtn) {
    legByeBtn.addEventListener("click", () => addExtra("legBye", 1));
  }

  const wicketBtn = $("wicketBtn");
  if (wicketBtn) {
    wicketBtn.addEventListener("click", addWicket);
  }

  const undoBtn = $("undoBtn");
  if (undoBtn) {
    undoBtn.addEventListener("click", undoLastBall);
  }

  const swapBtn = $("swapBtn");
  if (swapBtn) {
    swapBtn.addEventListener("click", async () => {
      if (!canScore()) return;

      saveHistory();
      swapBattersInternal();
      renderScorecard();
      saveInBackground();
    });
  }

  const saveBtn = $("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", manualSave);
  }

  const endMatchBtn = $("endMatchBtn");
  if (endMatchBtn) {
    endMatchBtn.addEventListener("click", endMatch);
  }

  const secondInningsBtn = $("startSecondInningsBtn");
  if (secondInningsBtn) {
    secondInningsBtn.addEventListener("click", startSecondInnings);
  }

  const nextMatchBtn = $("nextMatchBtn");
  if (nextMatchBtn) {
    nextMatchBtn.addEventListener("click", openNextMatch);
  }

  // Preserve existing navigation and add the selected IDs.
  const navLinks = [
    ["tournamentLink", "tournament.html"],
    ["scheduleLink", "schedule.html"],
    ["resultsLink", "results.html"],
    ["pointsLink", "points.html"]
  ];

  navLinks.forEach(([id, page]) => {
    const link = $(id);
    if (!link) return;

    link.href =
      `./${page}?id=${encodeURIComponent(tournamentId)}`;
  });
}

/* ---------------- Start application ---------------- */

async function initScorecard() {
  setupButtons();

  try {
    const loaded = await loadTournamentAndMatch();

    if (!loaded) {
      updateButtonStates();
      return;
    }

    showMessage("Scorecard ready");
  } catch (error) {
    console.error("APL scorecard initialization failed:", error);

    showMessage(
      "Scorecard load नहीं हुआ। Firebase config, internet और database rules जाँचें।"
    );
  }
}

initScorecard();
