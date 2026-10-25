
import { db } from "../firebase.js";

import { generateApplT10Knockout } from "./appl-t10-knockout.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   APL TOURNAMENT PLATFORM - SCHEDULE
   Deleted/recycled tournaments are hidden.
   Existing matches are preserved.
   ========================================= */

const tournamentSelect = document.getElementById("tournamentSelect");
const tournamentNameEl = document.getElementById("tournamentName");
const tournamentIdEl = document.getElementById("tournamentId");
const venueEl = document.getElementById("venue");
const matchesContainer = document.getElementById("matchList")
  || document.getElementById("matchesList")
  || document.getElementById("scheduleList");

const generateButton = document.getElementById("generateMatchesBtn")
  || document.getElementById("generateScheduleBtn");

const refreshButton = document.getElementById("refreshScheduleBtn");

let activeTournaments = [];
let selectedTournamentId = "";
let loading = false;

function isRecycled(data) {
  return data?.isDeleted === true || data?.deleted === true;
}

function tournamentName(data, id) {
  return data?.name ||
    data?.tournamentName ||
    data?.title ||
    `Tournament ${id}`;
}

function showMessage(message, isError = false) {
  console[isError ? "error" : "log"](message);

  let element = document.getElementById("scheduleMessage");

  if (!element) {
    element = document.createElement("p");
    element.id = "scheduleMessage";
    element.setAttribute("role", "status");

    if (matchesContainer?.parentElement) {
      matchesContainer.parentElement.insertBefore(
        element,
        matchesContainer
      );
    } else {
      document.body.appendChild(element);
    }
  }

  element.textContent = message;
  element.style.color = isError ? "#b91c1c" : "#087f3c";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? "";
}

function readSavedTournamentId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("id") ||
    params.get("tournamentId") ||
    localStorage.getItem("selectedTournamentId") ||
    localStorage.getItem("tournamentId") ||
    sessionStorage.getItem("selectedTournamentId") ||
    sessionStorage.getItem("tournamentId") ||
    ""
  );
}

function clearSavedTournamentId(id) {
  for (const key of ["selectedTournamentId", "tournamentId"]) {
    if (localStorage.getItem(key) === id) {
      localStorage.removeItem(key);
    }

    if (sessionStorage.getItem(key) === id) {
      sessionStorage.removeItem(key);
    }
  }
}

function setLoading(message) {
  if (!matchesContainer) return;

  matchesContainer.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  matchesContainer.appendChild(paragraph);
}

function makeLink(label, url) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = url;
  link.className = "schedule-link";
  return link;
}

/* =========================================
   LOAD ACTIVE TOURNAMENTS
   ========================================= */

async function loadTournaments(preferredId = "") {
  if (!tournamentSelect) {
    throw new Error("HTML mein tournamentSelect element nahi mila.");
  }

  tournamentSelect.replaceChildren(
    new Option("Loading tournaments...", "")
  );

  const snapshot = await getDocs(collection(db, "tournaments"));

  // Important: Recycle Bin wale tournaments exclude honge.
  activeTournaments = snapshot.docs
    .filter(item => !isRecycled(item.data()))
    .map(item => ({
      id: item.id,
      ...item.data()
    }));

  tournamentSelect.replaceChildren();

  if (activeTournaments.length === 0) {
    tournamentSelect.add(
      new Option("No active tournaments", "")
    );

    selectedTournamentId = "";
    setText("tournamentName", "No active tournaments");
    setText("tournamentId", "-");
    setText("venue", "-");
    setLoading("Abhi koi active tournament available nahi hai.");

    if (generateButton) generateButton.disabled = true;

    return;
  }

  activeTournaments.forEach(tournament => {
    tournamentSelect.add(
      new Option(
        tournamentName(tournament, tournament.id),
        tournament.id
      )
    );
  });

  const wantedId = preferredId || readSavedTournamentId();

  // Purana saved ID tabhi select hoga jab tournament abhi active ho.
  const selected = activeTournaments.find(
    item => item.id === wantedId
  );

  selectedTournamentId = selected
    ? selected.id
    : activeTournaments[0].id;

  tournamentSelect.value = selectedTournamentId;

  // Deleted tournament ki stale selection clear karein.
  if (wantedId && !selected) {
    clearSavedTournamentId(wantedId);
  }

  localStorage.setItem(
    "selectedTournamentId",
    selectedTournamentId
  );
  localStorage.setItem("tournamentId", selectedTournamentId);

  if (generateButton) generateButton.disabled = false;

  await loadSchedule(selectedTournamentId);
}

