
import { auth, db, legacyDb } from "../firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const tournamentSelect = document.getElementById("tournamentSelect");
const teamList = document.getElementById("teamList");
const recycleButton = document.getElementById("recycleTournamentBtn");
const message = document.getElementById("message");

const legacyList = document.getElementById("legacyRegistrationList");
const legacyMessage = document.getElementById("legacyMessage");
const legacySearch = document.getElementById("legacySearch");
const legacyStatusFilter = document.getElementById("legacyStatusFilter");
const refreshLegacyBtn = document.getElementById("refreshLegacyBtn");

let activeTournaments = [];
let currentLoadToken = 0;
let legacyRegistrations = [];

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#b91c1c" : "#087f3c";
}

function showLegacyMessage(text, isError = false) {
  legacyMessage.textContent = text;
  legacyMessage.style.color = isError ? "#b91c1c" : "#087f3c";
}

function setCount(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function resetTeamStats() {
  [
    "totalTeams", "pendingTeams", "approvedTeams",
    "rejectedTeams", "paidTeams", "holdTeams", "cancelledTeams"
  ].forEach(id => setCount(id, 0));
}

function isRecycled(data) {
  return data.isDeleted === true || data.deleted === true;
}

function getTournamentName(data, id) {
  return data.name || data.tournamentName || data.title || `Tournament ${id}`;
}

/* ---------------- TOURNAMENTS ---------------- */

async function loadTournaments(preferredId = "") {
  tournamentSelect.innerHTML = "";

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Loading tournaments...";
  tournamentSelect.appendChild(loadingOption);

  try {
    const snapshot = await getDocs(collection(db, "tournaments"));

    activeTournaments = snapshot.docs
      .filter(item => !isRecycled(item.data()))
      .map(item => ({ id: item.id, ...item.data() }));

    tournamentSelect.innerHTML = "";

    if (activeTournaments.length === 0) {
      tournamentSelect.add(new Option("No active tournaments", ""));
      teamList.className = "empty";
      teamList.textContent = "No active tournaments found.";
      resetTeamStats();
      return;
    }

    activeTournaments.forEach(tournament => {
      tournamentSelect.add(
        new Option(getTournamentName(tournament, tournament.id), tournament.id)
      );
    });

    const savedId =
      preferredId ||
      new URLSearchParams(location.search).get("id") ||
      localStorage.getItem("selectedTournamentId") ||
      localStorage.getItem("tournamentId") ||
      "";

    const selected = activeTournaments.find(item => item.id === savedId);
    tournamentSelect.value = selected
      ? selected.id
      : activeTournaments[0].id;

    await loadTeams(tournamentSelect.value);
  } catch (error) {
    console.error("Could not load tournaments:", error);
    tournamentSelect.innerHTML = "";
    tournamentSelect.add(new Option("Unable to load tournaments", ""));
    showMessage(
      "Tournament load nahi hua. Firebase permissions aur network check karein.\n" +
      error.message,
      true
    );
  }
}

/* ---------------- EXISTING TOURNAMENT TEAMS ---------------- */

async function loadTeams(tournamentId) {
  const token = ++currentLoadToken;
  resetTeamStats();

  if (!tournamentId) {
    teamList.className = "empty";
    teamList.textContent = "Please select an active tournament.";
    return;
  }

  teamList.className = "empty";
  teamList.textContent = "Loading teams...";

  try {
    const tournament = activeTournaments.find(item => item.id === tournamentId);

    if (!tournament || isRecycled(tournament)) {
      teamList.textContent = "This tournament is not active.";
      return;
    }

    const snapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "teams")
    );

    if (token !== currentLoadToken) return;

    const teams = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    const count = {
      total: teams.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      hold: 0,
      cancelled: 0
    };

    teams.forEach(team => {
      const status = String(team.status || "Pending").toLowerCase();

      if (status === "approved") count.approved++;
      else if (status === "rejected") count.rejected++;
      else if (status === "paid") count.paid++;
      else if (status === "on hold" || status === "hold") count.hold++;
      else if (status === "cancelled" || status === "canceled") count.cancelled++;
      else count.pending++;
    });

    setCount("totalTeams", count.total);
    setCount("pendingTeams", count.pending);
    setCount("approvedTeams", count.approved);
    setCount("rejectedTeams", count.rejected);
    setCount("paidTeams", count.paid);
    setCount("holdTeams", count.hold);
    setCount("cancelledTeams", count.cancelled);

    teamList.replaceChildren();

    if (teams.length === 0) {
      teamList.className = "empty";
      teamList.textContent = "No teams registered for this tournament.";
      return;
    }

    teamList.className = "";
    teams.forEach(team => {
      teamList.appendChild(createTeamCard(tournamentId, team));
    });
  } catch (error) {
    if (token !== currentLoadToken) return;

    console.error("Could not load teams:", error);
    teamList.className = "empty";
    teamList.textContent = "Teams load nahi hue: " + error.message;
  }
}

