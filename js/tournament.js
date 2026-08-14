console.log("🔥 TOURNAMENT JS LOADED");

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

const tournamentName =
    document.getElementById("tournamentName");

const tournamentVenue =
    document.getElementById("tournamentVenue");

const heroTournamentName =
    document.getElementById("heroTournamentName");

const heroVenue =
    document.getElementById("heroVenue");

const heroStatus =
    document.getElementById("heroStatus");

const teamCount =
    document.getElementById("teamCount");

const matchCount =
    document.getElementById("matchCount");

const playerCount =
    document.getElementById("playerCount");

const liveCount =
    document.getElementById("liveCount");


/* =====================================================
   TOURNAMENT ID
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

let tournamentId =
    params.get("id");


console.log(
    "🔥 URL:",
    window.location.href
);

console.log(
    "🔥 URL TOURNAMENT ID:",
    tournamentId
);


/* =====================================================
   LOCAL STORAGE FALLBACK
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
    "🔥 FINAL INITIAL ID:",
    tournamentId
);


/* =====================================================
   LOAD TOURNAMENT
===================================================== */

async function loadTournament() {

    try {

        /* ---------------------------------------------
           IF NO ID, TRY TO GET FIRST TOURNAMENT
        --------------------------------------------- */

        if (!tournamentId) {

            console.log(
                "⚠️ Tournament ID missing. Loading tournaments..."
            );

            const tournamentsSnap =
                await getDocs(
                    collection(
                        db,
                        "tournaments"
                    )
                );


            if (
                tournamentsSnap.empty
            ) {

                showError(
                    "No tournament found in Firebase."
                );

                return;

            }


            tournamentId =
                tournamentsSnap.docs[0].id;


            console.log(
                "✅ AUTO SELECTED:",
                tournamentId
            );

        }


        /* ---------------------------------------------
           SAVE ID
        --------------------------------------------- */

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );

        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );


        /* ---------------------------------------------
           FIRESTORE TOURNAMENT
        --------------------------------------------- */

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
            "🔥 TOURNAMENT EXISTS:",
            tournamentSnap.exists()
        );


        if (
            !tournamentSnap.exists()
        ) {

            showError(
                "Tournament not found: " +
                tournamentId
            );

            return;

        }


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
            "APL Tournament";


        /* ---------------------------------------------
           VENUE
        --------------------------------------------- */

        const venue =
            tournament.venue ||
            tournament.location ||
            "Venue not available";


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

            const status =
                tournament.status ||
                "Active";


            heroStatus.textContent =
                status === "Active"
                    ? "🟢 Active"
                    : status;

        }


        document.title =
            name +
            " - APL Tournament Platform";


        /* ---------------------------------------------
           COUNTS
        --------------------------------------------- */

        await loadCounts();


        /* ---------------------------------------------
           LINKS
        --------------------------------------------- */

        setTournamentLinks();


        console.log(
            "✅ TOURNAMENT PAGE READY"
        );

    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );

        showError(
            error.message
        );

    }

}


/* =====================================================
   LOAD COUNTS
===================================================== */

async function loadCounts() {

    try {

        /* ---------------------------------------------
           TEAMS
        --------------------------------------------- */

        const teamsSnap =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams"
                )
            );


        if (teamCount) {

            teamCount.textContent =
                teamsSnap.size;

        }


        /* ---------------------------------------------
           MATCHES
        --------------------------------------------- */

        const matchesSnap =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "matches"
                )
            );


        if (matchCount) {

            matchCount.textContent =
                matchesSnap.size;

        }


        /* ---------------------------------------------
           PLAYERS
        --------------------------------------------- */

        let players = 0;


        teamsSnap.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();


                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    players +=
                        team.players.length;

                }

            }
        );


        if (playerCount) {

            playerCount.textContent =
                players;

        }


        /* ---------------------------------------------
           LIVE MATCHES
        --------------------------------------------- */

        let live = 0;


        matchesSnap.forEach(
            matchDoc => {

                const match =
                    matchDoc.data();


                const status =
                    String(
                        match.status || ""
                    )
                    .toLowerCase()
                    .trim();


                if (
                    status === "live" ||
                    status === "in progress" ||
                    status === "in_progress"
                ) {

                    live++;

                }

            }
        );


        if (liveCount) {

            liveCount.textContent =
                live;

        }


        console.log(
            "🔥 COUNTS:",
            {
                teams: teamsSnap.size,
                matches: matchesSnap.size,
                players: players,
                live: live
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
   SET LINKS
===================================================== */

function setTournamentLinks() {

    const id =
        encodeURIComponent(
            tournamentId
        );


    const links = {

        teamsLink:
            `teams.html?id=${id}`,

        scheduleLink:
            `schedule.html?id=${id}`,

        liveLink:
            `live-score.html?id=${id}`,

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
            `live-score.html?id=${id}`,

        bottomPointsLink:
            `points.html?id=${id}`

    };


    Object.keys(links).forEach(
        key => {

            const element =
                document.getElementById(
                    key
                );


            if (element) {

                element.href =
                    links[key];

            }

        }
    );


    console.log(
        "🔗 ALL LINKS SET:",
        links
    );

}


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    console.error(
        "❌ PAGE ERROR:",
        message
    );


    if (tournamentName) {

        tournamentName.textContent =
            "Tournament Error";

    }


    if (tournamentVenue) {

        tournamentVenue.textContent =
            message;

    }


    if (heroTournamentName) {

        heroTournamentName.textContent =
            "Tournament Not Found";

    }


    if (heroVenue) {

        heroVenue.textContent =
            message;

    }

}


/* =====================================================
   MENU
===================================================== */

const menuButton =
    document.getElementById(
        "menuButton"
    );

const menu =
    document.getElementById(
        "menu"
    );


if (
    menuButton &&
    menu
) {

    menuButton.addEventListener(
        "click",
        () => {

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

        }
    );

}


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "🔥 AUTH:",
            user
                ? user.uid
                : "NOT LOGGED IN"
        );

        /*
         * Login जरूरी नहीं है।
         * Tournament page Firebase से tournament
         * ID मिलने पर खुलेगा।
         */

        loadTournament();

    }
);