
import { db, legacyDb } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   APL LIVE SCORING — COMPLETE REPLACEMENT
   Tournament data: apl-tournament-platform
   Registered players: ajay-premier-league-apl
========================================= */

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

const rosterFields = [
  "captainName",
  ...Array.from({ length: 14 }, (_, i) => `player${i + 2}`)
];

let matchData = {};
let teams = [];
let players = [];
let innings = [];
let inningsIndex = 0;
let striker = "";
let nonStriker = "";
let bowler = "";
let undoHistory = [];
let loadingFinished = false;

const status = (message) => {
  const el = $("matchInfo");
  if (el) el.textContent = message;
};

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function unique(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = normalise(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTeamName(team) {
  return team?.teamName ||
    team?.name ||
    team?.nameOfTeam ||
    team?.title ||
    team?.team ||
    "";
}

function getTeamId(team, id) {
  return String(
    team?.teamId ||
    team?.id ||
    team?.teamID ||
    id ||
    ""
  );
}

function ensurePlayerSelectors() {
  let section = $("registeredPlayerSelectors");

  if (!section) {
    section = document.createElement("section");
    section.id = "registeredPlayerSelectors";
    section.style.cssText =
      "padding:16px;margin:16px 0;border:1px solid #ccc;border-radius:12px;background:#fff;color:#111";

    const heading = document.createElement("h3");
    heading.textContent = "👥 Select Registered Players";
    section.appendChild(heading);

    const anchor =
      $("strikerRuns")?.closest("section") ||
      $("battingTeam")?.parentElement ||
      document.querySelector("main") ||
      document.body;

    anchor.parentNode.insertBefore(section, anchor.nextSibling);
  }

  const fields = [
    ["strikerSelect", "⭐ Striker"],
    ["nonStrikerSelect", "Non-Striker"],
    ["bowlerSelect", "🎯 Current Bowler"]
  ];

  for (const [id, labelText] of fields) {
    if ($(id)) continue;

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    label.style.cssText = "display:block;margin:12px 0 5px;font-weight:bold";

    const select = document.createElement("select");
    select.id = id;
    select.style.cssText =
      "display:block;width:100%;padding:10px;border:1px solid #999;border-radius:8px";

    label.appendChild(document.createElement("span"));
    section.appendChild(label);
    section.appendChild(select);
  }

  let apply = $("applyPlayersBtn");
  if (!apply) {
    apply = document.createElement("button");
    apply.id = "applyPlayersBtn";
    apply.type = "button";
    apply.textContent = "Apply Players";
    apply.style.cssText =
      "margin-top:12px;padding:10px 16px;cursor:pointer";
    section.appendChild(apply);
  }

  apply.onclick = () => {
    striker = $("strikerSelect")?.value || "";
    nonStriker = $("nonStrikerSelect")?.value || "";
    bowler = $("bowlerSelect")?.value || "";

    if (!striker || !nonStriker || !bowler) {
      alert("Striker, Non-Striker aur Bowler select kijiye.");
      return;
    }

    if (striker === nonStriker) {
      alert("Striker aur Non-Striker alag players hone chahiye.");
      return;
    }

    render();
    saveScore(false);
  };
}

function getCurrentInnings() {
  return innings[inningsIndex];
}

function teamForCurrentInnings() {
  const inn = getCurrentInnings();
  if (!inn) return null;

  const teamId = String(inn.battingTeamId || "");
  const teamName = String(inn.battingTeamName || "");

  return teams.find((t) =>
    (teamId && t.id === teamId) ||
    (teamName && normalise(t.name) === normalise(teamName))
  ) || null;
}

function fieldingTeamForCurrentInnings() {
  const inn = getCurrentInnings();
  if (!inn) return null;

  const teamId = String(inn.bowlingTeamId || "");
  const teamName = String(inn.bowlingTeamName || "");

  return teams.find((t) =>
    (teamId && t.id === teamId) ||
    (teamName && normalise(t.name) === normalise(teamName))
  ) || null;
}

function playersForTeam(team) {
  if (!team) return [];

  const teamName = normalise(team.name);
  const teamId = String(team.id || "");

  return unique(players
    .filter((p) => {
      const sameId =
        teamId &&
        [p.teamId, p.registrationTeamId, p.registeredTeamId, p.aplTeamId]
          .some((id) => id && String(id) === teamId);

      const sameName =
        teamName &&
        [p.teamName, p.registeredTeamName, p.registrationTeamName]
          .some((name) => name && normalise(name) === teamName);

      return sameId || sameName;
    })
    .map((p) => p.name));
}

async function loadTeams() {
  const snap = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  teams = snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      name: getTeamName(data) || d.id
    };
  });

  return teams;
}

