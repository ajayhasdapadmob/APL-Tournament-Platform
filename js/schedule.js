
import {
  db,
  tournamentDb
} from "../firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("APL Schedule JS loaded");

const $ = (id) => document.getElementById(id);

const tournamentSelect = $("tournamentSelect");
const generateButton = $("generateScheduleBtn");
const refreshButton = $("refreshScheduleBtn");
const messageBox = $("scheduleMessage");
const matchList = $("matchList");

let selectedTournamentId = "";
let isLoading = false;
let isGenerating = false;

function showMessage(message, type = "info") {
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.style.display = "block";
  messageBox.style.color =
    type === "error" ? "#b91c1c" :
    type === "success" ? "#166534" : "#334155";
}

function getSavedTournamentId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("tournamentId") ||
    params.get("id") ||
    localStorage.getItem("tournamentId") ||
    sessionStorage.getItem("tournamentId") ||
    ""
  );
}

function saveTournamentId(id) {
  if (!id) return;

  selectedTournamentId = id;

  localStorage.setItem("tournamentId", id);
  sessionStorage.setItem("tournamentId", id);

  const url = new URL(window.location.href);
  url.searchParams.set("tournamentId", id);
  url.searchParams.delete("id");

  window.history.replaceState({}, "", url);
}

function getTournamentName(data, fallback = "Tournament") {
  return (
    data.name ||
    data.tournamentName ||
    data.title ||
    data.leagueName ||
    fallback
  );
}

