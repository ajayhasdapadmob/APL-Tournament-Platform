
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

/* =====================================================
   EXISTING TOURNAMENT MANAGEMENT
   ===================================================== */

async function loadTournaments(preferredId = "") {
  tournamentSelect.innerHTML = "";
  tournamentSelect.add(new Option("Loading tournaments...", ""));

  try {
    const snapshot = await getDocs(collection(db, "tournaments"));

    activeTournaments = snapshot.docs
      .filter(item => !isRecycled(item.data()))
      .map(item => ({ id: item.id, ...item.data() }));

    tournamentSelect.innerHTML = "";

    if (!activeTournaments.length) {
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
    console.error(error);
    tournamentSelect.innerHTML = "";
    tournamentSelect.add(new Option("Unable to load tournaments", ""));
    showMessage("Tournament load nahi hua: " + error.message, true);
  }
}

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

    const counts = {
      total: teams.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      hold: 0,
      cancelled: 0
    };

    

teams.forEach(team => {
  const status = String(team.status || "Pending")
    .trim()
    .toLowerCase();

  const rawPaymentStatus = String(team.paymentStatus || "")
    .trim()
    .toLowerCase();

  if (status === "approved") {
    counts.approved++;
  } else if (status === "rejected") {
    counts.rejected++;
  } else if (status === "on hold" || status === "hold") {
    counts.hold++;
  } else if (status === "cancelled" || status === "canceled") {
    counts.cancelled++;
  } else {
    counts.pending++;
  }

  const isPaid = rawPaymentStatus
    ? rawPaymentStatus === "paid"
    : status === "paid";

  if (isPaid) {
    counts.paid++;
  }
});


    setCount("totalTeams", counts.total);
    setCount("pendingTeams", counts.pending);
    setCount("approvedTeams", counts.approved);
    setCount("rejectedTeams", counts.rejected);
    setCount("paidTeams", counts.paid);
    setCount("holdTeams", counts.hold);
    setCount("cancelledTeams", counts.cancelled);

    teamList.replaceChildren();

    if (!teams.length) {
      teamList.className = "empty";
      teamList.textContent = "No teams registered for this tournament.";
      return;
    }

    teamList.className = "";
    teams.forEach(team => teamList.appendChild(createTeamCard(tournamentId, team)));
  } catch (error) {
    if (token !== currentLoadToken) return;
    console.error(error);
    teamList.className = "empty";
    teamList.textContent = "Teams load nahi hue: " + error.message;
  }
}

function createTeamCard(tournamentId, team) {
  const card = document.createElement("article");
  card.className = "team-card";

  const heading = document.createElement("h3");
  heading.textContent =
    team.teamName || team.name || team.clubName || "Unnamed Team";


const details = document.createElement("p");

function getEffectivePaymentStatus() {
  const paymentStatus = String(team.paymentStatus || "")
    .trim()
    .toLowerCase();

  if (paymentStatus) {
    return paymentStatus === "paid" ? "Paid" : "Unpaid";
  }

  return String(team.status || "").trim().toLowerCase() === "paid"
    ? "Paid"
    : "Unpaid";
}

function updateDetails() {
  const rawStatus = String(team.status || "Pending").trim();
  const isLegacyPaid = rawStatus.toLowerCase() === "paid";

  details.textContent =
    `Status: ${isLegacyPaid ? "Pending approval (legacy Paid record)" : rawStatus}` +
    ` | Payment: ${getEffectivePaymentStatus()}` +
    (team.captain ? ` | Captain: ${team.captain}` : "") +
    (team.phone ? ` | Phone: ${team.phone}` : "");
}

updateDetails();


  const actions = document.createElement("div");
  actions.className = "actions";

  // Team approval status — payment is handled separately.
  ["Pending", "Approved", "Rejected", "On Hold", "Cancelled"]
    .forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "status-btn";
      button.textContent = status;

      if (
        String(team.status || "Pending").toLowerCase() ===
        status.toLowerCase()
      ) {
        button.classList.add("active");
      }

      button.addEventListener("click", async () => {
        button.disabled = true;

        try {
          
const oldStatus = String(team.status || "")
  .trim()
  .toLowerCase();

const existingPaymentStatus = String(team.paymentStatus || "")
  .trim();

const changes = { status };

if (oldStatus === "paid" && !existingPaymentStatus) {
  changes.paymentStatus = "Paid";
}

await updateDoc(
  doc(db, "tournaments", tournamentId, "teams", team.id),
  changes
);

          showMessage(`Team status updated: ${status}`);
          await loadTeams(tournamentId);
        } catch (error) {
          showMessage(
            "Status update nahi hua: " + error.message,
            true
          );
        } finally {
          button.disabled = false;
        }
      });

      actions.appendChild(button);
    });

  // Payment status — does not overwrite team approval status.
  
