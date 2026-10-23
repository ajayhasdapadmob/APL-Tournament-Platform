```javascript
// ========================================
// TEAM.JS
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("🔥 TEAM JS LOADED");

// ========================================
// PAGE FILES
// IMPORTANT: Use the exact filenames
// that exist in your GitHub repository.
// ========================================

const PAGES = {
    tournament: "./dashboard.html",
    registration: "./registration.html",
    schedule: "./schedule.html",
    points: "./points.html"
};

// ========================================
// ELEMENTS
// ========================================

const tournamentNameElement =
    document.getElementById("tournamentName");

const tournamentIdElement =
    document.getElementById("tournamentId");

const venueElement =
    document.getElementById("venue");

const totalTeamsElement =
    document.getElementById("totalTeams");

const teamListElement =
    document.getElementById("teamList");

const tournamentLink =
    document.getElementById("tournamentLink");

const registrationLink =
    document.getElementById("registrationLink");

const scheduleLink =
    document.getElementById("scheduleLink");

const pointsLink =
    document.getElementById("pointsLink");

// ========================================
// GET TOURNAMENT ID
// ========================================

function getTournamentId() {
    const params = new URLSearchParams(
        window.location.search
    );

    let id =
        params.get("id") ||
        params.get("tournamentId") ||
        localStorage.getItem("selectedTournamentId") ||
        localStorage.getItem("tournamentId");

    if (id) {
        id = String(id).trim();
    }

    console.log("🏆 Tournament ID:", id);

    return id || null;
}

const tournamentId = getTournamentId();

// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ========================================
// SET PAGE LINKS
// ========================================

function setupLinks() {
    if (!tournamentId) return;

    const id = encodeURIComponent(tournamentId);

    if (tournamentLink) {
        tournamentLink.href =
            `${PAGES.tournament}?id=${id}`;
    }

    if (registrationLink) {
        registrationLink.href =
            `${PAGES.registration}?id=${id}`;
    }

    if (scheduleLink) {
        scheduleLink.href =
            `${PAGES.schedule}?id=${id}`;
    }

    if (pointsLink) {
        pointsLink.href =
            `${PAGES.points}?id=${id}`;
    }

    console.log("🔗 Navigation links configured");
}

// ========================================
// MISSING TOURNAMENT MESSAGE
// ========================================

function showMissingTournament() {
    if (tournamentNameElement) {
        tournamentNameElement.textContent =
            "No Tournament Selected";
    }

    if (tournamentIdElement) {
        tournamentIdElement.textContent = "-";
    }

    if (venueElement) {
        venueElement.textContent = "-";
    }

    if (totalTeamsElement) {
        totalTeamsElement.textContent = "0";
    }

    if (teamListElement) {
        teamListElement.className = "empty";
        teamListElement.textContent =
            "Tournament ID missing. Please open this page from the tournament dashboard.";
    }
}

// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament() {
    try {
        console.log(
            "🏆 Loading tournament:",
            tournamentId
        );

        const tournamentRef = doc(
            db,
            "tournaments",
            tournamentId
        );

        const tournamentSnap =
            await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
            if (tournamentNameElement) {
                tournamentNameElement.textContent =
                    "Tournament Not Found";
            }

            if (tournamentIdElement) {
                tournamentIdElement.textContent =
                    tournamentId;
            }

            if (teamListElement) {
                teamListElement.className = "empty";
                teamListElement.textContent =
                    "Tournament not found. Please check the tournament link.";
            }

            return;
        }

        const tournament = tournamentSnap.data();

        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";

        const venue =
            tournament.venue ||
            tournament.location ||
            "-";

        if (tournamentNameElement) {
            tournamentNameElement.textContent = name;
        }

        if (tournamentIdElement) {
            tournamentIdElement.textContent =
                tournamentId;
        }

        if (venueElement) {
            venueElement.textContent = venue;
        }

        await loadTeams();

        console.log("✅ Tournament page loaded");
    } catch (error) {
        console.error("❌ Tournament load error:", error);

        if (teamListElement) {
            teamListElement.className = "empty";
            teamListElement.textContent =
                "Unable to load tournament: " +
                (error.message || "Unknown error");
        }
    }
}

// ========================================
// LOAD REGISTERED TEAMS
// ========================================

async function loadTeams() {
    try {
        console.log("👥 Loading registered teams...");

        const teamsRef = collection(
            db,
            "tournaments",
            tournamentId,
            "teams"
        );

        const snapshot = await getDocs(teamsRef);

        const teams = snapshot.docs.map(teamDoc => ({
            id: teamDoc.id,
            ...teamDoc.data()
        }));

        if (totalTeamsElement) {
            totalTeamsElement.textContent =
                String(teams.length);
        }

        if (!teamListElement) return;

        teamListElement.innerHTML = "";

        if (teams.length === 0) {
            teamListElement.className = "empty";
            teamListElement.textContent =
                "No registered teams yet. Use Register Team to register a team.";
            return;
        }

        teamListElement.className = "team-list";

        teams.forEach((team, index) => {
            const teamName =
                team.teamName ||
                team.name ||
                team.team ||
                "Unnamed Team";

            const captain =
                team.captainName ||
                team.captain ||
                "Not provided";

            const mobile =
                team.mobile ||
                team.phone ||
                "Not provided";

            const city =
                team.city ||
                team.area ||
                "Not provided";

            const status =
                team.status ||
                "Pending";

            const players = Array.isArray(team.players)
                ? team.players
                : [];

            const card = document.createElement("div");
            card.className = "team-card";

            card.innerHTML = `
                <h3>🏏 Team ${index + 1}</h3>

                <p>
                    <b>Team Name:</b>
                    ${escapeHTML(teamName)}
                </p>

                <p>
                    👤 <b>Captain:</b>
                    ${escapeHTML(captain)}
                </p>

                <p>
                    📱 <b>Mobile:</b>
                    ${escapeHTML(mobile)}
                </p>

                <p>
                    🏙️ <b>City:</b>
                    ${escapeHTML(city)}
                </p>

                <p>
                    👥 <b>Players:</b>
                    ${
                        players.length
                            ? players.map(player =>
                                escapeHTML(player)
                              ).join(", ")
                            : "Not provided"
                    }
                </p>

                <p>
                    🆔 <b>Team ID:</b>
                    ${escapeHTML(team.id)}
                </p>

                <span class="status">
                    ${escapeHTML(status)}
                </span>
            `;

            teamListElement.appendChild(card);
        });

        console.log(
            "✅ Registered teams displayed:",
            teams.length
        );
    } catch (error) {
        console.error("❌ Teams load error:", error);

        if (totalTeamsElement) {
            totalTeamsElement.textContent = "0";
        }

        if (teamListElement) {
            teamListElement.className = "empty";
            teamListElement.textContent =
                "Unable to load registered teams: " +
                (error.message || "Unknown error");
        }
    }
}

// ========================================
// INITIALIZE PAGE
// ========================================

setupLinks();

if (!tournamentId) {
    showMissingTournament();
} else {
    localStorage.setItem(
        "selectedTournamentId",
        tournamentId
    );

    localStorage.setItem(
        "tournamentId",
        tournamentId
    );

    if (tournamentIdElement) {
        tournamentIdElement.textContent =
            tournamentId;
    }

    loadTournament();
}
