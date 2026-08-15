// ========================================
// PLAYER STATS
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 PLAYERSTATS JS STARTED");


// ========================================
// ELEMENTS
// ========================================

const tournamentSelect =
    document.getElementById("tournamentSelect");

const tournamentInfo =
    document.getElementById("tournamentInfo");

const playersList =
    document.getElementById("playersList");

const backBtn =
    document.getElementById("backBtn");


// ========================================
// TOURNAMENT ID
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("id") ||
        params.get("tournamentId") ||
        localStorage.getItem("selectedTournamentId") ||
        localStorage.getItem("tournamentId") ||
        ""
    );

}


// ========================================
// SAVE ID
// ========================================

function saveTournamentId(id) {

    if (!id) return;

    localStorage.setItem(
        "selectedTournamentId",
        id
    );

    localStorage.setItem(
        "tournamentId",
        id
    );

}


// ========================================
// SAFE TEXT
// ========================================

function safe(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ========================================
// LOAD TOURNAMENTS
// ========================================

async function loadTournaments() {

    console.log(
        "🔥 Loading all tournaments..."
    );

    try {

        const ref =
            collection(
                db,
                "tournaments"
            );

        const snapshot =
            await getDocs(ref);


        console.log(
            "🏆 TOURNAMENT COUNT:",
            snapshot.size
        );


        tournamentSelect.innerHTML = "";


        if (snapshot.empty) {

            tournamentSelect.innerHTML = `

                <option value="">
                    ❌ No Tournament Found
                </option>

            `;

            return;

        }


        snapshot.forEach(
            tournamentDoc => {

                const data =
                    tournamentDoc.data();


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournamentDoc.id;


                option.textContent =
                    data.tournamentName ||
                    data.name ||
                    data.title ||
                    tournamentDoc.id;


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        let selectedId =
            getTournamentId();


        let found = false;


        snapshot.forEach(
            d => {

                if (
                    d.id === selectedId
                ) {

                    found = true;

                }

            }
        );


        if (!found) {

            selectedId =
                snapshot.docs[0].id;

        }


        tournamentSelect.value =
            selectedId;


        saveTournamentId(
            selectedId
        );


        await showTournament(
            selectedId
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );


        tournamentSelect.innerHTML = `

            <option value="">
                ❌ Loading Error
            </option>

        `;

        tournamentInfo.innerHTML = `

            <h2>❌ Error</h2>

            <p>
                ${safe(error.message)}
            </p>

        `;

    }

}


// ========================================
// SHOW TOURNAMENT
// ========================================

async function showTournament(id) {

    if (!id) return;


    console.log(
        "🏆 SELECTED:",
        id
    );


    try {

        const ref =
            doc(
                db,
                "tournaments",
                id
            );


        const snap =
            await getDoc(ref);


        if (!snap.exists()) {

            tournamentInfo.innerHTML = `

                <h2>
                    ❌ Tournament Not Found
                </h2>

            `;

            return;

        }


        const tournament =
            snap.data();


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "-";


        const teamCount =
            tournament.totalTeams ||
            tournament.teamCount ||
            0;


        tournamentInfo.innerHTML = `

            <div class="stats-icon">
                🏆
            </div>

            <h2>
                ${safe(name)}
            </h2>

            <p>
                🆔
                <b>Tournament ID:</b>
                ${safe(id)}
            </p>

            <p>
                📍
                <b>Venue:</b>
                ${safe(venue)}
            </p>

            <p>
                👥
                <b>Teams:</b>
                ${safe(teamCount)}
            </p>

        `;


        saveTournamentId(id);


        if (backBtn) {

            backBtn.href =
                "tournament.html?id=" +
                encodeURIComponent(id);

        }


        await loadPlayers(id);


    } catch (error) {

        console.error(
            "❌ SHOW TOURNAMENT ERROR:",
            error
        );

    }

}


// ========================================
// LOAD PLAYERS
// ========================================

async function loadPlayers(
    tournamentId
) {

    console.log(
        "👤 Loading teams and players..."
    );


    playersList.innerHTML = `

        <div class="empty">
            ⏳ Loading Players...
        </div>

    `;


    try {

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
            "👥 TEAM COUNT:",
            snapshot.size
        );


        playersList.innerHTML = "";


        if (snapshot.empty) {

            playersList.innerHTML = `

                <div class="empty">

                    👥 No teams found.

                </div>

            `;

            return;

        }


        let totalPlayers = 0;


        /*
         * Read registrations only for status.
         * If permission is denied, continue
         * without stopping the page.
         */

        let registrations = [];


        try {

            const registrationRef =
                collection(
                    db,
                    "registrations"
                );


            const registrationSnapshot =
                await getDocs(
                    registrationRef
                );


            registrationSnapshot.forEach(
                d => {

                    registrations.push({

                        id: d.id,

                        ...d.data()

                    });

                }
            );


            console.log(
                "📋 REGISTRATIONS:",
                registrations.length
            );


        } catch (error) {

            console.warn(
                "⚠️ Registration status unavailable:",
                error.message
            );

        }


        // ==================================
        // EVERY TEAM
        // ==================================

        snapshot.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();


                const teamId =
                    team.teamId ||
                    teamDoc.id;


                const teamName =
                    team.teamName ||
                    team.name ||
                    "Team";


                /*
                 * Find registration
                 */

                const registration =
                    registrations.find(
                        r => {

                            if (
                                r.teamId &&
                                String(r.teamId) ===
                                String(teamId)
                            ) {

                                return true;

                            }


                            const rTeamName =
                                r.teamName ||
                                r.team ||
                                "";


                            return (
                                String(rTeamName)
                                    .trim()
                                    .toLowerCase()
                                ===
                                String(teamName)
                                    .trim()
                                    .toLowerCase()
                            );

                        }
                    );


                /*
                 * Status priority:
                 *
                 * registration status
                 * ↓
                 * team status
                 * ↓
                 * Pending
                 */

                const status =
                    registration?.status ||
                    team.status ||
                    "Pending";


                // ==================================
                // PLAYERS ARRAY
                // ==================================

                let players = [];


                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    players =
                        team.players;

                }


                // ==================================
                // CAPTAIN
                // ==================================

                if (
                    players.length === 0 &&
                    (
                        team.captainName ||
                        team.captain
                    )
                ) {

                    players.push({

                        name:
                            team.captainName ||
                            team.captain

                    });

                }


// ==================================
                // PLAYER FIELDS
                // ==================================

                if (
                    players.length === 0
                ) {

                    const fields = [

                        "captainName",
                        "player2",
                        "player3",
                        "player4",
                        "player5",
                        "player6",
                        "player7",
                        "player8",
                        "player9",
                        "player10",
                        "player11",
                        "player12",
                        "player13",
                        "player14",
                        "player15"

                    ];


                    fields.forEach(
                        field => {

                            if (
                                team[field]
                            ) {

                                players.push({

                                    name:
                                        team[field]

                                });

                            }

                        }
                    );

                }


                // ==================================
                // REGISTRATION PLAYER FALLBACK
                // ==================================

                if (
                    players.length === 0 &&
                    registration
                ) {

                    const fields = [

                        "captainName",
                        "player2",
                        "player3",
                        "player4",
                        "player5",
                        "player6",
                        "player7",
                        "player8",
                        "player9",
                        "player10",
                        "player11",
                        "player12",
                        "player13",
                        "player14",
                        "player15"

                    ];


                    fields.forEach(
                        field => {

                            if (
                                registration[field]
                            ) {

                                players.push({

                                    name:
                                        registration[field]

                                });

                            }

                        }
                    );

                }


                // ==================================
                // DISPLAY
                // ==================================

                players.forEach(
                    (player, index) => {

                        displayPlayer(
                            player,
                            teamName,
                            status,
                            index + 1
                        );


                        totalPlayers++;

                    }
                );

            }
        );


        if (
            totalPlayers === 0
        ) {

            playersList.innerHTML = `

                <div class="empty">

                    👤 No players found.

                </div>

            `;

        }


        console.log(
            "✅ PLAYERS DISPLAYED:",
            totalPlayers
        );


    } catch (error) {

        console.error(
            "❌ PLAYER ERROR:",
            error
        );


        playersList.innerHTML = `

            <div class="empty">

                ❌ Unable to load players.

                <br><br>

                ${safe(error.message)}

            </div>

        `;

    }

}


