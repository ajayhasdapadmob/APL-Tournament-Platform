// ========================================
// DASHBOARD.JS
// APL TOURNAMENT PLATFORM
// ========================================

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 DASHBOARD JS LOADED");


// ========================================
// ELEMENTS
// ========================================

const organizerName =
    document.getElementById("organizerName");

const tournamentSelector =
    document.getElementById("tournamentSelector");

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


// ========================================
// LINKS
// ========================================

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


// ========================================
// GET TOURNAMENT ID
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    let id =
        params.get("id");


    // URL

    if (!id) {

        id =
            localStorage.getItem(
                "selectedTournamentId"
            );

    }


    // LocalStorage

    if (!id) {

        id =
            localStorage.getItem(
                "tournamentId"
            );

    }


    // SessionStorage

    if (!id) {

        id =
            sessionStorage.getItem(
                "selectedTournamentId"
            );

    }


    if (!id) {

        id =
            sessionStorage.getItem(
                "tournamentId"
            );

    }


    if (id) {

        id =
            String(id).trim();

    }


    console.log(
        "🏆 DASHBOARD TOURNAMENT ID:",
        id
    );


    return id || null;

}


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(id) {

    if (!id) return;


    const cleanId =
        String(id).trim();


    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    localStorage.setItem(
        "tournamentId",
        cleanId
    );


    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );


    console.log(
        "💾 Tournament ID SAVED:",
        cleanId
    );

}


// ========================================
// URL
// ========================================

function makeTournamentURL(
    page,
    id
) {

    return (
        `${page}?id=` +
        encodeURIComponent(id)
    );

}


// ========================================
// SET LINK
// ========================================

function setLink(
    element,
    page,
    id
) {

    if (!element) return;


    if (!id) {

        element.href = "#";

        return;

    }


    element.href =
        makeTournamentURL(
            page,
            id
        );

}


// ========================================
// SET ALL LINKS
// ========================================

function setupLinks(id) {

    if (!id) return;


    console.log(
        "🔗 Setting links for:",
        id
    );


    setLink(
        teamsLink,
        "teams.html",
        id
    );


    setLink(
        registrationLink,
        "registration.html",
        id
    );


    setLink(
        registerButton,
        "registration.html",
        id
    );


    setLink(
        scheduleLink,
        "schedule.html",
        id
    );


    setLink(
        bottomScheduleLink,
        "schedule.html",
        id
    );


    setLink(
        liveLink,
        "live-score.html",
        id
    );


    setLink(
        resultsLink,
        "results.html",
        id
    );


    setLink(
        pointsLink,
        "points.html",
        id
    );


    setLink(
        statsLink,
        "player-stats.html",
        id
    );


    setLink(
        bottomStatsLink,
        "player-stats.html",
        id
    );


    setLink(
        adminLink,
        "admin.html",
        id
    );


    setLink(
        orangeLink,
        "orange.html",
        id
    );


    setLink(
        purpleLink,
        "purple.html",
        id
    );


    console.log(
        "✅ ALL DASHBOARD LINKS READY"
    );

}


// ========================================
// LOAD ALL TOURNAMENTS
// ========================================

async function loadTournamentList() {

    if (!tournamentSelector) {
        console.error("❌ tournamentSelector not found");
        return;
    }

    try {

        console.log("🏆 Loading ALL tournaments...");

        tournamentSelector.innerHTML = `
            <option value="">
                Loading Tournaments...
            </option>
        `;

        const tournamentsRef =
            collection(db, "tournaments");

        const snapshot =
            await getDocs(tournamentsRef);

        console.log(
            "🏆 TOTAL TOURNAMENTS FOUND:",
            snapshot.size
        );

        tournamentSelector.innerHTML = "";

        if (snapshot.empty) {

            tournamentSelector.innerHTML = `
                <option value="">
                    No tournaments found
                </option>
            `;

            return;
        }

        const currentId =
            getTournamentId();

        let firstTournamentId = null;

        snapshot.forEach((tournamentDoc) => {

            const data =
                tournamentDoc.data();

            const id =
                tournamentDoc.id;

            const name =
                data.tournamentName ||
                data.name ||
                data.title ||
                "Unnamed Tournament";

            const status =
                data.status || "";

            if (!firstTournamentId) {
                firstTournamentId = id;
            }

            const option =
                document.createElement("option");

            option.value = id;

            option.textContent =
                status
                    ? `${name} (${status})`
                    : name;

            if (
                currentId &&
                currentId === id
            ) {
                option.selected = true;
            }

            tournamentSelector.appendChild(
                option
            );

        });

        let selectedId =
            tournamentSelector.value;

        if (!selectedId) {
            selectedId =
                firstTournamentId;
        }

        if (selectedId) {

            tournamentSelector.value =
                selectedId;

            saveTournamentId(
                selectedId
            );

            await loadTournament(
                selectedId
            );
        }

        console.log(
            "✅ DASHBOARD TOURNAMENTS:",
            tournamentSelector.options.length
        );

    } catch (error) {

        console.error(
            "❌ Tournament list error:",
            error
        );

        tournamentSelector.innerHTML = `
            <option value="">
                Error loading tournaments
            </option>
        `;
    }
}


