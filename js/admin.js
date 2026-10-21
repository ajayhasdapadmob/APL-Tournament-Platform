
console.log("🔥 ADMIN JS LOADED");

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =====================================================
   ELEMENTS
===================================================== */

const tournamentSelect = document.getElementById("tournamentSelect");
const teamList = document.getElementById("teamList");

const totalTeams = document.getElementById("totalTeams");
const pendingTeams = document.getElementById("pendingTeams");
const approvedTeams = document.getElementById("approvedTeams");
const rejectedTeams = document.getElementById("rejectedTeams");
const paidTeams = document.getElementById("paidTeams");
const holdTeams = document.getElementById("holdTeams");
const cancelledTeams = document.getElementById("cancelledTeams");

const adminMessage = document.getElementById("adminMessage");

/* =====================================================
   MESSAGE
===================================================== */

function showMessage(message, type = "") {
    if (!adminMessage) return;

    adminMessage.textContent = message;
    adminMessage.className = "";

    if (type) {
        adminMessage.classList.add(type);
    }
}

/* =====================================================
   SAFE TEXT HELPERS
===================================================== */

function safeText(value, fallback = "-") {
    if (typeof value === "string" || typeof value === "number") {
        const result = String(value).trim();
        return result || fallback;
    }

    return fallback;
}

/*
  Supports player names stored as strings or objects.
  If the data uses a different field name, update this list.
*/