function createTeamCard(tournamentId, team) {
  const card = document.createElement("article");
  card.className = "team-card";

  const heading = document.createElement("h3");
  heading.textContent = team.teamName || team.name || team.clubName || "Unnamed Team";

  const details = document.createElement("p");
  details.textContent =
    `Status: ${team.status || "Pending"}` +
    (team.captain ? ` | Captain: ${team.captain}` : "") +
    (team.phone ? ` | Phone: ${team.phone}` : "");

  const actions = document.createElement("div");
  actions.className = "actions";

  const statuses = ["Pending", "Approved", "Rejected", "Paid", "On Hold", "Cancelled"];

  statuses.forEach(status => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-btn";

    if (String(team.status || "Pending").toLowerCase() === status.toLowerCase()) {
      button.classList.add("active");
    }

    button.textContent = status;

    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await updateDoc(
          doc(db, "tournaments", tournamentId, "teams", team.id),
          { status }
        );

        showMessage(`Team status updated: ${status}`);
        await loadTeams(tournamentId);
      } catch (error) {
        console.error("Status update failed:", error);
        showMessage("Status update nahi hua: " + error.message, true);
      } finally {
        button.disabled = false;
      }
    });

    actions.appendChild(button);
  });

  // Existing delete action retained. Confirmation is required.
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "Delete Team";

  deleteButton.addEventListener("click", async () => {
    const confirmed = confirm(
      `Team "${heading.textContent}" ko permanently delete karna hai?`
    );

    if (!confirmed) return;

    deleteButton.disabled = true;

    try {
      const { deleteDoc } = await import(
        "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
      );

      await deleteDoc(doc(db, "tournaments", tournamentId, "teams", team.id));

      showMessage("Team deleted.");
      await loadTeams(tournamentId);
    } catch (error) {
      console.error("Team deletion failed:", error);
      showMessage("Team delete nahi hui: " + error.message, true);
    } finally {
      deleteButton.disabled = false;
    }
  });

  actions.appendChild(deleteButton);
  card.append(heading, details, actions);
  return card;
}

tournamentSelect.addEventListener("change", async () => {
  const tournamentId = tournamentSelect.value;

  if (tournamentId) {
    localStorage.setItem("selectedTournamentId", tournamentId);
    localStorage.setItem("tournamentId", tournamentId);
  }

  await loadTeams(tournamentId);
});

recycleButton.addEventListener("click", async () => {
  const tournamentId = tournamentSelect.value;

  if (!auth.currentUser) {
    showMessage("Please login first.", true);
    return;
  }

  const tournament = activeTournaments.find(item => item.id === tournamentId);

  if (!tournament || isRecycled(tournament)) {
    showMessage("Please select an active tournament.", true);
    return;
  }

  const name = getTournamentName(tournament, tournamentId);

  const confirmed = confirm(
    `"${name}" ko Recycle Bin mein bhejna hai?\n\n` +
    "Teams aur matches ki subcollections delete nahi hongi."
  );

  if (!confirmed) return;

  recycleButton.disabled = true;

  try {
    await updateDoc(doc(db, "tournaments", tournamentId), {
      isDeleted: true,
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: auth.currentUser.uid
    });

    if (localStorage.getItem("selectedTournamentId") === tournamentId) {
      localStorage.removeItem("selectedTournamentId");
    }

    if (localStorage.getItem("tournamentId") === tournamentId) {
      localStorage.removeItem("tournamentId");
    }

    showMessage("Tournament Recycle Bin mein bhej diya gaya.");
    await loadTournaments();
  } catch (error) {
    console.error("Tournament recycle failed:", error);
    showMessage(
      "Tournament recycle nahi hua. Firebase permissions check karein.\n" +
      error.message,
      true
    );
  } finally {
    recycleButton.disabled = false;
  }
});

/* ---------------- LEGACY APL LEAGUE REGISTRATIONS ---------------- */
/* Read-only: this section never writes to legacyDb. */

