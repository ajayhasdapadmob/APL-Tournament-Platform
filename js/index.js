// ========================================
// INDEX.JS
// APL TOURNAMENT PLATFORM
// HOME PAGE
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
    document.getElementById(
        "homeTournamentName"
    );

const tournamentIdEl =
    document.getElementById(
        "homeTournamentId"
    );

const totalTeamsEl =
    document.getElementById(
        "homeTotalTeams"
    );

const teamListEl =
    document.getElementById(
        "homeTeamList"
    );


// ========================================
// MESSAGE
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


    // ====================================
    // 2. LOCAL STORAGE
    // ====================================

    if (!id) {

        id =
            localStorage.getItem(
                "selectedTournamentId"
            );
    }


    if (!id) {

        id =
            localStorage.getItem(
                "tournamentId"
            );
    }


    // ====================================
    // 3. SESSION STORAGE
    // ====================================

    if (!id) {

        id =
            sessionStorage.getItem(
                "selectedTournamentId"
            );
    }


    if (!id) {

        id =
            sessionStorage.getItem(
                "tournamentId"
            );
    }


    // ====================================
    // CLEAN ID
    // ====================================

    if (id) {

        id =
            String(id).trim();

    }


    console.log(
        "🏆 HOME TOURNAMENT:",
        id
    );


    return id || null;
}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament(
    tournamentId
) {

    if (!tournamentId) {
        return false;
    }


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


            showMessage(
                "❌ Tournament not found."
            );


            return false;
        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "🏆 TOURNAMENT LOADED:",
            tournament
        );


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        if (tournamentNameEl) {

            tournamentNameEl.textContent =
                name;

        }


        if (tournamentIdEl) {

            tournamentIdEl.textContent =
                tournamentId;

        }


        // Save again

        saveTournamentId(
            tournamentId
        );


        return true;


    } catch (error) {

        console.error(
            "❌ LOAD TOURNAMENT ERROR:",
            error
        );


        if (tournamentNameEl) {

            tournamentNameEl.textContent =
                "Error";

        }


        showMessage(
            "❌ Unable to load tournament."
        );


        return false;
    }
}


// ========================================
// LOAD REGISTERED TEAMS
// ========================================

async function loadTeams(
    tournamentId
) {

    if (!tournamentId) {

        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                "0";

        }

        showMessage(`
            🏆 No tournament selected.
            <br><br>

            <a
                href="my-tournaments.html"
                class="btn primary-btn"
            >
                Select Tournament
            </a>
        `);

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


        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                snapshot.size;

        }


        if (teamListEl) {

            teamListEl.innerHTML =
                "";

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
            teamDoc => {

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
                        🏏 ${escapeHTML(
                            teamName
                        )}
                    </h3>

                    <p>
                        👤
                        <b>Captain:</b>
                        ${escapeHTML(
                            captain
                        )}
                    </p>

                    <p>
                        📱
                        <b>Mobile:</b>
                        ${escapeHTML(
                            mobile
                        )}
                    </p>

                    <p>
                        🏙️
                        <b>City:</b>
                        ${escapeHTML(
                            city
                        )}
                    </p>

                    <p>
                        👥
                        <b>Players:</b>
                        ${playerCount}
                    </p>

                    <span class="status-badge">
                        ${escapeHTML(
                            status
                        )}
                    </span>

                `;


                if (teamListEl) {

                    teamListEl.appendChild(
                        card
                    );

                }

            }
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
            ${escapeHTML(
                error.message
            )}
        `);
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


// ========================================
// MAIN HOME LOAD
// ========================================

async function loadHome() {

    console.log(
        "🚀 LOADING HOME..."
    );


    try {

        const tournamentId =
            getTournamentId();


        // =================================
        // NO ID
        // =================================

        if (!tournamentId) {

            console.warn(
                "⚠️ HOME TOURNAMENT ID MISSING"
            );


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
                    Select Tournament
                </a>
            `);


            return;
        }


        // =================================
        // SAVE ID
        // =================================

        saveTournamentId(
            tournamentId
        );


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


        console.log(
            "✅ HOME READY"
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
    async user => {

        console.log(
            "👤 HOME USER:",
            user
                ? user.email
                : "Not logged in"
        );


        if (!user) {

            window.location.href =
                "./login.html";

            return;
        }


        await loadHome();

    }
);


console.log(
    "✅ INDEX JS READY"
);