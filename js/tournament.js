console.log("🔥 TEAM JS LOADED");

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =====================================================
   ELEMENTS
===================================================== */

const tournamentInfo =
    document.getElementById("tournamentInfo");

const teamDetails =
    document.getElementById("teamDetails");

const tournamentLink =
    document.getElementById("tournamentLink");

const adminLink =
    document.getElementById("adminLink");

const scheduleLink =
    document.getElementById("scheduleLink");

const resultsLink =
    document.getElementById("resultsLink");

const pointsLink =
    document.getElementById("pointsLink");


/* =====================================================
   URL PARAMETERS
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );


/*
   Supported URLs:

   team.html?id=TOURNAMENT_ID&teamId=TEAM_ID

   OR

   team.html?tournamentId=TOURNAMENT_ID&teamId=TEAM_ID
*/

let tournamentId =
    params.get("id") ||
    params.get("tournamentId");

let teamId =
    params.get("teamId");


console.log(
    "🔥 URL:",
    window.location.href
);

console.log(
    "🔥 Tournament ID:",
    tournamentId
);

console.log(
    "🔥 Team ID:",
    teamId
);


/* =====================================================
   LOCAL STORAGE FALLBACK
===================================================== */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

}


if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );

}


if (!teamId) {

    teamId =
        localStorage.getItem(
            "teamId"
        );

}


console.log(
    "🔥 FINAL Tournament ID:",
    tournamentId
);

console.log(
    "🔥 FINAL Team ID:",
    teamId
);


/* =====================================================
   SHOW ERROR
===================================================== */

function showError(message) {

    if (tournamentInfo) {

        tournamentInfo.innerHTML = `
            <div class="error-box">

                ❌ ${message}

            </div>
        `;

    }


    if (teamDetails) {

        teamDetails.innerHTML = `
            <div class="error-box">

                ❌ ${message}

            </div>
        `;

    }

}


/* =====================================================
   LOAD TOURNAMENT
===================================================== */

async function loadTournament() {

    if (!tournamentId) {

        throw new Error(
            "Tournament ID नहीं मिला।"
        );

    }


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


    const tournamentSnap =
        await getDoc(
            tournamentRef
        );


    if (!tournamentSnap.exists()) {

        throw new Error(
            "Tournament नहीं मिला।"
        );

    }


    const tournament =
        tournamentSnap.data();


    console.log(
        "🔥 Tournament Data:",
        tournament
    );


    const tournamentName =
        tournament.tournamentName ||
        tournament.name ||
        "APL Tournament";


    const venue =
        tournament.venue ||
        tournament.location ||
        "Venue not available";


    if (tournamentInfo) {

        tournamentInfo.innerHTML = `

            <h2>
                🏆 ${tournamentName}
            </h2>

            <p>
                📍 <b>Venue:</b>
                ${venue}
            </p>

            <div class="tournament-id">

                🆔
                <b>Tournament ID:</b>

                <br>

                ${tournamentId}

            </div>

        `;

    }


    document.title =
        `${tournamentName} - Team Details`;

}


/* =====================================================
   FIND FIRST TEAM IF TEAM ID MISSING
===================================================== */

async function findFirstTeam() {

    console.log(
        "🔎 Team ID नहीं मिला, registered teams देख रहे हैं..."
    );


    const teamsRef =
        collection(
            db,
            "tournaments",
            tournamentId,
            "teams"
        );


    const snapshot =
        await getDocs(
            teamsRef
        );


    console.log(
        "👥 Teams found:",
        snapshot.size
    );


    if (snapshot.empty) {

        return null;

    }


    return snapshot.docs[0].id;

}


/* =====================================================
   LOAD TEAM
===================================================== */

