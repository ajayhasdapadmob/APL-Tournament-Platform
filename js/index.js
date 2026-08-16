// ========================================
// INDEX.JS
// APL TOURNAMENT PLATFORM
// HOME PAGE - FINAL VERSION
// ========================================

import { db, auth } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


console.log("🔥 INDEX JS STARTED");


// ========================================
// ELEMENTS
// ========================================

const tournamentNameEl =
    document.getElementById("homeTournamentName");

const tournamentIdEl =
    document.getElementById("homeTournamentId");

const totalTeamsEl =
    document.getElementById("homeTotalTeams");

const teamListEl =
    document.getElementById("homeTeamList");


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(message) {

    if (!teamListEl) return;

    teamListEl.innerHTML = `
        <div class="empty-teams">
            ${message}
        </div>
    `;
}


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(id) {

    if (!id) return;

    const cleanId =
        String(id).trim();

    if (!cleanId) return;


    // LOCAL STORAGE

    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    localStorage.setItem(
        "tournamentId",
        cleanId
    );


    // SESSION STORAGE

    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );


    console.log(
        "💾 HOME TOURNAMENT SAVED:",
        cleanId
    );
}


// ========================================
// GET TOURNAMENT ID
// PRIORITY:
// 1. URL
// 2. LocalStorage
// 3. SessionStorage
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    // ====================================
    // 1. URL
    // ====================================

    let id =
        params.get("id") ||
        params.get("tournamentId");


    if (id) {

        id =
            String(id).trim();

        saveTournamentId(id);

        console.log(
            "🏆 HOME TOURNAMENT FROM URL:",
            id
        );

        return id;
    }


    // ====================================
    // 2. LOCAL STORAGE
    // ====================================

    id =
        localStorage.getItem(
            "selectedTournamentId"
        );


    if (!id) {

        id =
            localStorage.getItem(
                "tournamentId"
            );
    }


    if (id) {

        id =
            String(id).trim();

        saveTournamentId(id);

        console.log(
            "🏆 HOME TOURNAMENT FROM LOCAL STORAGE:",
            id
        );

        return id;
    }


    // ====================================
    // 3. SESSION STORAGE
    // ====================================

    id =
        sessionStorage.getItem(
            "selectedTournamentId"
        );


    if (!id) {

        id =
            sessionStorage.getItem(
                "tournamentId"
            );
    }


    if (id) {

        id =
            String(id).trim();

        saveTournamentId(id);

        console.log(
            "🏆 HOME TOURNAMENT FROM SESSION:",
            id
        );

        return id;
    }


    // ====================================
    // NOTHING FOUND
    // ====================================

    console.warn(
        "⚠️ HOME TOURNAMENT ID MISSING"
    );

    return null;
}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament(tournamentId) {

    if (!tournamentId) {

        return false;
    }


    console.log(
        "🏆 Loading Home Tournament:",
        tournamentId
    );


    try {

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


        // =================================
        // NOT FOUND
        // =================================

        if (!tournamentSnap.exists()) {

            console.error(
                "❌ Tournament not found:",
                tournamentId
            );


            if (tournamentNameEl) {

                tournamentNameEl.textContent =
                    "Tournament Not Found";
            }


            if (tournamentIdEl) {

                tournamentIdEl.textContent =
                    tournamentId;
            }


            if (totalTeamsEl) {

                totalTeamsEl.textContent =
                    "0";
            }


            showMessage(`
                ❌ Tournament not found.
                <br><br>

                <a
                    href="my-tournaments.html"
                    class="btn primary-btn"
                >
                    Select Tournament
                </a>
            `);


            return false;
        }


        // =================================
        // DATA
        // =================================

        const tournament =
            tournamentSnap.data();


        console.log(
            "🏆 HOME TOURNAMENT DATA:",
            tournament
        );


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        // =================================
        // DISPLAY
        // =================================

        if (tournamentNameEl) {

            tournamentNameEl.textContent =
                name;
        }


        if (tournamentIdEl) {

            tournamentIdEl.textContent =
                tournamentId;
        }


        // =================================
        // SAVE AGAIN
        // =================================

        saveTournamentId(
            tournamentId
        );


        console.log(
            "✅ HOME TOURNAMENT LOADED:",
            name
        );


        return true;


    } catch (error) {

        console.error(
            "❌ LOAD TOURNAMENT ERROR:",
            error
        );


        showMessage(`
            ❌ Unable to load tournament.
            <br><br>
            ${error.message}
        `);


        return false;
    }
}


// ========================================
// LOAD REGISTERED TEAMS
// ========================================

