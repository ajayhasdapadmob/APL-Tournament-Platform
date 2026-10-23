
import { auth, db } from "../firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const tournamentSelect = document.getElementById("tournamentSelect");
const teamList = document.getElementById("teamList");
const recycleButton = document.getElementById("recycleTournamentBtn");
const message = document.getElementById("message");

let activeTournaments = [];
let currentLoadToken = 0;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#b91c1c" : "#087f3c";
}

function setCount(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function resetTeamStats() {
  [
    "totalTeams",
    "pendingTeams",
    "approvedTeams",
    "rejectedTeams",
    "paidTeams",
    "holdTeams",
    "cancelledTeams"
  ].forEach(id => setCount(id, 0));
}

function isRecycled(data) {
  return data.isDeleted === true || data.deleted === true;
}

function getTournamentName(data, id) {
  return data.name ||
    data.tournamentName ||
    data.title ||
    `Tournament ${id}`;
}

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
      .map(item => ({
        id: item.id,
        ...item.data()
      }));

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
        new Option(
          getTournamentName(tournament, tournament.id),
          tournament.id
        )
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
    // Check the tournament still exists and is not recycled.
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
  heading.textContent =
    team.teamName || team.name || team.clubName || "Unnamed Team";

  const details = document.createElement("p");
  details.textContent =
    `Status: ${team.status || "Pending"}` +
    (team.captain ? ` | Captain: ${team.captain}` : "") +
    (team.phone ? ` | Phone: ${team.phone}` : "");

  const actions = document.createElement("div");
  actions.className = "actions";

  const statuses = [
    "Pending",
    "Approved",
    "Rejected",
    "Paid",
    "On Hold",
    "Cancelled"
  ];

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

  // Existing team-delete function remains separate from tournament recycle.
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

      await deleteDoc(
        doc(db, "tournaments", tournamentId, "teams", team.id)
      );

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
    "Is action se tournament ka main record delete nahi hoga. " +
    "Teams aur matches ki subcollections preserve rahengi."
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

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  await loadTournaments();
});
