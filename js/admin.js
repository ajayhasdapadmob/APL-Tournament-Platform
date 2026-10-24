
import { auth, db, legacyDb } from "../firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const state = {
  user: null,
  tournaments: [],
  teams: [],
  registrations: [],
  bound: false
};

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "info") {
  const box = $("message") || $("adminMessage");

  if (box) {
    box.textContent = message;
    box.style.color =
      type === "error" ? "#dc2626" :
      type === "success" ? "#15803d" :
      "#334155";
  } else {
    console.log(message);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function firstValue(object, keys, fallback = "") {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null && object[key] !== "") {
      return object[key];
    }
  }
  return fallback;
}

function tournamentName(t) {
  return firstValue(t, ["tournamentName", "name", "title"], "Unnamed Tournament");
}

function teamName(t) {
  return firstValue(t, ["teamName", "name", "team", "clubName"], "Unnamed Team");
}

function registrationName(r) {
  return firstValue(
    r,
    ["playerName", "name", "fullName", "captainName", "teamName"],
    "Unnamed Registration"
  );
}

function isHidden(t) {
  return t?.isDeleted === true || t?.deleted === true;
}

function renderTournaments() {
  const body =
    $("tournamentsTableBody") ||
    $("tournamentTableBody") ||
    $("adminTournamentsBody");

  if (!body) return;

  const visible = state.tournaments.filter((t) => !isHidden(t));

  if (!visible.length) {
    body.innerHTML = `
      <tr><td colspan="6">Abhi koi tournament nahi hai.</td></tr>
    `;
    return;
  }

  body.innerHTML = visible.map((t) => `
    <tr>
      <td>${escapeHTML(tournamentName(t))}</td>
      <td>${escapeHTML(t.venue || "-")}</td>
      <td>${escapeHTML(t.status || "Upcoming")}</td>
      <td>${escapeHTML(t.totalTeams ?? "-")}</td>
      <td>
        <button type="button" data-action="toggle-status"
          data-id="${escapeHTML(t.id)}">
          Status
        </button>
        <button type="button" data-action="hide-tournament"
          data-id="${escapeHTML(t.id)}">
          Hide
        </button>
      </td>
      <td>${escapeHTML(t.id)}</td>
    </tr>
  `).join("");
}

function renderTeams() {
  const body =
    $("teamsTableBody") ||
    $("teamTableBody") ||
    $("adminTeamsBody");

  if (!body) return;

  if (!state.teams.length) {
    body.innerHTML = `<tr><td colspan="5">Tournament teams nahi mile.</td></tr>`;
    return;
  }

  body.innerHTML = state.teams.map((team) => `
    <tr>
      <td>${escapeHTML(teamName(team))}</td>
      <td>${escapeHTML(team.tournamentName || team.tournamentId || "-")}</td>
      <td>${escapeHTML(team.captainName || team.captain || "-")}</td>
      <td>${escapeHTML(team.status || "Registered")}</td>
      <td>${escapeHTML(team.id)}</td>
    </tr>
  `).join("");
}

function renderRegistrations() {
  const body =
    $("registrationsTableBody") ||
    $("registrationTableBody") ||
    $("adminRegistrationsBody");

  if (!body) return;

  if (!state.registrations.length) {
    body.innerHTML = `<tr><td colspan="6">Legacy registrations nahi mile.</td></tr>`;
    return;
  }

  body.innerHTML = state.registrations.map((r) => `
    <tr>
      <td>${escapeHTML(registrationName(r))}</td>
      <td>${escapeHTML(r.teamName || r.team || "-")}</td>
      <td>${escapeHTML(r.contact || r.phone || r.mobile || "-")}</td>
      <td>${escapeHTML(r.paymentStatus || r.status || "Pending")}</td>
      <td>${escapeHTML(r.id)}</td>
      <td>
        <button type="button" data-action="registration-paid"
          data-id="${escapeHTML(r.id)}">Mark Paid</button>
        <button type="button" data-action="registration-pending"
          data-id="${escapeHTML(r.id)}">Mark Pending</button>
      </td>
    </tr>
  `).join("");
}

async function loadTournaments() {
  const snapshot = await getDocs(collection(db, "tournaments"));

  state.tournaments = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));

  renderTournaments();
}