async function loadTeams(tournamentId) {

    if (!tournamentId) {

        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                "0";
        }

        return;
    }


    try {

        console.log(
            "🏆 Loading teams for:",
            tournamentId
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
            "👥 Firebase team count:",
            snapshot.size
        );


        // =================================
        // TOTAL TEAM COUNT
        // =================================

        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                snapshot.size;
        }


        // =================================
        // CLEAR OLD LIST
        // =================================

        if (teamListEl) {

            teamListEl.innerHTML = "";
        }


        // =================================
        // NO TEAMS
        // =================================

        if (snapshot.empty) {

            showMessage(`
                👥 No registered teams yet.

                <br><br>

                <a
                    href="team-registration.html?id=${encodeURIComponent(tournamentId)}"
                    class="btn primary-btn"
                >
                    🏏 Register Team
                </a>
            `);

            return;
        }


        // =================================
        // DISPLAY TEAMS
        // =================================

        snapshot.forEach(
            (teamDoc) => {

                const team =
                    teamDoc.data();


                const teamName =
                    team.teamName ||
                    team.name ||
                    "Unnamed Team";


                const captain =
                    team.captainName ||
                    team.captain ||
                    "-";


                const mobile =
                    team.mobile ||
                    team.phone ||
                    "-";


                const city =
                    team.city ||
                    team.area ||
                    "-";


                const players =
                    Array.isArray(
                        team.players
                    )
                        ? team.players
                        : [];


                const playerCount =
                    team.playerCount ||
                    players.length ||
                    0;


                const status =
                    team.status ||
                    "Pending";


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card-home";


                card.innerHTML = `

                    <h3>
                        🏏 ${teamName}
                    </h3>

                    <p>
                        👤
                        <b>Captain:</b>
                        ${captain}
                    </p>

                    <p>
                        📱
                        <b>Mobile:</b>
                        ${mobile}
                    </p>

                    <p>
                        🏙️
                        <b>City:</b>
                        ${city}
                    </p>

                    <p>
                        👥
                        <b>Players:</b>
                        ${playerCount}
                    </p>

                    <span class="status-badge">
                        ${status}
                    </span>

                `;


                if (teamListEl) {

                    teamListEl.appendChild(
                        card
                    );
                }

            }
        );


        console.log(
            "✅ HOME TEAMS DISPLAYED"
        );


    } catch (error) {

        console.error(
            "❌ LOAD TEAMS ERROR:",
            error
        );


        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                "0";
        }


        showMessage(`
            ❌ Unable to load registered teams.
            <br><br>
            ${error.message}
        `);
    }
}


// ========================================
// FIX ALL HOME LINKS
// ADD ACTIVE TOURNAMENT ID
// ========================================

function setupHomeLinks(tournamentId) {

    if (!tournamentId) return;


    const pages = [

        "schedule.html",

        "results.html",

        "points.html",

        "player-stats.html",

        "orange.html",

        "purple.html",

        "admin.html",

        "my-tournaments.html",

        "team-registration.html",

        "registration.html",

        "live-score.html"

    ];


    pages.forEach(
        (page) => {

            const links =
                document.querySelectorAll(
                    `a[href="${page}"]`
                );


            links.forEach(
                (link) => {

                    link.href =
                        `${page}?id=${encodeURIComponent(tournamentId)}`;

                }
            );

        }
    );


    console.log(
        "🔗 HOME LINKS UPDATED:",
        tournamentId
    );
}


// ========================================
// MAIN HOME LOAD
// ========================================

async function loadHome() {

    try {

        console.log(
            "🚀 STARTING HOME..."
        );


        // =================================
        // GET ACTIVE TOURNAMENT
        // =================================

        const tournamentId =
            getTournamentId();


        console.log(
            "🏆 HOME TOURNAMENT:",
            tournamentId
        );


        // =================================
        // NO TOURNAMENT
        // =================================

        if (!tournamentId) {

            if (tournamentNameEl) {

                tournamentNameEl.textContent =
                    "Select Tournament";
            }


            if (tournamentIdEl) {

                tournamentIdEl.textContent =
                    "-";
            }


            if (totalTeamsEl) {

                totalTeamsEl.textContent =
                    "0";
            }


            showMessage(`
                🏆 Please select a tournament.

                <br><br>

                <a
                    href="my-tournaments.html"
                    class="btn primary-btn"
                >
                    🏆 Select Tournament
                </a>
            `);


            return;
        }


        // =================================
        // LOAD TOURNAMENT
        // =================================

        const tournamentLoaded =
            await loadTournament(
                tournamentId
            );


        if (!tournamentLoaded) {

            return;
        }


        // =================================
        // LOAD TEAMS
        // =================================

        await loadTeams(
            tournamentId
        );


        // =================================
        // UPDATE HOME LINKS
        // =================================

        setupHomeLinks(
            tournamentId
        );


        console.log(
            "✅ HOME COMPLETELY LOADED"
        );


    } catch (error) {

        console.error(
            "❌ HOME LOAD ERROR:",
            error
        );


        showMessage(
            "❌ Unable to load tournament."
        );
    }
}


// ========================================
// AUTH
// ========================================

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "👤 HOME USER:",
            user
        );


        // =================================
        // IMPORTANT:
        // HOME KO LOGIN KE BINA BHI LOAD
        // KARNE DENGE
        // =================================

        await loadHome();

    }
);


console.log(
    "✅ INDEX JS READY"
);