function addRosterPlayers(data, docId) {
  const teamName =
    data.teamName ||
    data.registeredTeamName ||
    data.registrationTeamName ||
    data.team ||
    "";

  const teamId =
    data.teamId ||
    data.registrationTeamId ||
    data.registeredTeamId ||
    data.aplTeamId ||
    "";

  for (const field of rosterFields) {
    const name = String(data[field] || "").trim();

    if (!name) continue;

    players.push({
      name,
      teamName,
      teamId: String(teamId),
      registrationTeamId: String(data.registrationTeamId || ""),
      registeredTeamId: String(data.registeredTeamId || ""),
      aplTeamId: String(data.aplTeamId || ""),
      sourceDocumentId: docId
    });
  }

  // Also support documents that store one player per document.
  const singleName =
    data.playerName ||
    data.fullName ||
    data.name ||
    "";

  if (singleName) {
    players.push({
      name: String(singleName).trim(),
      teamName,
      teamId: String(teamId),
      registrationTeamId: String(data.registrationTeamId || ""),
      registeredTeamId: String(data.registeredTeamId || ""),
      aplTeamId: String(data.aplTeamId || ""),
      sourceDocumentId: docId
    });
  }
}

async function loadRegisteredPlayers() {
  players = [];

  // APL League registrations are stored in the LEGACY Firebase project.
  const snap = await getDocs(collection(legacyDb, "players"));

  snap.forEach((d) => addRosterPlayers(d.data(), d.id));

  // Support registrations saved directly in the Tournament Platform too.
  try {
    const tournamentPlayers = await getDocs(
      collection(db, "tournaments", tournamentId, "players")
    );

    tournamentPlayers.forEach((d) => addRosterPlayers(d.data(), d.id));
  } catch (error) {
    console.warn("Tournament players collection unavailable:", error.message);
  }

  players = players.filter((p) => p.name);
  players = players.filter((p, index, arr) =>
    arr.findIndex((x) =>
      normalise(x.name) === normalise(p.name) &&
      normalise(x.teamName) === normalise(p.teamName)
    ) === index
  );
}

function makeSelectOptions(select, list, placeholder, selected) {
  if (!select) return;

  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  list.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    select.appendChild(option);
  });

  if (selected && !list.includes(selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = selected;
    option.selected = true;
    select.appendChild(option);
  }
}

function refreshPlayerDropdowns() {
  ensurePlayerSelectors();

  const batTeam = teamForCurrentInnings();
  const bowlTeam = fieldingTeamForCurrentInnings();

  const batters = playersForTeam(batTeam);
  const bowlers = playersForTeam(bowlTeam);

  makeSelectOptions(
    $("strikerSelect"),
    batters,
    batters.length ? "Select striker" : "No registered players found for batting team",
    striker
  );

  makeSelectOptions(
    $("nonStrikerSelect"),
    batters,
    batters.length ? "Select non-striker" : "No registered players found for batting team",
    nonStriker
  );

  makeSelectOptions(
    $("bowlerSelect"),
    bowlers,
    bowlers.length ? "Select bowler" : "No registered players found for bowling team",
    bowler
  );

  const section = $("registeredPlayerSelectors");
  if (section) {
    let message = $("playerLoadMessage");

    if (!message) {
      message = document.createElement("p");
      message.id = "playerLoadMessage";
      section.appendChild(message);
    }

    message.textContent = players.length
      ? `Registered players found: ${players.length}. Batting team: ${batTeam?.name || "not identified"}; Bowling team: ${bowlTeam?.name || "not identified"}.`
      : "APL League ke players nahi mile. Firebase project, collection aur permissions check karein.";
  }
}