function safeText(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function getLegacyStatus(registration) {
  return registration.status || "Pending";
}

function updateLegacyStats(registrations) {
  setCount("legacyTotal", registrations.length);

  setCount(
    "legacyPending",
    registrations.filter(item => normalized(getLegacyStatus(item)) === "pending").length
  );

  setCount(
    "legacyApproved",
    registrations.filter(item => normalized(getLegacyStatus(item)) === "approved").length
  );

  setCount(
    "legacyPaid",
    registrations.filter(item =>
      normalized(item.paymentStatus) === "paid" ||
      normalized(item.paymentDone) === "paid" ||
      normalized(item.paymentDone) === "yes"
    ).length
  );
}

function createInfoLine(label, value) {
  const paragraph = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = label + ": ";
  paragraph.append(strong, document.createTextNode(safeText(value)));
  return paragraph;
}

function renderLegacyRegistrations() {
  const searchTerm = normalized(legacySearch.value);
  const statusFilter = normalized(legacyStatusFilter.value);

  const filtered = legacyRegistrations.filter(registration => {
    const searchable = [
      registration.registrationId,
      registration.teamId,
      registration.teamName,
      registration.captainName,
      registration.mobile,
      registration.whatsapp,
      registration.email,
      registration.area,
      registration.status,
      registration.paymentStatus,
      registration.paymentDone
    ].map(normalized).join(" ");

    const matchesSearch = !searchTerm || searchable.includes(searchTerm);

    const status = normalized(registration.status);
    const paymentStatus = normalized(registration.paymentStatus);
    const paymentDone = normalized(registration.paymentDone);

    let matchesStatus = !statusFilter;

    if (statusFilter === "paid") {
      matchesStatus =
        paymentStatus === "paid" ||
        paymentDone === "paid" ||
        paymentDone === "yes";
    } else if (statusFilter === "unpaid") {
      matchesStatus =
        paymentStatus === "unpaid" ||
        paymentDone === "no" ||
        paymentDone === "unpaid";
    } else if (statusFilter) {
      matchesStatus =
        status === statusFilter ||
        (statusFilter === "on hold" && status === "hold");
    }

    return matchesSearch && matchesStatus;
  });

  updateLegacyStats(legacyRegistrations);
  legacyList.replaceChildren();

  if (filtered.length === 0) {
    legacyList.className = "empty";
    legacyList.textContent = legacyRegistrations.length
      ? "Search/filter ke liye koi registration nahi mili."
      : "Purane APL League database mein koi registration nahi mili.";
    return;
  }

  legacyList.className = "";

  filtered.forEach(registration => {
    const card = document.createElement("article");
    card.className = "registration-card";

    const heading = document.createElement("h3");
    heading.textContent = safeText(registration.teamName || "Unnamed Team");

    const status = document.createElement("span");
    status.className = "tag";

    const statusValue = safeText(getLegacyStatus(registration));
    status.textContent = "Registration: " + statusValue;

    if (normalized(statusValue) === "pending") status.classList.add("pending");
    if (normalized(statusValue) === "rejected") status.classList.add("rejected");

    card.append(heading, status);

    card.append(
      createInfoLine("Registration ID", registration.registrationId),
      createInfoLine("Team ID", registration.teamId),
      createInfoLine("Captain", registration.captainName),
      createInfoLine("Mobile", registration.mobile),
      createInfoLine("WhatsApp", registration.whatsapp),
      createInfoLine("Email", registration.email),
      createInfoLine("Area", registration.area),
      createInfoLine("Address", registration.address),
      createInfoLine("Player Type", registration.playerType),
      createInfoLine("Payment Status", registration.paymentStatus),
      createInfoLine("Payment Details", registration.paymentDone),
      createInfoLine("UPI", registration.upi)
    );

    legacyList.appendChild(card);
  });

  showLegacyMessage(
    `Purane APL database se ${legacyRegistrations.length} registrations mili. ` +
    `Is waqt ${filtered.length} result dikh rahe hain.`
  );
}

async function loadLegacyRegistrations() {
  refreshLegacyBtn.disabled = true;
  legacyList.className = "empty";
  legacyList.textContent = "Purane APL League database se registrations load ho rahi hain...";
  showLegacyMessage("Loading registrations...");

  try {
    // IMPORTANT: Read from the old APL League project, not Platform db.
    const snapshot = await getDocs(collection(legacyDb, "registrations"));

    legacyRegistrations = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    // Newest registrations first when a Firestore timestamp exists.
    legacyRegistrations.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    renderLegacyRegistrations();
  } catch (error) {
    console.error("Legacy registrations could not load:", error);

    legacyList.className = "empty";
    legacyList.textContent =
      "APL League registrations load nahi hui.\n" +
      "Firebase rules, network aur legacyDb configuration check karein.";

    showLegacyMessage(
      "Error: " + error.message +
      "\nData delete ya migrate nahi kiya gaya hai.",
      true
    );
  } finally {
    refreshLegacyBtn.disabled = false;
  }
}

legacySearch.addEventListener("input", renderLegacyRegistrations);
legacyStatusFilter.addEventListener("change", renderLegacyRegistrations);
refreshLegacyBtn.addEventListener("click", loadLegacyRegistrations);

/* ---------------- ADMIN LOGIN ---------------- */

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  await Promise.all([
    loadTournaments(),
    loadLegacyRegistrations()
  ]);
});