// ========================================
// DISPLAY PLAYER
// ========================================

function displayPlayer(
    player,
    teamName,
    status,
    number
) {

    const playerName =
        typeof player === "string"
        ?
        player
        :
        (
            player.name ||
            player.playerName ||
            player.fullName ||
            `Player ${number}`
        );


    const matches =
        player.matches || 0;


    const runs =
        player.runs || 0;


    const wickets =
        player.wickets || 0;


    const statusLower =
        String(status)
            .toLowerCase();


    let statusClass =
        "status-pending";


    if (
        statusLower === "approved"
    ) {

        statusClass =
            "status-approved";

    }


    if (
        statusLower === "rejected"
    ) {

        statusClass =
            "status-rejected";

    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "player-card";


    card.innerHTML = `

        <div class="player-header">

            <div class="player-avatar">
                👤
            </div>

            <div>

                <h3>
                    ${safe(playerName)}
                </h3>

                <p>
                    🏏
                    ${safe(teamName)}
                </p>

                <span
                    class="player-status ${statusClass}"
                >
                    ${safe(status)}
                </span>

            </div>

        </div>


        <div class="stats-grid">

            <div class="stat-box">

                <strong>
                    ${safe(matches)}
                </strong>

                <span>
                    Matches
                </span>

            </div>


            <div class="stat-box">

                <strong>
                    ${safe(runs)}
                </strong>

                <span>
                    Runs
                </span>

            </div>


            <div class="stat-box">

                <strong>
                    ${safe(wickets)}
                </strong>

                <span>
                    Wickets
                </span>

            </div>

        </div>

    `;


    playersList.appendChild(
        card
    );

}


// ========================================
// TOURNAMENT CHANGE
// ========================================

if (tournamentSelect) {

    tournamentSelect.addEventListener(
        "change",
        async function() {

            const id =
                this.value;


            if (!id) return;


            console.log(
                "🔄 Tournament changed:",
                id
            );


            saveTournamentId(id);


            await showTournament(
                id
            );

        }
    );

}


// ========================================
// START
// ========================================

loadTournaments();


console.log(
    "🚀 PLAYER STATISTICS READY"
);