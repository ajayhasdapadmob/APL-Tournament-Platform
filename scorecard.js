// ========================================
// SCORECARD.JS
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 SCORECARD JS STARTED");


// ========================================
// HTML ELEMENTS
// ========================================

const matchInfo =
    document.getElementById("matchInfo");

const scoreElement =
    document.getElementById("score");


// ========================================
// GET TOURNAMENT ID
// SAME LOGIC AS schedule.js
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    let id =
        params.get("id");


    if (!id) {
        id = params.get("tournamentId");
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


    if (id) {
        id =
            String(id).trim();
    }


    console.log(
        "🏆 SCORECARD TOURNAMENT ID:",
        id
    );


    return id || null;

}


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(id) {

    if (!id) return;


    const cleanId =
        String(id).trim();


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
        "💾 Tournament ID saved:",
        cleanId
    );

}


// ========================================
// GET MATCH ID
// ========================================

function getMatchId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    let id =
        params.get("matchId");


    if (!id) {
        id = params.get("match");
    }


    if (!id) {
        id =
            localStorage.getItem(
                "selectedMatchId"
            );
    }


    if (!id) {
        id =
            localStorage.getItem(
                "matchId"
            );
    }


    if (!id) {
        id =
            sessionStorage.getItem(
                "selectedMatchId"
            );
    }


    if (!id) {
        id =
            sessionStorage.getItem(
                "matchId"
            );
    }


    if (id) {
        id =
            String(id).trim();
    }


    console.log(
        "🏏 SCORECARD MATCH ID:",
        id
    );


    return id || null;

}


// ========================================
// SAVE MATCH ID
// ========================================

function saveMatchId(id) {

    if (!id) return;


    const cleanId =
        String(id).trim();


    localStorage.setItem(
        "selectedMatchId",
        cleanId
    );

    localStorage.setItem(
        "matchId",
        cleanId
    );

    sessionStorage.setItem(
        "selectedMatchId",
        cleanId
    );

    sessionStorage.setItem(
        "matchId",
        cleanId
    );


    console.log(
        "💾 Match ID saved:",
        cleanId
    );

}


// ========================================
// UPDATE URL
// ========================================

function updateURL(
    tournamentId,
    matchId
) {

    if (!tournamentId) return;


    let url =
        `${window.location.pathname}?id=${encodeURIComponent(tournamentId)}`;


    if (matchId) {

        url +=
            `&matchId=${encodeURIComponent(matchId)}`;

    }


    window.history.replaceState(
        {},
        "",
        url
    );


    console.log(
        "🔗 SCORECARD URL:",
        url
    );

}


// ========================================
// VARIABLES
// ========================================

let tournamentId =
    getTournamentId();


let matchId =
    getMatchId();


// ========================================
// FIND FIRST TOURNAMENT
// ========================================

async function findFirstTournament() {

    console.log(
        "🔎 Finding tournament..."
    );


    const tournamentsRef =
        collection(
            db,
            "tournaments"
        );


    const snapshot =
        await getDocs(
            tournamentsRef
        );


    console.log(
        "📦 Tournaments found:",
        snapshot.size
    );


    if (snapshot.empty) {

        throw new Error(
            "No tournaments found."
        );

    }


    const first =
        snapshot.docs[0];


    tournamentId =
        first.id;


    saveTournamentId(
        tournamentId
    );


    console.log(
        "🏆 First tournament selected:",
        tournamentId
    );

}


// ========================================
// FIND FIRST MATCH
// ========================================

async function findFirstMatch() {

    console.log(
        "🔎 Finding first match..."
    );


    if (!tournamentId) {

        throw new Error(
            "Tournament ID missing."
        );

    }


    const matchesRef =
        collection(
            db,
            "tournaments",
            tournamentId,
            "matches"
        );


    const snapshot =
        await getDocs(
            matchesRef
        );


    console.log(
        "📦 Matches found:",
        snapshot.size
    );


    if (snapshot.empty) {

        throw new Error(
            "No matches found inside this tournament."
        );

    }


    const matches =
        snapshot.docs.map(
            matchDoc => ({

                id:
                    matchDoc.id,

                ...matchDoc.data()

            })
        );


    // Sort by match number

    matches.sort(
        (a, b) => {

            const aNo =
                Number(
                    a.matchNumber ||
                    a.matchNo ||
                    a.number ||
                    999999
                );


            const bNo =
                Number(
                    b.matchNumber ||
                    b.matchNo ||
                    b.number ||
                    999999
                );


            return aNo - bNo;

        }
    );


    matchId =
        matches[0].id;


    saveMatchId(
        matchId
    );


    updateURL(
        tournamentId,
        matchId
    );


    console.log(
        "🏏 First match selected:",
        matchId
    );


    return matches[0];

}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament() {

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


    const snapshot =
        await getDoc(
            tournamentRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Tournament not found."
        );

    }


    const tournament =
        snapshot.data();


    console.log(
        "✅ Tournament loaded:",
        tournament
    );


    return tournament;

}


// ========================================
// LOAD MATCH
// ========================================

