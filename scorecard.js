
import { db } from "./firebase.js";
import {
  doc, getDoc, getDocs, collection, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search);

const tournamentId =
  params.get("id") || params.get("tournamentId") ||
  localStorage.getItem("selectedTournamentId") ||
  localStorage.getItem("tournamentId") ||
  localStorage.getItem("aplTournamentId") ||
  sessionStorage.getItem("selectedTournamentId") || "";

const matchId =
  params.get("matchId") || params.get("match") ||
  localStorage.getItem("selectedMatchId") ||
  localStorage.getItem("matchId") ||
  localStorage.getItem("aplMatchId") ||
  sessionStorage.getItem("selectedMatchId") || "";

let tournament, match, matchRef;
let teams = { A: [], B: [] };
let history = [];
let innings1 = null, innings2 = null, state = null;
let saving = false, saveAgain = false, saveTimer = null;

const BOWLER_WICKETS = new Set([
  "Bowled", "Caught", "LBW", "Stumped", "Hit Wicket", "Caught and Bowled"
]);
const NO_BALL_DISMISSALS = new Set([
  "Run Out", "Obstructing the Field", "Hit the Ball Twice"
]);
const WIDE_DISMISSALS = new Set([
  "Run Out", "Stumped", "Obstructing the Field", "Hit the Ball Twice"
]);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function clone(v) {
  return JSON.parse(JSON.stringify(v));
}
function say(message, type = "info") {
  const el = $("#message");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}
