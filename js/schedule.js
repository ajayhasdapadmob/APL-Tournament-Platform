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

const scheduleHeader =
    document.getElementById("scheduleHeader");

const scheduleList =
    document.getElementById("scheduleList");

const tournamentLink =
    document.getElementById("tournamentLink");

const resultsLink =
    document.getElementById("resultsLink");

const pointsLink =
    document.getElementById("pointsLink");

const liveScoreLink =
    document.getElementById("liveScoreLink");


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

let tournamentId =
    params.get("id");


if (!tournamentId) {

    tournamentId =
        params.get("tournamentId");

}


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
   CHECK ID
========================= */

if (!tournamentId) {

    scheduleHeader.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Schedule
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

    scheduleList.innerHTML = "";

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


/*
   IMPORTANT:
   Live Score page is live.html
*/

liveScoreLink.href =
    "live.html?id=" +
    encodeURIComponent(
        tournamentId
    );


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

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

        scheduleHeader.innerHTML = `

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


    scheduleHeader.innerHTML = `

        <h2>

            🏆
            ${
                tournament.tournamentName ||
                "Tournament"
            }

        </h2>


        <p>

            📍
            <b>Venue:</b>

            ${
                tournament.venue ||
                "-"
            }

        </p>


        <p>

            📅
            <b>Start:</b>

            ${
                tournament.startDate ||
                "-"
            }

        </p>


        <p>

            📅
            <b>End:</b>

            ${
                tournament.endDate ||
                "-"
            }

        </p>


        <div class="id-box">

            🆔
            <b>Tournament ID:</b>

            ${tournamentId}

        </div>

    `;


    return true;

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


        scheduleList.innerHTML = "";


        if (
            snapshot.empty
        ) {

            scheduleList.innerHTML = `

                <div class="empty">

                    <h3>
                        📅 No Matches Found
                    </h3>

                    <p>
                        Please create matches
                        from the tournament.
                    </p>

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

                const dateA =
                    String(
                        a.date || ""
                    );

                const dateB =
                    String(
                        b.date || ""
                    );


                if (
                    dateA !== dateB
                ) {

                    return dateA.localeCompare(
                        dateB
                    );

                }


                return String(
                    a.time || ""
                )
                .localeCompare(
                    String(
                        b.time || ""
                    )
                );

            }
        );


        /* =========================
           DISPLAY
        ========================= */

        matches.forEach(
            (match, index) => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "match-card";


                const status =
                    match.status ||
                    "Scheduled";


                card.innerHTML = `

                    <div class="match-title">

                        🏏 Match
                        ${
                            match.matchNumber ||
                            index + 1
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
                            "-"
                        }

                    </div>


                    <div class="info">

                        📌
                        <b>Status:</b>

                        ${status}

                    </div>


                    ${
                        match.winner
                        ?

                        `

                        <div
                            class="info"
                            style="
                                color:#166534;
                                font-weight:bold;
                            "
                        >

                            🏆 Winner:

                            ${match.winner}

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

                        <a
                            class="btn"
                            href="results.html?id=${encodeURIComponent(tournamentId)}"
                        >

                            🏆 Result

                        </a>


                        <a
                            class="btn"
                            href="live.html?id=${encodeURIComponent(tournamentId)}&matchId=${encodeURIComponent(match.id)}"
                        >

                            🔴 Live Score

                        </a>

                    </div>

                `;


                scheduleList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Schedule Error:",
            error
        );


        scheduleList.innerHTML = `

            <div class="empty">

                ❌
                ${error.message}

            </div>

        `;

    }

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


        try {

            const loaded =
                await loadTournament();


            if (
                loaded
            ) {

                await loadMatches();

            }

        } catch (error) {

            console.error(
                error
            );

        }

    }
);