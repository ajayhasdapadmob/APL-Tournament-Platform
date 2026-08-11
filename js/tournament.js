import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const tournamentId =
    params.get("id");


console.log(
    "Tournament ID:",
    tournamentId
);


/* =========================
   CHECK TOURNAMENT ID
========================= */

if (!tournamentId) {

    document.body.innerHTML = `

        <div style="
            padding:40px;
            text-align:center;
            font-family:Arial;
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
                    padding:12px 18px;
                    background:#1d4ed8;
                    color:white;
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


/* =========================
   ELEMENTS
========================= */

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


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

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

            document.body.innerHTML = `

                <div style="
                    padding:40px;
                    text-align:center;
                    font-family:Arial;
                ">

                    <h2>
                        ❌ Tournament Not Found
                    </h2>

                    <p>
                        This tournament does not
                        exist in Firebase.
                    </p>

                    <br>

                    <a
                        href="my-tournaments.html"
                        style="
                            display:inline-block;
                            padding:12px 18px;
                            background:#1d4ed8;
                            color:white;
                            text-decoration:none;
                            border-radius:10px;
                        "
                    >
                        🏆 My Tournaments
                    </a>

                </div>

            `;

            return;

        }


        const tournament =
            tournamentSnap.data();


        const name =
            tournament.tournamentName ||
            "APL Tournament";


        const venue =
            tournament.venue ||
            "Venue not available";


        /* HEADER */

        if (tournamentName) {
            tournamentName.textContent =
                name;
        }


        if (tournamentVenue) {
            tournamentVenue.textContent =
                venue;
        }


        /* HERO */

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


        /* PAGE TITLE */

        document.title =
            name +
            " - APL Tournament Platform";


        /* LOAD COUNTS */

        await loadTournamentCounts();


        /* SET LINKS */

        setTournamentLinks();


    } catch (error) {

        console.error(
            "Tournament Error:",
            error
        );

    }

}


/* =========================
   LOAD COUNTS
========================= */

async function loadTournamentCounts() {

    try {

        /* TEAMS */

        const teamsSnapshot =
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
                teamsSnapshot.size;

        }


        /* MATCHES */

        const matchesSnapshot =
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
                matchesSnapshot.size;

        }


        /* PLAYERS */

        let players = 0;


        teamsSnapshot.forEach(
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


        /* LIVE MATCHES */

        let live = 0;


        matchesSnapshot.forEach(
            matchDoc => {

                const match =
                    matchDoc.data();


                const status =
                    String(
                        match.status ||
                        ""
                    ).toLowerCase();


                if (
                    status === "live" ||
                    status === "in progress"
                ) {

                    live++;

                }

            }
        );


        if (liveCount) {

            liveCount.textContent =
                live;

        }


    } catch (error) {

        console.error(
            "Count Error:",
            error
        );

    }

}


/* =========================
   TOURNAMENT LINKS
========================= */

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

            }

        }
    );

}


/* =========================
   MENU
========================= */

window.toggleMenu =
function () {

    const menu =
        document.getElementById(
            "menu"
        );


    if (!menu) {
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


/* =========================
   START
========================= */

loadTournament();