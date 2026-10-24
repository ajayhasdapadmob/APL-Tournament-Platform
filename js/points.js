
import { db } from "../firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);

let tournamentId =
  params.get("tournamentId") ||
  params.get("id") ||
  localStorage.getItem("aplTournamentId") ||
  sessionStorage.getItem("aplTournamentId");

let teams = [];
let matches = [];

function clean(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return clean(v).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function esc(v) {
  return clean(v).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function teamName(t) {
  return clean(t.teamName || t.name || t.team || t.nameOfTeam);
}

function teamId(t) {
  return clean(t.id || t.teamId || t.teamID);
}

function isDeleted(t) {
  return t?.deleted === true || t?.isDeleted === true;
}

function readTeam(match, side) {
  const upper = side.toUpperCase();
  const num = side === "A" ? "1" : "2";

  return {
    id: clean(
      match[`team${upper}Id`] ||
      match[`team${num}Id`] ||
      match[`team${upper}`] ||
      match[`team${num}`] ||
      ""
    ),
    name: clean(
      match[`team${upper}Name`] ||
      match[`team${num}Name`] ||
      (typeof match[`team${upper}`] === "string"
        ? match[`team${upper}`] : "") ||
      (typeof match[`team${num}`] === "string"
        ? match[`team${num}`] : "")
    )
  };
}

function findTeam(ref) {
  return teams.find((t) =>
    (ref.id && norm(teamId(t)) === norm(ref.id)) ||
    (ref.name && norm(teamName(t)) === norm(ref.name))
  );
}

function scoreRuns(value) {
  if (typeof value === "number") return value;

  const match = clean(value).match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function scoreWickets(value) {
  const match = clean(value).match(/^\d+\s*\/\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function ballsFromOvers(value) {
  if (value === undefined || value === null || value === "") return 0;

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;

  const whole = Math.floor(n);
  const fraction = Math.round((n - whole) * 10);

  if (fraction >= 0 && fraction <= 5 && n % 1 !== 0) {
    return whole * 6 + fraction;
  }

  return Math.round(n * 6);
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function getInnings(match) {
  if (Array.isArray(match.innings)) return match.innings;
  if (Array.isArray(match.scorecard?.innings)) return match.scorecard.innings;
  return [];
}

function getTeamInnings(match, ref) {
  const innings = getInnings(match);

  return innings.find((inn) =>
    (ref.id && norm(inn.battingTeamId) === norm(ref.id)) ||
    (ref.name && norm(inn.battingTeamName) === norm(ref.name))
  );
}

function getInningsRuns(match, ref, fallback) {
  const inn = getTeamInnings(match, ref);
  if (inn) return Number(inn.runs) || 0;
  return scoreRuns(fallback);
}

function getInningsBalls(match, ref) {
  const inn = getTeamInnings(match, ref);

  if (inn) {
    if (Number.isFinite(Number(inn.legalBalls))) {
      return Number(inn.legalBalls);
    }

    if (Number.isFinite(Number(inn.balls))) {
      return Number(inn.balls);
    }
  }

  return 0;
}

function isCompleted(match) {
  const status = norm(match.status);
  return [
    "completed",
    "complete",
    "finished",
    "result",
    "ended"
  ].includes(status) || Boolean(clean(match.result));
}

function isNoResult(match) {
  const result = norm(match.result || match.status);
  return result.includes("noresult") ||
    result.includes("abandoned") ||
    result.includes("cancelled");
}

function isTie(match) {
  const result = norm(match.result);
  return result.includes("tie") ||
    result.includes("tied") ||
    result.includes("draw");
}

function calculateNRR(runsFor, ballsFor, runsAgainst, ballsAgainst) {
  if (ballsFor <= 0 || ballsAgainst <= 0) return 0;

  return (
    (runsFor * 6 / ballsFor) -
    (runsAgainst * 6 / ballsAgainst)
  );
}

function makeRows() {
  const rows = new Map();

  teams.forEach((team) => {
    rows.set(teamId(team), {
      id: teamId(team),
      name: teamName(team),
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsFor: 0,
      runsAgainst: 0,
      ballsFor: 0,
      ballsAgainst: 0,
      nrr: 0
    });
  });

  for (const match of matches) {
    if (!isCompleted(match)) continue;

    const refA = readTeam(match, "A");
    const refB = readTeam(match, "B");

    const teamA = findTeam(refA);
    const teamB = findTeam(refB);

    if (!teamA || !teamB) continue;

    const rowA = rows.get(teamId(teamA));
    const rowB = rows.get(teamId(teamB));

    if (!rowA || !rowB) continue;

    if (isNoResult(match)) {
      rowA.played++;
      rowB.played++;
      rowA.noResult++;
      rowB.noResult++;
      rowA.points++;
      rowB.points++;
      continue;
    }

    const scoreA = match.scoreA ?? "0/0";
    const scoreB = match.scoreB ?? "0/0";

    const runsA = getInningsRuns(match, refA, scoreA);
    const runsB = getInningsRuns(match, refB, scoreB);

    const ballsA = getInningsBalls(match, refA);
    const ballsB = getInningsBalls(match, refB);

    rowA.played++;
    rowB.played++;

    rowA.runsFor += runsA;
    rowA.runsAgainst += runsB;
    rowB.runsFor += runsB;
    rowB.runsAgainst += runsA;

    rowA.ballsFor += ballsA;
    rowA.ballsAgainst += ballsB;
    rowB.ballsFor += ballsB;
    rowB.ballsAgainst += ballsA;

    if (isTie(match) || runsA === runsB) {
      rowA.tied++;
      rowB.tied++;
      rowA.points++;
      rowB.points++;
      continue;
    }

    const winnerText = norm(match.winner || "");
    const winnerIsA =
      (winnerText && (
        winnerText === norm(teamName(teamA)) ||
        winnerText === norm(teamId(teamA))
      ));

    const winnerIsB =
      (winnerText && (
        winnerText === norm(teamName(teamB)) ||
        winnerText === norm(teamId(teamB))
      ));

    if (winnerIsA || (!winnerIsB && runsA > runsB)) {
      rowA.won++;
      rowB.lost++;
      rowA.points += 2;
    } else {
      rowB.won++;
      rowA.lost++;
      rowB.points += 2;
    }
  }

  const result = [...rows.values()];

  result.forEach((row) => {
    row.nrr = calculateNRR(
      row.runsFor,
      row.ballsFor,
      row.runsAgainst,
      row.ballsAgainst
    );
  });

  result.sort((a, b) =>
    b.points - a.points ||
    b.nrr - a.nrr ||
    b.won - a.won ||
    a.name.localeCompare(b.name)
  );

  return result;
}

function renderTable(rows) {
  const body =
    $("pointsTableBody") ||
    $("pointsTable")?.querySelector("tbody");

  if (!body) {
    console.warn("Points table tbody not found.");
    return;
  }

  body.innerHTML = rows.map((r, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${esc(r.name)}</td>
      <td>${r.played}</td>
      <td>${r.won}</td>
      <td>${r.lost}</td>
      <td>${r.tied}</td>
      <td>${r.noResult}</td>
      <td><strong>${r.points}</strong></td>
      <td>${r.nrr.toFixed(3)}</td>
    </tr>
  `).join("");
}

function renderMessage(message, isError = false) {
  const el = $("message") || $("pointsMessage");
  if (!el) return;

  el.textContent = message;
  el.style.color = isError ? "#dc2626" : "";
}

async function loadTournamentList() {
  const select = $("tournamentSelect");
  if (!select) return;

  const snapshot = await getDocs(collection(db, "tournaments"));

  const tournamentList = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !isDeleted(t));

  select.innerHTML =
    '<option value="">-- Select Tournament --</option>' +
    tournamentList.map((t) => `
      <option value="${esc(t.id)}">
        ${esc(t.name || t.tournamentName || t.id)}
      </option>
    `).join("");

  if (tournamentId && tournamentList.some((t) => t.id === tournamentId)) {
    select.value = tournamentId;
    await loadPoints(tournamentId);
  }
}

async function loadPoints(id) {
  if (!id) {
    renderMessage("Pehle tournament select karein.", true);
    return;
  }

  tournamentId = id;
  localStorage.setItem("aplTournamentId", id);
  sessionStorage.setItem("aplTournamentId", id);

  const [teamSnap, matchSnap] = await Promise.all([
    getDocs(collection(db, "tournaments", id, "teams")),
    getDocs(collection(db, "tournaments", id, "matches"))
  ]);

  teams = teamSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !isDeleted(t) && teamName(t));

  matches = matchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const tournament = await import(
    "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
  ).then(({ doc, getDoc }) =>
    getDoc(doc(db, "tournaments", id))
  );

  if (tournament.exists()) {
    const data = tournament.data();
    if ($("tournamentName")) {
      $("tournamentName").textContent =
        data.name || data.tournamentName || "Points Table";
    }
  }

  const rows = makeRows();
  renderTable(rows);
  renderMessage(`Points table updated. ${rows.length} team(s) loaded.`);
}

function bindEvents() {
  $("tournamentSelect")?.addEventListener("change", async (event) => {
    try {
      await loadPoints(event.target.value);
    } catch (error) {
      console.error(error);
      renderMessage("Points table load nahi hui. Firebase rules check karein.", true);
    }
  });

  $("refreshPointsBtn")?.addEventListener("click", async () => {
    try {
      await loadPoints(tournamentId);
    } catch (error) {
      console.error(error);
      renderMessage("Refresh fail hua.", true);
    }
  });
}

async function init() {
  bindEvents();

  try {
    await loadTournamentList();
  } catch (error) {
    console.error("Points table initialization failed:", error);
    renderMessage("Points table load nahi hui.", true);
  }
}

init();
