import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const tournamentInfo =
    document.getElementById(
        "tournamentInfo"
    );

const matchesList =
    document.getElementById(
        "matchesList"
    );

const tournamentLink =
    document.getElementById(
        "tournamentLink"
    );

const scheduleLink =
    document.getElementById(
        "scheduleLink"
    );

const resultsLink =
    document.getElementById(
        "resultsLink"
    );

const pointsLink =
    document.getElementById(
        "pointsLink"
    );


/* =========================
   GET TOURNAMENT ID
========================= */

const params = new URLSearchParams(
    window.location.search
);

let tournamentId = params.get("id");


/* =========================
   FALLBACK 1
========================= */

if (!tournamentId) {

    tournamentId =
        params.get("tournamentId");

}


/* =========================
   FALLBACK 2
========================= */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );

}


/* =========================
   FALLBACK 3
========================= */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

}


/* =========================
   DEBUG
========================= */

console.log(
    "LIVE SCORE URL:",
    window.location.href
);

console.log(
    "LIVE SCORE TOURNAMENT ID:",
    tournamentId
);


/* =========================
   CHECK
========================= */

if (!tournamentId) {

    tournamentInfo.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Live Score
                from Tournament Details.
            </p>

            <br>

            <a
                href="my-tournaments.html"
                class="btn"
            >
                🏆 My Tournaments
            </a>

        </div>

    `;

    matchesList.innerHTML = "";

    throw new Error(
        "Tournament ID Missing"
    );

}


/* =========================
   SAVE ID
========================= */

localStorage.setItem(
    "tournamentId",
    tournamentId
);

localStorage.setItem(
    "selectedTournamentId",
    tournamentId
);


/* =========================
   NAVIGATION
========================= */

tournamentLink.href =
    "tournament.html?id=" +
    encodeURIComponent(
        tournamentId
    );


scheduleLink.href =
    "schedule.html?id=" +
    encodeURIComponent(
        tournamentId
    );


resultsLink.href =
    "results.html?id=" +
    encodeURIComponent(
        tournamentId
    );


pointsLink.href =
    "points.html?id=" +
    encodeURIComponent(
        tournamentId
    );


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

        const tournamentSnap =
            await getDoc(

                doc(
                    db,
                    "tournaments",
                    tournamentId
                )

            );


        if (
            !tournamentSnap.exists()
        ) {

            tournamentInfo.innerHTML = `

                <div class="empty">

                    <h2>
                        ❌ Tournament Not Found
                    </h2>

                    <p>

                        Tournament ID:
                        <b>${tournamentId}</b>

                    </p>

                </div>

            `;

            return false;
        }


        const tournament =
            tournamentSnap.data();


        tournamentInfo.innerHTML = `

            <h2>

                🏆
                ${
                    tournament.tournamentName ||
                    "Tournament"
                }

            </h2>


            <div class="tournament-id">

                🆔
                <b>Tournament ID:</b>

                ${tournamentId}

            </div>


            <p>

                📍
                <b>Venue:</b>

                ${tournament.venue || "-"}

            </p>


            <span class="live-status">

                🔴 LIVE SCORE

            </span>

        `;


        return true;


    } catch (error) {

        console.error(
            error
        );


        tournamentInfo.innerHTML = `

            <div class="empty">

                ❌ ${error.message}

            </div>

        `;

        return false;

    }

}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

    try {

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


        matchesList.innerHTML = "";


        if (
            snapshot.empty
        ) {

            matchesList.innerHTML = `

                <div class="empty">

                    📅 No matches found.

                    <br><br>

                    Please create matches
                    from Schedule.

                </div>

            `;

            return;

        }


        const matches = [];


        snapshot.forEach(
            matchDoc => {

                matches.push({

                    id:
                        matchDoc.id,

                    ...matchDoc.data()

                });

            }
        );


        /* =========================
           SORT MATCHES
        ========================= */

        matches.sort(
            (a, b) => {

                const aNumber =
                    Number(
                        a.matchNumber || 0
                    );

                const bNumber =
                    Number(
                        b.matchNumber || 0
                    );

                return (
                    aNumber -
                    bNumber
                );

            }
        );


        matches.forEach(
            match => {

                displayMatch(
                    match
                );

            }
        );


    } catch (error) {

        console.error(
            "Live Score Error:",
            error
        );


        matchesList.innerHTML = `

            <div class="empty">

                ❌ ${error.message}

            </div>

        `;

    }

}


/* =========================
   DISPLAY MATCH
========================= */

function displayMatch(
    match
) {

    const teamA =
        match.teamA ||
        "Team A";


    const teamB =
        match.teamB ||
        "Team B";


    const scoreA =
        match.scoreA ||
        "-";


    const scoreB =
        match.scoreB ||
        "-";


    const status =
        String(
            match.status ||
            "Scheduled"
        );


    let badge = "";


    if (
        status.toLowerCase()
            === "live"
    ) {

        badge = `

            <span class="live-badge">

                🔴 LIVE

            </span>

        `;

    }

    else if (
        status.toLowerCase()
            === "completed"
    ) {

        badge = `

            <span class="completed-badge">

                ✅ COMPLETED

            </span>

        `;

    }

    else {

        badge = `

            <span class="scheduled-badge">

                📅 SCHEDULED

            </span>

        `;

    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "live-card";


    card.innerHTML = `

        <div class="match-number">

            🏏 Match
            ${match.matchNumber || "-"}

            &nbsp;

            ${badge}

        </div>


        <div class="teams">


            <div class="team-score">

                <div>

                    ${teamA}

                </div>


                <div class="score">

                    ${scoreA}

                </div>

            </div>


            <div class="vs">

                🆚

            </div>


            <div class="team-score">

                <div>

                    ${teamB}

                </div>


                <div class="score">

                    ${scoreB}

                </div>

            </div>


        </div>


        <div class="match-info">

            📅
            ${match.date || "-"}

            &nbsp;&nbsp;

            ⏰
            ${match.time || "-"}

            <br><br>

            📍
            ${match.venue || "-"}

        </div>


        ${
            match.winner
            ?
            `

            <div class="result">

                🏆 Winner:
                ${match.winner}

                ${
                    match.result
                    ?
                    `<br>${match.result}`
                    :
                    ""
                }

            </div>

            `
            :
            ""
        }

    `;


    matchesList.appendChild(
        card
    );

}


/* =========================
   AUTO REFRESH
========================= */

let refreshTimer =
    null;


function startAutoRefresh() {

    if (
        refreshTimer
    ) {

        clearInterval(
            refreshTimer
        );

    }


    refreshTimer =
        setInterval(
            () => {

                loadMatches();

            },
            10000
        );

}


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        const tournamentLoaded =
            await loadTournament();


        if (
            tournamentLoaded
        ) {

            await loadMatches();

            startAutoRefresh();

        }

    }
);