function getTeamName(team) {
  if (typeof team === "string") return team.trim();

  if (!team || typeof team !== "object") return "";

  return (
    team.teamName ||
    team.name ||
    team.nameOfTeam ||
    team.title ||
    ""
  ).toString().trim();
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getMatchTeamNames(match) {
  const teamA =
    match.teamAName ||
    match.team1Name ||
    match.teamA ||
    match.team1 ||
    match.homeTeam ||
    "";

  const teamB =
    match.teamBName ||
    match.team2Name ||
    match.teamB ||
    match.team2 ||
    match.awayTeam ||
    "";

  return {
    teamA: typeof teamA === "object" ? getTeamName(teamA) : String(teamA),
    teamB: typeof teamB === "object" ? getTeamName(teamB) : String(teamB)
  };
}

function safeText(element, value) {
  if (element) element.textContent = value ?? "";
}

function setLink(id, url) {
  const element = $(id);
  if (element) element.href = url;
}

function setupLinks(tournamentId) {
  if (!tournamentId) return;

  const query = `?tournamentId=${encodeURIComponent(tournamentId)}`;

  setLink("tournamentLink", `tournament.html${query}`);
  setLink("resultsLink", `results.html${query}`);
  setLink("pointsLink", `points-table.html${query}`);
  setLink("liveLink", `live-score.html${query}`);
}

async function loadTournamentDropdown() {
  if (!tournamentSelect) {
    throw new Error("Tournament dropdown #tournamentSelect नहीं मिला।");
  }

  tournamentSelect.innerHTML =
    '<option value="">Loading tournaments...</option>';

  const snapshot = await getDocs(
    collection(tournamentDb, "tournaments")
  );

  const tournaments = snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data()
  }));

  tournaments.sort((a, b) => {
    const aTime = a.data.createdAt?.seconds || 0;
    const bTime = b.data.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  tournamentSelect.innerHTML =
    '<option value="">Select Tournament</option>';

  for (const tournament of tournaments) {
    const option = document.createElement("option");
    option.value = tournament.id;
    option.textContent = getTournamentName(
      tournament.data,
      tournament.id
    );
    tournamentSelect.appendChild(option);
  }

  const savedId = getSavedTournamentId();

  if (savedId && tournaments.some((item) => item.id === savedId)) {
    tournamentSelect.value = savedId;
  } else if (tournaments.length > 0) {
    tournamentSelect.value = tournaments[0].id;
  }

  selectedTournamentId = tournamentSelect.value || "";

  if (selectedTournamentId) {
    saveTournamentId(selectedTournamentId);
  }

  return tournaments.length;
}

async function loadSchedule() {
  const tournamentId =
    tournamentSelect?.value || selectedTournamentId;

  if (!tournamentId) {
    safeText($("tournamentName"), "No tournament selected");
    safeText($("tournamentId"), "—");
    safeText($("venue"), "—");

    if (matchList) {
      matchList.replaceChildren();
      matchList.textContent = "पहले एक tournament चुनें।";
    }

    showMessage("कोई tournament उपलब्ध नहीं है।", "info");
    return;
  }

  saveTournamentId(tournamentId);
  setupLinks(tournamentId);

  const tournamentRef = doc(
    tournamentDb,
    "tournaments",
    tournamentId
  );

  const tournamentSnapshot = await getDoc(tournamentRef);

  if (!tournamentSnapshot.exists()) {
    throw new Error(
      "चुना गया tournament Firebase में नहीं मिला।"
    );
  }

  const tournament = tournamentSnapshot.data();

  safeText(
    $("tournamentName"),
    getTournamentName(tournament, tournamentId)
  );
  safeText($("tournamentId"), tournamentId);
  safeText(
    $("venue"),
    tournament.venue || tournament.ground || "Not specified"
  );

  await loadMatches(tournamentId);
}

function createMatchCard(matchId, match) {
  const card = document.createElement("div");
  card.className = "match-card";

  const teams = getMatchTeamNames(match);
  const title = document.createElement("h3");

  title.textContent =
    `${teams.teamA || "Team A"} vs ${teams.teamB || "Team B"}`;

  const details = document.createElement("p");
  const date = match.date || match.matchDate || "Date not set";
  const time = match.time || match.matchTime || "";
  const status = match.status || "Upcoming";

  details.textContent =
    `${date}${time ? " • " + time : ""} • ${status}`;

  const idLine = document.createElement("p");
  idLine.textContent = `Match ID: ${matchId}`;

  const actions = document.createElement("div");
  actions.className = "match-actions";

  const scoreLink = document.createElement("a");
  scoreLink.textContent = "🏏 Scorecard";
  scoreLink.href =
    `scorecard.html?tournamentId=${encodeURIComponent(selectedTournamentId)}` +
    `&matchId=${encodeURIComponent(matchId)}`;

  const liveLink = document.createElement("a");
  liveLink.textContent = "📺 Live Score";
  liveLink.href =
    `live-score.html?tournamentId=${encodeURIComponent(selectedTournamentId)}` +
    `&matchId=${encodeURIComponent(matchId)}`;

  actions.append(scoreLink, liveLink);
  card.append(title, details, idLine, actions);

  return card;
}

async function loadMatches(tournamentId) {
  if (!matchList) return;

  matchList.replaceChildren();

  const snapshot = await getDocs(
    collection(
      tournamentDb,
      "tournaments",
      tournamentId,
      "matches"
    )
  );

  if (snapshot.empty) {
    matchList.textContent =
      "अभी इस tournament में कोई match नहीं है। Teams की जानकारी जाँचकर Generate Matches दबाएँ।";
    return;
  }

  const matches = snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data()
  }));

  matches.sort((a, b) => {
    const dateA = String(a.data.date || a.data.matchDate || "");
    const dateB = String(b.data.date || b.data.matchDate || "");
    return dateA.localeCompare(dateB);
  });

  for (const item of matches) {
    matchList.appendChild(createMatchCard(item.id, item.data));
  }

  showMessage(`${matches.length} existing match(es) loaded.`, "success");
}

/*
 * Teams are read from the tournament document's "teams" array,
 * or from tournaments/{tournamentId}/teams.
 *
 * This deliberately does not guess the registration schema or
 * create matches from unrelated players.
 */
async function loadTournamentTeams(tournamentId, tournamentData) {
  let teams = [];

  if (Array.isArray(tournamentData.teams)) {
    teams = tournamentData.teams
      .map((team) => ({
        name: getTeamName(team)
      }))
      .filter((team) => team.name);
  }

  if (teams.length < 2) {
    const teamSnapshot = await getDocs(
      collection(
        tournamentDb,
        "tournaments",
        tournamentId,
        "teams"
      )
    );

    teams = teamSnapshot.docs
      .map((item) => ({
        id: item.id,
        name: getTeamName({
          ...item.data(),
          teamName:
            item.data().teamName ||
            item.data().name ||
            item.id
        })
      }))
      .filter((team) => team.name);
  }

  const unique = new Map();

  for (const team of teams) {
    const key = normalizeName(team.name);
    if (key && !unique.has(key)) {
      unique.set(key, team);
    }
  }

  return [...unique.values()];
}

function makePairKey(teamA, teamB) {
  const a = normalizeName(teamA);
  const b = normalizeName(teamB);

  return [a, b].sort().join("::");
}

