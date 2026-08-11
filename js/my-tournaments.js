import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENT
========================= */

const tournamentList =
    document.getElementById(
        "tournamentList"
    );


/* =========================
   LOAD TOURNAMENTS
========================= */

async function loadTournaments(user) {

    try {

        tournamentList.innerHTML = `

            <div class="empty-message">

                ⏳ Loading Tournaments...

            </div>

        `;


        /* =========================
           USER TOURNAMENTS
        ========================= */

        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        /*
         * First try ownerId
         */

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


        /*
         * If ownerId is not used in
         * your old tournament documents,
         * try createdBy.
         */

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

        }


        tournamentList.innerHTML = "";


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
                        href="create-tournament.html"
                        class="btn primary-btn"
                    >
                        ➕ Create Tournament
                    </a>

                </div>

            `;

            return;

        }


        /* =========================
           DISPLAY TOURNAMENTS
        ========================= */

        snapshot.forEach(
            tournamentDoc => {

                const tournamentId =
                    tournamentDoc.id;


                const tournament =
                    tournamentDoc.data();


                console.log(
                    "Tournament:",
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
            "Tournament Load Error:",
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
   CREATE CARD
========================= */

function createTournamentCard(
    tournamentId,
    tournament
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "tournament-card";


    card.innerHTML = `

        <h2>

            🏆
            ${
                tournament.tournamentName ||
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


            <a
                class="btn primary-btn"
                href="tournament.html?id=${encodeURIComponent(tournamentId)}"
            >

                🏆 Open Tournament

            </a>


            <a
                class="btn"
                href="schedule.html?id=${encodeURIComponent(tournamentId)}"
            >

                📅 Schedule

            </a>


           <a
    class="btn"
    href="results.html?id=${tournamentId}"
    onclick="console.log('RESULT TOURNAMENT ID:', '${tournamentId}')"
>
    🏆 Results
</a>


           <a
    class="btn"
    href="live-score.html?id=${tournamentId}"
    onclick="console.log('LIVE TOURNAMENT ID:', '${tournamentId}')"
>
    🔴 Live Score
</a>


            <a
    class="btn"
    href="points.html?id=${tournamentId}"
    onclick="console.log('POINTS TOURNAMENT ID:', '${tournamentId}')"
>
    📈 Points
</a>


        </div>

    `;


    tournamentList.appendChild(
        card
    );

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


        loadTournaments(
            user
        );

    }
);