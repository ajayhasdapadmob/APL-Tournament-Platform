import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 LIVE SCORE JS LOADED");


/* =========================
   ELEMENTS
========================= */

const tournamentInfo =
    document.getElementById(
        "tournamentInfo"
    );

const matchesList =
    document.getElementById(
        "matchesList"
    );

const tournamentLink =
    document.getElementById(
        "tournamentLink"
    );

const scheduleLink =
    document.getElementById(
        "scheduleLink"
    );

const resultsLink =
    document.getElementById(
        "resultsLink"
    );

const pointsLink =
    document.getElementById(
        "pointsLink"
    );

const tournamentSelector =
    document.getElementById(
        "tournamentSelector"
    );


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

let tournamentId =
    params.get("id");


if (!tournamentId) {

    tournamentId =
        params.get("tournamentId");

}


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


if (!tournamentId) {

    tournamentId =
        sessionStorage.getItem(
            "selectedTournamentId"
        );

}


if (!tournamentId) {

    tournamentId =
        sessionStorage.getItem(
            "tournamentId"
        );

}


if (tournamentId) {

    tournamentId =
        String(
            tournamentId
        ).trim();

}


console.log(
    "🔎 LIVE SCORE URL:",
    window.location.href
);

console.log(
    "🏆 LIVE SCORE TOURNAMENT ID:",
    tournamentId
);


/* =========================
   SAVE ID
========================= */

function saveTournamentId(id) {

    if (!id) return;

    const cleanId =
        String(id).trim();


    localStorage.setItem(
        "tournamentId",
        cleanId
    );

    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

}


/* =========================
   LOAD TOURNAMENT DROPDOWN
========================= */

