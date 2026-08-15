import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================
   ELEMENTS
========================================= */

const organizerName =
    document.getElementById("organizerName");

const tournamentName =
    document.getElementById("dashboardTournamentName");

const tournamentIdElement =
    document.getElementById("dashboardTournamentId");

const venueElement =
    document.getElementById("dashboardVenue");

const teamCount =
    document.getElementById("teamCount");

const matchCount =
    document.getElementById("matchCount");

const liveCount =
    document.getElementById("liveCount");

const completedCount =
    document.getElementById("completedCount");


/* =========================================
   DASHBOARD LINKS
========================================= */

const teamsLink =
    document.getElementById("teamsLink");

const registrationLink =
    document.getElementById("registrationLink");

const scheduleLink =
    document.getElementById("scheduleLink");

const liveLink =
    document.getElementById("liveLink");

const resultsLink =
    document.getElementById("resultsLink");

const pointsLink =
    document.getElementById("pointsLink");

const statsLink =
    document.getElementById("statsLink");

const adminLink =
    document.getElementById("adminLink");

const orangeLink =
    document.getElementById("orangeLink");

const purpleLink =
    document.getElementById("purpleLink");

const registerButton =
    document.getElementById("registerButton");

const bottomScheduleLink =
    document.getElementById("bottomScheduleLink");

const bottomStatsLink =
    document.getElementById("bottomStatsLink");


/* =========================================
   LINK HELPER
========================================= */

function setLink(element, page, tournamentId) {

    if (!element) return;

    if (!tournamentId) {

        element.href = "#";

        return;
    }


    element.href =
        `./${page}?id=${encodeURIComponent(tournamentId)}`;


    console.log(
        "🔗 Link:",
        element.id,
        element.href
    );
}


/* =========================================
   SET ALL LINKS
========================================= */

function setupTournamentLinks(tournamentId) {

    console.log(
        "🔗 Setting tournament links:",
        tournamentId
    );


    /* =====================================
       TEAMS
    ===================================== */

    setLink(
        teamsLink,
        "teams.html",
        tournamentId
    );


    /* =====================================
       REGISTRATION
    ===================================== */

    setLink(
        registrationLink,
        "registration.html",
        tournamentId
    );

    setLink(
        registerButton,
        "registration.html",
        tournamentId
    );


    /* =====================================
       SCHEDULE
    ===================================== */

    setLink(
        scheduleLink,
        "schedule.html",
        tournamentId
    );

    setLink(
        bottomScheduleLink,
        "schedule.html",
        tournamentId
    );


    /* =====================================
       LIVE SCORE
    ===================================== */

    setLink(
        liveLink,
        "live-score.html",
        tournamentId
    );


    /* =====================================
       RESULTS
    ===================================== */

    setLink(
        resultsLink,
        "results.html",
        tournamentId
    );


    /* =====================================
       POINTS TABLE
    ===================================== */

    setLink(
        pointsLink,
        "points.html",
        tournamentId
    );


    /* =====================================
       PLAYER STATS
    ===================================== */

    setLink(
        statsLink,
        "player-stats.html",
        tournamentId
    );

    setLink(
        bottomStatsLink,
        "player-stats.html",
        tournamentId
    );


    /* =====================================
       ADMIN
    ===================================== */

    setLink(
        adminLink,
        "admin.html",
        tournamentId
    );


    /* =====================================
       ORANGE CAP
    ===================================== */

    setLink(
        orangeLink,
        "orange.html",
        tournamentId
    );


    /* =====================================
       PURPLE CAP
    ===================================== */

    setLink(
        purpleLink,
        "purple.html",
        tournamentId
    );


    console.log(
        "✅ All dashboard links ready"
    );
}


/* =========================================
   LOAD TEAM COUNT
========================================= */

async function loadTeamCount(tournamentId) {

    try {

        const teamsRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "teams"
            );


        const snapshot =
            await getDocs(teamsRef);


        if (teamCount) {

            teamCount.textContent =
                snapshot.size;
        }


        console.log(
            "👥 Registered Teams:",
            snapshot.size
        );


    } catch (error) {

        console.error(
            "❌ Team count error:",
            error
        );


        if (teamCount) {

            teamCount.textContent =
                "0";
        }
    }
}


/* =========================================
   LOAD MATCH COUNT
========================================= */

