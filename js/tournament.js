import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =====================================================
   TOURNAMENT JS START
===================================================== */

console.log("🔥 TOURNAMENT JS LOADED");


/* =====================================================
   GET TOURNAMENT ID
===================================================== */

const params = new URLSearchParams(
    window.location.search
);

const tournamentId = params.get("id");

console.log(
    "🔥 CURRENT URL:",
    window.location.href
);

console.log(
    "🔥 TOURNAMENT ID:",
    tournamentId
);


/* =====================================================
   CHECK TOURNAMENT ID
===================================================== */

if (!tournamentId) {

    document.body.innerHTML = `
        <div style="
            padding:40px 20px;
            text-align:center;
            font-family:Arial,sans-serif;
        ">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open the tournament
                from My Tournaments.
            </p>

            <br>

            <a
                href="my-tournaments.html"
                style="
                    display:inline-block;
                    padding:12px 20px;
                    background:#1d4ed8;
                    color:#fff;
                    text-decoration:none;
                    border-radius:10px;
                "
            >
                🏆 My Tournaments
            </a>

        </div>
    `;

    throw new Error(
        "Tournament ID Missing"
    );
}


/* =====================================================
   GET HTML ELEMENTS
===================================================== */

const tournamentName =
    document.getElementById(
        "tournamentName"
    );

const tournamentVenue =
    document.getElementById(
        "tournamentVenue"
    );

const heroTournamentName =
    document.getElementById(
        "heroTournamentName"
    );

const heroVenue =
    document.getElementById(
        "heroVenue"
    );

const heroStatus =
    document.getElementById(
        "heroStatus"
    );

const teamCount =
    document.getElementById(
        "teamCount"
    );

const matchCount =
    document.getElementById(
        "matchCount"
    );

const playerCount =
    document.getElementById(
        "playerCount"
    );

const liveCount =
    document.getElementById(
        "liveCount"
    );


/* =====================================================
   HELPER - SHOW ERROR
===================================================== */

function showPageError(message) {

    console.error(
        "❌ TOURNAMENT PAGE ERROR:",
        message
    );

    const errorBox =
        document.createElement("div");

    errorBox.style.cssText = `
        margin:20px;
        padding:20px;
        background:#fee2e2;
        color:#991b1b;
        border-radius:12px;
        font-family:Arial,sans-serif;
        border:1px solid #fecaca;
    `;

    errorBox.innerHTML = `
        <strong>❌ Tournament Error</strong>
        <br><br>
        ${message}
    `;

    document.body.prepend(
        errorBox
    );
}


/* =====================================================
   LOAD TOURNAMENT
===================================================== */

async function loadTournament() {

    console.log(
        "🔥 STARTING TOURNAMENT LOAD"
    );

    try {

        /* ---------------------------------------------
           FIRESTORE DOCUMENT
        --------------------------------------------- */

        const tournamentRef =
            doc(
                db,
                "tournaments",
                tournamentId
            );


        console.log(
            "🔥 FIRESTORE PATH:",
            tournamentRef.path
        );


        /* ---------------------------------------------
           GET DOCUMENT
        --------------------------------------------- */

        console.log(
            "⏳ Getting tournament document..."
        );


        const tournamentSnap =
            await getDoc(
                tournamentRef
            );


        console.log(
            "🔥 DOCUMENT EXISTS:",
            tournamentSnap.exists()
        );


        /* ---------------------------------------------
           DOCUMENT NOT FOUND
        --------------------------------------------- */

        if (!tournamentSnap.exists()) {

            showPageError(
                "Tournament document was not found in Firebase."
            );

            if (tournamentName) {
                tournamentName.textContent =
                    "Tournament Not Found";
            }

            if (tournamentVenue) {
                tournamentVenue.textContent =
                    "ID: " + tournamentId;
            }

            return;
        }


        /* ---------------------------------------------
           TOURNAMENT DATA
        --------------------------------------------- */

        const tournament =
            tournamentSnap.data();


        console.log(
            "🔥 TOURNAMENT DATA:",
            tournament
        );


        /* ---------------------------------------------
           NAME
        --------------------------------------------- */

        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "APL Tournament";


        /* ---------------------------------------------
           VENUE
        --------------------------------------------- */

        const venue =
            tournament.venue ||
            tournament.location ||
            tournament.ground ||
            "Venue not available";


        console.log(
            "🏆 NAME:",
            name
        );

        console.log(
            "📍 VENUE:",
            venue
        );


        /* ---------------------------------------------
           HEADER
        --------------------------------------------- */

        if (tournamentName) {

            tournamentName.textContent =
                name;

        }


        if (tournamentVenue) {

            tournamentVenue.textContent =
                venue;

        }


        /* ---------------------------------------------
           HERO
        --------------------------------------------- */

        if (heroTournamentName) {

            heroTournamentName.textContent =
                name;

        }


        if (heroVenue) {

            heroVenue.textContent =
                venue;

        }


        if (heroStatus) {

            heroStatus.textContent =
                "🟢 Active";

        }


        /* ---------------------------------------------
           PAGE TITLE
        --------------------------------------------- */

        document.title =
            name +
            " - APL Tournament Platform";


        /* ---------------------------------------------
           LOAD COUNTS
        --------------------------------------------- */

        await loadTournamentCounts();


        /* ---------------------------------------------
           SET LINKS
        --------------------------------------------- */

        setTournamentLinks();


        console.log(
            "✅ TOURNAMENT LOADED SUCCESSFULLY"
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );

        showPageError(
            error.message ||
            "Unable to load tournament."
        );

    }

}


