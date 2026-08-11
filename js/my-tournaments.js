import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 MY-TOURNAMENT JS LOADED");


/* =========================
   ELEMENT
========================= */

const tournamentList =
    document.getElementById("tournamentList");


/* =========================
   CHECK ELEMENT
========================= */

if (!tournamentList) {

    console.error(
        "❌ tournamentList element not found"
    );

}


/* =========================
   LOAD TOURNAMENTS
========================= */

async function loadTournaments(user) {

    try {

        console.log(
            "🔥 Loading tournaments for:",
            user.uid
        );


        tournamentList.innerHTML = `

            <div class="empty-message">

                ⏳ Loading Tournaments...

            </div>

        `;


        /* =========================
           TOURNAMENT COLLECTION
        ========================= */

        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        /* =========================
           SEARCH OWNER ID
        ========================= */

        let snapshot =
            await getDocs(
                query(
                    tournamentsRef,
                    where(
                        "ownerId",
                        "==",
                        user.uid
                    )
                )
            );


        console.log(
            "🔥 ownerId results:",
            snapshot.size
        );


        /* =========================
           SEARCH CREATED BY
        ========================= */

        if (snapshot.empty) {

            snapshot =
                await getDocs(
                    query(
                        tournamentsRef,
                        where(
                            "createdBy",
                            "==",
                            user.uid
                        )
                    )
                );


            console.log(
                "🔥 createdBy results:",
                snapshot.size
            );

        }


        /* =========================
           CLEAR LIST
        ========================= */

        tournamentList.innerHTML = "";


        /* =========================
           NO TOURNAMENT
        ========================= */

        if (snapshot.empty) {

            tournamentList.innerHTML = `

                <div class="empty-message">

                    <h2>
                        🏆 No Tournaments Found
                    </h2>

                    <p>
                        Create your first tournament.
                    </p>

                    <br>

                    <a
                        href="Creat-tournament.html"
                        class="btn primary-btn"
                    >
                        ➕ Create Tournament
                    </a>

                </div>

            `;

            return;

        }


        /* =========================
           CREATE CARDS
        ========================= */

        snapshot.forEach(
            tournamentDoc => {

                const tournamentId =
                    tournamentDoc.id;

                const tournament =
                    tournamentDoc.data();


                console.log(
                    "🔥 Tournament found:",
                    tournamentId,
                    tournament
                );


                createTournamentCard(
                    tournamentId,
                    tournament
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ Tournament Load Error:",
            error
        );


        tournamentList.innerHTML = `

            <div class="empty-message">

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
   CREATE TOURNAMENT CARD
========================= */

function createTournamentCard(
    tournamentId,
    tournament
) {

    const card =
        document.createElement("div");


    card.className =
        "tournament-card";


    card.innerHTML = `

        <h2>

            🏆
            ${
                tournament.tournamentName ||
                tournament.name ||
                "Tournament"
            }

        </h2>


        <p>

            🆔
            <b>Tournament ID:</b>

            ${tournamentId}

        </p>


        <p>

            📍
            <b>Venue:</b>

            ${
                tournament.venue ||
                tournament.location ||
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


        <p>

            👥
            <b>Teams:</b>

            ${
                tournament.totalTeams ||
                0
            }

        </p>


        <div class="card-buttons">


            <!-- OPEN TOURNAMENT -->

            <button
                class="btn primary-btn open-tournament-btn"
                type="button"
            >

                🏆 Open Tournament

            </button>


            <!-- SCHEDULE -->

            <button
                class="btn schedule-btn"
                type="button"
            >

                📅 Schedule

            </button>


            <!-- RESULTS -->

            <button
                class="btn results-btn"
                type="button"
            >

                🏆 Results

            </button>


            <!-- LIVE SCORE -->

            <button
                class="btn live-btn"
                type="button"
            >

                🔴 Live Score

            </button>


            <!-- POINTS -->

            <button
                class="btn points-btn"
                type="button"
            >

                📈 Points

            </button>


        </div>

    `;


    /* =========================
       OPEN TOURNAMENT
    ========================= */

    const openButton =
        card.querySelector(
            ".open-tournament-btn"
        );


    openButton.addEventListener(
        "click",
        function() {

            console.log(
                "🔥 OPEN TOURNAMENT ID:",
                tournamentId
            );


            const url =
                "Tournament.html?id=" +
                encodeURIComponent(
                    tournamentId
                );


            console.log(
                "🔥 OPEN URL:",
                url
            );


            /*
             * Save ID also
             */

            localStorage.setItem(
                "tournamentId",
                tournamentId
            );


            /*
             * Open tournament
             */

            window.location.href =
                url;

        }
    );


    /* =========================
       SCHEDULE
    ========================= */

    const scheduleButton =
        card.querySelector(
            ".schedule-btn"
        );


    scheduleButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "schedule.html?id=" +
                encodeURIComponent(
                    tournamentId
                );

        }
    );


    /* =========================
       RESULTS
    ========================= */

    const resultsButton =
        card.querySelector(
            ".results-btn"
        );


    resultsButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "results.html?id=" +
                encodeURIComponent(
                    tournamentId
                );

        }
    );


    /* =========================
       LIVE SCORE
    ========================= */

    const liveButton =
        card.querySelector(
            ".live-btn"
        );


    liveButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "live-score.html?id=" +
                encodeURIComponent(
                    tournamentId
                );

        }
    );


    /* =========================
       POINTS
    ========================= */

    const pointsButton =
        card.querySelector(
            ".points-btn"
        );


    pointsButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "points.html?id=" +
                encodeURIComponent(
                    tournamentId
                );

        }
    );


    /* =========================
       ADD CARD
    ========================= */

    tournamentList.appendChild(
        card
    );

}


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "🔥 Auth User:",
            user
        );


        if (!user) {

            console.log(
                "❌ User not logged in"
            );


            window.location.href =
                "login.html";

            return;

        }


        loadTournaments(
            user
        );

    }
);