
import { db } from "../firebase.js";

import {
    doc,
    getDoc,
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
    sessionStorage.getItem("aplTournamentId")
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
    el.style.color = isError ? "#dc2626" : "";
  }

  console[isError ? "error" : "log"](message);
}

function teamName(team) {
  return text(team.teamName || team.name || team.team || team.nameOfTeam);
}

function teamId(team) {
  return text(team.id || team.teamId || team.teamID);
}

function isDeleted(data) {
  return data?.isDeleted === true || data?.deleted === true;
}

function isEligible(team) {
  // Existing approved/paid teams are eligible.
  // If no status field exists, retain the team as eligible.
  const status = normalize(team.status || team.registrationStatus || "");
  const payment = normalize(team.paymentStatus || "");

  if (["rejected", "cancelled", "canceled", "deleted"].includes(status)) {
    return false;
  }

  if (status === "pending" || status === "unapproved") return false;
  if (payment === "unpaid" && status !== "approved") return false;

  return Boolean(teamName(team));
}

async function loadTournaments() {
  const select = $("tournamentSelect");
  if (!select) return;

  const snap = await getDocs(collection(db, "tournaments"));

  state.tournaments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !isDeleted(t));

  select.innerHTML =
    '<option value="">-- Select Tournament --</option>' +
    state.tournaments.map((t) => `
      <option value="${escapeHTML(t.id)}">
        ${escapeHTML(t.name || t.tournamentName || t.id)}
      </option>
    `).join("");

  if (state.tournamentId &&
      state.tournaments.some((t) => t.id === state.tournamentId)) {
    select.value = state.tournamentId;
    await loadTournament(state.tournamentId);
  }
}

async function loadTournament(id) {
  if (!id) return;

  state.tournamentId = id;
  localStorage.setItem("aplTournamentId", id);
  sessionStorage.setItem("aplTournamentId", id);

  const tournament = state.tournaments.find((t) => t.id === id);
  if (!tournament) {
    showMessage("Tournament nahi mila.", true);
    return;
  }

  if ($("tournamentName")) {
    $("tournamentName").textContent =
      tournament.name || tournament.tournamentName || "Tournament Schedule";
  }

  if ($("tournamentId")) $("tournamentId").textContent = id;
  if ($("venue")) $("venue").textContent = tournament.venue || "";

  await Promise.all([loadTeams(id), loadMatches(id)]);
  renderTeams();
  renderMatches();
}

async function loadTeams(id) {
  const snap = await getDocs(collection(db, "tournaments", id, "teams"));

  state.teams = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((t) => !isDeleted(t) && isEligible(t));

  state.teams.sort((a, b) => teamName(a).localeCompare(teamName(b)));
}

async function loadMatches(id) {
  const snap = await getDocs(collection(db, "tournaments", id, "matches"));

  // Keep every existing match in memory, including completed matches.
  state.matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function renderTeams() {
  const el = $("teamList") || $("teamsList");
  if (!el) return;

  if (!state.teams.length) {
    el.innerHTML = "<p>No eligible teams found.</p>";
    return;
  }

  el.innerHTML = state.teams.map((t, index) => `
    <div class="team-card">
      <strong>${index + 1}. ${escapeHTML(teamName(t))}</strong>
    </div>
  `).join("");
}

function matchPair(match) {
  const a = normalize(
    match.teamAId || match.team1Id || match.teamA || match.team1 || ""
  );
  const b = normalize(
    match.teamBId || match.team2Id || match.teamB || match.team2 || ""
  );

  if (!a || !b) return null;
  return [a, b].sort().join("__");
}

function expectedPair(a, b) {
  return [normalize(teamId(a)), normalize(teamId(b))].sort().join("__");
}

function resolveMatchTeam(match, side) {
  const upper = side.toUpperCase();
  const number = side === "A" ? "1" : "2";

  const id = text(
    match[`team${upper}Id`] ||
    match[`team${number}Id`] ||
    match[`team${upper}`] ||
    match[`team${number}`] ||
    ""
  );

  const name = text(
    match[`team${upper}Name`] ||
    match[`team${number}Name`] ||
    (typeof match[`team${upper}`] === "string" ? match[`team${upper}`] : "") ||
    (typeof match[`team${number}`] === "string" ? match[`team${number}`] : "")
  );

  return { id, name };
}

function renderMatches() {
  const el =
    $("matchList") ||
    $("matchesList") ||
    $("scheduleList");

  if (!el) return;

  const matches = [...state.matches].sort((a, b) => {
    const dateA = text(a.matchDate || a.date);
    const dateB = text(b.matchDate || b.date);
    return dateA.localeCompare(dateB) ||
      text(a.matchNumber).localeCompare(text(b.matchNumber), undefined, { numeric: true });
  });

  if (!matches.length) {
    el.innerHTML = "<p>No matches created yet.</p>";
    return;
  }

  el.innerHTML = matches.map((m) => {
    const a = resolveMatchTeam(m, "A");
    const b = resolveMatchTeam(m, "B");

    const nameA = a.name || state.teams.find((t) =>
      normalize(teamId(t)) === normalize(a.id)
    )?.let?.name || a.id || "Team A";

    const nameB = b.name || state.teams.find((t) =>
      normalize(teamId(t)) === normalize(b.id)
    )?.let?.name || b.id || "Team B";

    const status = text(m.status || "Upcoming");
    const scoreA = text(m.scoreA || "0/0");
    const scoreB = text(m.scoreB || "0/0");

    return `
      <article class="match-card">
        <h3>Match ${escapeHTML(m.matchNumber || "")}</h3>
        <p><strong>${escapeHTML(nameA)}</strong> vs
           <strong>${escapeHTML(nameB)}</strong></p>
        <p>${escapeHTML(m.matchDate || m.date || "Date not set")}
           ${escapeHTML(m.matchTime || m.time || "")}</p>
        <p>${escapeHTML(m.venue || m.matchVenue || "")}</p>
        <p>Status: ${escapeHTML(status)}</p>
        <p>${escapeHTML(scoreA)} — ${escapeHTML(scoreB)}</p>
        <button type="button"
          data-open-match="${escapeHTML(m.id)}">
          Open Scorecard
        </button>
      </article>
    `;
  }).join("");

  el.querySelectorAll("[data-open-match]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.openMatch;
      localStorage.setItem("aplMatchId", id);
      sessionStorage.setItem("aplMatchId", id);

      const url = new URL("./scorecard.html", location.href);
      url.searchParams.set("tournamentId", state.tournamentId);
      url.searchParams.set("matchId", id);
      location.href = url.toString();
    });
  });
}