async function generateMatches() {
  if (isGenerating) return;

  const tournamentId =
    tournamentSelect?.value || selectedTournamentId;

  if (!tournamentId) {
    showMessage("पहले tournament चुनें।", "error");
    return;
  }

  isGenerating = true;

  if (generateButton) {
    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
  }

  try {
    const tournamentRef = doc(
      tournamentDb,
      "tournaments",
      tournamentId
    );

    const tournamentSnapshot = await getDoc(tournamentRef);

    if (!tournamentSnapshot.exists()) {
      throw new Error("Tournament नहीं मिला।");
    }

    const tournamentData = tournamentSnapshot.data();
    const teams = await loadTournamentTeams(
      tournamentId,
      tournamentData
    );

    if (teams.length < 2) {
      showMessage(
        "Matches नहीं बनाए गए। इस tournament में कम-से-कम 2 teams चाहिए। Teams tournament document के 'teams' array या tournaments/{tournamentId}/teams collection में उपलब्ध होनी चाहिए।",
        "error"
      );
      return;
    }

    const matchesRef = collection(
      tournamentDb,
      "tournaments",
      tournamentId,
      "matches"
    );

    const existingSnapshot = await getDocs(matchesRef);
    const existingPairs = new Set();

    for (const item of existingSnapshot.docs) {
      const data = item.data();
      const names = getMatchTeamNames(data);

      if (names.teamA && names.teamB) {
        existingPairs.add(
          makePairKey(names.teamA, names.teamB)
        );
      }
    }

    const newMatches = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i].name;
        const teamB = teams[j].name;
        const pairKey = makePairKey(teamA, teamB);

        if (existingPairs.has(pairKey)) continue;

        newMatches.push({
          teamAName: teamA,
          teamBName: teamB,
          team1Name: teamA,
          team2Name: teamB,
          status: "Upcoming",
          date: "",
          time: "",
          tournamentId,
          createdAt: serverTimestamp()
        });

        existingPairs.add(pairKey);
      }
    }

    if (newMatches.length === 0) {
      showMessage(
        "सभी team combinations के matches पहले से मौजूद हैं। कोई duplicate match नहीं बनाया गया।",
        "success"
      );
      await loadMatches(tournamentId);
      return;
    }

    for (const match of newMatches) {
      await addDoc(matchesRef, match);
    }

    showMessage(
      `${newMatches.length} नए matches बनाए गए। पुराने matches सुरक्षित रखे गए।`,
      "success"
    );

    await loadMatches(tournamentId);

  } catch (error) {
    console.error("Generate matches error:", error);
    showMessage(
      `Matches generate नहीं हुए: ${error.message || "Unknown error"}`,
      "error"
    );
  } finally {
    isGenerating = false;

    if (generateButton) {
      generateButton.disabled = false;
      generateButton.textContent = "🏏 Generate Matches";
    }
  }
}

async function refreshSchedule() {
  if (isLoading) return;

  isLoading = true;

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";
  }

  try {
    await loadTournamentDropdown();

    if (selectedTournamentId) {
      await loadSchedule();
    }

    showMessage("Schedule refresh हो गया।", "success");
  } catch (error) {
    console.error("Refresh schedule error:", error);
    showMessage(
      `Refresh नहीं हो पाया: ${error.message || "Unknown error"}`,
      "error"
    );
  } finally {
    isLoading = false;

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

if (tournamentSelect) {
  tournamentSelect.addEventListener("change", async () => {
    const id = tournamentSelect.value;

    if (!id) return;

    saveTournamentId(id);

    try {
      await loadSchedule();
    } catch (error) {
      console.error("Tournament selection error:", error);
      showMessage(error.message || "Tournament load नहीं हुआ।", "error");
    }
  });
}

if (generateButton) {
  generateButton.addEventListener("click", generateMatches);
} else {
  console.error("Generate button #generateScheduleBtn नहीं मिला।");
}

if (refreshButton) {
  refreshButton.addEventListener("click", refreshSchedule);
} else {
  console.error("Refresh button #refreshScheduleBtn नहीं मिला।");
}

async function init() {
  try {
    showMessage("Schedule load हो रहा है...");

    await loadTournamentDropdown();

    if (selectedTournamentId) {
      await loadSchedule();
    } else {
      showMessage(
        "कोई tournament नहीं मिला। पहले Tournament Platform में tournament बनाएँ।"
      );
    }
  } catch (error) {
    console.error("Schedule initialization error:", error);
    showMessage(
      `Schedule load नहीं हुआ: ${error.message || "Unknown error"}`,
      "error"
    );
  }
}

init();
