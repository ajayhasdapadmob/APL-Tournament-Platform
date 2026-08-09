import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const matchContainer =
    document.getElementById(
        "matchContainer"
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

const liveScoreLink =
    document.getElementById(
        "liveScoreLink"
    );

const pointsLink =
    document.getElementById(
        "pointsLink"
    );


/* =========================
   GET URL PARAMETERS
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );


let tournamentId =
    params.get("id");


let matchId =
    params.get("matchId");


/* =========================
   FALLBACK TO
   TOURNAMENT ID
========================= */

if (!tournamentId) {

    tournamentId =
        params.get(
            "tournamentId"
        );

}


/* =========================
   LOCAL STORAGE FALLBACK
========================= */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );

}


if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

}


/* =========================
   MATCH ID FALLBACK
========================= */

if (!matchId) {

    matchId =
        localStorage.getItem(
            "selectedMatchId"
        );

}


/* =========================
   CHECK TOURNAMENT ID
========================= */

if (!tournamentId) {

    matchContainer.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open this match
                from a tournament.
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

    throw new Error(
        "Tournament ID Missing"
    );

}


/* =========================
   CHECK MATCH ID
========================= */

if (!matchId) {

    matchContainer.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Match ID Missing
            </h2>

            <p>
                Please open the match
                from Schedule.
            </p>

            <br>

            <a
                href="schedule.html?id=${encodeURIComponent(tournamentId)}"
                class="btn"
            >
                📅 Open Schedule
            </a>

        </div>

    `;

    throw new Error(
        "Match ID Missing"
    );

}


/* =========================
   SAVE IDS
========================= */

localStorage.setItem(
    "selectedTournamentId",
    tournamentId
);

localStorage.setItem(
    "tournamentId",
    tournamentId
);

localStorage.setItem(
    "selectedMatchId",
    matchId
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


liveScoreLink.href =
    "live-score.html?id=" +
    encodeURIComponent(
        tournamentId
    ) +
    "&matchId=" +
    encodeURIComponent(
        matchId
    );


/* =========================
   LOAD MATCH
========================= */

async function loadMatch() {

    try {

        /* =====================
           LOAD TOURNAMENT
        ===================== */

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

            matchContainer.innerHTML = `

                <div class="empty">

                    <h2>
                        ❌ Tournament Not Found
                    </h2>

                    <p>

                        Tournament ID:

                        <b>
                            ${tournamentId}
                        </b>

                    </p>

                </div>

            `;

            return;

        }


        const tournament =
            tournamentSnap.data();


        /* =====================
           LOAD MATCH
        ===================== */

        const matchSnap =
            await getDoc(

                doc(
                    db,
                    "tournaments",
                    tournamentId,
                    "matches",
                    matchId
                )

            );


        if (
            !matchSnap.exists()
        ) {

            matchContainer.innerHTML = `

                <div class="empty">

                    <h2>
                        ❌ Match Not Found
                    </h2>

                    <p>

                        Match ID:

                        <b>
                            ${matchId}
                        </b>

                    </p>

                    <br>

                    <a
                        href="schedule.html?id=${encodeURIComponent(tournamentId)}"
                        class="btn"
                    >
                        📅 Schedule
                    </a>

                </div>

            `;

            return;

        }


        const match =
            matchSnap.data();


        /* =====================
           MATCH STATUS
        ===================== */

        const status =
            match.status ||
            "Scheduled";


        /* =====================
           RESULT
        ===================== */

        let resultHTML = "";


        if (
            match.winner ||
            match.result
        ) {

            resultHTML = `

                <div class="result-box">

                    <h3>
                        🏆 Match Result
                    </h3>

                    <p>

                        <b>
                            Winner:
                        </b>

                        ${
                            match.winner ||
                            "-"
                        }

                    </p>


                    <p>

                        <b>
                            Result:
                        </b>

                        ${
                            match.result ||
                            "-"
                        }

                    </p>


                    <p>

                        <b>
                            Score:
                        </b>

                        ${
                            match.scoreA ||
                            "-"
                        }

                        &nbsp; - &nbsp;

                        ${
                            match.scoreB ||
                            "-"
                        }

                    </p>

                </div>

            `;

        }


        /* =====================
           DISPLAY
        ===================== */

        matchContainer.innerHTML = `

            <div class="match-header">

                <h2>

                    🏆
                    ${
                        tournament.tournamentName ||
                        "Tournament"
                    }

                </h2>


                <div class="id-box">

                    🆔
                    <b>Tournament ID:</b>

                    ${tournamentId}

                    <br><br>

                    🏏
                    <b>Match ID:</b>

                    ${matchId}

                </div>

            </div>


            <div
                style="
                    text-align:center;
                    font-weight:bold;
                    color:#1e3a8a;
                "
            >

                🏏 Match
                ${
                    match.matchNumber ||
                    "-"
                }

            </div>


            <div class="teams">

                ${
                    match.teamA ||
                    "Team A"
                }

                🆚

                ${
                    match.teamB ||
                    "Team B"
                }

            </div>


            <div class="info">

                📅
                <b>Date:</b>

                ${
                    match.date ||
                    "-"
                }

            </div>


            <div class="info">

                ⏰
                <b>Time:</b>

                ${
                    match.time ||
                    "-"
                }

            </div>


            <div class="info">

                📍
                <b>Venue:</b>

                ${
                    match.venue ||
                    tournament.venue ||
                    "-"
                }

            </div>


            <div class="info">

                📌
                <b>Status:</b>

                ${status}

            </div>


            ${resultHTML}

        `;


    } catch (error) {

        console.error(
            "Match Error:",
            error
        );


        matchContainer.innerHTML = `

            <div class="empty">

                <h2>
                    ❌ Error
                </h2>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

    }

}


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        loadMatch();

    }
);