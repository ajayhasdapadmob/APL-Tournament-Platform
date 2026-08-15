// ========================================
// SCHEDULE.JS
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 SCHEDULE JS LOADED");


// ========================================
// ELEMENTS
// ========================================

const tournamentSelect =
    document.getElementById("tournamentSelect");

const tournamentNameElement =
    document.getElementById("tournamentName");

const tournamentIdElement =
    document.getElementById("tournamentId");

const venueElement =
    document.getElementById("venue");

const matchListElement =
    document.getElementById("matchList");

const tournamentLink =
    document.getElementById("tournamentLink");

const resultsLink =
    document.getElementById("resultsLink");

const pointsLink =
    document.getElementById("pointsLink");

const liveLink =
    document.getElementById("liveLink");

const teamsLink =
    document.getElementById("teamsLink");


// ========================================
// GET INITIAL TOURNAMENT ID
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    let id =
        params.get("id");


    if (!id) {

        id =
            localStorage.getItem(
                "selectedTournamentId"
            );

    }


    if (!id) {

        id =
            localStorage.getItem(
                "tournamentId"
            );

    }


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
        "🔎 URL Tournament ID:",
        params.get("id")
    );

    console.log(
        "🏆 FINAL SCHEDULE TOURNAMENT ID:",
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
        "💾 Schedule Tournament ID saved:",
        cleanId
    );

}


// ========================================
// INITIAL ID
// ========================================

let tournamentId =
    getTournamentId();


// ========================================
// LOAD ALL TOURNAMENTS
// ========================================