const paymentButton = document.createElement("button");
paymentButton.type = "button";
paymentButton.className = "status-btn";

function updatePaymentButton() {
  const paid = getEffectivePaymentStatus() === "Paid";

  paymentButton.textContent = paid ? "Mark Unpaid" : "Mark Paid";

  if (paid) paymentButton.classList.add("active");
  else paymentButton.classList.remove("active");
}

updatePaymentButton();

paymentButton.addEventListener("click", async () => {
  const currentlyPaid = getEffectivePaymentStatus() === "Paid";
  const nextPaymentStatus = currentlyPaid ? "Unpaid" : "Paid";

  if (
    nextPaymentStatus === "Paid" &&
    !confirm(`Kya "${heading.textContent}" ka payment verify ho gaya hai?`)
  ) {
    return;
  }

  paymentButton.disabled = true;

  try {
    await updateDoc(
      doc(db, "tournaments", tournamentId, "teams", team.id),
      { paymentStatus: nextPaymentStatus }
    );

    showMessage(`Payment status updated: ${nextPaymentStatus}`);
    await loadTeams(tournamentId);
  } catch (error) {
    showMessage(
      "Payment status update nahi hua: " + error.message,
      true
    );
  } finally {
    paymentButton.disabled = false;
  }
});

actions.appendChild(paymentButton);


  // Keep the existing delete-team feature.
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "Delete Team";

  deleteButton.addEventListener("click", async () => {
    if (
      !confirm(
        `Team "${heading.textContent}" ko permanently delete karna hai?`
      )
    ) {
      return;
    }

    deleteButton.disabled = true;

    try {
      const { deleteDoc } = await import(
        "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
      );

      await deleteDoc(
        doc(db, "tournaments", tournamentId, "teams", team.id)
      );

      showMessage("Team deleted.");
      await loadTeams(tournamentId);
    } catch (error) {
      showMessage(
        "Team delete nahi hui: " + error.message,
        true
      );
    } finally {
      deleteButton.disabled = false;
    }
  });

  actions.appendChild(deleteButton);
  card.append(heading, details, actions);

  return card;
}
 
tournamentSelect.addEventListener("change", async () => {
  const id = tournamentSelect.value;

  if (id) {
    localStorage.setItem("selectedTournamentId", id);
    localStorage.setItem("tournamentId", id);
  }

  await loadTeams(id);
});

recycleButton.addEventListener("click", async () => {
  const id = tournamentSelect.value;

  if (!auth.currentUser) {
    showMessage("Please login first.", true);
    return;
  }

  const tournament = activeTournaments.find(item => item.id === id);

  if (!tournament || isRecycled(tournament)) {
    showMessage("Please select an active tournament.", true);
    return;
  }

  const name = getTournamentName(tournament, id);

  if (!confirm(
    `"${name}" ko Recycle Bin mein bhejna hai?\n\n` +
    "Teams aur matches ki subcollections delete nahi hongi."
  )) return;

  recycleButton.disabled = true;

  try {
    await updateDoc(doc(db, "tournaments", id), {
      isDeleted: true,
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: auth.currentUser.uid
    });

    if (localStorage.getItem("selectedTournamentId") === id) {
      localStorage.removeItem("selectedTournamentId");
    }
    if (localStorage.getItem("tournamentId") === id) {
      localStorage.removeItem("tournamentId");
    }

    showMessage("Tournament Recycle Bin mein bhej diya gaya.");
    await loadTournaments();
  } catch (error) {
    showMessage("Tournament recycle nahi hua: " + error.message, true);
  } finally {
    recycleButton.disabled = false;
  }
});