async function generateMatches() {
  const id = state.tournamentId;
  if (!id) {
    showMessage("Pehle tournament select karein.", true);
    return;
  }

  if (state.teams.length < 2) {
    showMessage("Fixtures ke liye kam se kam 2 eligible teams chahiye.", true);
    return;
  }

  const existingPairs = new Set();

  // Avoid creating duplicate fixtures. Existing records are not modified.
  state.matches.forEach((match) => {
    const pair = matchPair(match);
    if (pair) existingPairs.add(pair);
  });

  const missing = [];

  for (let i = 0; i < state.teams.length; i++) {
    for (let j = i + 1; j < state.teams.length; j++) {
      const a = state.teams[i];
      const b = state.teams[j];
      const pair = expectedPair(a, b);

      if (!existingPairs.has(pair)) {
        missing.push({ a, b, pair });
        existingPairs.add(pair);
      }
    }
  }

  if (!missing.length) {
    showMessage("Koi missing round-robin fixture nahi mila.");
    return;
  }

  if (!confirm(
    `${missing.length} missing fixture(s) create honge. Existing matches change nahi honge. Continue?`
  )) {
    return;
  }

  const matchesRef = collection(db, "tournaments", id, "matches");
  let nextNumber = state.matches.reduce((max, m) => {
    const n = Number(m.matchNumber);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0) + 1;

  let created = 0;

  for (const item of missing) {
    const a = item.a;
    const b = item.b;

    await addDoc(matchesRef, {
      matchNumber: nextNumber++,
      teamAId: teamId(a),
      teamAName: teamName(a),
      teamBId: teamId(b),
      teamBName: teamName(b),
      team1Id: teamId(a),
      team1Name: teamName(a),
      team2Id: teamId(b),
      team2Name: teamName(b),
      matchDate: "",
      matchTime: "",
      venue: "",
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

  await loadMatches(id);
  renderMatches();

  showMessage(`${created} new fixture(s) created. Existing matches were preserved.`);
}

function bindEvents() {
  $("tournamentSelect")?.addEventListener("change", async (event) => {
    try {
      await loadTournament(event.target.value);
    } catch (error) {
      console.error(error);
      showMessage("Tournament load nahi hua.", true);
    }
  });

  const generateButton =
    $("generateMatchesBtn") ||
    $("generateScheduleBtn");

  generateButton?.addEventListener("click", async () => {
    try {
      generateButton.disabled = true;
      await generateMatches();
    } catch (error) {
      console.error("Fixture generation failed:", error);
      showMessage(
        "Fixtures create nahi hue. Firebase rules aur connection check karein.",
        true
      );
    } finally {
      generateButton.disabled = false;
    }
  });

  $("refreshScheduleBtn")?.addEventListener("click", async () => {
    try {
      if (state.tournamentId) await loadTournament(state.tournamentId);
      else await loadTournaments();

      showMessage("Schedule refreshed.");
    } catch (error) {
      console.error(error);
      showMessage("Schedule refresh nahi hua.", true);
    }
  });
}

async function init() {
  bindEvents();

  try {
    await loadTournaments();
  } catch (error) {
    console.error("Schedule initialization failed:", error);
    showMessage(
      "Schedule load nahi hua. Firebase configuration aur Firestore rules check karein.",
      true
    );
  }
}

/* ========================================
   GENERATE ROUND-ROBIN FIXTURES
======================================== */

const generateScheduleBtn =
    document.getElementById("generateScheduleBtn");

const scheduleMessage =
    document.getElementById("scheduleMessage");

function showScheduleMessage(message, isError = false) {
    if (scheduleMessage) {
        scheduleMessage.textContent = message;
        scheduleMessage.style.color = isError ? "#dc2626" : "#15803d";
    }
}

function getTeamName(team) {
    return String(
        team.teamName ||
        team.name ||
        team.team ||
        team.nameOfTeam ||
        ""
    ).trim();
}

function isTeamDeleted(team) {
    return team.deleted === true || team.isDeleted === true;
}

function isTeamEligible(team) {
    if (isTeamDeleted(team)) return false;

    const status = String(
        team.status || team.registrationStatus || ""
    ).trim().toLowerCase();

    if (
        ["rejected", "cancelled", "canceled", "deleted"].includes(status)
    ) {
        return false;
    }

    return Boolean(getTeamName(team));
}

function getTeamId(team) {
    return String(team.id || team.teamId || team.teamID || "").trim();
}

function normalizePair(id1, id2) {
    return [id1, id2].sort().join("::");
}

async function generateRoundRobinFixtures() {
    if (!tournamentId) {
        showScheduleMessage(
            "Pehle dropdown se tournament select karein.",
            true
        );
        return;
    }

    if (generateScheduleBtn) {
        generateScheduleBtn.disabled = true;
        generateScheduleBtn.textContent = "⏳ Generating...";
    }

    try {
        showScheduleMessage("Tournament teams load ho rahi hain...");

        const teamsSnapshot = await getDocs(
            collection(db, "tournaments", tournamentId, "teams")
        );

        const teams = teamsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(isTeamEligible);

        if (teams.length < 2) {
            showScheduleMessage(
                `Sirf ${teams.length} eligible team mili. Is tournament ke "Registered Teams" section mein teams aur unke status check karein.`,
                true
            );
            return;
        }

        // Existing matches read karein; unhe delete nahi karna.
        const matchesRef = collection(
            db, "tournaments", tournamentId, "matches"
        );

        const existingSnapshot = await getDocs(matchesRef);

        const existingPairs = new Set();
        let highestMatchNumber = 0;

        existingSnapshot.forEach(matchDoc => {
            const match = matchDoc.data();

            const a = String(
                match.teamAId || match.team1Id || match.teamA || ""
            );
            const b = String(
                match.teamBId || match.team2Id || match.teamB || ""
            );

            if (a && b) existingPairs.add(normalizePair(a, b));

            const n = Number(
                match.matchNumber || match.matchNo || match.number || 0
            );

            if (Number.isFinite(n)) {
                highestMatchNumber = Math.max(highestMatchNumber, n);
            }
        });

        const fixtures = [];

        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const teamA = teams[i];
                const teamB = teams[j];

                const idA = getTeamId(teamA);
                const idB = getTeamId(teamB);

                if (!idA || !idB || idA === idB) continue;

                const pair = normalizePair(idA, idB);

                // Existing matchup ko dobara create na karein.
                if (existingPairs.has(pair)) continue;

                fixtures.push({
                    tournamentId,
                    matchNumber: String(++highestMatchNumber),

                    teamAId: idA,
                    teamAName: getTeamName(teamA),
                    teamBId: idB,
                    teamBName: getTeamName(teamB),

                    // Existing scorecard compatibility.
                    team1Id: idA,
                    team1Name: getTeamName(teamA),
                    team2Id: idB,
                    team2Name: getTeamName(teamB),

                    matchDate: "",
                    matchTime: "",
                    date: "",
                    time: "",
                    venue: venueElement?.textContent?.trim() || "",

                    status: "Upcoming",
                    scoreA: "0/0",
                    scoreB: "0/0",
                    winner: "",
                    result: "",
                    innings: [],
                    currentInningsIndex: 0,

                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                existingPairs.add(pair);
            }
        }

        if (fixtures.length === 0) {
            showScheduleMessage(
                "Koi naya fixture nahi bana: sabhi team pairs ke matches pehle se maujood hain."
            );
            await loadSchedule();
            return;
        }

        let createdCount = 0;

        for (const fixture of fixtures) {
            await addDoc(matchesRef, fixture);
            createdCount++;
        }

        showScheduleMessage(
            `Success! ${createdCount} naye matches create hue. Total eligible teams: ${teams.length}.`
        );

        await loadSchedule();

    } catch (error) {
        console.error("Generate fixtures error:", error);

        showScheduleMessage(
            `Fixtures nahi bane: ${error.code || error.message || "Unknown error"}`,
            true
        );

    } finally {
        if (generateScheduleBtn) {
            generateScheduleBtn.disabled = false;
            generateScheduleBtn.textContent = "🏏 Generate Matches";
        }
    }
}

if (generateScheduleBtn) {
    generateScheduleBtn.addEventListener(
        "click",
        generateRoundRobinFixtures
    );
}

init();