async function loadTournamentDropdown() {

    try {

        console.log(
            "🏆 Loading tournaments for dropdown..."
        );


        if (!tournamentSelect) return;


        tournamentSelect.innerHTML = `
            <option value="">
                ⏳ Loading Tournaments...
            </option>
        `;


        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        const snapshot =
            await getDocs(
                tournamentsRef
            );


        console.log(
            "🏆 Total tournaments:",
            snapshot.size
        );


        tournamentSelect.innerHTML = "";


        if (snapshot.empty) {

            tournamentSelect.innerHTML = `
                <option value="">
                    No tournaments found
                </option>
            `;

            return;

        }


        const tournaments =
            snapshot.docs.map(
                tournamentDoc => ({

                    id:
                        tournamentDoc.id,

                    ...tournamentDoc.data()

                })
            );


        // Sort newest first if createdAt exists

        tournaments.sort(
            (a, b) => {

                const aTime =
                    a.createdAt?.seconds || 0;

                const bTime =
                    b.createdAt?.seconds || 0;

                return bTime - aTime;

            }
        );


        tournaments.forEach(
            tournament => {

                const name =
                    tournament.tournamentName ||
                    tournament.name ||
                    tournament.title ||
                    "Unnamed Tournament";


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournament.id;


                option.textContent =
                    name;


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        // =================================
        // SELECT CURRENT TOURNAMENT
        // =================================

        if (tournamentId) {

            const exists =
                tournaments.some(
                    tournament =>
                        tournament.id === tournamentId
                );


            if (exists) {

                tournamentSelect.value =
                    tournamentId;

            }

        }


        // If no current ID, select first

        if (
            !tournamentId &&
            tournaments.length > 0
        ) {

            tournamentId =
                tournaments[0].id;


            tournamentSelect.value =
                tournamentId;


            saveTournamentId(
                tournamentId
            );


            updateURL(
                tournamentId
            );

        }


        console.log(
            "✅ Tournament dropdown ready"
        );


    } catch (error) {

        console.error(
            "❌ Tournament dropdown error:",
            error
        );


        if (tournamentSelect) {

            tournamentSelect.innerHTML = `
                <option value="">
                    ❌ Unable to load tournaments
                </option>
            `;

        }

    }

}


// ========================================
// DROPDOWN CHANGE
// ========================================

if (tournamentSelect) {

    tournamentSelect.addEventListener(
        "change",
        async function () {

            const selectedId =
                this.value;


            if (!selectedId) return;


            console.log(
                "🔄 Tournament changed:",
                selectedId
            );


            tournamentId =
                selectedId;


            saveTournamentId(
                tournamentId
            );


            updateURL(
                tournamentId
            );


            await loadSchedule();

        }
    );

}


// ========================================
// UPDATE URL
// ========================================

function updateURL(id) {

    if (!id) return;


    const newURL =
        `${window.location.pathname}?id=${encodeURIComponent(id)}`;


    window.history.replaceState(
        {},
        "",
        newURL
    );


    console.log(
        "🔗 URL updated:",
        newURL
    );

}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadSchedule() {

    if (!tournamentId) {

        showNoTournament();

        return;

    }


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

            throw new Error(
                "Tournament not found."
            );

        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "✅ Tournament:",
            tournament
        );


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "-";


        if (tournamentNameElement) {

            tournamentNameElement.textContent =
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


        saveTournamentId(
            tournamentId
        );


        await loadMatches();


        setupLinks();


        console.log(
            "✅ SCHEDULE PAGE READY"
        );


    } catch (error) {

        console.error(
            "❌ SCHEDULE ERROR:",
            error
        );


        if (tournamentNameElement) {

            tournamentNameElement.textContent =
                "Tournament Error";

        }


        if (matchListElement) {

            matchListElement.className =
                "empty";

            matchListElement.innerHTML = `
                ❌ Unable to load schedule.
                <br><br>
                ${escapeHTML(error.message)}
            `;

        }

    }

}


// ========================================
// LOAD MATCHES
// ========================================

async function loadMatches() {

    try {

        console.log(
            "📅 Loading matches for:",
            tournamentId
        );


        const matchesRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "matches"
            );


        const snapshot =
            await getDocs(
                matchesRef
            );


        console.log(
            "📅 Matches:",
            snapshot.size
        );


        if (!matchListElement) return;


        if (snapshot.empty) {

            matchListElement.className =
                "empty";

            matchListElement.innerHTML = `
                📅 No matches scheduled yet.
            `;

            return;

        }


        matchListElement.className =
            "match-list";

        matchListElement.innerHTML =
            "";


        const matches =
            snapshot.docs.map(
                matchDoc => ({

                    id:
                        matchDoc.id,

                    ...matchDoc.data()

                })
            );


        matches.sort(
            (a, b) => {

                const aNo =
                    Number(
                        a.matchNumber ||
                        a.matchNo ||
                        a.number ||
                        999999
                    );


                const bNo =
                    Number(
                        b.matchNumber ||
                        b.matchNo ||
                        b.number ||
                        999999
                    );


                return aNo - bNo;

            }
        );


        matches.forEach(
            (match, index) => {

                const team1 =
                    match.team1Name ||
                    match.team1 ||
                    match.homeTeam ||
                    "Team 1";


                const team2 =
                    match.team2Name ||
                    match.team2 ||
                    match.awayTeam ||
                    "Team 2";


                const date =
                    match.date ||
                    match.matchDate ||
                    "Date not set";


                const time =
                    match.time ||
                    match.matchTime ||
                    "Time not set";


                const status =
                    match.status ||
                    "Scheduled";


                const matchNumber =
                    match.matchNumber ||
                    match.matchNo ||
                    index + 1;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "match-card";


                card.innerHTML = `

                    <h3>
                        🏏 Match
                        ${escapeHTML(matchNumber)}
                    </h3>

                    <p>

                        🏏

                        <b>
                            ${escapeHTML(team1)}
                        </b>

                        VS

                        <b>
                            ${escapeHTML(team2)}
                        </b>

                    </p>

                    <p>

                        📅
                        <b>Date:</b>

                        ${escapeHTML(date)}

                    </p>

                    <p>

                        ⏰
                        <b>Time:</b>

                        ${escapeHTML(time)}

                    </p>

                    <p>

                        📍
                        <b>Venue:</b>

                        ${escapeHTML(
                            match.venue ||
                            venueElement?.textContent ||
                            "-"
                        )}

                    </p>

                    <span class="match-status">

                        ${escapeHTML(status)}

                    </span>

                `;


                matchListElement.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ MATCH LOAD ERROR:",
            error
        );


        if (matchListElement) {

            matchListElement.className =
                "empty";

            matchListElement.innerHTML = `
                ❌ Unable to load matches.
                <br><br>
                ${escapeHTML(error.message)}
            `;

        }

    }

}


// ========================================
// LINKS
// ========================================

function setupLinks() {

    if (!tournamentId) return;


    const id =
        encodeURIComponent(
            tournamentId
        );


    if (tournamentLink) {

        tournamentLink.href =
            `tournament.html?id=${id}`;

    }


    if (resultsLink) {

        resultsLink.href =
            `results.html?id=${id}`;

    }


    if (pointsLink) {

        pointsLink.href =
            `points.html?id=${id}`;

    }


    if (liveLink) {

        liveLink.href =
            `live-score.html?id=${id}`;

    }


    if (teamsLink) {

        teamsLink.href =
            `teams.html?id=${id}`;

    }


    console.log(
        "🔗 Schedule links ready"
    );

}


// ========================================
// NO TOURNAMENT
// ========================================

function showNoTournament() {

    if (tournamentNameElement) {

        tournamentNameElement.textContent =
            "No Tournament Selected";

    }


    if (tournamentIdElement) {

        tournamentIdElement.textContent =
            "-";

    }


    if (venueElement) {

        venueElement.textContent =
            "-";

    }


    if (matchListElement) {

        matchListElement.className =
            "empty";

        matchListElement.innerHTML = `
            ❌ No tournament selected.
        `;

    }

}


// ========================================
// SAFE HTML
// ========================================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ========================================
// START
// ========================================

async function init() {

    console.log(
        "🚀 Starting Schedule..."
    );


    await loadTournamentDropdown();


    if (tournamentId) {

        await loadSchedule();

    } else {

        showNoTournament();

    }

}


init();