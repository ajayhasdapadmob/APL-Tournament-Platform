import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const pointsHeader =
    document.getElementById("pointsHeader");

const pointsBody =
    document.getElementById("pointsBody");

const tournamentLink =
    document.getElementById("tournamentLink");

const teamsLink =
    document.getElementById("teamsLink");

const scheduleLink =
    document.getElementById("scheduleLink");

const resultsLink =
    document.getElementById("resultsLink");

const liveScoreLink =
    document.getElementById("liveScoreLink");


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


/* =========================
   CHECK ID
========================= */

if (!tournamentId) {

    pointsHeader.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Points Table
                from a tournament.
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

    pointsBody.innerHTML = "";

    throw new Error(
        "Tournament ID Missing"
    );
}


/* =========================
   SAVE ID
========================= */

localStorage.setItem(
    "tournamentId",
    tournamentId
);

localStorage.setItem(
    "selectedTournamentId",
    tournamentId
);


/* =========================
   NAVIGATION
========================= */

tournamentLink.href =
    "tournament.html?id=" +
    encodeURIComponent(tournamentId);

teamsLink.href =
    "teams.html?id=" +
    encodeURIComponent(tournamentId);

scheduleLink.href =
    "schedule.html?id=" +
    encodeURIComponent(tournamentId);

resultsLink.href =
    "results.html?id=" +
    encodeURIComponent(tournamentId);

liveScoreLink.href =
    "live-score.html?id=" +
    encodeURIComponent(tournamentId);


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    const tournamentSnap =
        await getDoc(
            doc(
                db,
                "tournaments",
                tournamentId
            )
        );

    if (!tournamentSnap.exists()) {

        pointsHeader.innerHTML = `

            <div class="empty">

                <h2>
                    ❌ Tournament Not Found
                </h2>

                <p>

                    Tournament ID:
                    <b>${tournamentId}</b>

                </p>

            </div>

        `;

        return false;
    }

    const tournament =
        tournamentSnap.data();

    pointsHeader.innerHTML = `

        <h2>

            🏆
            ${
                tournament.tournamentName ||
                "Tournament"
            }

        </h2>

        <p>

            📍
            <b>Venue:</b>

            ${
                tournament.venue ||
                "-"
            }

        </p>

        <div class="id-box">

            🆔
            <b>Tournament ID:</b>

            ${tournamentId}

        </div>

    `;

    return true;
}


/* =========================
   LOAD TEAMS
========================= */

async function loadTeams() {

    const teamsSnapshot =
        await getDocs(
            collection(
                db,
                "tournaments",
                tournamentId,
                "teams"
            )
        );

    const teams = {};

    teamsSnapshot.forEach(
        teamDoc => {

            const data =
                teamDoc.data();

            const name =
                data.teamName ||
                data.name ||
                teamDoc.id;

            teams[name] = {

                teamName:
                    name,

                played: 0,

                won: 0,

                lost: 0,

                noResult: 0,

                points: 0,

                runsFor: 0,

                runsAgainst: 0

            };

        }
    );

    return teams;
}


/* =========================
   NUMBER HELPER
========================= */

function getRuns(score) {

    if (!score) {
        return 0;
    }

    const text =
        String(score);

    const match =
        text.match(
            /(\d+)\s*(?:\/\s*\d+)?/
        );

    if (!match) {
        return 0;
    }

    return Number(
        match[1]
    ) || 0;
}


/* =========================
   LOAD MATCHES
========================= */