// ========================================
// TOURNAMENT SELECT CHANGE
// ========================================

if (tournamentSelector) {

    tournamentSelector.addEventListener(
        "change",
        async function () {

            const id =
                this.value;


            console.log(
                "🏆 Tournament selected:",
                id
            );


            if (!id) {

                return;

            }


            // Save immediately

            saveTournamentId(
                id
            );


            // Update URL

            const newURL =
                `dashboard.html?id=${encodeURIComponent(id)}`;


            window.history.replaceState(
                {},
                "",
                newURL
            );


            // Load selected tournament

            await loadTournament(
                id
            );

        }
    );

}


// ========================================
// LOAD TEAM COUNT
// ========================================

async function loadTeamCount(id) {

    try {

        const teamsRef =
            collection(
                db,
                "tournaments",
                id,
                "teams"
            );


        const snapshot =
            await getDocs(
                teamsRef
            );


        if (teamCount) {

            teamCount.textContent =
                snapshot.size;

        }


        console.log(
            "👥 Teams:",
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


// ========================================
// LOAD MATCH COUNT
// ========================================

async function loadMatchCount(id) {

    try {

        const matchesRef =
            collection(
                db,
                "tournaments",
                id,
                "matches"
            );


        const snapshot =
            await getDocs(
                matchesRef
            );


        let live = 0;

        let completed = 0;


        snapshot.forEach(
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


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament(id) {

    if (!id) {

        console.warn(
            "⚠️ loadTournament called without ID"
        );

        return;

    }


    try {

        console.log(
            "🏆 Loading tournament:",
            id
        );


        const tournamentRef =
            doc(
                db,
                "tournaments",
                id
            );


        const snapshot =
            await getDoc(
                tournamentRef
            );


        if (!snapshot.exists()) {

            console.error(
                "❌ Tournament not found:",
                id
            );


            if (tournamentName) {

                tournamentName.textContent =
                    "Tournament Not Found";

            }


            if (tournamentIdElement) {

                tournamentIdElement.textContent =
                    id;

            }


            return;

        }


        const data =
            snapshot.data();


        console.log(
            "✅ Tournament Data:",
            data
        );


        const name =
            data.tournamentName ||
            data.name ||
            data.title ||
            "Tournament";


        const venue =
            data.venue ||
            data.location ||
            "-";


        // DISPLAY

        if (tournamentName) {

            tournamentName.textContent =
                name;

        }


        if (tournamentIdElement) {

            tournamentIdElement.textContent =
                id;

        }


        if (venueElement) {

            venueElement.textContent =
                venue;

        }


        // SAVE

        saveTournamentId(
            id
        );


        // LINKS

        setupLinks(
            id
        );


        // COUNTS

        await loadTeamCount(
            id
        );


        await loadMatchCount(
            id
        );


        // Make sure dropdown is selected

        if (tournamentSelector) {

            tournamentSelector.value =
                id;

        }


        console.log(
            "✅ DASHBOARD COMPLETELY LOADED"
        );


    } catch (error) {

        console.error(
            "❌ DASHBOARD ERROR:",
            error
        );

    }

}


// ========================================
// AUTH
// ========================================

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "👤 Logged User:",
            user
        );


        if (!user) {

            window.location.href =
                "./login.html";

            return;

        }


        // Organizer

        if (organizerName) {

            organizerName.textContent =
                user.displayName ||
                user.email?.split("@")[0] ||
                "Organizer";

        }


        // Load tournament dropdown

        await loadTournamentList();

    }
);


console.log(
    "✅ DASHBOARD JS READY"
);