async function loadTeams() {
  const tournaments = state.tournaments;
  const allTeams = [];

  for (const tournament of tournaments) {
    try {
      const snapshot = await getDocs(
        collection(db, "tournaments", tournament.id, "teams")
      );

      snapshot.forEach((item) => {
        allTeams.push({
          id: item.id,
          tournamentId: tournament.id,
          tournamentName: tournamentName(tournament),
          ...item.data()
        });
      });
    } catch (error) {
      console.error("Teams load error:", tournament.id, error);
    }
  }

  state.teams = allTeams;
  renderTeams();
}

async function loadLegacyRegistrations() {
  // Legacy APL registration database ko sirf read kiya jata hai.
  // Is function mein kisi registration ko delete nahi kiya jata.
  const possibleCollections = ["registrations"];
  const results = [];

  for (const collectionName of possibleCollections) {
    try {
      const snapshot = await getDocs(
        collection(legacyDb, collectionName)
      );

      snapshot.forEach((item) => {
        results.push({
          id: item.id,
          collectionName,
          ...item.data()
        });
      });
    } catch (error) {
      console.error(
        `Legacy ${collectionName} load error:`,
        error
      );
    }
  }

  state.registrations = results;
  renderRegistrations();
}

async function updateTournamentStatus(id) {
  const tournament = state.tournaments.find((item) => item.id === id);
  if (!tournament) return;

  const current = tournament.status || "Upcoming";
  const next = current === "Active" ? "Upcoming" : "Active";

  await updateDoc(doc(db, "tournaments", id), {
    status: next,
    updatedAt: serverTimestamp()
  });

  showMessage(`Tournament status: ${next}`, "success");
  await loadTournaments();
}

async function hideTournament(id) {
  const confirmed = confirm(
    "Kya is tournament ko list se hide karna hai? " +
    "Tournament document aur uski subcollections ko delete nahi kiya jayega."
  );

  if (!confirmed) return;

  await updateDoc(doc(db, "tournaments", id), {
    isDeleted: true,
    deleted: true,
    updatedAt: serverTimestamp()
  });

  showMessage("Tournament hide kar diya gaya. Data delete nahi hua.", "success");
  await loadTournaments();
}

async function updateLegacyRegistration(id, status) {
  const registration = state.registrations.find((item) => item.id === id);

  if (!registration) {
    showMessage("Registration nahi mila.", "error");
    return;
  }

  // Safety: purane registration ko tabhi update karein jab aapka
  // actual legacy schema aur admin permission confirm ho.
  const confirmed = confirm(
    `Legacy registration "${registrationName(registration)}" ka ` +
    `payment status "${status}" karna hai?`
  );

  if (!confirmed) return;

  await updateDoc(
    doc(legacyDb, registration.collectionName, id),
    {
      paymentStatus: status,
      updatedAt: serverTimestamp()
    }
  );

  showMessage("Registration payment status update ho gaya.", "success");
  await loadLegacyRegistrations();
}

async function handleClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  button.disabled = true;

  try {
    if (action === "toggle-status") {
      await updateTournamentStatus(id);
    } else if (action === "hide-tournament") {
      await hideTournament(id);
    } else if (action === "registration-paid") {
      await updateLegacyRegistration(id, "Paid");
    } else if (action === "registration-pending") {
      await updateLegacyRegistration(id, "Pending");
    }
  } catch (error) {
    console.error("Admin action error:", error);

    showMessage(
      error.code === "permission-denied"
        ? "Permission denied. Firebase Rules aur admin access check kijiye."
        : "Action complete nahi hua. Console mein error check kijiye.",
      "error"
    );
  } finally {
    button.disabled = false;
  }
}

async function refreshAdmin() {
  if (!state.user) return;

  showMessage("Admin data load ho raha hai...");

  try {
    await loadTournaments();
    await Promise.all([
      loadTeams(),
      loadLegacyRegistrations()
    ]);

    showMessage("Admin data load ho gaya.", "success");
  } catch (error) {
    console.error("Admin load error:", error);
    showMessage(
      "Admin data load nahi hua. Login aur Firebase Rules check kijiye.",
      "error"
    );
  }
}

onAuthStateChanged(auth, async (user) => {
  state.user = user;

  if (!user) {
    showMessage("Admin panel dekhne ke liye login kijiye.", "error");
    return;
  }

  if (!state.bound) {
    document.addEventListener("click", handleClick);

    const refreshButton = $("refreshAdminBtn");
    if (refreshButton) {
      refreshButton.addEventListener("click", refreshAdmin);
    }

    state.bound = true;
  }

  await refreshAdmin();
});

console.log("APL Admin JS loaded.");