async function loadMatch() {

    console.log(
        "🔥 LOAD MATCH STARTED"
    );


    if (!tournamentId) {

        throw new Error(
            "Tournament ID missing."
        );

    }


    // ------------------------------------
    // If match ID missing, find first match
    // ------------------------------------

    if (!matchId) {

        console.warn(
            "⚠️ Match ID missing. Finding first match..."
        );


        const firstMatch =
            await findFirstMatch();


        return firstMatch;

    }


    console.log(
        "🏏 Loading Match:",
        matchId
    );


    const matchRef =
        doc(
            db,
            "tournaments",
            tournamentId,
            "matches",
            matchId
        );


    const snapshot =
        await getDoc(
            matchRef
        );


    if (!snapshot.exists()) {

        console.warn(
            "⚠️ Match ID not found. Finding first match..."
        );


        matchId = null;


        const firstMatch =
            await findFirstMatch();


        return firstMatch;

    }


    const match =
        snapshot.data();


    console.log(
        "✅ Match loaded:",
        match
    );


    return {

        id:
            snapshot.id,

        ...match

    };

}


// ========================================
// DISPLAY MATCH
// ========================================

function displayMatch(
    tournament,
    match
) {

    const tournamentName =
        tournament.tournamentName ||
        tournament.name ||
        tournament.title ||
        "Tournament";


    const team1 =
        match.team1Name ||
        match.team1 ||
        match.homeTeam ||
        match.teamA ||
        "Team A";


    const team2 =
        match.team2Name ||
        match.team2 ||
        match.awayTeam ||
        match.teamB ||
        "Team B";


    const matchNumber =
        match.matchNumber ||
        match.matchNo ||
        match.number ||
        "-";


    const date =
        match.date ||
        match.matchDate ||
        "-";


    const time =
        match.time ||
        match.matchTime ||
        "-";


    const venue =
        match.venue ||
        tournament.venue ||
        tournament.location ||
        "-";


    if (matchInfo) {

        matchInfo.innerHTML = `

            <h2>
                🏆
                ${escapeHTML(tournamentName)}
            </h2>

            <p>
                🏏
                <b>Match ${escapeHTML(matchNumber)}</b>
            </p>

            <h3>
                ${escapeHTML(team1)}
                VS
                ${escapeHTML(team2)}
            </h3>

            <p>
                📅 ${escapeHTML(date)}
            </p>

            <p>
                ⏰ ${escapeHTML(time)}
            </p>

            <p>
                📍 ${escapeHTML(venue)}
            </p>

            <p>
                🆔 Tournament:
                ${escapeHTML(tournamentId)}
            </p>

            <p>
                🆔 Match:
                ${escapeHTML(match.id || matchId)}
            </p>

        `;

    }


    // ------------------------------------
    // SCORE
    // ------------------------------------

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


    if (scoreElement) {

        scoreElement.innerHTML = `

            <div class="score-team">

                <h2>
                    ${escapeHTML(team1)}
                </h2>

                <div class="big-score">

                    ${escapeHTML(
                        String(scoreA)
                    )}

                </div>

            </div>


            <div class="vs">

                VS

            </div>


            <div class="score-team">

                <h2>
                    ${escapeHTML(team2)}
                </h2>

                <div class="big-score">

                    ${escapeHTML(
                        String(scoreB)
                    )}

                </div>

            </div>

        `;

    }

}


// ========================================
// ERROR DISPLAY
// ========================================

function showError(
    message
) {

    console.error(
        "❌ SCORECARD ERROR:",
        message
    );


    if (matchInfo) {

        matchInfo.innerHTML = `

            <div class="empty">

                ❌
                ${escapeHTML(message)}

            </div>

        `;

    }


    if (scoreElement) {

        scoreElement.innerHTML = `

            <div class="empty">

                🏏 Scorecard unavailable

            </div>

        `;

    }

}


// ========================================
// START
// ========================================

async function init() {

    console.log(
        "🚀 Starting SCORECARD..."
    );


    try {

        // --------------------------------
        // Firebase check
        // --------------------------------

        console.log(
            "🔥 Firebase DB READY:",
            db
        );


        // --------------------------------
        // Tournament ID missing
        // --------------------------------

        if (!tournamentId) {

            console.warn(
                "⚠️ Tournament ID missing. Finding first tournament..."
            );


            await findFirstTournament();

        }


        // --------------------------------
        // Save tournament
        // --------------------------------

        saveTournamentId(
            tournamentId
        );


        // --------------------------------
        // Load tournament
        // --------------------------------

        const tournament =
            await loadTournament();


        // --------------------------------
        // Load match
        // --------------------------------

        const match =
            await loadMatch();


        // --------------------------------
        // Save match
        // --------------------------------

        if (match?.id) {

            matchId =
                match.id;


            saveMatchId(
                matchId
            );


            updateURL(
                tournamentId,
                matchId
            );

        }


        // --------------------------------
        // Display
        // --------------------------------

        displayMatch(
            tournament,
            match
        );


        console.log(
            "✅ SCORECARD READY"
        );


    } catch (error) {

        console.error(
            "❌ SCORECARD START ERROR:",
            error
        );


        showError(
            error.message ||
            "Unable to load scorecard."
        );

    }

}


init();


// ========================================
// SAFE HTML
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