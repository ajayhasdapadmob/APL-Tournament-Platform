// ========================================
// LIVE SCORE - FINAL
// ========================================

import { db } from "../firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("🔥 LIVE SCORE FINAL JS");

const tournamentSelect =
    document.getElementById("tournamentSelect");

const tournamentInfo =
    document.getElementById("tournamentInfo");

const matchesList =
    document.getElementById("matchesList");

let tournaments = [];
let selectedTournamentId = null;


// ========================================
// GET SAVED TOURNAMENT
// ========================================

function getSavedTournament() {

    const url =
        new URLSearchParams(
            window.location.search
        );

    return (
        url.get("id") ||
        url.get("tournamentId") ||
        localStorage.getItem(
            "selectedTournamentId"
        ) ||
        localStorage.getItem(
            "tournamentId"
        ) ||
        null
    );

}


// ========================================
// LOAD TOURNAMENTS
// ========================================

async function loadTournaments() {

    try {

        console.log(
            "🏆 Loading tournaments..."
        );

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments"
                )
            );


        tournaments = [];


        snapshot.forEach(
            tournamentDoc => {

                tournaments.push({

                    id:
                        tournamentDoc.id,

                    ...tournamentDoc.data()

                });

            }
        );


        console.log(
            "✅ Tournaments:",
            tournaments.length
        );


        if (
            !tournamentSelect
        ) {

            console.error(
                "❌ tournamentSelect not found"
            );

            return;

        }


        tournamentSelect.innerHTML = "";


        if (
            tournaments.length === 0
        ) {

            tournamentSelect.innerHTML = `

                <option value="">

                    ❌ No tournaments found

                </option>

            `;

            return;

        }


        // ====================================
        // FIND SAVED TOURNAMENT
        // ====================================

        const saved =
            getSavedTournament();


        let defaultTournament =
            tournaments.find(
                t =>
                    t.id === saved
            );


        // If no saved tournament,
        // choose tournament having matches

        if (
            !defaultTournament
        ) {

            for (
                const t
                of tournaments
            ) {

                const matches =
                    await getDocs(
                        collection(
                            db,
                            "tournaments",
                            t.id,
                            "matches"
                        )
                    );


                if (
                    !matches.empty
                ) {

                    defaultTournament =
                        t;

                    break;

                }

            }

        }


        // Otherwise first tournament

        if (
            !defaultTournament
        ) {

            defaultTournament =
                tournaments[0];

        }


        // ====================================
        // DROPDOWN
        // ====================================

        tournaments.forEach(
            tournament => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournament.id;


                option.textContent =
                    tournament.tournamentName ||
                    tournament.name ||
                    tournament.title ||
                    "Tournament";


                if (
                    defaultTournament &&
                    tournament.id ===
                    defaultTournament.id
                ) {

                    option.selected =
                        true;

                }


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        selectedTournamentId =
            defaultTournament.id;


        saveTournamentId(
            selectedTournamentId
        );


        console.log(
            "🏆 Selected:",
            selectedTournamentId
        );


        await loadMatches(
            selectedTournamentId
        );


    } catch (error) {

        console.error(
            "❌ Tournament error:",
            error
        );


        tournamentSelect.innerHTML = `

            <option value="">

                ❌ Error loading tournaments

            </option>

        `;


        tournamentInfo.innerHTML = `

            <div class="empty">

                ❌ ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ========================================
// DROPDOWN CHANGE
// ========================================

if (
    tournamentSelect
) {

    tournamentSelect.addEventListener(
        "change",
        async function () {

            const id =
                this.value;


            if (!id) {

                return;

            }


            selectedTournamentId =
                id;


            saveTournamentId(
                id
            );


            const url =
                new URL(
                    window.location.href
                );


            url.searchParams.set(
                "id",
                id
            );


            window.history.replaceState(
                {},
                "",
                url
            );


            await loadMatches(
                id
            );

        }
    );

}


// ========================================
// LOAD MATCHES
// ========================================

async function loadMatches(
    tournamentId
) {

    try {

        tournamentInfo.innerHTML = `

            <div class="empty">

                🔄 Loading Tournament...

            </div>

        `;


        matchesList.innerHTML = `

            <div class="empty">

                ⏳ Loading Live Matches...

            </div>

        `;


        const tournament =
            tournaments.find(
                t =>
                    t.id ===
                    tournamentId
            );


        const tournamentName =
            tournament?.tournamentName ||
            tournament?.name ||
            tournament?.title ||
            "Tournament";


        const matches =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "matches"
                )
            );


        console.log(
            "🏏 Matches:",
            matches.size
        );


        // ====================================
        // TOURNAMENT INFO
        // ====================================

        tournamentInfo.innerHTML = `

            <h2>
                🏆
                ${escapeHTML(
                    tournamentName
                )}
            </h2>

            <div class="tournament-id">

                🆔
                <b>Tournament ID:</b>

                ${escapeHTML(
                    tournamentId
                )}

            </div>

            <p>

                📍
                <b>Venue:</b>

                ${escapeHTML(
                    tournament?.venue ||
                    tournament?.location ||
                    "-"
                )}

            </p>

            <span class="live-status">

                🔴 LIVE SCORE

            </span>

        `;


        if (
            matches.empty
        ) {

            matchesList.innerHTML = `

                <div class="empty">

                    📅 No matches found
                    for this tournament.

                </div>

            `;

            return;

        }


        matchesList.innerHTML = "";


        matches.forEach(
            matchDoc => {

                displayMatch(
                    matchDoc.data(),
                    matchDoc.id
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ Match error:",
            error
        );


        matchesList.innerHTML = `

            <div class="empty">

                ❌ ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }

}