async function loadTeam() {

    if (!tournamentId) {

        throw new Error(
            "Tournament ID नहीं मिला।"
        );

    }


    /*
       अगर Team ID URL में नहीं है,
       तो localStorage / first team fallback
    */

    if (!teamId) {

        teamId =
            await findFirstTeam();


        if (teamId) {

            localStorage.setItem(
                "teamId",
                teamId
            );

        }

    }


    if (!teamId) {

        throw new Error(
            "इस tournament में कोई team नहीं मिली।"
        );

    }


    console.log(
        "👥 Loading team:",
        teamId
    );


    const teamRef =
        doc(
            db,
            "tournaments",
            tournamentId,
            "teams",
            teamId
        );


    const teamSnap =
        await getDoc(
            teamRef
        );


    console.log(
        "🔥 Team exists:",
        teamSnap.exists()
    );


    if (!teamSnap.exists()) {

        throw new Error(
            "Team नहीं मिली।"
        );

    }


    const team =
        teamSnap.data();


    console.log(
        "🔥 Team Data:",
        team
    );


    /* =================================================
       TEAM NAME
    ================================================= */

    const teamName =
        team.teamName ||
        team.name ||
        "Unnamed Team";


    /* =================================================
       PLAYERS
    ================================================= */

    let playersHTML = "";


    if (
        Array.isArray(
            team.players
        )
    ) {

        team.players.forEach(
            (player, index) => {

                playersHTML += `

                    <div class="player">

                        👤
                        <b>
                            Player ${index + 1}:
                        </b>

                        ${player || "-"}

                    </div>

                `;

            }
        );

    } else {

        /*
           अगर players array में नहीं है,
           तो player1/player2 आदि fields check करें
        */

        const playerFields = [

            "captainName",
            "player2",
            "player3",
            "player4",
            "player5",
            "player6",
            "player7",
            "player8",
            "player9",
            "player10",
            "player11",
            "player12",
            "player13",
            "player14",
            "player15"

        ];


        playerFields.forEach(
            field => {

                if (team[field]) {

                    playersHTML += `

                        <div class="player">

                            👤
                            <b>
                                ${field === "captainName"
                                    ? "Captain"
                                    : field}:
                            </b>

                            ${team[field]}

                        </div>

                    `;

                }

            }
        );

    }


    if (!playersHTML) {

        playersHTML = `

            <div class="player">

                No player information available.

            </div>

        `;

    }


    /* =================================================
       STATUS
    ================================================= */

    const status =
        team.status ||
        "Pending";


    /* =================================================
       PAYMENT
    ================================================= */

    const payment =
        team.paymentStatus ||
        "Unpaid";


    /* =================================================
       DISPLAY TEAM
    ================================================= */

    if (teamDetails) {

        teamDetails.innerHTML = `

            <div class="team-name">

                🏏 ${teamName}

            </div>


            <div class="info-grid">


                <div class="info-item">

                    <b>🆔 Team ID</b>

                    ${teamId}

                </div>


                <div class="info-item">

                    <b>🏆 Tournament</b>

                    ${team.tournamentName || "-"}

                </div>


                <div class="info-item">

                    <b>👤 Captain</b>

                    ${team.captainName || "-"}

                </div>


                <div class="info-item">

                    <b>📞 Mobile</b>

                    ${team.mobile || "-"}

                </div>


                <div class="info-item">

                    <b>📧 Email</b>

                    ${team.email || "-"}

                </div>


                <div class="info-item">

                    <b>📍 City</b>

                    ${team.city || "-"}

                </div>


                <div class="info-item">

                    <b>🏟️ Venue</b>

                    ${team.venue || "-"}

                </div>


                <div class="info-item">

                    <b>👥 Player Count</b>

                    ${team.playerCount ||
                     (Array.isArray(team.players)
                        ? team.players.length
                        : 0)}

                </div>


                <div class="info-item">

                    <b>💰 Payment</b>

                    ${payment}

                </div>


                <div class="info-item">

                    <b>📌 Status</b>

                    <span class="status">

                        ${status}

                    </span>

                </div>


            </div>


            <div class="players">

                <h3>
                    👥 Team Players
                </h3>

                ${playersHTML}

            </div>

        `;

    }


    /* =================================================
       SAVE TEAM ID
    ================================================= */

    localStorage.setItem(
        "teamId",
        teamId
    );


    console.log(
        "✅ TEAM LOADED SUCCESSFULLY"
    );

}


/* =====================================================
   SET NAVIGATION LINKS
===================================================== */

function setLinks() {

    const id =
        encodeURIComponent(
            tournamentId
        );


    const team =
        encodeURIComponent(
            teamId || ""
        );


    if (tournamentLink) {

        tournamentLink.href =
            `Tournament.html?id=${id}`;

    }


    if (adminLink) {

        adminLink.href =
            `admin.html?id=${id}`;

    }


    if (scheduleLink) {

        scheduleLink.href =
            `schedule.html?id=${id}`;

    }


    if (resultsLink) {

        resultsLink.href =
            `results.html?id=${id}`;

    }


    if (pointsLink) {

        pointsLink.href =
            `points.html?id=${id}`;

    }


    console.log(
        "🔗 Navigation links set"
    );

}


/* =====================================================
   START
===================================================== */

async function startPage() {

    try {

        console.log(
            "🚀 Starting Team Details..."
        );


        /*
           Authentication का इंतजार
           लेकिन login न होने पर भी
           page को बेवजह redirect नहीं करेंगे।
        */

        await new Promise(
            resolve => {

                let unsubscribe;

                unsubscribe =
                    onAuthStateChanged(
                        auth,
                        user => {

                            console.log(
                                "🔥 USER:",
                                user
                                    ? user.uid
                                    : "NOT LOGGED IN"
                            );

                            if (unsubscribe) {

                                unsubscribe();

                            }

                            resolve(user);

                        }
                    );

            }
        );


        await loadTournament();


        await loadTeam();


        setLinks();


        console.log(
            "✅ TEAM DETAILS PAGE READY"
        );


    } catch (error) {

        console.error(
            "❌ TEAM DETAILS ERROR:",
            error
        );


        showError(
            error.message
        );

    }

}


startPage();