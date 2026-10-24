
/* =====================================================
   APL TOURNAMENT PLATFORM — SCHEDULE.JS
   APL League registrations -> Tournament fixtures
   Existing matches are never deleted or overwritten.
   ===================================================== */

import { db, legacyDb } from "../firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const tournamentSelect = $("tournamentSelect");
const tournamentNameEl = $("tournamentName");
const tournamentIdEl = $("tournamentId");
const venueEl = $("venue");
const matchList = $("matchList");
const messageBox = $("scheduleMessage");
const generateBtn = $("generateScheduleBtn");
const refreshBtn = $("refreshScheduleBtn");

let selectedTournamentId = "";
let loading = false;
let generating = false;

function message(text, type = "info") {
  if (!messageBox) {
    console.log(text);
    return;
  }

  messageBox.textContent = text;
  messageBox.style.display = "block";
  messageBox.style.color =
    type === "error" ? "#b91c1c" :
    type === "success" ? "#166534" : "#334155";
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function getTournamentIdFromURL() {
  const params = new URLSearchParams(location.search);
  return (
    params.get("id") ||
    params.get("tournamentId") ||
    localStorage.getItem("selectedTournamentId") ||
    localStorage.getItem("tournamentId") ||
    sessionStorage.getItem("tournamentId") ||
    ""
  );
}

function saveTournamentId(id) {
  if (!id) return;

  selectedTournamentId = id;
  localStorage.setItem("selectedTournamentId", id);
  localStorage.setItem("tournamentId", id);
  sessionStorage.setItem("tournamentId", id);

  const url = new URL(location.href);
  url.searchParams.set("id", id);
  url.searchParams.delete("tournamentId");
  history.replaceState({}, "", url);
}

function tournamentName(data, fallback = "Tournament") {
  return data.tournamentName || data.name ||
    data.title || data.leagueName || fallback;
}

function getTeamName(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  return String(
    value.teamName || value.name ||
    value.nameOfTeam || value.title || ""
  ).trim();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase()
    .replace(/\s+/g, " ");
}

function getMatchTeams(match) {
  const a = match.teamAName || match.team1Name ||
    match.teamA || match.team1 || match.homeTeam || "";
  const b = match.teamBName || match.team2Name ||
    match.teamB || match.team2 || match.awayTeam || "";

  return {
    a: getTeamName(a),
    b: getTeamName(b)
  };
}

function setupLinks(id) {
  if (!id) return;
  const query = `?id=${encodeURIComponent(id)}`;

  if ($("tournamentLink")) $("tournamentLink").href = `tournament.html${query}`;
  if ($("resultsLink")) $("resultsLink").href = `results.html${query}`;
  if ($("pointsLink")) $("pointsLink").href = `points-table.html${query}`;
  if ($("liveLink")) $("liveLink").href = `live-score.html${query}`;
}

async function loadTournamentDropdown() {
  if (!tournamentSelect) {
    throw new Error("HTML में #tournamentSelect नहीं मिला।");
  }

  tournamentSelect.innerHTML =
    '<option value="">Loading tournaments...</option>';

  const snap = await getDocs(collection(db, "tournaments"));

  const tournaments = snap.docs.map(d => ({
    id: d.id,
    data: d.data()
  }));

  tournaments.sort((a, b) =>
    (b.data.createdAt?.seconds || 0) -
    (a.data.createdAt?.seconds || 0)
  );

  tournamentSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select Tournament";
  tournamentSelect.appendChild(placeholder);

  for (const item of tournaments) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = tournamentName(item.data, item.id);
    tournamentSelect.appendChild(option);
  }

  const requestedId = getTournamentIdFromURL();

  if (requestedId && tournaments.some(t => t.id === requestedId)) {
    tournamentSelect.value = requestedId;
  } else if (tournaments.length) {
    tournamentSelect.value = tournaments[0].id;
  }

  selectedTournamentId = tournamentSelect.value || "";

  if (selectedTournamentId) {
    saveTournamentId(selectedTournamentId);
  }

  return tournaments.length;
}