async function loadPoints() {

    try {

        const teams =
            await loadTeams();

        const matchesSnapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "matches"
                )
            );


        matchesSnapshot.forEach(
            matchDoc => {

                const match =
                    matchDoc.data();

                const teamA =
                    match.teamA;

                const teamB =
                    match.teamB;

                if (
                    !teamA ||
                    !teamB
                ) {
                    return;
                }


                /* =====================
                   CREATE TEAM IF MISSING
                ===================== */

                if (!teams[teamA]) {

                    teams[teamA] = {

                        teamName:
                            teamA,

                        played: 0,

                        won: 0,

                        lost: 0,

                        noResult: 0,

                        points: 0,

                        runsFor: 0,

                        runsAgainst: 0

                    };

                }


                if (!teams[teamB]) {

                    teams[teamB] = {

                        teamName:
                            teamB,

                        played: 0,

                        won: 0,

                        lost: 0,

                        noResult: 0,

                        points: 0,

                        runsFor: 0,

                        runsAgainst: 0

                    };

                }


                const status =
                    String(
                        match.status ||
                        ""
                    ).toLowerCase();


                const winner =
                    match.winner ||
                    "";


                /* =====================
                   ONLY COMPLETED MATCH
                ===================== */

                if (
                    status !==
                    "completed"
                ) {
                    return;
                }


                teams[teamA].played++;

                teams[teamB].played++;


                const scoreA =
                    getRuns(
                        match.scoreA
                    );

                const scoreB =
                    getRuns(
                        match.scoreB
                    );


                teams[teamA].runsFor +=
                    scoreA;

                teams[teamA].runsAgainst +=
                    scoreB;

                teams[teamB].runsFor +=
                    scoreB;

                teams[teamB].runsAgainst +=
                    scoreA;


                /* =====================
                   DRAW
                ===================== */

                if (
                    winner === "Draw"
                ) {

                    teams[teamA].noResult++;

                    teams[teamB].noResult++;

                    teams[teamA].points += 1;

                    teams[teamB].points += 1;

                    return;
                }


                /* =====================
                   WINNER
                ===================== */

                if (
                    winner === teamA
                ) {

                    teams[teamA].won++;

                    teams[teamA].points += 2;

                    teams[teamB].lost++;

                }


                else if (
                    winner === teamB
                ) {

                    teams[teamB].won++;

                    teams[teamB].points += 2;

                    teams[teamA].lost++;

                }

            }
        );


        /* =========================
           CALCULATE NRR
        ========================= */

        Object.values(
            teams
        ).forEach(
            team => {

                const forRuns =
                    team.runsFor;

                const againstRuns =
                    team.runsAgainst;

                if (
                    forRuns === 0 &&
                    againstRuns === 0
                ) {

                    team.nrr = 0;

                    return;

                }

                team.nrr =
                    forRuns -
                    againstRuns;

            }
        );


        /* =========================
           SORT
        ========================= */

        const teamArray =
            Object.values(
                teams
            );

        teamArray.sort(
            (a, b) => {

                if (
                    b.points !==
                    a.points
                ) {

                    return (
                        b.points -
                        a.points
                    );

                }


                if (
                    b.nrr !==
                    a.nrr
                ) {

                    return (
                        b.nrr -
                        a.nrr
                    );

                }


                return (
                    b.won -
                    a.won
                );

            }
        );


        /* =========================
           DISPLAY
        ========================= */

        pointsBody.innerHTML = "";


        if (
            teamArray.length === 0
        ) {

            pointsBody.innerHTML = `

                <tr>

                    <td colspan="8">

                        👥 No teams found.

                    </td>

                </tr>

            `;

            return;

        }


        teamArray.forEach(
            (team, index) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <b>
                            ${team.teamName}
                        </b>
                    </td>

                    <td>
                        ${team.played}
                    </td>

                    <td>
                        ${team.won}
                    </td>

                    <td>
                        ${team.lost}
                    </td>

                    <td>
                        ${team.noResult}
                    </td>

                    <td>
                        <b>
                            ${team.points}
                        </b>
                    </td>

                    <td>
                        ${team.nrr.toFixed(2)}
                    </td>

                `;


                pointsBody.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "Points Error:",
            error
        );


        pointsBody.innerHTML = `

            <tr>

                <td colspan="8">

                    ❌
                    ${error.message}

                </td>

            </tr>

        `;

    }
}


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        try {

            const loaded =
                await loadTournament();

            if (loaded) {

                await loadPoints();

            }

        } catch (error) {

            console.error(
                error
            );

        }

    }
);