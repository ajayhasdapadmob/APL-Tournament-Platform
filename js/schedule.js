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


console.log("🔥 SCHEDULE JS STARTED");


// ========================================
// HTML ELEMENTS
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


    if (!id) {

        id =
            params.get("tournamentId");

    }


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
        "🏆 FINAL TOURNAMENT ID:",
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
        "💾 Tournament ID saved:",
        cleanId
    );

}


// ========================================
// GLOBAL TOURNAMENT ID
// ========================================

let tournamentId =
    getTournamentId();


// ========================================
// LOAD TOURNAMENT DROPDOWN
// ========================================

async function loadTournamentDropdown() {

    console.log(
        "🏆 Loading tournament dropdown..."
    );


    if (!tournamentSelect) {

        console.warn(
            "⚠️ tournamentSelect not found"
        );

        return;

    }


    try {

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
            "📦 Tournaments found:",
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
                tournamentDoc => {

                    return {

                        id:
                            tournamentDoc.id,

                        ...tournamentDoc.data()

                    };

                }
            );


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

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournament.id;


                option.textContent =
                    tournament.tournamentName ||
                    tournament.name ||
                    tournament.title ||
                    "Unnamed Tournament";


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        if (tournamentId) {

            const exists =
                tournaments.some(
                    tournament =>
                        tournament.id ===
                        tournamentId
                );


            if (exists) {

                tournamentSelect.value =
                    tournamentId;

            }

        }


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
            "❌ TOURNAMENT DROPDOWN ERROR:",
            error
        );


        tournamentSelect.innerHTML = `
            <option value="">
                ❌ Unable to load tournaments
            </option>
        `;

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


            if (!selectedId) {

                return;

            }


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


        saveTournamentId(
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
                "Tournament not found: " +
                tournamentId
            );

        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "✅ Tournament loaded:",
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


        setupLinks();


        await loadMatches();


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

                ❌ Unable to load tournament.

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            `;

        }

    }

}


// ========================================
// LOAD MATCHES
// ========================================

async function loadMatches() {

    if (!tournamentId) {

        return;

    }


    try {

        console.log(
            "🔥 LOAD MATCHES STARTED"
        );

        console.log(
            "🏆 Tournament:",
            tournamentId
        );


        const matchesRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "matches"
            );


        console.log(
            "📂 Firebase path:",
            `tournaments/${tournamentId}/matches`
        );


        const snapshot =
            await getDocs(
                matchesRef
            );


        console.log(
            "📦 Matches found:",
            snapshot.size
        );


        if (!matchListElement) {

            return;

        }


        matchListElement.innerHTML =
            "";


        if (snapshot.empty) {

            matchListElement.className =
                "empty";


            matchListElement.innerHTML = `

                <h3>
                    📅 No Matches Found
                </h3>

                <p>
                    Is tournament ke andar
                    abhi koi match create nahi hua.
                </p>

                <br>

                <b>
                    Tournament ID:
                </b>

                <br>

                ${escapeHTML(
                    tournamentId
                )}

                <br><br>

                <small>
                    Firestore path:
                    <br>
                    tournaments /
                    ${escapeHTML(tournamentId)} /
                    matches
                </small>

            `;


            console.warn(
                "⚠️ NO MATCHES FOUND"
            );


            return;

        }


        matchListElement.className =
            "match-list";


        const matches =
            snapshot.docs.map(
                matchDoc => {

                    return {

                        id:
                            matchDoc.id,

                        ...matchDoc.data()

                    };

                }
            );


        matches.sort(
            (a, b) => {

                const aNo =
                    Number(
                        a.matchNumber ??
                        a.matchNo ??
                        a.number ??
                        999999
                    );


                const bNo =
                    Number(
                        b.matchNumber ??
                        b.matchNo ??
                        b.number ??
                        999999
                    );


                return aNo - bNo;

            }
        );


        matches.forEach(
            (match, index) => {

                displayMatch(
                    match,
                    index
                );

            }
        );


        console.log(
            "✅ ALL MATCHES DISPLAYED:",
            matches.length
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

                ${escapeHTML(
                    error.message
                )}

            `;

        }

    }

}


// ========================================
// DISPLAY MATCH
// ========================================

function displayMatch(
    match,
    index
) {

    const matchNumber =
        match.matchNumber ??
        match.matchNo ??
        match.number ??
        index + 1;


    const team1 =
        match.team1Name ||
        match.team1 ||
        match.homeTeam ||
        match.teamA ||
        "Team 1";


    const team2 =
        match.team2Name ||
        match.team2 ||
        match.awayTeam ||
        match.teamB ||
        "Team 2";


    const date =
        match.date ||
        match.matchDate ||
        "-";


    const time =
        match.time ||
        match.matchTime ||
        "-";


    const venue =
        match.venue ||
        "-";


    const status =
        match.status ||
        "Scheduled";


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "match-card";


    const scorecardURL =
        `scorecard.html?tournamentId=${encodeURIComponent(tournamentId)}&matchId=${encodeURIComponent(match.id)}`;


    const liveURL =
        `live-score.html?id=${encodeURIComponent(tournamentId)}&matchId=${encodeURIComponent(match.id)}`;


    card.innerHTML = `

        <h3>
            🏏 Match
            ${escapeHTML(
                matchNumber
            )}
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

            ${escapeHTML(venue)}

        </p>


        <span class="match-status">

            ${escapeHTML(status)}

        </span>


        <div
            style="
                margin-top:15px;
                display:flex;
                gap:10px;
                flex-wrap:wrap;
            "
        >

            <a
                href="${scorecardURL}"
                class="btn"
            >
                📊 Scorecard
            </a>


            <a
                href="${liveURL}"
                class="btn"
            >
                🔴 Live Score
            </a>

        </div>

    `;


    matchListElement.appendChild(
        card
    );


    console.log(
        "🔗 Scorecard:",
        scorecardURL
    );

}


// ========================================
// NAVIGATION LINKS
// ========================================

function setupLinks() {

    if (!tournamentId) {

        return;

    }


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


    console.log(
        "🔗 Navigation links ready"
    );

}


// ========================================
// NO TOURNAMENT
// ========================================

function showNoTournament() {

    console.error(
        "❌ NO TOURNAMENT SELECTED"
    );


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

            <br><br>

            Please select a tournament
            from the dropdown.

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
        "🚀 Starting SCHEDULE..."
    );


    try {

        console.log(
            "🔥 Firebase DB:",
            db
        );


        await loadTournamentDropdown();


        if (tournamentId) {

            await loadSchedule();

        } else {

            showNoTournament();

        }


        console.log(
            "🏁 SCHEDULE START FINISHED"
        );


    } catch (error) {

        console.error(
            "❌ SCHEDULE START ERROR:",
            error
        );

    }

}


init();