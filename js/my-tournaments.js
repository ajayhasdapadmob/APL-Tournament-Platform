console.log("🔥🔥 MY TOURNAMENTS JS LOADED 🔥🔥");


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

        console.log(
            "🔥 USER UID:",
            user.uid
        );


        tournamentList.innerHTML = `

            <div class="tournament-card">

                <h2>
                    ⏳ Loading...
                </h2>

            </div>

        `;


        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        /* =========================
           OWNER ID
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


        /* =========================
           CREATED BY
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

        }


        tournamentList.innerHTML = "";


        /* =========================
           NO TOURNAMENT
        ========================= */

        if (snapshot.empty) {

            tournamentList.innerHTML = `

                <div class="tournament-card">

                    <h2>
                        🏆 No Tournament Found
                    </h2>

                    <p>
                        Create your first tournament.
                    </p>

                </div>

            `;

            return;

        }


        /* =========================
           DISPLAY
        ========================= */

        snapshot.forEach(
            tournamentDoc => {

                const tournamentId =
                    tournamentDoc.id;


                const tournament =
                    tournamentDoc.data();


                console.log(
                    "🔥 TOURNAMENT ID:",
                    tournamentId
                );


                createTournamentCard(
                    tournamentId,
                    tournament
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ LOAD ERROR:",
            error
        );


        tournamentList.innerHTML = `

            <div class="tournament-card">

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


    const name =
        tournament.tournamentName ||
        tournament.name ||
        "Tournament";


    const venue =
        tournament.venue ||
        tournament.location ||
        "Venue not available";


    card.innerHTML = `

        <div>

            <h2>
                🏆 ${name}
            </h2>

            <p>
                🆔
                <b>Tournament ID:</b>
                ${tournamentId}
            </p>

            <p>
                📍
                <b>Venue:</b>
                ${venue}
            </p>

        </div>


        <div class="card-buttons">

            <button
                class="register-btn openTournamentBtn"
                type="button"
            >
                🏆 Open Tournament
            </button>

        </div>

    `;


    /* =========================
       OPEN BUTTON
    ========================= */

    const openButton =
        card.querySelector(
            ".openTournamentBtn"
        );


    openButton.addEventListener(
        "click",
        function() {

            console.log(
                "🔥 OPEN ID:",
                tournamentId
            );


            /*
             * Save ID
             */

            localStorage.setItem(
                "tournamentId",
                tournamentId
            );


            /*
             * Create URL
             */

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
             * Open Tournament
             */

            window.location.assign(
                url
            );

        }
    );


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
            "🔥 AUTH:",
            user
        );


        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        loadTournaments(
            user
        );

    }
console.log("🔥 MY TOURNAMENTS JS LOADED");

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENT
========================= */

const tournamentList =
    document.getElementById("tournamentList");


/* =========================
   SHOW MESSAGE
========================= */

function showMessage(message) {

    if (!tournamentList) return;

    tournamentList.innerHTML = `
        <div class="empty-message">

            ${message}

        </div>
    `;
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


    const name =
        tournament.tournamentName ||
        tournament.name ||
        "APL Tournament";


    const venue =
        tournament.venue ||
        tournament.location ||
        "-";


    const startDate =
        tournament.startDate ||
        "-";


    const endDate =
        tournament.endDate ||
        "-";


    const totalTeams =
        tournament.totalTeams ||
        0;


    card.innerHTML = `

        <h2>
            🏆 ${name}
        </h2>


        <p>
            🆔
            <b>Tournament ID:</b>
            ${tournamentId}
        </p>


        <p>
            📍
            <b>Venue:</b>
            ${venue}
        </p>


        <p>
            📅
            <b>Start:</b>
            ${startDate}
        </p>


        <p>
            📅
            <b>End:</b>
            ${endDate}
        </p>


        <p>
            👥
            <b>Teams:</b>
            ${totalTeams}
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
                href="results.html?id=${encodeURIComponent(tournamentId)}"
            >
                🏆 Results
            </a>


            <a
                class="btn"
                href="live-score.html?id=${encodeURIComponent(tournamentId)}"
            >
                🔴 Live Score
            </a>


            <a
                class="btn"
                href="points.html?id=${encodeURIComponent(tournamentId)}"
            >
                📊 Points
            </a>


        </div>

    `;


    tournamentList.appendChild(card);

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


        showMessage(
            "⏳ Loading Tournaments..."
        );


        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        let snapshot = null;


        /* =========================
           TRY ownerId
        ========================= */

        try {

            snapshot =
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
                "🔥 ownerId result:",
                snapshot.size
            );

        } catch (error) {

            console.log(
                "⚠️ ownerId query failed:",
                error.message
            );

        }


        /* =========================
           TRY createdBy
        ========================= */

        if (!snapshot || snapshot.empty) {

            try {

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
                    "🔥 createdBy result:",
                    snapshot.size
                );

            } catch (error) {

                console.log(
                    "⚠️ createdBy query failed:",
                    error.message
                );

            }

        }


        /* =========================
           TRY LOCAL STORAGE ID
        ========================= */

        if (!snapshot || snapshot.empty) {

            const savedId =
                localStorage.getItem(
                    "tournamentId"
                );


            console.log(
                "🔥 Local Storage Tournament ID:",
                savedId
            );


            if (savedId) {

                try {

                    const tournamentRef =
                        doc(
                            db,
                            "tournaments",
                            savedId
                        );


                    const tournamentSnap =
                        await getDoc(
                            tournamentRef
                        );


                    if (
                        tournamentSnap.exists()
                    ) {

                        console.log(
                            "✅ Tournament found from Local Storage"
                        );


                        snapshot = {
                            docs: [
                                tournamentSnap
                            ],
                            empty: false,
                            size: 1
                        };

                    }

                } catch (error) {

                    console.error(
                        "❌ Local Storage tournament error:",
                        error
                    );

                }

            }

        }


        /* =========================
           NO TOURNAMENT
        ========================= */

        if (
            !snapshot ||
            snapshot.empty
        ) {

            showMessage(`

                <h2>
                    🏆 No Tournaments Found
                </h2>

                <p>
                    Your tournament could not be found.
                </p>

                <br>

                <a
                    href="create-tournament.html"
                    class="btn primary-btn"
                >
                    ➕ Create Tournament
                </a>

            `);

            console.log(
                "❌ No tournament found"
            );

            return;

        }


        /* =========================
           CLEAR LIST
        ========================= */

        tournamentList.innerHTML = "";


        /* =========================
           DISPLAY
        ========================= */

        snapshot.docs.forEach(
            tournamentDoc => {

                const tournamentId =
                    tournamentDoc.id;


                const tournament =
                    tournamentDoc.data();


                console.log(
                    "🏆 Tournament:",
                    tournamentId,
                    tournament
                );


                /*
                 * Save latest tournament ID
                 */

                localStorage.setItem(
                    "tournamentId",
                    tournamentId
                );


                createTournamentCard(
                    tournamentId,
                    tournament
                );

            }
        );


        console.log(
            "✅ My Tournaments Loaded:",
            snapshot.size
        );


    } catch (error) {

        console.error(
            "❌ MY TOURNAMENT ERROR:",
            error
        );


        showMessage(`

            <h2>
                ❌ Error
            </h2>

            <p>
                ${error.message}
            </p>

        `);

    }

}


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "🔥 AUTH USER:",
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


        console.log(
            "✅ User logged in:",
            user.uid
        );


        loadTournaments(
            user
        );

    }
);