/* =====================================================
   LOAD TOURNAMENT COUNTS
===================================================== */

async function loadTournamentCounts() {

    console.log(
        "🔥 LOADING TOURNAMENT COUNTS"
    );


    try {

        /* =================================================
           TEAMS
        ================================================= */

        let teamsSnapshot = null;


        try {

            teamsSnapshot =
                await getDocs(
                    collection(
                        db,
                        "tournaments",
                        tournamentId,
                        "teams"
                    )
                );


            console.log(
                "👥 TEAMS:",
                teamsSnapshot.size
            );


        } catch (error) {

            console.error(
                "❌ TEAMS ERROR:",
                error
            );

        }


        if (teamCount) {

            teamCount.textContent =
                teamsSnapshot
                    ? teamsSnapshot.size
                    : 0;

        }


        /* =================================================
           MATCHES
        ================================================= */

        let matchesSnapshot = null;


        try {

            matchesSnapshot =
                await getDocs(
                    collection(
                        db,
                        "tournaments",
                        tournamentId,
                        "matches"
                    )
                );


            console.log(
                "📅 MATCHES:",
                matchesSnapshot.size
            );


        } catch (error) {

            console.error(
                "❌ MATCHES ERROR:",
                error
            );

        }


        if (matchCount) {

            matchCount.textContent =
                matchesSnapshot
                    ? matchesSnapshot.size
                    : 0;

        }


        /* =================================================
           PLAYERS
        ================================================= */

        let players = 0;


        if (teamsSnapshot) {

            teamsSnapshot.forEach(
                teamDoc => {

                    const team =
                        teamDoc.data();


                    /* -------------------------------------
                       ARRAY PLAYERS
                    ------------------------------------- */

                    if (
                        Array.isArray(
                            team.players
                        )
                    ) {

                        players +=
                            team.players.length;

                    }


                    /* -------------------------------------
                       ALTERNATIVE PLAYER FIELDS
                    ------------------------------------- */

                    else {

                        const possiblePlayers = [

                            "player1",
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


                        possiblePlayers.forEach(
                            field => {

                                if (
                                    team[field]
                                ) {

                                    players++;

                                }

                            }
                        );

                    }

                }
            );

        }


        if (playerCount) {

            playerCount.textContent =
                players;

        }


        console.log(
            "🏏 PLAYERS:",
            players
        );


        /* =================================================
           LIVE MATCHES
        ================================================= */

        let live = 0;


        if (matchesSnapshot) {

            matchesSnapshot.forEach(
                matchDoc => {

                    const match =
                        matchDoc.data();


                    const status =
                        String(
                            match.status ||
                            match.matchStatus ||
                            ""
                        ).toLowerCase();


                    if (
                        status === "live" ||
                        status === "in progress" ||
                        status === "in_progress" ||
                        status === "ongoing"
                    ) {

                        live++;

                    }

                }
            );

        }


        if (liveCount) {

            liveCount.textContent =
                live;

        }


        console.log(
            "🔴 LIVE MATCHES:",
            live
        );


        console.log(
            "📊 FINAL COUNTS:",
            {
                teams:
                    teamsSnapshot
                        ? teamsSnapshot.size
                        : 0,

                matches:
                    matchesSnapshot
                        ? matchesSnapshot.size
                        : 0,

                players:
                    players,

                live:
                    live
            }
        );


    } catch (error) {

        console.error(
            "❌ COUNT ERROR:",
            error
        );

    }

}


/* =====================================================
   SET TOURNAMENT LINKS
===================================================== */

function setTournamentLinks() {

    const id =
        encodeURIComponent(
            tournamentId
        );


    console.log(
        "🔗 SETTING LINKS FOR:",
        tournamentId
    );


    const links = {

        teamsLink:
            `teams.html?id=${id}`,

        scheduleLink:
            `schedule.html?id=${id}`,

        liveLink:
            `live.html?id=${id}`,

        resultsLink:
            `results.html?id=${id}`,

        pointsLink:
            `points.html?id=${id}`,

        statsLink:
            `playerstats.html?id=${id}`,

        orangeLink:
            `orange.html?id=${id}`,

        purpleLink:
            `purple.html?id=${id}`,

        registerTeamLink:
            `registration.html?id=${id}`,

        bottomLiveLink:
            `live.html?id=${id}`,

        bottomPointsLink:
            `points.html?id=${id}`

    };


    Object.keys(links).forEach(
        elementId => {

            const element =
                document.getElementById(
                    elementId
                );


            if (element) {

                element.href =
                    links[elementId];


                console.log(
                    "🔗 LINK:",
                    elementId,
                    element.href
                );

            }

        }
    );

}


/* =====================================================
   TOGGLE MENU
===================================================== */

window.toggleMenu =
function () {

    const menu =
        document.getElementById(
            "menu"
        );


    if (!menu) {

        console.log(
            "⚠️ Menu element not found"
        );

        return;

    }


    if (
        menu.style.display ===
        "block"
    ) {

        menu.style.display =
            "none";

    } else {

        menu.style.display =
            "block";

    }

};


/* =====================================================
   START
===================================================== */

loadTournament();