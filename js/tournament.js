console.log("🔥 TOURNAMENT JS LOADED");

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   GET ELEMENTS
========================= */

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


/* =========================
   GET URL ID
========================= */

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
    "🔥 ID FROM URL:",
    tournamentId
);


/* =========================
   LOCAL STORAGE
========================= */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

    console.log(
        "🔥 ID FROM LOCAL STORAGE:",
        tournamentId
    );
}


/* =========================
   FIND TOURNAMENT
========================= */

async function findTournament(user) {

    console.log(
        "🔥 Searching tournaments..."
    );


    const tournamentsRef =
        collection(
            db,
            "tournaments"
        );


    /* =========================
       OWNER ID
    ========================= */

    if (user) {

        try {

            const ownerQuery =
                query(
                    tournamentsRef,
                    where(
                        "ownerId",
                        "==",
                        user.uid
                    )
                );


            const ownerSnap =
                await getDocs(
                    ownerQuery
                );


            console.log(
                "🔥 ownerId:",
                ownerSnap.size
            );


            if (!ownerSnap.empty) {

                return ownerSnap.docs[0].id;

            }

        } catch (error) {

            console.log(
                "⚠️ ownerId search failed:",
                error.message
            );

        }


        /* =========================
           CREATED BY
        ========================= */

        try {

            const createdQuery =
                query(
                    tournamentsRef,
                    where(
                        "createdBy",
                        "==",
                        user.uid
                    )
                );


            const createdSnap =
                await getDocs(
                    createdQuery
                );


            console.log(
                "🔥 createdBy:",
                createdSnap.size
            );


            if (!createdSnap.empty) {

                return createdSnap.docs[0].id;

            }

        } catch (error) {

            console.log(
                "⚠️ createdBy search failed:",
                error.message
            );

        }

    }


    /* =========================
       FINAL FALLBACK
       GET ANY TOURNAMENT
    ========================= */

    try {

        const allSnap =
            await getDocs(
                tournamentsRef
            );


        console.log(
            "🔥 ALL TOURNAMENTS:",
            allSnap.size
        );


        if (!allSnap.empty) {

            return allSnap.docs[0].id;

        }

    } catch (error) {

        console.error(
            "❌ Cannot read tournaments:",
            error
        );

    }


    return null;
}


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

        /* =========================
           WAIT FOR AUTH
        ========================= */

        const user =
            await new Promise(
                resolve => {

                    let unsubscribe;

                    unsubscribe =
                        onAuthStateChanged(
                            auth,
                            currentUser => {

                                if (unsubscribe) {
                                    unsubscribe();
                                }

                                resolve(
                                    currentUser
                                );

                            }
                        );

                }
            );


        console.log(
            "🔥 USER:",
            user ? user.uid : "NOT LOGGED IN"
        );


        /* =========================
           FIND ID
        ========================= */

        if (!tournamentId) {

            tournamentId =
                await findTournament(
                    user
                );


            console.log(
                "🔥 AUTO FOUND ID:",
                tournamentId
            );

        }


        /* =========================
           NO ID
        ========================= */

        if (!tournamentId) {

            document.body.innerHTML = `

                <div style="
                    padding:40px;
                    text-align:center;
                    font-family:Arial;
                ">

                    <h2>
                        ❌ No Tournament Found
                    </h2>

                    <p>
                        Firebase में कोई tournament नहीं मिला।
                    </p>

                    <br>

                    <a
                        href="my-tournaments.html"
                        style="
                            display:inline-block;
                            padding:12px 20px;
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


        /* =========================
           SAVE ID
        ========================= */

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );


        console.log(
            "✅ FINAL TOURNAMENT ID:",
            tournamentId
        );


        /* =========================
           FIRESTORE DOCUMENT
        ========================= */

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


        if (!tournamentSnap.exists()) {

            console.error(
                "❌ Tournament document not found:",
                tournamentId
            );

            return;

        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "🔥 FULL TOURNAMENT DATA:",
            tournament
        );


        /* =========================
           NAME
        ========================= */

        const name =
            tournament.tournamentName ||
            tournament.name ||
            "APL Tournament";


        /* =========================
           VENUE
        ========================= */

        const venue =
            tournament.venue ||
            tournament.location ||
            "Venue not available";


        /* =========================
           HEADER
        ========================= */

        if (tournamentName) {

            tournamentName.textContent =
                name;

        }


        if (tournamentVenue) {

            tournamentVenue.textContent =
                venue;

        }


        /* =========================
           HERO
        ========================= */

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


        /* =========================
           PAGE TITLE
        ========================= */

        document.title =
            name +
            " - APL Tournament Platform";


        /* =========================
           COUNTS
        ========================= */

        await loadCounts();


        /* =========================
           LINKS
        ========================= */

        setTournamentLinks();


        console.log(
            "✅ TOURNAMENT DATA LOADED"
        );

    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );

    }

}


/* =========================
   LOAD COUNTS
========================= */

async function loadCounts() {

    try {

        /* =========================
           TEAMS
        ========================= */

        const teamsSnap =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams"
                )
            );


        console.log(
            "🔥 TEAMS:",
            teamsSnap.size
        );


        if (teamCount) {

            teamCount.textContent =
                teamsSnap.size;

        }


        /* =========================
           MATCHES
        ========================= */

        const matchesSnap =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "matches"
                )
            );


        console.log(
            "🔥 MATCHES:",
            matchesSnap.size
        );


        if (matchCount) {

            matchCount.textContent =
                matchesSnap.size;

        }


        /* =========================
           PLAYERS
        ========================= */

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


        /* =========================
           LIVE
        ========================= */

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


/* =========================
   SET ALL LINKS
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

}


/* =========================
   START
========================= */

loadTournament();