/* =========================================
   LOAD SELECTED TOURNAMENT + MATCHES
   ========================================= */

async function loadSchedule(tournamentId) {
  if (!tournamentId) {
    setLoading("Please select an active tournament.");
    return;
  }

  const tournament = activeTournaments.find(
    item => item.id === tournamentId
  );

  if (!tournament || isRecycled(tournament)) {
    clearSavedTournamentId(tournamentId);
    showMessage("Ye tournament active list mein nahi hai.", true);
    await loadTournaments();
    return;
  }

  selectedTournamentId = tournamentId;
  setLoading("Loading matches...");

  try {
    // Latest tournament document dobara check karein.
    const tournamentRef = doc(db, "tournaments", tournamentId);
    const tournamentSnapshot = await getDoc(tournamentRef);

    if (
      !tournamentSnapshot.exists() ||
      isRecycled(tournamentSnapshot.data())
    ) {
      clearSavedTournamentId(tournamentId);
      showMessage("Tournament delete/recycle ho chuka hai.");
      await loadTournaments();
      return;
    }

    const data = tournamentSnapshot.data();

    setText("tournamentName", tournamentName(data, tournamentId));
    setText("tournamentId", tournamentId);
    setText("venue", data.venue || data.location || "-");

    const matchesSnapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "matches")
    );

    renderMatches(matchesSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    })));

  } catch (error) {
    console.error("Schedule load failed:", error);
    setLoading("Matches load nahi hue: " + error.message);
    showMessage("Schedule load nahi hua. Firebase Rules/connection check karein.", true);
  }
}

/* =========================================
   DISPLAY MATCHES
   ========================================= */

function renderMatches(matches) {
  if (!matchesContainer) {
    showMessage("HTML mein match list container nahi mila.", true);
    return;
  }

  matchesContainer.replaceChildren();

  if (!matches.length) {
    setLoading("Is tournament ke matches abhi nahi bane hain.");
    return;
  }

  matches.sort((a, b) => {
    const numberA = Number(a.matchNumber ?? a.matchNo ?? 999999);
    const numberB = Number(b.matchNumber ?? b.matchNo ?? 999999);
    return numberA - numberB;
  });

  matches.forEach(match => {
    const card = document.createElement("article");
    card.className = "match-card";

    const heading = document.createElement("h3");
    const teamA =
      match.teamAName ||
      match.team1Name ||
      match.teamA ||
      match.team1 ||
      "Team A";

    const teamB =
      match.teamBName ||
      match.team2Name ||
      match.teamB ||
      match.team2 ||
      "Team B";

    heading.textContent =
      `Match ${match.matchNumber ?? match.matchNo ?? ""}: ${teamA} vs ${teamB}`;

    const details = document.createElement("p");
    details.textContent =
      `Status: ${match.status || "Upcoming"}` +
      (match.date ? ` | Date: ${match.date}` : "") +
      (match.time ? ` | Time: ${match.time}` : "");

    const actions = document.createElement("div");
    actions.className = "actions";

    const params = new URLSearchParams({
      id: selectedTournamentId,
      matchId: match.id
    });

    // Links existing project pages ko use karte hain.
    actions.appendChild(
      makeLink("Scorecard", `scorecard.html?${params.toString()}`)
    );

    actions.appendChild(
      makeLink("Live Score", `live-score.html?${params.toString()}`)
    );

    card.append(heading, details, actions);
    matchesContainer.appendChild(card);
  });
}

/* =========================================
   GENERATE MISSING ROUND-ROBIN MATCHES
   Existing matches are NOT deleted.
   Teams must already exist in this tournament.
   ========================================= */