async function loadSchedule() {
  const id = tournamentSelect?.value || selectedTournamentId;

  if (!id) {
    setText("tournamentName", "No Tournament Selected");
    setText("tournamentId", "-");
    setText("venue", "-");
    if (matchList) matchList.textContent = "पहले tournament चुनें।";
    return;
  }

  saveTournamentId(id);
  setupLinks(id);

  const snap = await getDoc(doc(db, "tournaments", id));

  if (!snap.exists()) {
    throw new Error(`Tournament नहीं मिला: ${id}`);
  }

  const data = snap.data();

  setText("tournamentName", tournamentName(data, id));
  setText("tournamentId", id);
  setText("venue", data.venue || data.location || data.ground || "-");

  await loadMatches(id);
}

function createMatchCard(id, match, tournamentId, index) {
  const teams = getMatchTeams(match);
  const number = match.matchNumber ?? match.matchNo ?? index + 1;

  const card = document.createElement("div");
  card.className = "match-card";

  const heading = document.createElement("h3");
  heading.textContent =
    `🏏 Match ${number}: ${teams.a || "Team 1"} vs ${teams.b || "Team 2"}`;

  const details = document.createElement("p");
  details.textContent =
    `Date: ${match.date || match.matchDate || "Not set"} | ` +
    `Time: ${match.time || match.matchTime || "Not set"} | ` +
    `Status: ${match.status || "Upcoming"}`;

  const actions = document.createElement("p");
  const score = document.createElement("a");
  score.textContent = "📊 Scorecard";
  score.href =
    `scorecard.html?tournamentId=${encodeURIComponent(tournamentId)}` +
    `&matchId=${encodeURIComponent(id)}`;

  const live = document.createElement("a");
  live.textContent = " 🔴 Live Score";
  live.href =
    `live-score.html?id=${encodeURIComponent(tournamentId)}` +
    `&matchId=${encodeURIComponent(id)}`;

  actions.append(score, live);
  card.append(heading, details, actions);
  return card;
}

async function loadMatches(tournamentId) {
  if (!matchList) {
    throw new Error("HTML में #matchList नहीं मिला।");
  }

  matchList.textContent = "Loading matches...";

  const snap = await getDocs(
    collection(db, "tournaments", tournamentId, "matches")
  );

  if (snap.empty) {
    matchList.textContent = "अभी कोई match नहीं है। Generate Matches दबाकर fixtures बनाएँ।";
    return;
  }

  const matches = snap.docs.map(d => ({
    id: d.id,
    data: d.data()
  }));

  matches.sort((x, y) => {
    const a = Number(x.data.matchNumber ?? x.data.matchNo ?? 999999);
    const b = Number(y.data.matchNumber ?? y.data.matchNo ?? 999999);
    return a - b;
  });

  matchList.replaceChildren();

  matches.forEach((item, index) => {
    matchList.appendChild(
      createMatchCard(item.id, item.data, tournamentId, index)
    );
  });

  message(`${matches.length} existing match(es) loaded.`, "success");
}

/* -----------------------------------------------------
   APL LEAGUE REGISTRATIONS
   Reads the legacy database; does not modify it.
   Only paid/approved/confirmed registrations are used.
   ----------------------------------------------------- */

function isEligibleRegistration(data) {
  const status = normalize(data.status);
  const payment = normalize(data.paymentStatus);
  const paymentDone = normalize(data.paymentDone);

  return (
    ["approved", "confirmed", "registered", "accepted"].includes(status) ||
    ["paid", "completed", "success", "successful"].includes(payment) ||
    ["yes", "paid", "true", "completed"].includes(paymentDone)
  );
}

async function loadApprovedAPLTeams() {
  const snap = await getDocs(collection(legacyDb, "registrations"));
  const teams = new Map();

  for (const item of snap.docs) {
    const data = item.data();
    const name = getTeamName(data.teamName);

    if (!name || !isEligibleRegistration(data)) continue;

    const key = normalize(name);
    if (!teams.has(key)) {
      teams.set(key, {
        name,
        registrationId: item.id,
        teamId: data.teamId || "",
        captainName: data.captainName || ""
      });
    }
  }

  return [...teams.values()];
}

function pairKey(a, b) {
  return [normalize(a), normalize(b)].sort().join("::");
}