function makeNewInnings(battingTeam, bowlingTeam) {
  return {
    battingTeamId: battingTeam?.id || "",
    battingTeamName: battingTeam?.name || "Team A",
    bowlingTeamId: bowlingTeam?.id || "",
    bowlingTeamName: bowlingTeam?.name || "Team B",
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    batters: {},
    bowlers: {},
    deliveries: [],
    fallOfWickets: [],
    yetToBat: [],
    completed: false
  };
}

function ensurePlayerStats(inn) {
  if (!inn.batters) inn.batters = {};
  if (!inn.bowlers) inn.bowlers = {};
  if (!inn.deliveries) inn.deliveries = [];
  if (!inn.fallOfWickets) inn.fallOfWickets = [];

  [striker, nonStriker].filter(Boolean).forEach((name) => {
    if (!inn.batters[name]) {
      inn.batters[name] = {
        runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: ""
      };
    }
  });

  if (bowler && !inn.bowlers[bowler]) {
    inn.bowlers[bowler] = {
      runs: 0, wickets: 0, legalBalls: 0, wides: 0, noBalls: 0, maidens: 0
    };
  }
}

function snapshot() {
  undoHistory.push(JSON.stringify({
    innings,
    inningsIndex,
    striker,
    nonStriker,
    bowler
  }));

  if (undoHistory.length > 30) undoHistory.shift();
}

