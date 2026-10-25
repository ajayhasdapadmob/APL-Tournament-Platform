
import { db } from "../firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);

const state = {
  tournaments: [],
  teams: [],
  matches: [],
  tournamentId:
    params.get("tournamentId") ||
    params.get("id") ||
    localStorage.getItem("aplTournamentId") ||
    sessionStorage.getItem("aplTournamentId") ||
    ""
};

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeHTML(value) {
  return text(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function showMessage(message, isError = false) {
  const el = $("scheduleMessage") || $("message");

  if (el) {
    el.textContent = message;
    el.style.color = isError ? "#dc2626" : "#15803d";
  }

  console[isError ? "error" : "log"](message);
}

function teamName(team) {
  return text(
    team.teamName ||
    team.name ||
    team.team ||
    team.nameOfTeam
  );
}

function teamId(team) {
  return text(team.id || team.teamId || team.teamID);
}

function isDeleted(data) {
  return data?.isDeleted === true || data?.deleted === true;
}

function isEligible(team) {
  const name = teamName(team);
  const status = normalize(
    team.status || team.registrationStatus || ""
  );
  const payment = normalize(team.paymentStatus || "");

  if (!name || isDeleted(team)) return false;

  if ([
    "rejected",
    "cancelled",
    "canceled",
    "deleted",
    "pending",
    "unapproved"
  ].includes(status)) {
    return false;
  }

  if (payment === "unpaid" && status !== "approved") {
    return false;
  }

  return true;
}

/* ---------------- TOURNAMENTS ---------------- */

async function loadTournaments() {
  const select = $("tournamentSelect");

  if (!select) {
    throw new Error("HTML mein tournamentSelect element nahi mila.");
  }

  showMessage("Loading tournaments...");

  const snapshot = await getDocs(
    collection(db, "tournaments")
  );

  state.tournaments = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((tournament) => !isDeleted(tournament));

  select.innerHTML =
    '<option value="">-- Select Tournament --</option>' +
    state.tournaments.map((tournament) => `
      <option value="${escapeHTML(tournament.id)}">
        ${escapeHTML(
          tournament.name ||
          tournament.tournamentName ||
          tournament.id
        )}
      </option>
    `).join("");

  if (
    state.tournamentId &&
    state.tournaments.some(
      (tournament) => tournament.id === state.tournamentId
    )
  ) {
    select.value = state.tournamentId;
    await loadTournament(state.tournamentId);
  } else {
    state.tournamentId = "";
    state.teams = [];
    state.matches = [];
    renderTeams();
    renderMatches();
    showMessage("Tournament select karein.");
  }
}

/* ---------------- SELECTED TOURNAMENT ---------------- */

async function loadTournament(id) {
  const tournamentId = text(id);

  if (!tournamentId) {
    state.tournamentId = "";
    state.teams = [];
    state.matches = [];
    renderTeams();
    renderMatches();
    showMessage("Pehle tournament select karein.", true);
    return;
  }

  state.tournamentId = tournamentId;

  localStorage.setItem("aplTournamentId", tournamentId);
  sessionStorage.setItem("aplTournamentId", tournamentId);

  const tournament = state.tournaments.find(
    (item) => item.id === tournamentId
  );

  if (!tournament) {
    throw new Error("Selected tournament nahi mila.");
  }

  if ($("tournamentName")) {
    $("tournamentName").textContent =
      tournament.name ||
      tournament.tournamentName ||
      "Tournament Schedule";
  }

  if ($("tournamentId")) {
    $("tournamentId").textContent = tournamentId;
  }

  if ($("venue")) {
    $("venue").textContent = tournament.venue || "";
  }

  showMessage("Teams aur matches load ho rahe hain...");

  await Promise.all([
    loadTeams(tournamentId),
    loadMatches(tournamentId)
  ]);

  renderTeams();
  renderMatches();

  showMessage(
    `${state.teams.length} eligible team(s), ${state.matches.length} existing match(es).`
  );
}

/* ---------------- TEAMS ---------------- */

async function loadTeams(tournamentId) {
  // Correct Firestore collection path:
  // tournaments/{tournamentId}/teams
  const teamsRef = collection(
    db,
    "tournaments",
    String(tournamentId),
    "teams"
  );

  const snapshot = await getDocs(teamsRef);

  state.teams = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data()
    }))
    .filter((team) => isEligible(team));

  state.teams.sort((a, b) =>
    teamName(a).localeCompare(teamName(b))
  );

  console.log(
    "Tournament ID:",
    tournamentId,
    "| Teams read:",
    snapshot.size,
    "| Eligible teams:",
    state.teams.length
  );
}