/* =====================================================
   LEGACY APL LEAGUE REGISTRATIONS
   Read/write ONLY to legacyDb registrations.
   ===================================================== */

function textValue(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function registrationStatus(registration) {
  return registration.status || "Pending";
}

function updateLegacyStats() {
  setCount("legacyTotal", legacyRegistrations.length);

  setCount(
    "legacyPending",
    legacyRegistrations.filter(r => norm(registrationStatus(r)) === "pending").length
  );

  setCount(
    "legacyApproved",
    legacyRegistrations.filter(r => norm(registrationStatus(r)) === "approved").length
  );

  setCount(
    "legacyRejected",
    legacyRegistrations.filter(r => norm(registrationStatus(r)) === "rejected").length
  );

  setCount(
    "legacyPaid",
    legacyRegistrations.filter(r =>
      norm(r.paymentStatus) === "paid" ||
      norm(r.paymentDone) === "paid" ||
      norm(r.paymentDone) === "yes"
    ).length
  );
}

function addInfo(card, label, value) {
  const paragraph = document.createElement("p");
  const bold = document.createElement("strong");
  bold.textContent = label + ": ";
  paragraph.append(bold, document.createTextNode(textValue(value)));
  card.appendChild(paragraph);
}

async function updateLegacyRegistration(registration, changes, button) {
  if (!auth.currentUser) {
    showLegacyMessage("Admin login zaroori hai.", true);
    return;
  }

  const confirmed = confirm(
    `Team: ${registration.teamName || "Unnamed Team"}\n` +
    `Registration ID: ${registration.registrationId || registration.id}\n\n` +
    `Is registration ka status update karna hai?`
  );

  if (!confirmed) return;

  button.disabled = true;

  try {
    // Update the existing legacy document; do not copy or recreate it.
    await updateDoc(
      doc(legacyDb, "registrations", registration.id),
      changes
    );

    Object.assign(registration, changes);
    renderLegacyRegistrations();

    showLegacyMessage(
      `Registration ${registration.registrationId || registration.id} updated successfully.`
    );
  } catch (error) {
    console.error("Legacy registration update failed:", error);
    showLegacyMessage(
      "Update nahi hua. Purane Firebase project ki Firestore Rules check karein.\n" +
      error.message,
      true
    );
  } finally {
    button.disabled = false;
  }
}

function renderLegacyRegistrations() {
  if (!legacyList) return;

  const search = norm(legacySearch?.value);
  const selectedFilter = norm(legacyStatusFilter?.value);

  updateLegacyStats();

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
    ].map(norm).join(" ");

    const matchesSearch = !search || searchable.includes(search);

    let matchesFilter = true;
    const status = norm(registration.status);
    const paymentStatus = norm(registration.paymentStatus);
    const paymentDone = norm(registration.paymentDone);

    if (selectedFilter === "paid") {
      matchesFilter =
        paymentStatus === "paid" ||
        paymentDone === "paid" ||
        paymentDone === "yes";
    } else if (selectedFilter === "unpaid") {
      matchesFilter =
        paymentStatus === "unpaid" ||
        paymentDone === "unpaid" ||
        paymentDone === "no";
    } else if (selectedFilter) {
      matchesFilter =
        status === selectedFilter ||
        (selectedFilter === "on hold" && status === "hold");
    }

    return matchesSearch && matchesFilter;
  });

  legacyList.replaceChildren();

  if (!filtered.length) {
    legacyList.className = "empty";
    legacyList.textContent = legacyRegistrations.length
      ? "Is search/filter mein koi registration nahi mili."
      : "Koi APL League registration nahi mili.";
    return;
  }

  legacyList.className = "";

  filtered.forEach(registration => {
    const card = document.createElement("article");
    card.className = "registration-card";

    const heading = document.createElement("h3");
    heading.textContent = textValue(registration.teamName || "Unnamed Team");
    card.appendChild(heading);

    const statusTag = document.createElement("span");
    statusTag.className = "tag";
    statusTag.textContent = "Status: " + textValue(registrationStatus(registration));

    const currentStatus = norm(registrationStatus(registration));
    if (currentStatus === "pending") statusTag.classList.add("pending");
    if (currentStatus === "rejected") statusTag.classList.add("rejected");

    card.appendChild(statusTag);

    addInfo(card, "Registration ID", registration.registrationId);
    addInfo(card, "Team ID", registration.teamId);
    addInfo(card, "Captain", registration.captainName);
    addInfo(card, "Mobile", registration.mobile);
    addInfo(card, "WhatsApp", registration.whatsapp);
    addInfo(card, "Email", registration.email);
    addInfo(card, "Area", registration.area);
    addInfo(card, "Address", registration.address);
    addInfo(card, "Player Type", registration.playerType);
    addInfo(card, "Payment Status", registration.paymentStatus);
    addInfo(card, "Payment Details", registration.paymentDone);

    const actions = document.createElement("div");
    actions.className = "actions";

    const statusButtons = [
      { label: "Approve", status: "Approved" },
      { label: "Reject", status: "Rejected" },
      { label: "Pending", status: "Pending" }
    ];

    statusButtons.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.className = item.status === "Rejected" ? "danger" : "primary";

      if (norm(registrationStatus(registration)) === norm(item.status)) {
        button.disabled = true;
        button.title = "This is the current status";
      }

      button.addEventListener("click", () => {
        updateLegacyRegistration(
          registration,
          { status: item.status },
          button
        );
      });

      actions.appendChild(button);
    });

    const paidButton = document.createElement("button");
    paidButton.type = "button";
    paidButton.textContent = "Mark Paid";
    paidButton.className = "primary";

    const alreadyPaid =
      norm(registration.paymentStatus) === "paid" ||
      norm(registration.paymentDone) === "paid" ||
      norm(registration.paymentDone) === "yes";

    if (alreadyPaid) {
      paidButton.disabled = true;
      paidButton.title = "Payment already marked paid";
    }

    paidButton.addEventListener("click", () => {
      if (!confirm(
        `Kya aapne payment verify kar liya hai?\n` +
        `Team: ${registration.teamName || "Unnamed Team"}`
      )) return;

      updateLegacyRegistration(
        registration,
        { paymentStatus: "Paid" },
        paidButton
      );
    });

    actions.appendChild(paidButton);
    card.appendChild(actions);
    legacyList.appendChild(card);
  });

  showLegacyMessage(
    `Total registrations: ${legacyRegistrations.length}. ` +
    `Filtered results: ${filtered.length}.`
  );
}

async function loadLegacyRegistrations() {
  if (!legacyList) return;

  refreshLegacyBtn.disabled = true;
  legacyList.className = "empty";
  legacyList.textContent = "APL League registrations load ho rahi hain...";
  showLegacyMessage("Loading registrations...");

  try {
    const snapshot = await getDocs(collection(legacyDb, "registrations"));

    legacyRegistrations = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    legacyRegistrations.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    renderLegacyRegistrations();
  } catch (error) {
    console.error("Legacy registrations load failed:", error);
    legacyList.className = "empty";
    legacyList.textContent =
      "Registrations load nahi hui. Firebase permissions aur connection check karein.";
    showLegacyMessage(error.message, true);
  } finally {
    refreshLegacyBtn.disabled = false;
  }
}

legacySearch?.addEventListener("input", renderLegacyRegistrations);
legacyStatusFilter?.addEventListener("change", renderLegacyRegistrations);
refreshLegacyBtn?.addEventListener("click", loadLegacyRegistrations);

/* =====================================================
   ADMIN AUTHENTICATION
   ===================================================== */

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
