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

    // Current URL
    const currentURL =
        window.location.href;

    console.log(
        "🌐 Current URL:",
        currentURL
    );


    // URL search
    const search =
        window.location.search;

    console.log(
        "🔎 URL Search:",
        search
    );


    // Read URL parameters
    const params =
        new URLSearchParams(search);


    let id =
        params.get("id");


    console.log(
        "🔎 URL id:",
        id
    );


    // Support tournamentId also
    if (!id) {

        id =
            params.get("tournamentId");

    }


    console.log(
        "🔎 URL tournamentId:",
        id
    );


    // LocalStorage
    if (!id) {

        id =
            localStorage.getItem(
                "selectedTournamentId"
            );

        console.log(
            "💾 Local selectedTournamentId:",
            id
        );

    }


    // LocalStorage second
    if (!id) {

        id =
            localStorage.getItem(
                "tournamentId"
            );

        console.log(
            "💾 Local tournamentId:",
            id
        );

    }


    // Clean
    if (id) {

        id =
            String(id)
                .trim();

    }


    console.log(
        "🏆 FINAL TEAMS TOURNAMENT ID:",
        id
    );


    return id || null;

}


// ========================================
// TOURNAMENT ID
// ========================================

const tournamentId =
    getTournamentId();


// ========================================
// NO TOURNAMENT ID
// ========================================

if (!tournamentId) {

    console.error(
        "❌ Tournament ID Missing"
    );


    if (tournamentNameElement) {

        tournamentNameElement.textContent =
            "No Tournament Selected";

    }


    if (tournamentIdElement) {

        tournamentIdElement.textContent =
            "-";

    }


    if (venueElement) {

        venueElement.textContent =
            "-";

    }


    if (totalTeamsElement) {

        totalTeamsElement.textContent =
            "0";

    }


    if (teamListElement) {

        teamListElement.className =
            "empty";

        teamListElement.innerHTML = `
            ❌ Tournament ID Missing
            <br><br>
            Please open Teams from Dashboard.
        `;

    }

}


// ========================================
// TOURNAMENT ID FOUND
// ========================================

else {

    console.log(
        "✅ Tournament ID FOUND:",
        tournamentId
    );


    // Save immediately
    localStorage.setItem(
        "selectedTournamentId",
        tournamentId
    );

    localStorage.setItem(
        "tournamentId",
        tournamentId
    );


    // Display ID immediately
    if (tournamentIdElement) {

        tournamentIdElement.textContent =
            tournamentId;

    }


    // Load tournament
    loadTournament();

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


        const tournamentRef =
            doc(
                db,
                "tournaments",
                tournamentId
            );


        const tournamentSnap =
            await getDoc(
                tournamentRef
            );


        if (!tournamentSnap.exists()) {

            console.error(
                "❌ Tournament not found:",
                tournamentId
            );


            if (tournamentNameElement) {

                tournamentNameElement.textContent =
                    "Tournament Not Found";

            }


            if (tournamentIdElement) {

                tournamentIdElement.textContent =
                    tournamentId;

            }


            if (teamListElement) {

                teamListElement.className =
                    "empty";

                teamListElement.innerHTML = `
                    ❌ Tournament not found.
                `;

            }


            return;

        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "✅ Tournament:",
            tournament
        );


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "-";


        // Display name
        if (tournamentNameElement) {

            tournamentNameElement.textContent =
                name;

        }


        // Display ID
        if (tournamentIdElement) {

            tournamentIdElement.textContent =
                tournamentId;

        }


        // Display venue
        if (venueElement) {

            venueElement.textContent =
                venue;

        }


        // Load teams
        await loadTeams();


        // Setup links
        setupLinks();


        console.log(
            "🔗 Team page links ready"
        );


        console.log(
            "✅ TEAM PAGE COMPLETELY LOADED"
        );

    }


    catch (error) {

        console.error(
            "❌ TEAM PAGE ERROR:",
            error
        );


        if (teamListElement) {

            teamListElement.className =
                "empty";

            teamListElement.innerHTML = `
                ❌ Unable to load Teams.
                <br><br>
                ${escapeHTML(
                    error.message || "Unknown error"
                )}
            `;

        }

    }

}


// ========================================
// LOAD TEAMS
// ========================================

async function loadTeams() {

    try {

        console.log(
            "👥 Loading teams..."
        );


        const teamsRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "teams"
            );


        const snapshot =
            await getDocs(
                teamsRef
            );


        console.log(
            "👥 Tournament teams:",
            snapshot.size
        );


        const teams =
            snapshot.docs.map(
                teamDoc => ({

                    id:
                        teamDoc.id,

                    ...teamDoc.data()

                })
            );


        // Count
        if (totalTeamsElement) {

            totalTeamsElement.textContent =
                teams.length;

        }


        // No teams
        if (teams.length === 0) {

            if (teamListElement) {

                teamListElement.className =
                    "empty";

                teamListElement.innerHTML = `
                    👥 No registered teams yet.
                `;

            }

            return;

        }


        // Clear
        if (teamListElement) {

            teamListElement.className =
                "team-list";

            teamListElement.innerHTML =
                "";

        }


        // Display teams
        teams.forEach(
            (team, index) => {

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


                let players = [];


                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    players =
                        team.players;

                }


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                card.innerHTML = `

                    <h3>
                        🏏 Team ${index + 1}
                    </h3>

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
                            ?
                            players
                                .map(
                                    player =>
                                        escapeHTML(
                                            String(player)
                                        )
                                )
                                .join(", ")
                            :
                            "Not provided"
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


                if (teamListElement) {

                    teamListElement.appendChild(
                        card
                    );

                }

            }
        );


        console.log(
            "✅ Teams displayed:",
            teams.length
        );

    }


    catch (error) {

        console.error(
            "❌ TEAM LOAD ERROR:",
            error
        );


        if (totalTeamsElement) {

            totalTeamsElement.textContent =
                "0";

        }


        if (teamListElement) {

            teamListElement.className =
                "empty";

            teamListElement.innerHTML = `
                ❌ Unable to load registered teams.
                <br><br>
                ${escapeHTML(
                    error.message || "Unknown error"
                )}
            `;

        }

    }

}


// ========================================
// LINKS
// ========================================

function setupLinks() {

    const id =
        encodeURIComponent(
            tournamentId
        );


    if (tournamentLink) {

        tournamentLink.href =
            `dashboard.html?id=${id}`;

    }


    if (registrationLink) {

        registrationLink.href =
            `registration.html?id=${id}`;

    }


    if (scheduleLink) {

        scheduleLink.href =
            `schedule.html?id=${id}`;

    }


    if (pointsLink) {

        pointsLink.href =
            `points.html?id=${id}`;

    }

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}