function oversText(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function strikeRate(runs, balls) {
  return balls ? (runs * 100 / balls).toFixed(2) : "0.00";
}

function economy(runs, balls) {
  return balls ? (runs * 6 / balls).toFixed(2) : "0.00";
}

function updateText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function render() {
  const inn = getCurrentInnings();
  if (!inn) return;

  ensurePlayerStats(inn);

  updateText("matchId", matchId || "Match ID missing");
  updateText("battingTeam", inn.battingTeamName || "Team A");
  updateText("score", `${inn.runs}/${inn.wickets}`);
  updateText("overs", `${oversText(inn.legalBalls)} Overs`);
  updateText(
    "crr",
    `CRR: ${inn.legalBalls ? (inn.runs * 6 / inn.legalBalls).toFixed(2) : "0.00"}`
  );

  const batter1 = inn.batters[striker] || {};
  const batter2 = inn.batters[nonStriker] || {};
  const bowl = inn.bowlers[bowler] || {};

  updateText("strikerRuns", batter1.runs || 0);
  updateText("strikerBalls", batter1.balls || 0);
  updateText("strikerSR", strikeRate(batter1.runs || 0, batter1.balls || 0));

  updateText("nonStrikerRuns", batter2.runs || 0);
  updateText("nonStrikerBalls", batter2.balls || 0);
  updateText("nonStrikerSR", strikeRate(batter2.runs || 0, batter2.balls || 0));

  updateText("bowlerName", bowler || "Select bowler");
  updateText("bowlerOvers", oversText(bowl.legalBalls || 0));
  updateText("bowlerRuns", bowl.runs || 0);
  updateText("bowlerWickets", bowl.wickets || 0);

  updateText(
    "currentOver",
    (inn.deliveries || []).slice(-6).map((d) => d.label).join(" ") || "-"
  );

  refreshPlayerDropdowns();
  renderScorecardTables(inn);
}

function renderScorecardTables(inn) {
  const bats = Object.entries(inn.batters || {});
  const bowls = Object.entries(inn.bowlers || {});

  let battingTable = $("battingScorecardTable");
  let bowlingTable = $("bowlingScorecardTable");

  if (!battingTable) {
    const heading = [...document.querySelectorAll("h2,h3")]
      .find((e) => /batting scorecard/i.test(e.textContent));

    if (heading) {
      battingTable = document.createElement("table");
      battingTable.id = "battingScorecardTable";
      heading.insertAdjacentElement("afterend", battingTable);
    }
  }

  if (!bowlingTable) {
    const heading = [...document.querySelectorAll("h2,h3")]
      .find((e) => /bowling scorecard/i.test(e.textContent));

    if (heading) {
      bowlingTable = document.createElement("table");
      bowlingTable.id = "bowlingScorecardTable";
      heading.insertAdjacentElement("afterend", bowlingTable);
    }
  }

  if (battingTable) {
    battingTable.innerHTML =
      "<thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>";

    const body = document.createElement("tbody");

    bats.forEach(([name, s]) => {
      const row = document.createElement("tr");
      [
        name,
        s.dismissal || (s.out ? "Out" : "Not out"),
        s.runs || 0,
        s.balls || 0,
        s.fours || 0,
        s.sixes || 0,
        strikeRate(s.runs || 0, s.balls || 0)
      ].forEach((v) => {
        const cell = document.createElement("td");
        cell.textContent = v;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    battingTable.appendChild(body);
  }

  if (bowlingTable) {
    bowlingTable.innerHTML =
      "<thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Wd</th><th>NB</th><th>Eco</th></tr></thead>";

    const body = document.createElement("tbody");

    bowls.forEach(([name, s]) => {
      const row = document.createElement("tr");
      [
        name,
        oversText(s.legalBalls || 0),
        s.runs || 0,
        s.wickets || 0,
        s.wides || 0,
        s.noBalls || 0,
        economy(s.runs || 0, s.legalBalls || 0)
      ].forEach((v) => {
        const cell = document.createElement("td");
        cell.textContent = v;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    bowlingTable.appendChild(body);
  }
}

async function loadMatch() {
  if (!tournamentId || !matchId) {
    throw new Error("URL mein tournamentId ya matchId missing hai.");
  }

  const ref = doc(db, "tournaments", tournamentId, "matches", matchId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "Match document Firestore mein nahi mila: tournaments/" +
      tournamentId + "/matches/" + matchId
    );
  }

  matchData = { ...snap.data(), id: snap.id };

  if (Array.isArray(matchData.innings) && matchData.innings.length) {
    innings = matchData.innings;
    inningsIndex = Math.min(
      Number(matchData.currentInningsIndex || 0),
      innings.length - 1
    );
  } else if (matchData.scorecard && Array.isArray(matchData.scorecard.innings)) {
    innings = matchData.scorecard.innings;
    inningsIndex = Number(matchData.scorecard.currentInningsIndex || 0);
  } else {
    const teamAId = String(
      matchData.teamAId || matchData.team1Id ||
      matchData.homeTeamId || matchData.battingTeamId || ""
    );

    const teamBId = String(
      matchData.teamBId || matchData.team2Id ||
      matchData.awayTeamId || matchData.bowlingTeamId || ""
    );

    const teamAName = matchData.teamAName || matchData.team1Name ||
      matchData.homeTeamName || matchData.teamA || "Team A";

    const teamBName = matchData.teamBName || matchData.team2Name ||
      matchData.awayTeamName || matchData.teamB || "Team B";

    const a = teams.find((t) => t.id === teamAId ||
      normalise(t.name) === normalise(teamAName));

    const b = teams.find((t) => t.id === teamBId ||
      normalise(t.name) === normalise(teamBName));

    innings = [makeNewInnings(
      a || { id: teamAId, name: teamAName },
      b || { id: teamBId, name: teamBName }
    )];

    inningsIndex = 0;
  }

  if (!innings.length) {
    throw new Error("Match mein innings data nahi hai.");
  }

  status(
    `${matchData.teamAName || matchData.team1Name || "APL Match"} — ${matchData.status || "Ready"}`
  );

  const link = $("tournamentLink");
  if (link) link.href = `./index.html?tournamentId=${encodeURIComponent(tournamentId)}`;

  const schedule = $("scheduleLink");
  if (schedule) schedule.href =
    `./schedule.html?tournamentId=${encodeURIComponent(tournamentId)}`;

  const results = $("resultsLink");
  if (results) results.href =
    `./results.html?tournamentId=${encodeURIComponent(tournamentId)}`;

  const points = $("pointsLink");
  if (points) points.href =
    `./points-table.html?tournamentId=${encodeURIComponent(tournamentId)}`;
}

async function saveScore(showMessage = true) {
  if (!tournamentId || !matchId || !innings.length) return;

  try {
    const ref = doc(db, "tournaments", tournamentId, "matches", matchId);

    await updateDoc(ref, {
      innings,
      currentInningsIndex: inningsIndex,
      scorecard: {
        innings,
        currentInningsIndex: inningsIndex
      },
      scoreA: innings[0]?.runs || 0,
      scoreB: innings[1]?.runs || 0,
      status: getCurrentInnings()?.completed ? "Completed" : "Live",
      updatedAt: serverTimestamp()
    });

    if (showMessage) alert("Score successfully saved.");
  } catch (error) {
    console.error("Score save failed:", error);
    if (showMessage) {
      alert("Score save nahi hua: " + error.message);
    }
  }
}

function recordBall(runs = 0, type = "normal") {
  const inn = getCurrentInnings();

  if (!inn || inn.completed) {
    alert("Innings complete hai ya load nahi hui.");
    return;
  }

  if (!striker || !nonStriker || !bowler) {
    alert("Pehle striker, non-striker aur bowler select kijiye.");
    return;
  }

  snapshot();
  ensurePlayerStats(inn);

  const bat = inn.batters[striker];
  const bowl = inn.bowlers[bowler];

  const isWide = type === "wide";
  const isNoBall = type === "noball";
  const isBye = type === "bye";
  const isLegBye = type === "legbye";
  const legal = !isWide && !isNoBall;
  const batterRuns = (isWide || isNoBall || isBye || isLegBye) ? 0 : runs;

  let totalRuns = runs;

  if (isWide) {
    totalRuns = Math.max(1, runs);
    bowl.wides += 1;
  }

  if (isNoBall) {
    totalRuns = Math.max(1, runs);
    bowl.noBalls += 1;
  }

  if (isBye || isLegBye) {
    totalRuns = Math.max(1, runs);
  }

  inn.runs += totalRuns;
  bowl.runs += totalRuns;

  if (!isWide && !isNoBall && !isBye && !isLegBye) {
    bat.runs += batterRuns;
    bat.balls += 1;
    if (batterRuns === 4) bat.fours += 1;
    if (batterRuns === 6) bat.sixes += 1;
  }

  if (legal) {
    inn.legalBalls += 1;
    bowl.legalBalls += 1;
  }

  const label = isWide ? `Wd${totalRuns}` :
    isNoBall ? `Nb${totalRuns}` :
    isBye ? `B${totalRuns}` :
    isLegBye ? `Lb${totalRuns}` : String(runs);

  inn.deliveries.push({ label, runs: totalRuns, type, striker, bowler });

  if (legal && totalRuns % 2 === 1) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  if (inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  render();
}

function recordWicket() {
  const inn = getCurrentInnings();
  if (!inn || inn.completed) return;

  if (!striker || !bowler) {
    alert("Pehle striker aur bowler select kijiye.");
    return;
  }

  snapshot();
  ensurePlayerStats(inn);

  inn.wickets += 1;
  inn.legalBalls += 1;
  inn.bowlers[bowler].legalBalls += 1;
  inn.bowlers[bowler].wickets += 1;

  inn.batters[striker].balls += 1;
  inn.batters[striker].out = true;
  inn.batters[striker].dismissal = `b ${bowler}`;

  inn.fallOfWickets.push({
    wicket: inn.wickets,
    score: inn.runs,
    overs: oversText(inn.legalBalls),
    batter: striker
  });

  inn.deliveries.push({ label: "W", type: "wicket", striker, bowler });

  striker = "";
  render();
}

function bindButton(id, fn) {
  const el = $(id);
  if (el) el.onclick = fn;
}

function bindScoringButtons() {
  document.querySelectorAll("[data-runs]").forEach((button) => {
    button.onclick = () => recordBall(Number(button.dataset.runs || 0));
  });

  bindButton("wideBtn", () => recordBall(1, "wide"));
  bindButton("noBallBtn", () => recordBall(1, "noball"));
  bindButton("byeBtn", () => recordBall(1, "bye"));
  bindButton("legByeBtn", () => recordBall(1, "legbye"));
  bindButton("wicketBtn", recordWicket);

  bindButton("undoBtn", () => {
    const previous = undoHistory.pop();
    if (!previous) return alert("Undo ke liye score history nahi hai.");

    const state = JSON.parse(previous);
    innings = state.innings;
    inningsIndex = state.inningsIndex;
    striker = state.striker;
    nonStriker = state.nonStriker;
    bowler = state.bowler;
    render();
  });

  bindButton("swapBtn", () => {
    [striker, nonStriker] = [nonStriker, striker];
    render();
  });

  bindButton("saveBtn", () => saveScore(true));

  bindButton("endMatchBtn", async () => {
    const inn = getCurrentInnings();
    if (!inn) return;

    if (!confirm("Current innings ko complete mark karein?")) return;

    inn.completed = true;
    await saveScore(false);
    render();
    alert("Innings completed.");
  });

  bindButton("startSecondInningsBtn", async () => {
    if (innings.length >= 2) {
      inningsIndex = 1;
      striker = "";
      nonStriker = "";
      bowler = "";
      render();
      return;
    }

    const first = getCurrentInnings();
    if (!first) return;

    const batting = teams.find((t) => t.id === first.bowlingTeamId) ||
      { id: first.bowlingTeamId, name: first.bowlingTeamName };

    const bowling = teams.find((t) => t.id === first.battingTeamId) ||
      { id: first.battingTeamId, name: first.battingTeamName };

    innings.push(makeNewInnings(batting, bowling));
    inningsIndex = 1;
    striker = "";
    nonStriker = "";
    bowler = "";
    render();
    await saveScore(false);
  });

  bindButton("nextMatchBtn", () => {
    location.href = `./schedule.html?tournamentId=${encodeURIComponent(tournamentId || "")}`;
  });
}

async function init() {
  ensurePlayerSelectors();
  bindScoringButtons();

  try {
    status("Loading match and registered players...");

    if (!db || !legacyDb) {
      throw new Error("firebase.js mein db aur legacyDb export check karein.");
    }

    if (!tournamentId || !matchId) {
      throw new Error("URL mein tournamentId/matchId nahi mila.");
    }

    await loadTeams();
    await loadMatch();
    await loadRegisteredPlayers();

    refreshPlayerDropdowns();
    render();

    loadingFinished = true;
    status(`Match loaded: ${matchData.status || "Ready"}`);
    console.log("APL scoring loaded", {
      tournamentId,
      matchId,
      teams: teams.length,
      registeredPlayers: players.length
    });

    if (!players.length) {
      console.warn(
        "No registered players found. Check the legacyDb project and players collection."
      );
    }
  } catch (error) {
    console.error("APL Live Scoring load error:", error);
    status("Loading failed: " + error.message);

    const section = $("registeredPlayerSelectors");
    if (section) {
      let message = $("playerLoadMessage");
      if (!message) {
        message = document.createElement("p");
        message.id = "playerLoadMessage";
        section.appendChild(message);
      }
      message.textContent = "Error: " + error.message;
    }

    alert("APL Live Scoring load error:\n" + error.message);
  }
}

init();
