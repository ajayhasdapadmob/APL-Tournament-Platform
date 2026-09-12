// ========================================
// INDEX JS
// APL TOURNAMENT PLATFORM
// HOME PAGE
// ========================================

console.log("🔥 INDEX JS STARTED");


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


    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );


    localStorage.setItem(
        "tournamentId",
        cleanId
    );


    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );


    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );


    console.log(
        "💾 SELECTED TOURNAMENT SAVED:",
        cleanId
    );

}


// ========================================
// GET TOURNAMENT ID
//
// PRIORITY:
//
// 1. URL ?id=
// 2. URL ?tournamentId=
// 3. LocalStorage
// 4. SessionStorage
//
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    // =================================
    // 1. URL ID
    // =================================

    let id =
        params.get("id");


    // =================================
    // 2. URL tournamentId
    // =================================

    if (!id) {

        id =
            params.get(
                "tournamentId"
            );

    }


    if (id) {

        id =
            String(id).trim();


        if (id) {

            saveTournamentId(
                id
            );


            console.log(
                "🏆 TOURNAMENT FROM URL:",
                id
            );


            return id;

        }

    }


    // =================================
    // 3. LOCAL STORAGE
    // =================================

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


        if (id) {

            console.log(
                "🏆 TOURNAMENT FROM LOCAL STORAGE:",
                id
            );


            return id;

        }

    }


    // =================================
    // 4. SESSION STORAGE
    // =================================

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


        if (id) {

            saveTournamentId(
                id
            );


            console.log(
                "🏆 TOURNAMENT FROM SESSION:",
                id
            );


            return id;

        }

    }


    // =================================
    // NOTHING FOUND
    // =================================

    console.warn(
        "⚠️ NO SELECTED TOURNAMENT"
    );


    return null;

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


    console.log(
        "🏆 Loading tournament:",
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

        if (
            !tournamentSnap.exists()
        ) {

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
                    🏆 Select Tournament
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
        // DISPLAY NAME
        // =================================

        if (tournamentNameEl) {

            tournamentNameEl.textContent =
                name;

        }


        // =================================
        // DISPLAY ID
        // =================================

        if (tournamentIdEl) {

            tournamentIdEl.textContent =
                tournamentId;

        }


        // =================================
        // SAVE VALID ID
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


        if (tournamentNameEl) {

            tournamentNameEl.textContent =
                "Unable to Load Tournament";

        }


        if (tournamentIdEl) {

            tournamentIdEl.textContent =
                "-";

        }


        showMessage(`

            ❌ Unable to load tournament.

            <br><br>

            ${escapeHtml(
                error.message
            )}

        `);


        return false;

    }

}


// ========================================
// LOAD TEAMS
// ========================================

async function loadTeams(
    tournamentId
) {

    if (!tournamentId) {

        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                "0";

        }


        return;

    }


    try {

        console.log(
            "👥 Loading teams:",
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
        // TOTAL
        // =================================

        if (totalTeamsEl) {

            totalTeamsEl.textContent =
                snapshot.size;

        }


        // =================================
        // CLEAR
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
                    href="team-registration.html?id=${encodeURIComponent(
                        tournamentId
                    )}"
                    class="btn primary-btn"
                >
                    🏏 Register Team
                </a>

            `);


            return;

        }


        // =================================
        // DISPLAY
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
                        🏏
                        ${escapeHtml(
                            teamName
                        )}
                    </h3>


                    <p>
                        👤
                        <b>Captain:</b>
                        ${escapeHtml(
                            captain
                        )}
                    </p>


                    <p>
                        📱
                        <b>Mobile:</b>
                        ${escapeHtml(
                            mobile
                        )}
                    </p>


                    <p>
                        🏙️
                        <b>City:</b>
                        ${escapeHtml(
                            city
                        )}
                    </p>


                    <p>
                        👥
                        <b>Players:</b>
                        ${Number(
                            playerCount
                        ) || 0}
                    </p>


                    <span class="status-badge">
                        ${escapeHtml(
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

            ${escapeHtml(
                error.message
            )}

        `);

    }

}


// ========================================
// FIX HOME LINKS
// ========================================

function setupHomeLinks(
    tournamentId
) {

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
        "live-score.html",
        "tournament.html"

    ];


    pages.forEach(
        page => {

            const links =
                document.querySelectorAll(
                    `a[href="${page}"]`
                );


            links.forEach(
                link => {

                    link.href =
                        `${page}?id=${encodeURIComponent(
                            tournamentId
                        )}`;

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
// NO TOURNAMENT
// ========================================

function showNoTournament() {

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

}


// ========================================
// MAIN HOME
// ========================================

async function loadHome() {

    console.log(
        "🚀 STARTING HOME..."
    );


    const tournamentId =
        getTournamentId();


    console.log(
        "🏆 ACTIVE TOURNAMENT:",
        tournamentId
    );


    // =================================
    // NO TOURNAMENT
    // =================================

    if (!tournamentId) {

        showNoTournament();

        return;

    }


    // =================================
    // LOAD TOURNAMENT
    // =================================

    const loaded =
        await loadTournament(
            tournamentId
        );


    if (!loaded) {

        return;

    }


    // =================================
    // LOAD TEAMS
    // =================================

    await loadTeams(
        tournamentId
    );


    // =================================
    // UPDATE LINKS
    // =================================

    setupHomeLinks(
        tournamentId
    );


    console.log(
        "✅ HOME COMPLETELY LOADED"
    );

}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

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
        );


        // =================================
        // HOME CAN LOAD WITHOUT LOGIN
        // =================================

        await loadHome();

    }
);


console.log(
    "✅ INDEX JS READY"
);