async function loadTournamentSelector() {

    if (!tournamentSelector) {

        console.warn(
            "⚠️ tournamentSelector not found in HTML"
        );

        return;

    }


    try {

        tournamentSelector.innerHTML = `
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


        tournamentSelector.innerHTML = "";


        if (snapshot.empty) {

            tournamentSelector.innerHTML = `
                <option value="">
                    No tournaments found
                </option>
            `;

            return;

        }


        snapshot.forEach(
            tournamentDoc => {

                const data =
                    tournamentDoc.data();


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournamentDoc.id;


                option.textContent =
                    data.tournamentName ||
                    data.name ||
                    data.title ||
                    "Tournament";


                if (
                    tournamentDoc.id ===
                    tournamentId
                ) {

                    option.selected =
                        true;

                }


                tournamentSelector.appendChild(
                    option
                );

            }
        );


        console.log(
            "✅ Tournament dropdown loaded:",
            snapshot.size
        );


    } catch (error) {

        console.error(
            "❌ Tournament dropdown error:",
            error
        );


        tournamentSelector.innerHTML = `
            <option value="">
                ❌ Unable to load tournaments
            </option>
        `;

    }

}


/* =========================
   DROPDOWN CHANGE
========================= */

if (tournamentSelector) {

    tournamentSelector.addEventListener(
        "change",
        function () {

            const selectedId =
                this.value;


            if (!selectedId) {

                return;

            }


            console.log(
                "🏆 Tournament changed:",
                selectedId
            );


            saveTournamentId(
                selectedId
            );


            window.location.href =
                "live-score.html?id=" +
                encodeURIComponent(
                    selectedId
                );

        }
    );

}


/* =========================
   NO TOURNAMENT
========================= */

if (!tournamentId) {

    console.error(
        "❌ Tournament ID Missing"
    );


    if (tournamentInfo) {

        tournamentInfo.innerHTML = `

            <div class="empty">

                <h2>
                    ❌ Tournament ID Missing
                </h2>

                <p>
                    Please select a tournament.
                </p>

                <br>

                <a
                    href="my-tournaments.html"
                    class="btn"
                >
                    🏆 My Tournaments
                </a>

            </div>

        `;

    }


    if (matchesList) {

        matchesList.innerHTML = "";

    }


} else {


    /* SAVE */

    saveTournamentId(
        tournamentId
    );


    /* =========================
       NAVIGATION
    ========================= */

    const id =
        encodeURIComponent(
            tournamentId
        );


    if (tournamentLink) {

        tournamentLink.href =
            `tournament.html?id=${id}`;

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


    /* =========================
       LOAD
    ========================= */

    loadTournament();

}


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

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


        if (
            !tournamentSnap.exists()
        ) {

            if (tournamentInfo) {

                tournamentInfo.innerHTML = `

                    <div class="empty">

                        <h2>
                            ❌ Tournament Not Found
                        </h2>

                        <p>
                            Tournament ID:
                            <b>
                                ${escapeHTML(
                                    tournamentId
                                )}
                            </b>
                        </p>

                    </div>

                `;

            }

            return;

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


        if (tournamentInfo) {

            tournamentInfo.innerHTML = `

                <h2>
                    🏆
                    ${escapeHTML(name)}
                </h2>

                <div class="tournament-id">

                    🆔
                    <b>Tournament ID:</b>

                    ${escapeHTML(
                        tournamentId
                    )}

                </div>

                <p>

                    📍
                    <b>Venue:</b>

                    ${escapeHTML(
                        venue
                    )}

                </p>

                <span class="live-status">

                    🔴 LIVE SCORE

                </span>

            `;

        }


        await loadMatches();


        startAutoRefresh();


        console.log(
            "✅ LIVE SCORE PAGE READY"
        );


    } catch (error) {

        console.error(
            "❌ LIVE SCORE ERROR:",
            error
        );


        if (tournamentInfo) {

            tournamentInfo.innerHTML = `

                <div class="empty">

                    ❌
                    ${escapeHTML(
                        error.message
                    )}

                </div>

            `;

        }

    }

}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

    try {

        console.log(
            "🔄 Loading live matches..."
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


        if (!matchesList) {

            return;

        }


        matchesList.innerHTML = "";


        if (
            snapshot.empty
        ) {

            matchesList.innerHTML = `

                <div class="empty">

                    📅 No matches found.

                    <br><br>

                    Please create matches
                    from Schedule.

                </div>

            `;

            return;

        }


        const matches = [];


        snapshot.forEach(
            matchDoc => {

                matches.push({

                    id:
                        matchDoc.id,

                    ...matchDoc.data()

                });

            }
        );


        matches.sort(
            (a, b) => {

                const aNumber =
                    Number(
                        a.matchNumber ||
                        a.matchNo ||
                        999999
                    );


                const bNumber =
                    Number(
                        b.matchNumber ||
                        b.matchNo ||
                        999999
                    );


                return (
                    aNumber -
                    bNumber
                );

            }
        );


        matches.forEach(
            match => {

                displayMatch(
                    match
                );

            }
        );


        console.log(
            "✅ Matches loaded:",
            matches.length
        );


    } catch (error) {

        console.error(
            "❌ MATCH LOAD ERROR:",
            error
        );


        if (matchesList) {

            matchesList.innerHTML = `

                <div class="empty">

                    ❌
                    ${escapeHTML(
                        error.message
                    )}

                </div>

            `;

        }

    }

}


/* =========================
   DISPLAY MATCH
========================= */

function displayMatch(
    match
) {

    const teamA =
        match.teamA ||
        match.team1Name ||
        match.team1 ||
        match.homeTeam ||
        "Team A";


    const teamB =
        match.teamB ||
        match.team2Name ||
        match.team2 ||
        match.awayTeam ||
        "Team B";


    const scoreA =
        match.scoreA ??
        match.teamAScore ??
        match.score1 ??
        "-";


    const scoreB =
        match.scoreB ??
        match.teamBScore ??
        match.score2 ??
        "-";


    const status =
        String(
            match.status ||
            "Scheduled"
        ).trim();


    const lowerStatus =
        status.toLowerCase();


    let badge = "";


    if (
        lowerStatus === "live" ||
        lowerStatus === "ongoing" ||
        lowerStatus === "in_progress"
    ) {

        badge = `

            <span class="live-badge">

                🔴 LIVE

            </span>

        `;

    }

    else if (
        lowerStatus === "completed" ||
        lowerStatus === "finished" ||
        lowerStatus === "result"
    ) {

        badge = `

            <span class="completed-badge">

                ✅ COMPLETED

            </span>

        `;

    }

    else {

        badge = `

            <span class="scheduled-badge">

                📅 SCHEDULED

            </span>

        `;

    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "live-card";


    card.innerHTML = `

        <div class="match-number">

            🏏 Match
            ${escapeHTML(
                match.matchNumber ||
                match.matchNo ||
                "-"
            )}

            &nbsp;

            ${badge}

        </div>


        <div class="teams">


            <div class="team-score">

                <div>

                    ${escapeHTML(
                        teamA
                    )}

                </div>


                <div class="score">

                    ${escapeHTML(
                        String(scoreA)
                    )}

                </div>

            </div>


            <div class="vs">

                🆚

            </div>


            <div class="team-score">

                <div>

                    ${escapeHTML(
                        teamB
                    )}

                </div>


                <div class="score">

                    ${escapeHTML(
                        String(scoreB)
                    )}

                </div>

            </div>


        </div>


        <div class="match-info">

            📅
            ${escapeHTML(
                match.date ||
                match.matchDate ||
                "-"
            )}

            &nbsp;&nbsp;

            ⏰
            ${escapeHTML(
                match.time ||
                match.matchTime ||
                "-"
            )}

            <br><br>

            📍
            ${escapeHTML(
                match.venue ||
                "-"
            )}

        </div>


        ${
            match.winner
            ?
            `

                <div class="result">

                    🏆 Winner:
                    ${escapeHTML(
                        match.winner
                    )}

                    ${
                        match.result
                        ?
                        `<br>
                         ${escapeHTML(
                             match.result
                         )}`
                        :
                        ""
                    }

                </div>

            `
            :
            ""
        }

    `;


    matchesList.appendChild(
        card
    );

}


/* =========================
   AUTO REFRESH
========================= */

let refreshTimer =
    null;


function startAutoRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }


    refreshTimer =
        setInterval(
            function () {

                loadMatches();

            },
            10000
        );

}


/* =========================
   SAFE HTML
========================= */

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