// ========================================
// RESULTS.JS
// ========================================

import { db } from "../firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("✅ RESULTS.JS LOADED");


const tournamentSelect =
    document.getElementById("tournamentSelect");

const tournamentInfo =
    document.getElementById("tournamentInfo");

const resultsList =
    document.getElementById("resultsList");


/* ========================================
   LOAD TOURNAMENTS
======================================== */

async function loadTournaments() {

    console.log("🔥 STARTING FIRESTORE READ");


    if (!tournamentSelect) {

        console.error(
            "❌ tournamentSelect NOT FOUND"
        );

        return;
    }


    try {

        const ref =
            collection(
                db,
                "tournaments"
            );


        console.log(
            "🔥 Reading tournaments collection..."
        );


        const snapshot =
            await getDocs(ref);


        console.log(
            "🔥 FIRESTORE READ SUCCESS"
        );


        console.log(
            "🔥 TOURNAMENT COUNT:",
            snapshot.size
        );


        // Clear loading option

        tournamentSelect.innerHTML = "";


        // No tournaments

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

                <p>
                    Firestore में tournaments collection खाली है।
                </p>

            `;


            console.log(
                "⚠️ tournaments collection EMPTY"
            );

            return;
        }


        // ==================================
        // ADD EVERY TOURNAMENT
        // ==================================

        snapshot.forEach((tournamentDoc) => {

            const data =
                tournamentDoc.data();


            console.log(
                "🏆 TOURNAMENT:",
                tournamentDoc.id,
                data
            );


            const option =
                document.createElement("option");


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

        });


        console.log(
            "✅ ALL TOURNAMENTS ADDED"
        );


        // ==================================
        // SELECT FIRST TOURNAMENT
        // ==================================

        const firstId =
            tournamentSelect.value;


        if (firstId) {

            await showTournament(
                firstId
            );

        }


    } catch (error) {

        console.error(
            "❌ FIRESTORE ERROR:",
            error
        );


        tournamentSelect.innerHTML = `

            <option value="">
                ❌ Loading Error
            </option>

        `;


        tournamentInfo.innerHTML = `

            <h2>
                ❌ Firestore Error
            </h2>

            <p>
                ${error.message}
            </p>

        `;


        resultsList.innerHTML = `

            <div class="empty">

                ❌ Tournament load नहीं हो पाया।

                <br><br>

                ${error.message}

            </div>

        `;

    }

}

/* ========================================
   LOAD MATCHES
======================================== */

async function loadMatches(id) {

    console.log(
        "🏏 Loading matches for:",
        id
    );

    if (!resultsList) {
        console.error(
            "❌ resultsList NOT FOUND"
        );
        return;
    }

    resultsList.innerHTML = `

        <div class="empty">
            ⏳ Loading Matches...
        </div>

    `;

    try {

        const matchesRef =
            collection(
                db,
                "tournaments",
                id,
                "matches"
            );

        const snapshot =
            await getDocs(matchesRef);

        console.log(
            "🏏 MATCH COUNT:",
            snapshot.size
        );

        resultsList.innerHTML = "";

        if (snapshot.empty) {

            resultsList.innerHTML = `

                <div class="empty">

                    📅 No matches found.

                    <br><br>

                    Tournament ID:
                    <b>${id}</b>

                    <br><br>

                    Please create matches
                    from Schedule.

                </div>

            `;

            return;
        }


        snapshot.forEach((matchDoc) => {

            const match =
                matchDoc.data();

            console.log(
                "🏏 MATCH:",
                matchDoc.id,
                match
            );


            const teamA =
                match.teamA ||
                match.team1Name ||
                match.team1 ||
                "Team A";


            const teamB =
                match.teamB ||
                match.team2Name ||
                match.team2 ||
                "Team B";


            const matchNumber =
                match.matchNumber ||
                match.matchNo ||
                match.number ||
                matchDoc.id;


            const result =
                match.result ||
                "";


            const card =
                document.createElement("div");


            card.className =
                "result-card";


            card.innerHTML = `

                <div class="match-title">

                    🏏 Match ${matchNumber}

                </div>


                <div class="teams">

                    ${teamA}
                    🆚
                    ${teamB}

                </div>


                <div class="info">

                    📅
                    ${match.date ||
                    match.matchDate ||
                    "-"}

                </div>


                <div class="info">

                    ⏰
                    ${match.time ||
                    match.matchTime ||
                    "-"}

                </div>


                <div class="info">

                    📍
                    ${match.venue || "-"}

                </div>


                ${
                    result
                    ?
                    `
                    <div class="result-success">

                        🏆 Result:
                        ${result}

                    </div>
                    `
                    :
                    `
                    <div class="info">

                        ⏳ Result Not Added Yet

                    </div>
                    `
                }

            `;


            resultsList.appendChild(
                card
            );

        });


        console.log(
            "✅ MATCHES DISPLAYED"
        );


    } catch (error) {

        console.error(
            "❌ MATCH LOAD ERROR:",
            error
        );


        resultsList.innerHTML = `

            <div class="empty">

                ❌ Unable to load matches.

                <br><br>

                ${error.message}

            </div>

        `;

    }

}

/* ========================================
   TOURNAMENT SELECT CHANGE
======================================== */

tournamentSelect.addEventListener(
    "change",
    async function () {

        const id =
            this.value;


        if (!id) {
            return;
        }


        console.log(
            "🔄 SELECTED TOURNAMENT:",
            id
        );


        await showTournament(
            id
        );

    }
);


/* ========================================
   SHOW SELECTED TOURNAMENT
======================================== */

async function showTournament(id) {

    try {

        const selected =
            await getDocs(
                collection(
                    db,
                    "tournaments"
                )
            );


        let tournamentData =
            null;


        selected.forEach((d) => {

            if (d.id === id) {

                tournamentData =
                    d.data();

            }

        });


        if (!tournamentData) {

            tournamentInfo.innerHTML = `

                <h2>
                    ❌ Tournament Not Found
                </h2>

            `;

            return;
        }


        tournamentInfo.innerHTML = `

            <h2>
                🏆 ${
                    tournamentData.tournamentName ||
                    tournamentData.name ||
                    tournamentData.title ||
                    "Tournament"
                }
            </h2>

            <p>
                🆔 <b>Tournament ID:</b>
                ${id}
            </p>

            <p>
                📍 <b>Venue:</b>
                ${
                    tournamentData.venue ||
                    tournamentData.location ||
                    "-"
                }
            </p>

            <p>
                👥 <b>Teams:</b>
                ${
                    tournamentData.totalTeams ||
                    tournamentData.teamCount ||
                    0
                }
            </p>

        `;


        // Save selected tournament

        localStorage.setItem(
            "tournamentId",
            id
        );

        localStorage.setItem(
            "selectedTournamentId",
            id
        );


        console.log(
            "✅ SELECTED TOURNAMENT:",
            id
        );
await loadMatches(id);

    } catch (error) {

        console.error(
            "❌ SHOW TOURNAMENT ERROR:",
            error
        );

    }

}


/* ========================================
   START
======================================== */

loadTournaments();