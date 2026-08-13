console.log("🔥 MY TOURNAMENTS JS LOADED");

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
    document.getElementById("tournamentList");


/* =========================
   CHECK ELEMENT
========================= */

if (!tournamentList) {

    console.error(
        "❌ tournamentList not found"
    );

    throw new Error(
        "tournamentList not found"
    );

}


/* =========================
   MESSAGE
========================= */

function showMessage(html) {

    tournamentList.innerHTML = `
        <div class="empty-message">
            ${html}
        </div>
    `;

}


/* =========================
   LOAD TOURNAMENTS
========================= */

async function loadTournaments(user) {

    console.log(
        "🔥 Loading tournaments for UID:",
        user.uid
    );


    showMessage(
        "⏳ Loading Tournaments..."
    );


    try {

        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        /* =========================
           FIND BY OWNER ID
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
            "🔥 ownerId tournaments:",
            snapshot.size
        );


        /* =========================
           FIND BY CREATED BY
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
                "🔥 createdBy tournaments:",
                snapshot.size
            );

        }


        /* =========================
           NO TOURNAMENT
        ========================= */

        if (snapshot.empty) {

            showMessage(`
                
                <h2>
                    🏆 No Tournament Found
                </h2>

                <p>
                    अभी आपके account में कोई tournament नहीं है।
                </p>

                <br>

                <a
                    href="create-tournament.html"
                    class="btn primary-btn"
                >
                    ➕ Create Tournament
                </a>

            `);

            return;

        }


        /* =========================
           CLEAR LOADING
        ========================= */

        tournamentList.innerHTML = "";


        /* =========================
           SHOW TOURNAMENTS
        ========================= */

        snapshot.forEach(
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


                createTournamentCard(
                    tournamentId,
                    tournament
                );

            }
        );


        console.log(
            "✅ ALL TOURNAMENTS LOADED"
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
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
   CREATE CARD
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
        "Venue not available";


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
            <b>Total Teams:</b>
            ${totalTeams}
        </p>


        <div class="card-buttons">

            <a
                href="tournament.html?id=${encodeURIComponent(tournamentId)}"
                class="btn primary-btn"
            >
                🏆 Open Tournament
            </a>


            <a
                href="registration.html?id=${encodeURIComponent(tournamentId)}"
                class="btn"
            >
                👥 Team Registration
            </a>


            <a
                href="schedule.html?id=${encodeURIComponent(tournamentId)}"
                class="btn"
            >
                📅 Schedule
            </a>


            <a
                href="live-score.html?id=${encodeURIComponent(tournamentId)}"
                class="btn"
            >
                🔴 Live Score
            </a>


            <a
                href="points.html?id=${encodeURIComponent(tournamentId)}"
                class="btn"
            >
                📊 Points Table
            </a>

        </div>

    `;


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
            "🔥 AUTH STATE:",
            user
        );


        if (!user) {

            console.log(
                "❌ USER NOT LOGGED IN"
            );


            window.location.href =
                "login.html";


            return;

        }


        console.log(
            "✅ USER LOGGED IN:",
            user.uid
        );


        loadTournaments(
            user
        );

    }
);