async function generateMatches() {
  if (generating) return;

  const id = tournamentSelect?.value || selectedTournamentId;

  if (!id) {
    message("पहले tournament चुनें।", "error");
    return;
  }

  if (!confirm(
    "APL League की eligible registered teams के fixtures बनाएँ? " +
    "पुराने matches delete या overwrite नहीं होंगे।"
  )) return;

  generating = true;
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
  }

  try {
    const tournamentSnap = await getDoc(doc(db, "tournaments", id));
    if (!tournamentSnap.exists()) {
      throw new Error("Tournament नहीं मिला।");
    }

    message("APL League से approved/paid teams लोड हो रही हैं...");

    const teams = await loadApprovedAPLTeams();

    if (teams.length < 2) {
      message(
        `केवल ${teams.length} eligible team मिली। APL League के registrations में ` +
        "status Approved/Confirmed या paymentStatus Paid होना चाहिए। " +
        "Registration data में कोई बदलाव नहीं किया गया।",
        "error"
      );
      return;
    }

    const matchesRef = collection(db, "tournaments", id, "matches");
    const existingSnap = await getDocs(matchesRef);
    const existingPairs = new Set();
    let maxMatchNumber = 0;

    for (const item of existingSnap.docs) {
      const data = item.data();
      const names = getMatchTeams(data);

      if (names.a && names.b) {
        existingPairs.add(pairKey(names.a, names.b));
      }

      maxMatchNumber = Math.max(
        maxMatchNumber,
        Number(data.matchNumber ?? data.matchNo ?? 0) || 0
      );
    }

    const pending = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const a = teams[i];
        const b = teams[j];
        const key = pairKey(a.name, b.name);

        if (existingPairs.has(key)) continue;

        pending.push({
          teamAName: a.name,
          teamBName: b.name,
          team1Name: a.name,
          team2Name: b.name,
          teamAId: a.teamId || "",
          teamBId: b.teamId || "",
          matchNumber: ++maxMatchNumber,
          status: "Upcoming",
          date: "",
          time: "",
          tournamentId: id,
          source: "APL League registrations",
          createdAt: serverTimestamp()
        });

        existingPairs.add(key);
      }
    }

    if (!pending.length) {
      message("सभी team pairings पहले से मौजूद हैं। कोई नया match नहीं बनाया गया।", "success");
      await loadMatches(id);
      return;
    }

    let created = 0;

    for (const match of pending) {
      await addDoc(matchesRef, match);
      created++;
    }

    await loadMatches(id);
    message(
      `${created} नए fixtures बनाए गए। पुराने matches सुरक्षित रखे गए।`,
      "success"
    );

  } catch (error) {
    console.error("Generate Matches error:", error);
    message(`Generate Matches error: ${error.message || error}`, "error");
  } finally {
    generating = false;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.textContent = "🏏 Generate Matches";
    }
  }
}

async function refreshSchedule() {
  if (loading) return;
  loading = true;

  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing...";
  }

  try {
    await loadTournamentDropdown();
    if (selectedTournamentId) await loadSchedule();
    else message("Firebase में कोई tournament नहीं मिला।", "error");
  } catch (error) {
    console.error("Schedule refresh error:", error);
    message(`Schedule load नहीं हुआ: ${error.message || error}`, "error");
  } finally {
    loading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "🔄 Refresh";
    }
  }
}

tournamentSelect?.addEventListener("change", async () => {
  if (!tournamentSelect.value) return;

  saveTournamentId(tournamentSelect.value);

  try {
    await loadSchedule();
  } catch (error) {
    console.error(error);
    message(`Tournament load नहीं हुआ: ${error.message || error}`, "error");
  }
});

generateBtn?.addEventListener("click", generateMatches);
refreshBtn?.addEventListener("click", refreshSchedule);

async function init() {
  try {
    message("Schedule load हो रहा है...");
    const count = await loadTournamentDropdown();

    if (selectedTournamentId) {
      await loadSchedule();
    } else if (count === 0) {
      message("कोई tournament नहीं मिला।", "error");
    } else {
      message("कृपया tournament चुनें।");
    }
  } catch (error) {
    console.error("Schedule startup error:", error);
    message(`Schedule load नहीं हुआ: ${error.message || error}`, "error");
    if (matchList) {
      matchList.textContent = "Matches लोड नहीं हो पाए। ऊपर दिया गया error देखें।";
    }
  }
}

init();