async function generateMatches() {
  if (loading) return;

  const tournamentId = tournamentSelect?.value;

  if (!tournamentId) {
    showMessage("Pehle active tournament select karein.", true);
    return;
  }

  const tournament = activeTournaments.find(
    item => item.id === tournamentId
  );

  if (!tournament || isRecycled(tournament)) {
    showMessage("Deleted tournament ke matches nahi ban sakte.", true);
    await loadTournaments();
    return;
  }

  const confirmed = confirm(
    "Missing round-robin matches generate karne hain?\n\n" +
    "Existing matches delete nahi honge."
  );

  if (!confirmed) return;

  loading = true;
  if (generateButton) generateButton.disabled = true;

  try {
    const latest = await getDoc(doc(db, "tournaments", tournamentId));

    if (!latest.exists() || isRecycled(latest.data())) {
      showMessage("Tournament active nahi hai.", true);
      await loadTournaments();
      return;
    }

    const teamsSnapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "teams")
    );

    const teams = teamsSnapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .filter(team =>
        team.status
          ? ["approved", "paid"].includes(
              String(team.status).trim().toLowerCase()
            )
          : true
      );

    if (teams.length < 2) {
      showMessage(
        "Matches banane ke liye kam se kam 2 teams chahiye. " +
        "Tournament ke Teams section ko check karein.",
        true
      );
      return;
    }

    const matchesRef = collection(
      db,
      "tournaments",
      tournamentId,
      "matches"
    );

    const existingSnapshot = await getDocs(matchesRef);
    const existingPairs = new Set();

    existingSnapshot.docs.forEach(item => {
      const match = item.data();
      const a = match.teamAId || match.team1Id;
      const b = match.teamBId || match.team2Id;

      if (a && b) {
        existingPairs.add([a, b].sort().join("__"));
      }
    });

    let added = 0;
    let nextNumber = existingSnapshot.size + 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i];
        const teamB = teams[j];
        const pairKey = [teamA.id, teamB.id].sort().join("__");

        if (existingPairs.has(pairKey)) continue;

        await addDoc(matchesRef, {
          tournamentId,
          matchNumber: nextNumber++,
          teamAId: teamA.id,
          teamBId: teamB.id,
          teamAName: teamA.teamName || teamA.name || "Team A",
          teamBName: teamB.teamName || teamB.name || "Team B",
          team1Name: teamA.teamName || teamA.name || "Team A",
          team2Name: teamB.teamName || teamB.name || "Team B",
          status: "Upcoming",
          date: "",
          time: "",
          createdAt: serverTimestamp(),
          source: "schedule-generator"
        });

        existingPairs.add(pairKey);
        added++;
      }
    }

    showMessage(
      added
        ? `${added} naye matches banaye gaye. Existing matches safe hain.`
        : "Koi missing match nahi tha. Existing schedule same hai."
    );

    await loadSchedule(tournamentId);

  } catch (error) {
    console.error("Generate matches failed:", error);
    showMessage("Matches generate nahi hue: " + error.message, true);
  } finally {
    loading = false;
    if (generateButton) generateButton.disabled = false;
  }
}

/* =========================================
   BUTTONS + INITIAL LOAD
   ========================================= */

tournamentSelect?.addEventListener("change", async () => {
  const id = tournamentSelect.value;

  if (!id) return;

  selectedTournamentId = id;
  localStorage.setItem("selectedTournamentId", id);
  localStorage.setItem("tournamentId", id);

  await loadSchedule(id);
});

generateButton?.addEventListener("click", generateMatches);

refreshButton?.addEventListener("click", async () => {
  try {
    await loadTournaments(tournamentSelect?.value || "");
    showMessage("Schedule refresh ho gaya.");
  } catch (error) {
    showMessage("Refresh nahi hua: " + error.message, true);
  }
});

async function init() {
  try {
    if (!matchesContainer) {
      console.error(
        "Schedule HTML mein match list container ka ID match nahi kar raha."
      );
    }

    await loadTournaments();
  } catch (error) {
    console.error("Schedule initialization failed:", error);
    showMessage("Schedule start nahi hua: " + error.message, true);
  }
}

async function generateApplT10Schedule(tournamentId) {
  try {
    if (!tournamentId) {
      alert("Please select a tournament first.");
      return;
    }

    await generateApplT10Knockout(tournamentId);

    alert("APPL T10 Knockout fixtures generated successfully!");

    window.location.reload();
  } catch (error) {
    console.error("APPL T10 schedule error:", error);
    alert(error.message || "Could not generate APPL T10 fixtures.");
  }
}

init();