function renderTeams() {
  const el = $("teamList") || $("teamsList");

  if (!el) return;

  if (!state.teams.length) {
    el.innerHTML = "<p>No eligible teams found.</p>";
    return;
  }

  el.innerHTML = state.teams.map((team, index) => `
    <div class="team-card">
      <strong>
        ${index + 1}. ${escapeHTML(teamName(team))}
      </strong>
    </div>
  `).join("");
}

/* ---------------- MATCHES ---------------- */

async function loadMatches(tournamentId) {
  // Correct Firestore collection path:
  // tournaments/{tournamentId}/matches
  const matchesRef = collection(
    db,
    "tournaments",
    String(tournamentId),
    "matches"
  );

  const snapshot = await getDocs(matchesRef);

  // Existing and completed matches are preserved.
  state.matches = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

function matchPair(match) {
  const a = normalize(
    match.teamAId ||
    match.team1Id ||
    match.teamA ||
    match.team1 ||
    ""
  );

  const b = normalize(
    match.teamBId ||
    match.team2Id ||
    match.teamB ||
    match.team2 ||
    ""
  );

  if (!a || !b) return null;

  return [a, b].sort().join("__");
}

function expectedPair(teamA, teamB) {
  const idA = normalize(teamId(teamA));
  const idB = normalize(teamId(teamB));

  if (!idA || !idB || idA === idB) return null;

  return [idA, idB].sort().join("__");
}

function resolveMatchTeam(match, side) {
  const upper = side.toUpperCase();
  const number = side === "A" ? "1" : "2";

  const id = text(
    match[`team${upper}Id`] ||
    match[`team${number}Id`] ||
    (typeof match[`team${upper}`] === "string"
      ? match[`team${upper}`]
      : "") ||
    (typeof match[`team${number}`] === "string"
      ? match[`team${number}`]
      : "")
  );

  const name = text(
    match[`team${upper}Name`] ||
    match[`team${number}Name`] ||
    (typeof match[`team${upper}`] === "string"
      ? match[`team${upper}`]
      : "") ||
    (typeof match[`team${number}`] === "string"
      ? match[`team${number}`]
      : "")
  );

  const team = state.teams.find(
    (item) => normalize(teamId(item)) === normalize(id)
  );

  return {
    id,
    name: name || (team ? teamName(team) : "") || id || "Unknown team"
  };
}

function renderMatches() {
  const el =
    $("matchList") ||
    $("matchesList") ||
    $("scheduleList");

  if (!el) return;

  const matches = [...state.matches].sort((a, b) => {
    const numberA = Number(a.matchNumber) || 0;
    const numberB = Number(b.matchNumber) || 0;

    return numberA - numberB;
  });

  if (!matches.length) {
    el.innerHTML = "<p>No matches created yet.</p>";
    return;
  }

  el.innerHTML = matches.map((match) => {
    const teamA = resolveMatchTeam(match, "A");
    const teamB = resolveMatchTeam(match, "B");

    return `
      <article class="match-card">
        <h3>Match ${escapeHTML(match.matchNumber || "")}</h3>
        <p>
          <strong>${escapeHTML(teamA.name)}</strong>
          vs
          <strong>${escapeHTML(teamB.name)}</strong>
        </p>
        <p>
          ${escapeHTML(match.matchDate || match.date || "Date not set")}
          ${escapeHTML(match.matchTime || match.time || "")}
        </p>
        <p>${escapeHTML(match.venue || match.matchVenue || "")}</p>
        <p>Status: ${escapeHTML(match.status || "Upcoming")}</p>
        <p>
          ${escapeHTML(match.scoreA || "0/0")}
          —
          ${escapeHTML(match.scoreB || "0/0")}
        </p>
        <button
          type="button"
          data-open-match="${escapeHTML(match.id)}">
          Open Scorecard
        </button>
      </article>
    `;
  }).join("");

  el.querySelectorAll("[data-open-match]").forEach((button) => {
    button.addEventListener("click", () => {
      const matchId = button.dataset.openMatch;

      localStorage.setItem("aplMatchId", matchId);
      sessionStorage.setItem("aplMatchId", matchId);

      const url = new URL("./scorecard.html", location.href);

      url.searchParams.set("tournamentId", state.tournamentId);
      url.searchParams.set("matchId", matchId);

      location.href = url.toString();
    });
  });
}

/* ---------------- ROUND-ROBIN GENERATOR ---------------- */

async function generateMatches() {
  const tournamentId = text(state.tournamentId);

  if (!tournamentId) {
    showMessage("Pehle tournament select karein.", true);
    return;
  }

  // Reload from Firestore at click time, not stale page state.
  await Promise.all([
    loadTeams(tournamentId),
    loadMatches(tournamentId)
  ]);

  renderTeams();
  renderMatches();

  console.log("Generate Matches diagnostics:", {
    tournamentId,
    eligibleTeams: state.teams.map((team) => ({
      id: teamId(team),
      name: teamName(team),
      status: team.status || team.registrationStatus || "",
      paymentStatus: team.paymentStatus || ""
    })),
    existingMatches: state.matches.length
  });

  if (state.teams.length < 2) {
    showMessage(
      `Sirf ${state.teams.length} eligible team mili. Registered Teams mein team status check karein. Console mein team diagnostics bhi dekhein.`,
      true
    );
    return;
  }

  const existingPairs = new Set();

  state.matches.forEach((match) => {
    const pair = matchPair(match);
    if (pair) existingPairs.add(pair);
  });

  const missing = [];

  for (let i = 0; i < state.teams.length; i++) {
    for (let j = i + 1; j < state.teams.length; j++) {
      const teamA = state.teams[i];
      const teamB = state.teams[j];

      const pair = expectedPair(teamA, teamB);

      if (!pair || existingPairs.has(pair)) continue;

      missing.push({ teamA, teamB, pair });
      existingPairs.add(pair);
    }
  }

  if (!missing.length) {
    showMessage(
      "Sabhi eligible team pairs ke fixtures pehle se maujood hain."
    );
    return;
  }

  const confirmed = confirm(
    `${state.teams.length} teams ke liye ${missing.length} naye fixtures banenge. Existing matches delete ya modify nahi honge. Continue?`
  );

  if (!confirmed) return;

  // IMPORTANT: db is the Firestore instance, followed by string path segments.
  const matchesRef = collection(
    db,
    "tournaments",
    tournamentId,
    "matches"
  );

  let nextNumber = state.matches.reduce((max, match) => {
    const number = Number(match.matchNumber);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0) + 1;

  let created = 0;

  for (const fixture of missing) {
    const teamA = fixture.teamA;
    const teamB = fixture.teamB;

    await addDoc(matchesRef, {
      tournamentId,

      matchNumber: nextNumber++,

      teamAId: teamId(teamA),
      teamAName: teamName(teamA),

      teamBId: teamId(teamB),
      teamBName: teamName(teamB),

      // Compatibility fields for existing scorecard code.
      team1Id: teamId(teamA),
      team1Name: teamName(teamA),

      team2Id: teamId(teamB),
      team2Name: teamName(teamB),

      matchDate: "",
      matchTime: "",
      venue: $("venue")?.textContent?.trim() || "",

      overs: 20,
      status: "Upcoming",

      scoreA: "0/0",
      scoreB: "0/0",

      winner: "",
      result: "",
      innings: [],

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    created++;
  }

  await loadMatches(tournamentId);
  renderMatches();

  showMessage(
    `Success! ${created} naye fixtures create hue. Existing matches safe rahe.`
  );
}

/* ---------------- BUTTON EVENTS ---------------- */

function bindEvents() {
  const tournamentSelect = $("tournamentSelect");

  tournamentSelect?.addEventListener("change", async (event) => {
    try {
      await loadTournament(event.target.value);
    } catch (error) {
      console.error("Tournament load error:", error);
      showMessage(
        `Tournament load nahi hua: ${error.message || error}`,
        true
      );
    }
  });

  const generateButton =
    $("generateMatchesBtn") ||
    $("generateScheduleBtn");

  if (generateButton) {
    generateButton.addEventListener("click", async () => {
      generateButton.disabled = true;

      try {
        await generateMatches();
      } catch (error) {
        console.error("Generate fixtures error:", error);

        showMessage(
          `Fixtures nahi bane: ${error.code || error.message || error}`,
          true
        );
      } finally {
        generateButton.disabled = false;
      }
    });
  } else {
    console.error("Generate Matches button HTML mein nahi mila.");
  }

  $("refreshScheduleBtn")?.addEventListener("click", async () => {
    try {
      if (state.tournamentId) {
        await loadTournament(state.tournamentId);
      } else {
        await loadTournaments();
      }

      showMessage("Schedule refreshed.");
    } catch (error) {
      console.error("Schedule refresh error:", error);

      showMessage(
        `Schedule refresh nahi hua: ${error.message || error}`,
        true
      );
    }
  });
}

/* ---------------- START ---------------- */

async function init() {
  bindEvents();

  try {
    await loadTournaments();
  } catch (error) {
    console.error("Schedule initialization error:", error);

    showMessage(
      `Schedule load nahi hua: ${error.code || error.message || error}`,
      true
    );
  }
}

init();
