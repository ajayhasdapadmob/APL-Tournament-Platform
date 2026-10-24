
import { db, auth } from "../firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const state = {
  tournamentId:
    params.get("tournamentId") ||
    params.get("id") ||
    localStorage.getItem("aplTournamentId") ||
    sessionStorage.getItem("aplTournamentId"),
  teams: []
};

function clean(v) {
  return String(v ?? "").trim();
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

function teamName(team) {
  return clean(team.teamName || team.name || team.team || team.nameOfTeam);
}

function teamId(team) {
  return clean(team.id || team.teamId || team.teamID);
}

function showMessage(message, error = false) {
  const el = $("message");
  if (el) {
    el.textContent = message;
    el.style.color = error ? "#dc2626" : "";
  }
  console[error ? "error" : "log"](message);
}

function isDeleted(data) {
  return data?.deleted === true || data?.isDeleted === true;
}

async function loadTournament() {
  if (!state.tournamentId) {
    showMessage("Pehle tournament select karein.", true);
    return;
  }

  const tournamentRef = doc(db, "tournaments", state.tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);

  if (!tournamentSnap.exists()) {
    showMessage("Tournament nahi mila.", true);
    return;
  }

  const tournament = tournamentSnap.data();

  if (isDeleted(tournament)) {
    showMessage("Yeh tournament archived hai.", true);
    return;
  }

  if ($("tournamentName")) {
    $("tournamentName").textContent =
      tournament.name || tournament.tournamentName || "Create Match";
  }

  if ($("tournamentId")) {
    $("tournamentId").textContent = state.tournamentId;
  }

  const teamSnap = await getDocs(
    collection(db, "tournaments", state.tournamentId, "teams")
  );

  state.teams = teamSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((team) => {
      if (isDeleted(team)) return false;

      const status = clean(
        team.status || team.registrationStatus || ""
      ).toLowerCase();

      return !["rejected", "cancelled", "canceled", "deleted"].includes(status);
    })
    .filter((team) => teamName(team));

  populateTeamSelect("team1", state.teams);
  populateTeamSelect("team2", state.teams);

  showMessage(`${state.teams.length} team(s) loaded.`);
}

function populateTeamSelect(id, teams) {
  const select = $(id);
  if (!select) return;

  select.innerHTML =
    '<option value="">-- Select Team --</option>' +
    teams.map((team) => `
      <option value="${esc(team.id)}">
        ${esc(teamName(team))}
      </option>
    `).join("");
}

function getSelectedTeam(id) {
  const select = $(id);
  if (!select?.value) return null;

  return state.teams.find((team) => team.id === select.value) || null;
}

function getMatchNumber() {
  const value = clean($("matchNumber")?.value);
  if (value) return value;

  const max = state.matches.reduce((highest, match) => {
    const n = Number(match.matchNumber);
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 0);

  return String(max + 1);
}

state.matches = [];

async function loadExistingMatches() {
  const snap = await getDocs(
    collection(db, "tournaments", state.tournamentId, "matches")
  );

  state.matches = snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
}

async function createMatch(event) {
  event.preventDefault();

  const form = $("createMatchForm") || $("matchForm");

  if (form?.dataset.submitting === "true") return;

  if (!state.tournamentId) {
    showMessage("Tournament ID missing hai.", true);
    return;
  }

  const teamA = getSelectedTeam("team1");
  const teamB = getSelectedTeam("team2");

  if (!teamA || !teamB) {
    showMessage("Dono teams select karein.", true);
    return;
  }

  if (teamA.id === teamB.id) {
    showMessage("Ek team apne khilaaf match nahi khel sakti.", true);
    return;
  }

  const date = clean($("matchDate")?.value);
  const time = clean($("matchTime")?.value);
  const overs = Number($("overs")?.value || 20);
  const venue = clean(
    $("venue")?.value ||
    $("matchVenue")?.value
  );

  if (!Number.isFinite(overs) || overs < 1 || overs > 100) {
    showMessage("Overs 1 se 100 ke beech enter karein.", true);
    return;
  }

  if (!date) {
    showMessage("Match date select karein.", true);
    return;
  }

  const matchNumber = getMatchNumber();

  const duplicateNumber = state.matches.some(
    (m) => clean(m.matchNumber) === matchNumber
  );

  if (duplicateNumber) {
    showMessage(
      `Match number ${matchNumber} pehle se maujood hai. Dusra number enter karein.`,
      true
    );
    return;
  }

  if (!confirm(
    `${teamName(teamA)} vs ${teamName(teamB)} match create karein?`
  )) {
    return;
  }

  const button = form?.querySelector('[type="submit"]');
  if (form) form.dataset.submitting = "true";
  if (button) button.disabled = true;

  try {
    const matchData = {
      tournamentId: state.tournamentId,

      matchNumber,

      teamAId: teamId(teamA),
      teamAName: teamName(teamA),
      teamBId: teamId(teamB),
      teamBName: teamName(teamB),

      // Compatibility with existing scorecard field names.
      team1Id: teamId(teamA),
      team1Name: teamName(teamA),
      team2Id: teamId(teamB),
      team2Name: teamName(teamB),

      matchDate: date,
      matchTime: time,
      venue,
      overs,

      status: "Upcoming",
      scoreA: "0/0",
      scoreB: "0/0",
      winner: "",
      result: "",

      innings: [],
      currentInningsIndex: 0,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const created = await addDoc(
      collection(db, "tournaments", state.tournamentId, "matches"),
      matchData
    );

    localStorage.setItem("aplTournamentId", state.tournamentId);
    sessionStorage.setItem("aplTournamentId", state.tournamentId);
    localStorage.setItem("aplMatchId", created.id);
    sessionStorage.setItem("aplMatchId", created.id);

    showMessage("Match create ho gaya.");

    const url = new URL("./scorecard.html", location.href);
    url.searchParams.set("tournamentId", state.tournamentId);
    url.searchParams.set("matchId", created.id);

    location.href = url.toString();
  } catch (error) {
    console.error("Create match failed:", error);
    showMessage(
      "Match create nahi hua. Firebase permissions aur internet connection check karein.",
      true
    );
  } finally {
    if (form) form.dataset.submitting = "false";
    if (button) button.disabled = false;
  }
}

function bindEvents() {
  const form = $("createMatchForm") || $("matchForm");

  form?.addEventListener("submit", createMatch);

  $("team1")?.addEventListener("change", () => {
    const a = $("team1")?.value;
    const b = $("team2")?.value;

    if (a && a === b && $("team2")) {
      $("team2").value = "";
      showMessage("Dono alag teams select karein.", true);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showMessage("Match create karne ke liye login karein.", true);
    return;
  }

  bindEvents();

  try {
    await loadTournament();
    await loadExistingMatches();
  } catch (error) {
    console.error(error);
    showMessage("Tournament ya teams load nahi hui.", true);
  }
});
