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
    "🔥 Tournament ID FROM URL:",
    tournamentId
);

console.log(
    "🔥 Team ID FROM URL:",
    teamId
);


/* =====================================================
   TOURNAMENT ID FALLBACK
   ONLY TOURNAMENT ID
===================================================== */

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


console.log(
    "🔥 FINAL Tournament ID:",
    tournamentId
);


/*
   IMPORTANT:
   पुराने localStorage teamId को यहाँ
   जानबूझकर इस्तेमाल नहीं किया गया है।

   क्योंकि वही पुराना गलत Team ID था।
*/


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    console.error(
        "❌ TEAM ERROR:",
        message
    );


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


    console.log(
        "🔥 Tournament exists:",
        tournamentSnap.exists()
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
   FIND FIRST TEAM
===================================================== */

async function findFirstTeam() {

    console.log(
        "🔎 URL में Team ID नहीं है।"
    );

    console.log(
        "🔎 इस tournament की registered teams खोज रहे हैं..."
    );


    if (!tournamentId) {

        return null;

    }


    const teamsRef =
        collection(
            db,
            "tournaments",
            tournamentId,
            "teams"
        );


    console.log(
        "📁 Firestore Path:",
        `tournaments/${tournamentId}/teams`
    );


    const snapshot =
        await getDocs(
            teamsRef
        );


    console.log(
        "👥 Registered Teams:",
        snapshot.size
    );


    if (snapshot.empty) {

        return null;

    }


    const firstTeam =
        snapshot.docs[0];


    console.log(
        "✅ First Team Found:",
        firstTeam.id
    );


    return firstTeam.id;

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
       STEP 1
       अगर URL में Team ID है,
       तो पहले वही इस्तेमाल होगा।
    */

    if (teamId) {

        console.log(
            "👥 Team ID URL से मिला:",
            teamId
        );

    }


    /*
       STEP 2
       अगर URL में Team ID नहीं है,
       तो इस tournament की पहली team खोजेंगे।
       
       पुराने localStorage teamId को
       इस्तेमाल नहीं करेंगे।
    */

    if (!teamId) {

        teamId =
            await findFirstTeam();

    }


    /*
       STEP 3
       कोई team नहीं मिली
    */

    if (!teamId) {

        throw new Error(
            "इस tournament में कोई registered team नहीं मिली।"
        );

    }


    console.log(
        "🔥 FINAL TEAM ID:",
        teamId
    );


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


    /*
       अगर URL से आया Team ID गलत है,
       तो उसी tournament की पहली team try करेंगे।
    */

    if (!teamSnap.exists()) {

        console.warn(
            "⚠️ URL Team ID नहीं मिला:",
            teamId
        );


        /*
           URL Team ID गलत होने पर
           first registered team खोजें।
        */

        const fallbackTeamId =
            await findFirstTeam();


        if (
            fallbackTeamId &&
            fallbackTeamId !== teamId
        ) {

            console.log(
                "🔄 Fallback Team:",
                fallbackTeamId
            );


            teamId =
                fallbackTeamId;


            const fallbackRef =
                doc(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams",
                    teamId
                );


            const fallbackSnap =
                await getDoc(
                    fallbackRef
                );


            if (
                !fallbackSnap.exists()
            ) {

                throw new Error(
                    "Team document नहीं मिला।"
                );

            }


            await displayTeam(
                fallbackSnap.data()
            );


            return;

        }


        throw new Error(
            "Team नहीं मिली।"
        );

    }


    await displayTeam(
        teamSnap.data()
    );

}


/* =====================================================
   DISPLAY TEAM
===================================================== */

async function displayTeam(team) {

    console.log(
        "🔥 Team Data:",
        team
    );


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

                    const label =
                        field === "captainName"
                            ? "Captain"
                            : field.replace(
                                "player",
                                "Player "
                            );


                    playersHTML += `

                        <div class="player">

                            👤

                            <b>
                                ${label}:
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
       PLAYER COUNT
    ================================================= */

    let totalPlayers =
        team.playerCount || 0;


    if (
        !totalPlayers &&
        Array.isArray(team.players)
    ) {

        totalPlayers =
            team.players.length;

    }


    /* =================================================
       DISPLAY
    ================================================= */

    if (teamDetails) {

        teamDetails.innerHTML = `

            <div class="team-name">

                🏏 ${teamName}

            </div>


            <div class="info-grid">


                <div class="info-item">

                    <b>
                        🆔 Team ID
                    </b>

                    ${teamId}

                </div>


                <div class="info-item">

                    <b>
                        🏆 Tournament
                    </b>

                    ${team.tournamentName || "-"}

                </div>


                <div class="info-item">

                    <b>
                        👤 Captain
                    </b>

                    ${team.captainName || "-"}

                </div>


                <div class="info-item">

                    <b>
                        📞 Mobile
                    </b>

                    ${team.mobile || "-"}

                </div>


                <div class="info-item">

                    <b>
                        📧 Email
                    </b>

                    ${team.email || "-"}

                </div>


                <div class="info-item">

                    <b>
                        📍 City
                    </b>

                    ${team.city || "-"}

                </div>


                <div class="info-item">

                    <b>
                        🏟️ Venue
                    </b>

                    ${team.venue || "-"}

                </div>


                <div class="info-item">

                    <b>
                        👥 Player Count
                    </b>

                    ${totalPlayers}

                </div>


                <div class="info-item">

                    <b>
                        💰 Payment
                    </b>

                    ${payment}

                </div>


                <div class="info-item">

                    <b>
                        📌 Status
                    </b>

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


    /*
       अब सही Team ID ही save होगी।
    */

    localStorage.setItem(
        "teamId",
        teamId
    );


    localStorage.setItem(
        "tournamentId",
        tournamentId
    );


    localStorage.setItem(
        "selectedTournamentId",
        tournamentId
    );


    console.log(
        "✅ TEAM LOADED SUCCESSFULLY"
    );

}


/* =====================================================
   NAVIGATION
===================================================== */

function setLinks() {

    const id =
        encodeURIComponent(
            tournamentId
        );


    if (tournamentLink) {

        tournamentLink.href =
            `tournament.html?id=${id}`;

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
   AUTH
===================================================== */

async function waitForAuth() {

    return new Promise(
        resolve => {

            let unsubscribe = null;


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

}


/* =====================================================
   START
===================================================== */

async function startPage() {

    try {

        console.log(
            "🚀 Starting Team Details..."
        );


        await waitForAuth();


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