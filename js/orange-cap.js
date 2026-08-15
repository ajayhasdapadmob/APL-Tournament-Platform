// ========================================
// ORANGE CAP
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "../firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 ORANGE CAP JS STARTED");


// ========================================
// ELEMENTS
// ========================================

const tournamentSelect =
    document.getElementById("tournamentSelect");

const tournamentInfo =
    document.getElementById("tournamentInfo");

const playerName =
    document.getElementById("playerName");

const teamName =
    document.getElementById("teamName");

const runs =
    document.getElementById("runs");

const matches =
    document.getElementById("matches");

const wickets =
    document.getElementById("wickets");

const statusMessage =
    document.getElementById("statusMessage");

const pointsLink =
    document.getElementById("pointsLink");

const purpleLink =
    document.getElementById("purpleLink");


// ========================================
// GET TOURNAMENT ID
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    let id =
        params.get("id");

    if (!id) {
        id =
            params.get("tournamentId");
    }

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

    return id
        ? String(id).trim()
        : null;
}


// ========================================
// SAVE TOURNAMENT
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
// LOAD TOURNAMENTS
// ========================================

async function loadTournaments() {

    console.log(
        "🔥 Loading tournaments..."
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

            tournamentInfo.innerHTML = `
                <h2>
                    ❌ No Tournament Found
                </h2>
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


        const exists =
            Array.from(
                tournamentSelect.options
            ).some(
                option =>
                    option.value ===
                    selectedId
            );


        if (!exists) {

            selectedId =
                tournamentSelect
                    .options[0]
                    .value;

        }


        tournamentSelect.value =
            selectedId;


        saveTournamentId(
            selectedId
        );


        await loadTournament(
            selectedId
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );


        statusMessage.innerHTML =
            "❌ " + error.message;

    }

}


// ========================================
// LOAD TOURNAMENT + PLAYERS
// ========================================

async function loadTournament(id) {

    console.log(
        "🏆 Selected tournament:",
        id
    );


    if (!id) return;


    saveTournamentId(id);


    try {

        // ==================================
        // TOURNAMENT INFO
        // ==================================

        const tournamentRef =
            collection(
                db,
                "tournaments"
            );


        const tournamentSnapshot =
            await getDocs(
                tournamentRef
            );


        let tournament = null;


        tournamentSnapshot.forEach(
            tournamentDoc => {

                if (
                    tournamentDoc.id === id
                ) {

                    tournament =
                        tournamentDoc.data();

                }

            }
        );


        if (!tournament) {

            tournamentInfo.innerHTML = `
                <h2>
                    ❌ Tournament Not Found
                </h2>
            `;

            return;

        }


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "-";


        const totalTeams =
            tournament.totalTeams ||
            tournament.teamCount ||
            0;


        tournamentInfo.innerHTML = `

            <div class="orange-icon">
                🏆
            </div>

            <h2>
                ${escapeHTML(name)}
            </h2>

            <p>
                📍 <b>Venue:</b>
                ${escapeHTML(venue)}
            </p>

            <p>
                👥 <b>Teams:</b>
                ${escapeHTML(totalTeams)}
            </p>

            <div class="id-box">

                🆔 <b>Tournament ID:</b>
                ${escapeHTML(id)}

            </div>

        `;


        // ==================================
        // LOAD PLAYERS
        // ==================================

        await loadPlayers(id);


        // ==================================
        // LINKS
        // ==================================

        const query =
            "?id=" +
            encodeURIComponent(id);


        pointsLink.href =
            "points.html" +
            query;


        purpleLink.href =
            "purple-cap.html" +
            query;


    } catch (error) {

        console.error(
            "❌ LOAD ERROR:",
            error
        );


        statusMessage.innerHTML = `
            ❌ ${escapeHTML(
                error.message
            )}
        `;

    }

}


// ========================================
// LOAD PLAYERS
// ========================================

async function loadPlayers(id) {

    console.log(
        "👤 Loading players:",
        id
    );


    statusMessage.innerHTML =
        "⏳ Loading Player Statistics...";


    try {

        const teamsRef =
            collection(
                db,
                "tournaments",
                id,
                "teams"
            );


        const teamsSnapshot =
            await getDocs(
                teamsRef
            );


        console.log(
            "👥 TEAM COUNT:",
            teamsSnapshot.size
        );


        let players = [];


        teamsSnapshot.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();


                const currentTeamName =
                    team.teamName ||
                    team.name ||
                    "Team";


                // ==================================
                // PLAYERS ARRAY
                // ==================================

                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    team.players.forEach(
                        player => {

                            addPlayer(
                                players,
                                player,
                                currentTeamName
                            );

                        }
                    );

                }


                // ==================================
                // CAPTAIN FALLBACK
                // ==================================

                if (
                    !Array.isArray(
                        team.players
                    )
                    &&
                    (
                        team.captainName ||
                        team.captain
                    )
                ) {

                    addPlayer(
                        players,
                        {
                            name:
                                team.captainName ||
                                team.captain,

                            runs:
                                team.runs ||
                                0,

                            wickets:
                                team.wickets ||
                                0,

                            matches:
                                team.matches ||
                                0
                        },
                        currentTeamName
                    );

                }

            }
        );


        console.log(
            "👤 PLAYER COUNT:",
            players.length
        );


        if (
            players.length === 0
        ) {

            playerName.textContent =
                "No Players";

            teamName.textContent =
                "-";

            runs.textContent =
                "0";

            matches.textContent =
                "0";

            wickets.textContent =
                "0";


            statusMessage.innerHTML = `
                👤 No player statistics found.
                <br><br>
                Players are not available
                inside this tournament.
            `;

            return;

        }


        // ==================================
        // FIND ORANGE CAP
        // ==================================

        players.sort(
            (a, b) =>
                b.runs - a.runs
        );


        const orangeCap =
            players[0];


        playerName.textContent =
            orangeCap.name;


        teamName.textContent =
            orangeCap.team;


        runs.textContent =
            orangeCap.runs;


        matches.textContent =
            orangeCap.matches;


        wickets.textContent =
            orangeCap.wickets;


        statusMessage.innerHTML = `
            ✅ Orange Cap loaded successfully.
        `;


        console.log(
            "🟠 ORANGE CAP:",
            orangeCap
        );


    } catch (error) {

        console.error(
            "❌ PLAYER LOAD ERROR:",
            error
        );


        statusMessage.innerHTML = `
            ❌ Unable to load players.
            <br><br>
            ${escapeHTML(
                error.message
            )}
        `;

    }

}


// ========================================
// ADD PLAYER
// ========================================

function addPlayer(
    players,
    player,
    teamName
) {

    if (
        typeof player === "string"
    ) {

        players.push({

            name:
                player,

            team:
                teamName,

            runs:
                0,

            wickets:
                0,

            matches:
                0

        });

        return;

    }


    if (
        !player ||
        typeof player !== "object"
    ) {

        return;

    }


    const name =
        player.name ||
        player.playerName ||
        player.fullName ||
        "Player";


    const playerRuns =
        Number(
            player.runs ||
            player.totalRuns ||
            player.score ||
            0
        );


    const playerWickets =
        Number(
            player.wickets ||
            player.totalWickets ||
            player.wicketCount ||
            0
        );


    const playerMatches =
        Number(
            player.matches ||
            player.matchCount ||
            0
        );


    players.push({

        name:
            name,

        team:
            teamName,

        runs:
            playerRuns,

        wickets:
            playerWickets,

        matches:
            playerMatches

    });

}


// ========================================
// DROPDOWN CHANGE
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


            await loadTournament(
                id
            );

        }
    );

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
// START
// ========================================

loadTournaments();

console.log(
    "🚀 ORANGE CAP READY"
);