async function loadMatchCount(tournamentId) {

    try {

        const matchesRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "matches"
            );


        const snapshot =
            await getDocs(matchesRef);


        let live = 0;

        let completed = 0;


        snapshot.forEach(
            (matchDoc) => {

                const match =
                    matchDoc.data();


                const status =
                    String(
                        match.status || ""
                    ).toLowerCase();


                if (
                    status === "live" ||
                    status === "ongoing" ||
                    status === "in_progress"
                ) {

                    live++;
                }


                if (
                    status === "completed" ||
                    status === "finished" ||
                    status === "result"
                ) {

                    completed++;
                }

            }
        );


        if (matchCount) {

            matchCount.textContent =
                snapshot.size;
        }


        if (liveCount) {

            liveCount.textContent =
                live;
        }


        if (completedCount) {

            completedCount.textContent =
                completed;
        }


        console.log(
            "📅 Matches:",
            snapshot.size
        );

        console.log(
            "🔴 Live:",
            live
        );

        console.log(
            "🏆 Completed:",
            completed
        );


    } catch (error) {

        console.error(
            "❌ Match count error:",
            error
        );


        if (matchCount) {

            matchCount.textContent =
                "0";
        }

        if (liveCount) {

            liveCount.textContent =
                "0";
        }

        if (completedCount) {

            completedCount.textContent =
                "0";
        }
    }
}


/* =========================================
   LOAD TOURNAMENT
========================================= */

async function loadTournament(tournamentId) {

    try {

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

            console.error(
                "❌ Tournament not found:",
                tournamentId
            );


            if (tournamentName) {

                tournamentName.textContent =
                    "Tournament Not Found";
            }


            if (tournamentIdElement) {

                tournamentIdElement.textContent =
                    tournamentId;
            }


            return;
        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "✅ Tournament Data:",
            tournament
        );


        /* =====================================
           NAME
        ===================================== */

        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        /* =====================================
           VENUE
        ===================================== */

        const venue =
            tournament.venue ||
            tournament.location ||
            "Not Set";


        /* =====================================
           DISPLAY
        ===================================== */

        if (tournamentName) {

            tournamentName.textContent =
                name;
        }


        if (tournamentIdElement) {

            tournamentIdElement.textContent =
                tournamentId;
        }


        if (venueElement) {

            venueElement.textContent =
                venue;
        }


        /* =====================================
           ORGANIZER
        ===================================== */

        if (organizerName) {

            const currentText =
                organizerName.textContent;


            organizerName.textContent =
                tournament.organizerName ||
                tournament.organizer ||
                currentText ||
                "Organizer";
        }


        /* =====================================
           SAVE TO LOCAL STORAGE
        ===================================== */

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );

        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );


        /* =====================================
           LINKS
        ===================================== */

        setupTournamentLinks(
            tournamentId
        );


        /* =====================================
           COUNTS
        ===================================== */

        await loadTeamCount(
            tournamentId
        );

        await loadMatchCount(
            tournamentId
        );


        console.log(
            "✅ Dashboard completely loaded"
        );


    } catch (error) {

        console.error(
            "❌ Dashboard tournament error:",
            error
        );

    }
}


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "👤 Logged user:",
            user
        );


        /* =====================================
           LOGIN CHECK
        ===================================== */

        if (!user) {

            window.location.href =
                "./login.html";

            return;
        }


        /* =====================================
           ORGANIZER NAME
        ===================================== */

        if (organizerName) {

            organizerName.textContent =
                user.displayName ||
                user.email?.split("@")[0] ||
                "Organizer";
        }


        /* =====================================
           GET TOURNAMENT ID
        ===================================== */

        let tournamentId =
            localStorage.getItem(
                "selectedTournamentId"
            );


        if (!tournamentId) {

            tournamentId =
                localStorage.getItem(
                    "tournamentId"
                );
        }


        /* =====================================
           NO TOURNAMENT
        ===================================== */

        if (!tournamentId) {

            console.log(
                "⚠️ No tournament selected"
            );


            if (tournamentName) {

                tournamentName.textContent =
                    "Select Tournament";
            }


            if (tournamentIdElement) {

                tournamentIdElement.textContent =
                    "-";
            }


            if (teamCount) {

                teamCount.textContent =
                    "0";
            }


            if (matchCount) {

                matchCount.textContent =
                    "0";
            }


            return;
        }


        /* =====================================
           LOAD
        ===================================== */

        await loadTournament(
            tournamentId
        );

    }
);