function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = String(value ?? "");
}
function overs(balls) {
  balls = Math.max(0, num(balls));
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}
function sr(p) {
  return num(p?.balls) ? (num(p.runs) * 100 / num(p.balls)).toFixed(2) : "0.00";
}
function eco(p) {
  return num(p?.balls) ? (num(p.runs) * 6 / num(p.balls)).toFixed(2) : "0.00";
}
function newBatter(name = "") {
  return { name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: "" };
}
function newBowler(name = "") {
  return { name, runs: 0, balls: 0, wickets: 0, wides: 0, noBalls: 0, maidens: 0 };
}
function newInnings(number = 1, side = "A") {
  return {
    innings: number, battingTeam: side, runs: 0, wickets: 0, balls: 0,
    currentOverRuns: [], striker: newBatter(), nonStriker: newBatter(),
    bowler: newBowler(),
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    totalFours: 0, totalSixes: 0, battingStats: {}, bowlingStats: {},
    dismissedPlayers: [], dismissals: [], fallOfWickets: [], ballLog: [],
    status: "LIVE"
  };
}
function limitOvers() {
  return Math.max(1, num(match?.overs) || num(tournament?.overs) || 20);
}
function inningsEnded() {
  return state.wickets >= 10 || state.balls >= limitOvers() * 6 ||
    state.status === "COMPLETED";
}
function matchEnded() {
  return ["completed", "complete", "finished", "result"]
    .includes(String(match?.status || "").toLowerCase());
}
function teamName(side) {
  const team = side === "A"
    ? (match?.team1Name || match?.teamAName || match?.teamA || match?.team1)
    : (match?.team2Name || match?.teamBName || match?.teamB || match?.team2);
  return typeof team === "object" ? (team?.teamName || team?.name || `Team ${side}`) : (team || `Team ${side}`);
}
function teamId(side) {
  const direct = side === "A"
    ? (match?.team1Id || match?.teamAId)
    : (match?.team2Id || match?.teamBId);
  const raw = side === "A" ? match?.team1 : match?.team2;
  return direct || (typeof raw === "object" ? raw?.id || raw?.teamId : raw) || "";
}
function extractNames(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(p => {
    if (typeof p === "string") return p.trim();
    return String(p?.name || p?.playerName || p?.fullName ||
      p?.displayName || p?.player || "").trim();
  }).filter(Boolean))];
}
function teamPlayerNames(team) {
  for (const key of ["players", "registeredPlayers", "playerNames", "playersList", "squad", "playerList"]) {
    const names = extractNames(team?.[key]);
    if (names.length) return names;
  }
  return [];
}
function approved(team) {
  return ["approved", "paid", "accepted"].includes(
    String(team?.status || "approved").toLowerCase()
  );
}
async function loadPlayersForTeam(id, name) {
  const snap = await getDocs(collection(db, "tournaments", tournamentId, "teams"));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  let found = all.find(t => t.id === String(id) || t.teamId === id || t.id === id);
  if (!found && name) {
    found = all.find(t =>
      String(t.teamName || t.name || t.nameOfTeam || "").trim().toLowerCase() ===
      String(name).trim().toLowerCase()
    );
  }
  if (!found) {
    console.warn("Team document not found:", id, name);
    return [];
  }
  if (!approved(found)) {
    say(`${name || "Team"} approved nahi hai; registered players load nahi kiye gaye.`, "warning");
    return [];
  }
  return teamPlayerNames(found);
}
async function loadPlayers() {
  const [A, B] = await Promise.all([
    loadPlayersForTeam(teamId("A"), teamName("A")),
    loadPlayersForTeam(teamId("B"), teamName("B"))
  ]);
  teams = { A, B };
  if (!A.length || !B.length) {
    setText("#playerMessage",
      "Team players nahi mile. Firestore team document mein registered player field aur match ke team IDs/names check karein.");
  } else {
    setText("#playerMessage", `${teamName("A")}: ${A.length} players · ${teamName("B")}: ${B.length} players`);
  }
}
function battingPlayers() { return teams[state.battingTeam] || []; }
function bowlingPlayers() { return teams[state.battingTeam === "A" ? "B" : "A"] || []; }
function ensureBatter(name) {
  if (name && !state.battingStats[name]) state.battingStats[name] = newBatter(name);
}
function ensureBowler(name) {
  if (name && !state.bowlingStats[name]) state.bowlingStats[name] = newBowler(name);
}
function fillSelect(selector, names, selected = "") {
  const el = $(selector);
  if (!el) return;
  const old = selected || el.value;
  el.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select Player --";
  el.appendChild(placeholder);
  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    el.appendChild(option);
  });
  el.value = names.includes(old) ? old : "";
}
function refreshDropdowns() {
  const batting = battingPlayers();
  const used = new Set(state.dismissedPlayers || []);
  const available = batting.filter(n => !used.has(n));
  fillSelect("#strikerSelect", available, state.striker.name);
  fillSelect("#nonStrikerSelect", available, state.nonStriker.name);
  fillSelect("#bowlerSelect", bowlingPlayers(), state.bowler.name);
}
function saveUndoPoint() {
  history.push({ state: clone(state), innings1: clone(innings1), innings2: clone(innings2) });
  if (history.length > 100) history.shift();
}
function rotateStrike() {
  [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
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
  const row = state.battingStats[player.name];
  row.runs += runs;
  if (runs === 4) { player.fours++; row.fours++; state.totalFours++; }
  if (runs === 6) { player.sixes++; row.sixes++; state.totalSixes++; }
}
function logBall(entry) {
  state.ballLog.push({ ...entry, legalBalls: state.balls, score: state.runs, timestamp: new Date().toISOString() });
}
function completeOver() {
  if (state.balls > 0 && state.balls % 6 === 0) {
    const runsThisOver = state.currentOverRuns.reduce((sum, x) => sum + num(x.runs), 0);
    if (runsThisOver === 0 && state.bowler.name) {
      state.bowler.maidens++;
      ensureBowler(state.bowler.name);
      state.bowlingStats[state.bowler.name].maidens++;
    }
    state.currentOverRuns = [];
    rotateStrike();
    say("Over complete. Next bowler select karein.", "success");
  }
}
function checkInnings() {
  if (state.wickets >= 10 || state.balls >= limitOvers() * 6) {
    state.status = "COMPLETED";
    say("Innings complete. Next innings start karein.", "success");
  }
}
function canScore() {
  if (!match || matchEnded()) { say("Match completed; scoring locked.", "warning"); return false; }
  if (inningsEnded()) { say("Innings complete.", "warning"); return false; }
  if (!state.striker.name || !state.nonStriker.name) {
    say("Striker aur non-striker select karein.", "warning"); return false;
  }
  if (state.striker.name === state.nonStriker.name) {
    say("Dono batters alag hone chahiye.", "warning"); return false;
  }
  if (!state.bowler.name) { say("Bowler select karein.", "warning"); return false; }
  return true;
}
function addRuns(raw) {
  if (!canScore()) return;
  const runs = Math.max(0, Math.min(6, num(raw)));
  saveUndoPoint();
  const batter = state.striker.name;
  state.runs += runs;
  addBatterRuns(runs, state.striker);
  addBatterBall(state.striker);
  addBowlerRuns(runs);
  addLegalBall();
  state.currentOverRuns.push({ label: String(runs), runs });
  if (runs % 2) rotateStrike();
  logBall({ type: "runs", runs, batter });
  completeOver(); checkInnings(); refreshUI(); scheduleSave();
}
function addExtra(type) {
  if (!canScore()) return;
  saveUndoPoint();
  if (type === "wide") {
    state.runs++;
    state.extras.wides++; state.extras.total++;
    addBowlerRuns(1);
    state.bowler.wides++;
    ensureBowler(state.bowler.name);
    state.bowlingStats[state.bowler.name].wides++;
    state.currentOverRuns.push({ label: "Wd", runs: 1 });
  } else if (type === "noBall") {
    state.runs++;
    state.extras.noBalls++; state.extras.total++;
    addBowlerRuns(1);
    state.bowler.noBalls++;
    ensureBowler(state.bowler.name);
    state.bowlingStats[state.bowler.name].noBalls++;
    state.currentOverRuns.push({ label: "Nb", runs: 1 });
  } else {
    const key = type === "bye" ? "byes" : "legByes";
    state.runs++; state.extras[key]++; state.extras.total++;
    addLegalBall();
    state.currentOverRuns.push({ label: type === "bye" ? "B" : "Lb", runs: 0 });
  }
  logBall({ type, runs: 1 });
  completeOver(); checkInnings(); refreshUI(); scheduleSave();
}
function showWicketDialog() {
  if (!canScore()) return;
  let dialog = $("#dismissalDialog");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "dismissalDialog";
    dialog.style.cssText = "position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    const panel = document.createElement("div");
    panel.style.cssText = "background:white;color:#111;padding:20px;border-radius:12px;width:min(460px,100%);max-height:90vh;overflow:auto";
    panel.innerHTML = `
      <h2>Record Wicket</h2>
      <label for="dismissalType">Dismissal</label>
      <select id="dismissalType">
        <option>Bowled</option><option>Caught</option><option>LBW</option>
        <option>Run Out</option><option>Stumped</option><option>Hit Wicket</option>
        <option>Caught and Bowled</option><option>Retired Out</option>
        <option>Timed Out</option><option>Obstructing the Field</option><option>Hit the Ball Twice</option>
      </select>
      <label for="dismissedBatter">Out batter</label><select id="dismissedBatter"></select>
      <label for="dismissalDeliveryType">Delivery</label>
      <select id="dismissalDeliveryType"><option value="legal">Legal ball</option><option value="wide">Wide</option><option value="noBall">No-ball</option></select>
      <label for="dismissalRuns">Completed runs</label><input id="dismissalRuns" type="number" min="0" max="6" value="0">
      <label for="replacementSelect">Replacement batter</label><select id="replacementSelect"></select>
      <button id="confirmWicket" class="action-btn" style="margin-top:12px;width:100%">Confirm Wicket</button>
      <button id="cancelWicket" class="action-btn" style="margin-top:8px;width:100%">Cancel</button>`;
    dialog.appendChild(panel); document.body.appendChild(dialog);
    $("#dismissalType").addEventListener("change", updateWicketOptions);
    $("#dismissedBatter").addEventListener("change", updateWicketOptions);
    $("#confirmWicket").addEventListener("click", () => {
      const type = $("#dismissalType").value;
      const name = $("#dismissedBatter").value;
      const delivery = $("#dismissalDeliveryType").value;
      const runs = num($("#dismissalRuns").value);
      const replacement = $("#replacementSelect").value;
      dialog.style.display = "none";
      dismissBatter(type, name, delivery, runs, replacement);
    });
    $("#cancelWicket").addEventListener("click", () => dialog.style.display = "none");
  }
  fillSelect("#dismissedBatter", [state.striker.name, state.nonStriker.name].filter(Boolean));
  updateWicketOptions();
  dialog.style.display = "flex";
}
function updateWicketOptions() {
  const outName = $("#dismissedBatter")?.value;
  const dismissed = new Set(state.dismissedPlayers || []);
  if (outName) dismissed.add(outName);
  const available = battingPlayers().filter(n => !dismissed.has(n));
  fillSelect("#replacementSelect", available);
}
function dismissBatter(type, name, delivery, completedRuns, replacementName) {
  if (!canScore()) return;
  if (![state.striker.name, state.nonStriker.name].includes(name)) {
    say("Dismissed batter select karein.", "warning"); return;
  }
  if (delivery === "noBall" && !NO_BALL_DISMISSALS.has(type)) {
    say("No-ball par yeh dismissal valid nahi hai.", "warning"); return;
  }
  if (delivery === "wide" && !WIDE_DISMISSALS.has(type)) {
    say("Wide par yeh dismissal valid nahi hai.", "warning"); return;
  }
  const availableBefore = battingPlayers().filter(n =>
    n !== state.striker.name && n !== state.nonStriker.name &&
    !(state.dismissedPlayers || []).includes(n)
  );
  if (availableBefore.length && !replacementName) {
    say("Replacement batter select karein.", "warning"); return;
  }
  saveUndoPoint();
  const runs = Math.max(0, Math.min(6, num(completedRuns)));
  const wasStriker = state.striker.name === name;
  const dismissed = wasStriker ? state.striker : state.nonStriker;
  const bowlerName = state.bowler.name;

  if (delivery === "wide") {
    const total = runs + 1;
    state.runs += total; state.extras.wides += total; state.extras.total += total;
    addBowlerRuns(total); state.bowler.wides += total;
    ensureBowler(bowlerName); if (bowlerName) state.bowlingStats[bowlerName].wides += total;
  } else if (delivery === "noBall") {
    const total = runs + 1;
    state.runs += total; state.extras.noBalls++; state.extras.total++;
    addBowlerRuns(total); state.bowler.noBalls++;
    ensureBowler(bowlerName); if (bowlerName) state.bowlingStats[bowlerName].noBalls++;
  } else {
    addLegalBall();
  }

  state.runs += runs;
  if (runs % 2) rotateStrike();

  dismissed.out = true;
  dismissed.dismissal = type;
  ensureBatter(name);
  Object.assign(state.battingStats[name], dismissed);
  state.wickets++;
  state.dismissedPlayers = [...new Set([...(state.dismissedPlayers || []), name])];

  if (BOWLER_WICKETS.has(type)) {
    state.bowler.wickets++;
    ensureBowler(bowlerName);
    if (bowlerName) state.bowlingStats[bowlerName].wickets++;
  }

  state.dismissals.push({ batter: name, type, bowler: bowlerName, wicketNumber: state.wickets, over: overs(state.balls) });
  state.fallOfWickets.push({ wicket: state.wickets, score: state.runs, batter: name, over: overs(state.balls) });

  const replacement = replacementName && battingPlayers().includes(replacementName) &&
    !state.dismissedPlayers.includes(replacementName) &&
    replacementName !== state.striker.name && replacementName !== state.nonStriker.name
    ? newBatter(replacementName) : newBatter("");

  if (wasStriker) state.striker = replacement;
  else state.nonStriker = replacement;
  if (replacement.name) ensureBatter(replacement.name);

  state.currentOverRuns.push({ label: "W", runs });
  logBall({ type: "wicket", batter: name, dismissal: type, bowler: bowlerName });
  completeOver(); checkInnings(); refreshUI(); scheduleSave();
  say(`${name} out: ${type}`, "success");
}
function renderList(selector, rows, formatter, empty) {
  const el = $(selector);
  if (!el) return;
  el.replaceChildren();
  if (!rows.length) {
    const li = document.createElement("li"); li.textContent = empty; el.appendChild(li); return;
  }
  rows.forEach(row => {
    const li = document.createElement("li");
    li.textContent = formatter(row);
    el.appendChild(li);
  });
}
function renderTable(selector, rows, columns, emptyText) {
  const body = $(selector);
  if (!body) return;
  body.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement("tr"), td = document.createElement("td");
    td.colSpan = columns.length; td.textContent = emptyText; tr.appendChild(td); body.appendChild(tr); return;
  }
  rows.forEach(row => {
    const tr = document.createElement("tr");
    columns.forEach(([key, format]) => {
      const td = document.createElement("td");
      td.textContent = format ? format(row) : String(row[key] ?? 0);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}
function refreshUI() {
  setText("#matchInfo h2", `${teamName("A")} vs ${teamName("B")}`);
  setText("#matchId", `Match ID: ${matchId}`);
  setText("#inningsNumber", `Innings ${state.innings}`);
  setText("#battingTeam", teamName(state.battingTeam));
  setText("#score", `${state.runs}/${state.wickets}`);
  setText("#overs", `${overs(state.balls)} Overs`);
  setText("#crr", `CRR: ${state.balls ? (state.runs * 6 / state.balls).toFixed(2) : "0.00"}`);
  setText("#targetInfo", state.innings === 2 && innings1 ? `Target: ${num(innings1.runs) + 1}` : "");
  setText("#matchStatus", state.status === "COMPLETED" ? "INNINGS COMPLETED" : "LIVE");
  setText("#strikerName", (state.striker.name || "Select striker") + (state.striker.name ? " *" : ""));
  setText("#strikerRuns", state.striker.runs);
  setText("#strikerBalls", state.striker.balls);
  setText("#strikerSR", sr(state.striker));
  setText("#nonStrikerName", state.nonStriker.name || "Select non-striker");
  setText("#nonStrikerRuns", state.nonStriker.runs);
  setText("#nonStrikerBalls", state.nonStriker.balls);
  setText("#nonStrikerSR", sr(state.nonStriker));
  setText("#bowlerName", state.bowler.name || "Select bowler");
  setText("#bowlerOvers", overs(state.bowler.balls));
  setText("#bowlerRuns", state.bowler.runs);
  setText("#bowlerWickets", state.bowler.wickets);
  setText("#bowlerEconomy", eco(state.bowler));
  setText("#wides", state.extras.wides);
  setText("#noBalls", state.extras.noBalls);
  setText("#totalFours", state.totalFours);
  setText("#totalSixes", state.totalSixes);

  refreshDropdowns();
  renderList("#yetToBatList",
    battingPlayers().filter(n => n !== state.striker.name && n !== state.nonStriker.name &&
      !(state.dismissedPlayers || []).includes(n)),
    n => n, "No players left to bat.");
  renderList("#fallOfWicketsList", state.fallOfWickets,
    w => `${w.wicket}-${w.score} · ${w.batter} · ${w.over} overs`,
    "No wickets yet.");

  const batters = Object.values(state.battingStats);
  if (state.striker.name && !batters.some(p => p.name === state.striker.name)) batters.push(state.striker);
  if (state.nonStriker.name && !batters.some(p => p.name === state.nonStriker.name)) batters.push(state.nonStriker);
  renderTable("#battingTableBody", batters,
    [["name"], ["dismissal", p => p.out ? (p.dismissal || "Out") : (p.name === state.striker.name ? "Batting *" : p.name === state.nonStriker.name ? "Batting" : "Not out")],
     ["runs"], ["balls"], ["fours"], ["sixes"], ["sr", p => sr(p)]], "No batting figures yet.");

  renderTable("#bowlingTableBody", Object.values(state.bowlingStats),
    [["name"], ["overs", p => overs(p.balls)], ["maidens"], ["runs"], ["wickets"], ["wides"], ["noBalls"], ["economy", p => eco(p)]],
    "No bowling figures yet.");

  const overEl = $("#currentOver");
  if (overEl) {
    overEl.replaceChildren();
    (state.currentOverRuns.length ? state.currentOverRuns : [{ label: "-", runs: 0 }]).forEach(ball => {
      const span = document.createElement("span"); span.className = "ball";
      span.textContent = ball.label ?? String(ball);
      overEl.appendChild(span);
    });
  }
}
function snapshot() {
  return { ...clone(state), overs: overs(state.balls), totalRuns: state.runs, totalWickets: state.wickets, legalBalls: state.balls };
}
function scores() {
  return {
    scoreA: state.battingTeam === "A" ? state.runs : num(innings1?.battingTeam === "A" ? innings1.runs : innings2?.runs),
    scoreB: state.battingTeam === "B" ? state.runs : num(innings1?.battingTeam === "B" ? innings1.runs : innings2?.runs)
  };
}
function resultForMatch() {
  if (!innings1 || !innings2) return { winner: "", result: "Second innings pending." };
  const a = num(innings1.runs), b = num(innings2.runs);
  if (a === b) return { winner: "", result: "Match tied." };
  if (b > a) return { winner: teamName(innings2.battingTeam), result: `${teamName(innings2.battingTeam)} won by ${Math.max(0, 10 - num(innings2.wickets))} wickets.` };
  return { winner: teamName(innings1.battingTeam), result: `${teamName(innings1.battingTeam)} won by ${a - b} runs.` };
}
function payload(status) {
  return {
    status, scorecard: snapshot(), innings: state.innings, currentInnings: state.innings,
    currentOver: Math.floor(state.balls / 6), currentBall: state.balls % 6,
    totalRuns: state.runs, totalWickets: state.wickets, currentRuns: state.runs,
    currentWickets: state.wickets, currentOvers: overs(state.balls), ...scores(),
    updatedAt: serverTimestamp()
  };
}
async function persist(status = "LIVE", extra = {}) {
  if (!matchRef) throw new Error("Match document missing.");
  const data = { ...payload(status), ...extra, updatedAt: serverTimestamp() };
  await updateDoc(matchRef, data);
  match = { ...match, ...data, status };
}
async function autosave() {
  if (!matchRef || !match || saving) { if (saving) saveAgain = true; return; }
  saving = true;
  try {
    await persist(matchEnded() ? "COMPLETED" : "LIVE", { innings1, innings2 });
    say("Score Firebase mein save ho gaya.", "success");
  } catch (e) {
    console.error(e); say(`Save failed: ${e.message}. Firebase rules aur match document check karein.`, "error");
  } finally {
    saving = false;
    if (saveAgain) { saveAgain = false; autosave(); }
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 500);
}
function undo() {
  if (!history.length) { say("Undo karne ke liye action nahi hai.", "warning"); return; }
  const old = history.pop();
  state = old.state; innings1 = old.innings1; innings2 = old.innings2;
  refreshUI(); scheduleSave(); say("Last action undo ho gaya.", "success");
}
function swap() {
  if (!state || matchEnded() || inningsEnded()) return;
  saveUndoPoint(); rotateStrike(); refreshUI(); scheduleSave();
}
function setBatter(which, name) {
  if (!name) return;
  const other = which === "striker" ? state.nonStriker.name : state.striker.name;
  if (name === other) { say("Striker aur non-striker alag hone chahiye.", "warning"); refreshDropdowns(); return; }
  if ((state.dismissedPlayers || []).includes(name)) { say("Out batter dobara select nahi ho sakta.", "warning"); refreshDropdowns(); return; }
  saveUndoPoint();
  ensureBatter(name);
  state[which] = { ...newBatter(name), ...state.battingStats[name] };
  refreshUI(); scheduleSave();
}
function setupButtons() {
  $$(".run-btn").forEach(b => b.addEventListener("click", () => addRuns(b.dataset.runs)));
  $("#wideBtn")?.addEventListener("click", () => addExtra("wide"));
  $("#noBallBtn")?.addEventListener("click", () => addExtra("noBall"));
  $("#byeBtn")?.addEventListener("click", () => addExtra("bye"));
  $("#legByeBtn")?.addEventListener("click", () => addExtra("legBye"));
  $("#wicketBtn")?.addEventListener("click", showWicketDialog);
  $("#undoBtn")?.addEventListener("click", undo);
  $("#swapBtn")?.addEventListener("click", swap);
  $("#saveBtn")?.addEventListener("click", autosave);
  $("#strikerSelect")?.addEventListener("change", e => setBatter("striker", e.target.value));
  $("#nonStrikerSelect")?.addEventListener("change", e => setBatter("nonStriker", e.target.value));
  $("#bowlerSelect")?.addEventListener("change", e => {
    const name = e.target.value;
    if (!name || name === state.bowler.name) return;
    saveUndoPoint();
    ensureBowler(name);
    state.bowler = { ...newBowler(name), ...state.bowlingStats[name] };
    refreshUI(); scheduleSave();
  });
  $("#startSecondInningsBtn")?.addEventListener("click", startSecondInnings);
  $("#endMatchBtn")?.addEventListener("click", endInningsOrMatch);
  $("#nextMatchBtn")?.addEventListener("click", () => {
    location.href = `schedule.html?id=${encodeURIComponent(tournamentId)}`;
  });
  const pages = { "#tournamentLink": "tournament.html", "#scheduleLink": "schedule.html", "#resultsLink": "results.html", "#pointsLink": "points.html" };
  Object.entries(pages).forEach(([selector, page]) => $(selector)?.addEventListener("click", e => {
    e.preventDefault(); location.href = `${page}?id=${encodeURIComponent(tournamentId)}`;
  }));
}
async function startSecondInnings() {
  if (!match || matchEnded()) { say("Match already completed.", "warning"); return; }
  if (state.innings !== 1) { say("Second innings already started.", "warning"); return; }
  if (!inningsEnded() && !confirm("First innings complete nahi hui. Phir bhi start karein?")) return;
  state.status = "COMPLETED";
  innings1 = snapshot();
  const side = innings1.battingTeam === "A" ? "B" : "A";
  state = newInnings(2, side);
  state.striker = newBatter();
  state.nonStriker = newBatter();
  state.bowler = newBowler();
  innings2 = null; history = [];
  try {
    await persist("LIVE", { innings1, innings2: null, winner: "", result: "Second innings in progress." });
    refreshUI(); say("Second innings started. Batters aur bowler select karein.", "success");
  } catch (e) { console.error(e); say(`Second innings save failed: ${e.message}`, "error"); }
}
async function endInningsOrMatch() {
  if (!match || matchEnded()) return;
  if (state.innings === 1) {
    if (!confirm("First innings end karein?")) return;
    state.status = "COMPLETED"; innings1 = snapshot();
    try {
      await persist("LIVE", { innings1, innings2: null, winner: "", result: "First innings completed." });
      refreshUI(); say("First innings complete. Start 2nd Innings dabayein.", "success");
    } catch (e) { console.error(e); say(`Save failed: ${e.message}`, "error"); }
    return;
  }
  if (!confirm("Match complete karke result publish karein?")) return;
  state.status = "COMPLETED"; innings2 = snapshot();
  const result = resultForMatch();
  try {
    await persist("COMPLETED", { innings1, innings2, winner: result.winner, result: result.result, completedAt: serverTimestamp() });
    match.status = "COMPLETED"; refreshUI(); say(result.result, "success");
  } catch (e) { console.error(e); say(`Match result save failed: ${e.message}`, "error"); }
}
async function loadScorecard() {
  if (!tournamentId || !matchId) {
    say("Tournament ID ya Match ID missing. Schedule se scorecard kholein.", "error"); return;
  }
  try {
    matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
    const [ts, ms] = await Promise.all([
      getDoc(doc(db, "tournaments", tournamentId)), getDoc(matchRef)
    ]);
    if (!ts.exists()) throw new Error("Tournament document nahi mila.");
    if (!ms.exists()) throw new Error("Match document nahi mila.");
    tournament = { id: ts.id, ...ts.data() };
    match = { id: ms.id, ...ms.data() };
    await loadPlayers();

    innings1 = match.innings1 || null;
    innings2 = match.innings2 || null;
    const raw = match.scorecard || innings2 || innings1;
    if (raw) {
      state = {
        ...newInnings(num(raw.innings) || 1, raw.battingTeam || "A"), ...raw,
        striker: { ...newBatter(), ...(raw.striker || {}) },
        nonStriker: { ...newBatter(), ...(raw.nonStriker || {}) },
        bowler: { ...newBowler(), ...(raw.bowler || {}) },
        extras: { ...newInnings().extras, ...(raw.extras || {}) },
        battingStats: raw.battingStats || {}, bowlingStats: raw.bowlingStats || {},
        dismissedPlayers: raw.dismissedPlayers || raw.dismissals?.map(d => d.batter) || [],
        dismissals: raw.dismissals || [], fallOfWickets: raw.fallOfWickets || [],
        currentOverRuns: raw.currentOverRuns || [], ballLog: raw.ballLog || []
      };
    } else {
      state = newInnings(1, match.firstBattingTeam === "B" ? "B" : "A");
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
    setupButtons();
    refreshUI();
    say(matchEnded() ? "Match completed; scoring locked." : "Scorecard loaded.", "success");
  } catch (e) {
    console.error("Scorecard load failed:", e);
    say(`Scorecard load failed: ${e.message}`, "error");
  }
}

setupButtons();
say("Loading APL scorecard...");
loadScorecard();