function getPlayerName(player) {
    if (typeof player === "string") {
        return player.trim();
    }

    if (typeof player === "number") {
        return String(player);
    }

    if (!player || typeof player !== "object") {
        return "";
    }

    const possibleNames = [
        player.playerName,
        player.fullName,
        player.name,
        player.displayName,
        player.captainName,
        player.label,
        player.firstName && player.lastName
            ? `${player.firstName} ${player.lastName}`
            : "",
        player.firstName
    ];

    for (const value of possibleNames) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function getPlayers(team) {
    let source = team.players;

    // Also support alternative player-array field names.
    if (!Array.isArray(source) && Array.isArray(team.playerList)) {
        source = team.playerList;
    }

    if (!Array.isArray(source) && Array.isArray(team.registeredPlayers)) {
        source = team.registeredPlayers;
    }

    if (Array.isArray(source)) {
        return source.map(getPlayerName).filter(Boolean);
    }

    if (typeof source === "string" && source.trim()) {
        return source
            .split(",")
            .map(name => name.trim())
            .filter(Boolean);
    }

    // Support player1, player2, player3, etc. fields.
    const fieldPlayers = [];

    for (const [key, value] of Object.entries(team)) {
        if (
            /^player\d*$/i.test(key) ||
            /^player_\d+$/i.test(key)
        ) {
            const name = getPlayerName(value);
            if (name) fieldPlayers.push(name);
        }
    }

    return [...new Set(fieldPlayers)];
}

/* =====================================================
   RESET COUNTERS
===================================================== */

function resetCounters() {
    if (totalTeams) totalTeams.textContent = "0";
    if (pendingTeams) pendingTeams.textContent = "0";
    if (approvedTeams) approvedTeams.textContent = "0";
    if (rejectedTeams) rejectedTeams.textContent = "0";
    if (paidTeams) paidTeams.textContent = "0";
    if (holdTeams) holdTeams.textContent = "0";
    if (cancelledTeams) cancelledTeams.textContent = "0";
}

/* =====================================================
   LOAD TOURNAMENTS
===================================================== */

async function loadTournaments() {
    console.log("🏆 Loading tournaments...");

    if (!tournamentSelect || !teamList) {
        console.error(
            "Required HTML elements missing:",
            { tournamentSelect, teamList }
        );
        return;
    }

    try {
        showMessage("⏳ Loading tournaments...", "loading");

        const snapshot = await getDocs(collection(db, "tournaments"));

        console.log("🏆 Tournament count:", snapshot.size);

        tournamentSelect.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "-- Select Tournament --";
        tournamentSelect.appendChild(placeholder);

        if (snapshot.empty) {
            showMessage("❌ No tournaments found.", "error");

            teamList.textContent = "🏆 No tournament found. Please create a tournament first.";

            resetCounters();
            return;
        }

        snapshot.forEach(tournamentDoc => {
            const data = tournamentDoc.data();
            const option = document.createElement("option");

            option.value = tournamentDoc.id;
            option.textContent = safeText(
                data.tournamentName || data.name,
                "Unnamed Tournament"
            );

            tournamentSelect.appendChild(option);
        });

        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");
        const localId = localStorage.getItem("tournamentId");
        const selectedId = localStorage.getItem("selectedTournamentId");

        const availableIds = new Set(
            snapshot.docs.map(item => item.id)
        );

        let tournamentId = null;

        if (urlId && availableIds.has(urlId)) {
            tournamentId = urlId;
        } else if (selectedId && availableIds.has(selectedId)) {
            tournamentId = selectedId;
        } else if (localId && availableIds.has(localId)) {
            tournamentId = localId;
        } else {
            tournamentId = snapshot.docs[0].id;
        }

        tournamentSelect.value = tournamentId;

        localStorage.setItem("tournamentId", tournamentId);
        localStorage.setItem("selectedTournamentId", tournamentId);

        console.log("🏆 Selected Tournament:", tournamentId);

        await loadTeams(tournamentId);

    } catch (error) {
        console.error("❌ TOURNAMENT LOAD ERROR:", error);

        showMessage("❌ " + error.message, "error");
        teamList.textContent = "Tournament load failed: " + error.message;
        resetCounters();
    }
}

/* =====================================================
   RENDER TEAM CARD
===================================================== */

function createTeamCard(tournamentId, teamDoc) {
    const team = teamDoc.data();
    const teamId = teamDoc.id;

    const status = safeText(team.status, "Pending");
    const players = getPlayers(team);
    const actualPlayerCount = players.length;

    const card = document.createElement("div");
    card.className = "team-card";

    const heading = document.createElement("h3");
    heading.textContent = "🏏 " + safeText(team.teamName, "-");
    card.appendChild(heading);

    function addLine(label, value) {
        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = label + ": ";
        paragraph.appendChild(strong);
        paragraph.appendChild(document.createTextNode(value));

        card.appendChild(paragraph);
    }

    addLine("🆔 Team ID", teamId);
    addLine("🏆 Tournament", safeText(team.tournamentName));
    addLine("📍 Venue", safeText(team.venue));
    addLine("👤 Captain", safeText(team.captainName));
    addLine("📞 Mobile", safeText(team.mobile));
    addLine("📧 Email", safeText(team.email));
    addLine("🏙️ City", safeText(team.city));

    const playersBox = document.createElement("div");
    playersBox.className = "players-box";

    const playersTitle = document.createElement("strong");
    playersTitle.textContent = "👥 Players:";
    playersBox.appendChild(playersTitle);

    const playerList = document.createElement("div");
    playerList.style.marginTop = "10px";

    if (players.length) {
        playerList.textContent = players.join(", ");
    } else {
        playerList.textContent = "Player names not available in this team document.";
    }

    playersBox.appendChild(playerList);
    card.appendChild(playersBox);

    addLine("👥 Player Count", String(actualPlayerCount));
    addLine("💰 Payment", safeText(team.paymentStatus, "Unpaid"));
    addLine("📌 Status", status);

    const actions = document.createElement("div");
    actions.className = "action-buttons";

    const statuses = [
        ["Pending", "⏳ Pending", "pending-btn"],
        ["Approved", "✅ Approved", "approved-btn"],
        ["Rejected", "❌ Rejected", "rejected-btn"],
        ["Paid", "💰 Paid", "paid-btn"],
        ["On Hold", "⏸️ Hold", "hold-btn"],
        ["Cancelled", "🚫 Cancel", "cancel-btn"]
    ];

    for (const [newStatus, label, className] of statuses) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;

        button.addEventListener("click", async () => {
            await updateTeamStatus(tournamentId, teamId, newStatus);
        });

        actions.appendChild(button);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "🗑️ Delete";

    deleteButton.addEventListener("click", async () => {
        await deleteTeam(tournamentId, teamId);
    });

    actions.appendChild(deleteButton);
    card.appendChild(actions);

    return card;
}

/* =====================================================
   LOAD TEAMS
===================================================== */

async function loadTeams(tournamentId) {
    console.log("👥 Loading teams:", tournamentId);

    resetCounters();

    if (!teamList) return;

    if (!tournamentId) {
        teamList.textContent = "🏆 Please select a tournament.";
        return;
    }

    try {
        showMessage("⏳ Loading registered teams...", "loading");

        const teamsRef = collection(
            db,
            "tournaments",
            tournamentId,
            "teams"
        );

        console.log(
            "📁 Firestore:",
            `tournaments/${tournamentId}/teams`
        );

        const snapshot = await getDocs(teamsRef);

        console.log("👥 Teams found:", snapshot.size);

        teamList.replaceChildren();

        if (snapshot.empty) {
            teamList.textContent = "👥 No teams registered for this tournament yet.";
            showMessage("ℹ️ No team registered yet.");
            return;
        }

        let pending = 0;
        let approved = 0;
        let rejected = 0;
        let paid = 0;
        let hold = 0;
        let cancelled = 0;

        snapshot.forEach(teamDoc => {
            const team = teamDoc.data();
            const status = safeText(team.status, "Pending");

            if (status === "Pending") pending++;
            if (status === "Approved") approved++;
            if (status === "Rejected") rejected++;
            if (status === "Paid") paid++;
            if (status === "On Hold") hold++;
            if (status === "Cancelled") cancelled++;

            teamList.appendChild(
                createTeamCard(tournamentId, teamDoc)
            );

            console.log("👥 Team details:", {
                id: teamDoc.id,
                teamName: team.teamName,
                players: getPlayers(team)
            });
        });

        if (totalTeams) totalTeams.textContent = String(snapshot.size);
        if (pendingTeams) pendingTeams.textContent = String(pending);
        if (approvedTeams) approvedTeams.textContent = String(approved);
        if (rejectedTeams) rejectedTeams.textContent = String(rejected);
        if (paidTeams) paidTeams.textContent = String(paid);
        if (holdTeams) holdTeams.textContent = String(hold);
        if (cancelledTeams) cancelledTeams.textContent = String(cancelled);

        showMessage(`✅ ${snapshot.size} team(s) loaded.`, "success");

    } catch (error) {
        console.error("❌ TEAM LOAD ERROR:", error);

        teamList.textContent = "Team load failed: " + error.message;
        showMessage("❌ " + error.message, "error");
    }
}

/* =====================================================
   UPDATE TEAM STATUS
===================================================== */

async function updateTeamStatus(tournamentId, teamId, status) {
    try {
        console.log("🔄 Updating status:", status);

        const teamRef = doc(
            db,
            "tournaments",
            tournamentId,
            "teams",
            teamId
        );

        await updateDoc(teamRef, { status });

        alert("✅ Team status updated: " + status);

        await loadTeams(tournamentId);

    } catch (error) {
        console.error("❌ STATUS ERROR:", error);
        alert("❌ " + error.message);
    }
}

/* =====================================================
   DELETE TEAM
===================================================== */

async function deleteTeam(tournamentId, teamId) {
    if (!confirm("क्या आप इस team को delete करना चाहते हैं?")) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "tournaments",
                tournamentId,
                "teams",
                teamId
            )
        );

        alert("🗑️ Team Deleted");

        await loadTeams(tournamentId);

    } catch (error) {
        console.error("❌ DELETE ERROR:", error);
        alert("❌ " + error.message);
    }
}

/* =====================================================
   TOURNAMENT CHANGE
===================================================== */

if (tournamentSelect) {
    tournamentSelect.addEventListener("change", async () => {
        const tournamentId = tournamentSelect.value;

        if (!tournamentId) {
            resetCounters();

            if (teamList) {
                teamList.textContent = "🏆 Please select a tournament.";
            }

            return;
        }

        localStorage.setItem("tournamentId", tournamentId);
        localStorage.setItem("selectedTournamentId", tournamentId);

        console.log("🔄 Tournament changed:", tournamentId);

        await loadTeams(tournamentId);
    });
}

/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(auth, async user => {
    console.log("🔥 AUTH USER:", user);

    if (!user) {
        console.log("❌ User not logged in");
        window.location.href = "login.html";
        return;
    }

    console.log("✅ Logged in:", user.uid);

    await loadTournaments();
});
            