// ========================================
// DISPLAY MATCH
// ========================================

function displayMatch(
    match,
    matchId
) {

    const teamA =
        match.teamA ||
        match.team1Name ||
        match.team1 ||
        match.homeTeam ||
        "Team A";


    const teamB =
        match.teamB ||
        match.team2Name ||
        match.team2 ||
        match.awayTeam ||
        "Team B";


    const scoreA =
        match.scoreA ??
        match.teamAScore ??
        match.score1 ??
        "0/0";


    const scoreB =
        match.scoreB ??
        match.teamBScore ??
        match.score2 ??
        "0/0";


    const status =
        String(
            match.status ||
            "Scheduled"
        ).toLowerCase();


    const live =
        status === "live" ||
        status === "ongoing" ||
        status === "in_progress";


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "live-card";


    card.innerHTML = `

        <div class="match-number">

            🏏 Match
            ${escapeHTML(
                match.matchNumber ||
                match.matchNo ||
                "-"
            )}

            &nbsp;

            ${
                live
                ?
                `
                <span class="live-badge">
                    🔴 LIVE
                </span>
                `
                :
                `
                <span class="scheduled-badge">
                    📅 ${escapeHTML(
                        status.toUpperCase()
                    )}
                </span>
                `
            }

        </div>


        <div class="teams">

            <div class="team-score">

                <div>
                    ${escapeHTML(teamA)}
                </div>

                <div class="score">
                    ${escapeHTML(
                        String(scoreA)
                    )}
                </div>

            </div>


            <div class="vs">
                🆚
            </div>


            <div class="team-score">

                <div>
                    ${escapeHTML(teamB)}
                </div>

                <div class="score">
                    ${escapeHTML(
                        String(scoreB)
                    )}
                </div>

            </div>

        </div>


        <div class="match-info">

            📅
            ${escapeHTML(
                match.matchDate ||
                match.date ||
                "-"
            )}

            &nbsp;&nbsp;

            ⏰
            ${escapeHTML(
                match.time ||
                match.matchTime ||
                "-"
            )}

            <br><br>

            📍
            ${escapeHTML(
                match.venue ||
                "-"
            )}

        </div>

${
    match.winner
    ?
    `
    <div class="result">

        🏆 WINNER:

        <strong>
            ${escapeHTML(match.winner)}
        </strong>

        ${
            match.result
            ?
            `
            <br><br>
            ${escapeHTML(match.result)}
            `
            :
            ""
        }

    </div>
    `
    :
    ""
}

        <div
            style="
                margin-top:15px;
            "
        >

            <button
                type="button"
                class="scorecard-btn"
                style="
                    width:100%;
                    padding:14px;
                    border:0;
                    border-radius:12px;
                    background:#1d4ed8;
                    color:white;
                    font-weight:bold;
                    font-size:15px;
                "
            >

                🏏 OPEN SCORECARD

            </button>

        </div>

    `;


    const button =
        card.querySelector(
            ".scorecard-btn"
        );


    button.addEventListener(
        "click",
        function () {

            saveTournamentId(
                selectedTournamentId
            );


            localStorage.setItem(
                "matchId",
                matchId
            );


            window.location.href =
                "scorecard.html?id=" +
                encodeURIComponent(
                    selectedTournamentId
                ) +
                "&matchId=" +
                encodeURIComponent(
                    matchId
                );

        }
    );


    matchesList.appendChild(
        card
    );

}


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(
    id
) {

    if (!id) return;


    localStorage.setItem(
        "tournamentId",
        id
    );


    localStorage.setItem(
        "selectedTournamentId",
        id
    );


    sessionStorage.setItem(
        "tournamentId",
        id
    );


    sessionStorage.setItem(
        "selectedTournamentId",
        id
    );

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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
// START
// ========================================

loadTournaments();