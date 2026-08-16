// ========================================
// POINTS.JS - PART 1/3
// APL TOURNAMENT PLATFORM
// POINTS + NRR + OVERS/BALLS
// ========================================

import { db } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("🔥 POINTS.JS STARTED");


// ========================================
// HTML ELEMENTS
// ========================================

const tournamentSelect =
    document.getElementById("tournamentSelect");

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


// ========================================
// GET TOURNAMENT ID
// ========================================

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const id =
        params.get("id") ||
        params.get("tournamentId") ||
        localStorage.getItem("selectedTournamentId") ||
        localStorage.getItem("tournamentId") ||
        sessionStorage.getItem("selectedTournamentId") ||
        sessionStorage.getItem("tournamentId");

    return id
        ? String(id).trim()
        : null;
}


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(id) {

    if (!id) {
        return;
    }

    localStorage.setItem(
        "selectedTournamentId",
        id
    );

    localStorage.setItem(
        "tournamentId",
        id
    );

    sessionStorage.setItem(
        "selectedTournamentId",
        id
    );

    sessionStorage.setItem(
        "tournamentId",
        id
    );
}


// ========================================
// LOAD ALL TOURNAMENTS
// ========================================

async function loadTournaments() {

    console.log(
        "🏆 Loading ALL tournaments..."
    );

    if (!tournamentSelect) {

        console.error(
            "❌ tournamentSelect not found."
        );

        return;
    }

    try {

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
            "🏆 TOURNAMENT COUNT:",
            snapshot.size
        );

        tournamentSelect.innerHTML = "";


        if (snapshot.empty) {

            tournamentSelect.innerHTML = `
                <option value="">
                    ❌ No Tournament Found
                </option>
            `;

            if (pointsHeader) {

                pointsHeader.innerHTML = `
                    <h2>
                        ❌ No Tournament Found
                    </h2>
                `;
            }

            return;
        }


        // ====================================
        // ADD TOURNAMENTS
        // ====================================

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
                    tournamentDoc.id;

                tournamentSelect.appendChild(
                    option
                );

            }
        );


        // ====================================
        // SELECT TOURNAMENT
        // ====================================

        let selectedId =
            getTournamentId();

        const exists =
            Array.from(
                tournamentSelect.options
            ).some(
                option =>
                    option.value === selectedId
            );

        if (!exists) {

            selectedId =
                tournamentSelect
                    .options[0]
                    .value;
        }

        tournamentSelect.value =
            selectedId;

        saveTournamentId(
            selectedId
        );

        console.log(
            "🏆 SELECTED TOURNAMENT:",
            selectedId
        );

        await loadTournament(
            selectedId
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );

        tournamentSelect.innerHTML = `
            <option value="">
                ❌ Loading Error
            </option>
        `;

        if (pointsHeader) {

            pointsHeader.innerHTML = `
                <h2>
                    ❌ Error
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>
            `;
        }
    }
}


// ========================================
// LOAD SELECTED TOURNAMENT
// ========================================

async function loadTournament(id) {

    if (!id) {
        return;
    }

    console.log(
        "🏆 Loading tournament:",
        id
    );

    try {

        const tournamentRef =
            doc(
                db,
                "tournaments",
                id
            );

        const tournamentSnap =
            await getDoc(
                tournamentRef
            );

        if (!tournamentSnap.exists()) {

            if (pointsHeader) {

                pointsHeader.innerHTML = `
                    <h2>
                        ❌ Tournament Not Found
                    </h2>
                `;
            }

            return;
        }

        const tournament =
            tournamentSnap.data();

        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";

        const venue =
            tournament.venue ||
            tournament.location ||
            "-";

        const teams =
            tournament.totalTeams ??
            tournament.teamCount ??
            0;


        // ====================================
        // TOURNAMENT INFORMATION
        // ====================================

        if (pointsHeader) {

            pointsHeader.innerHTML = `

                <h2>
                    🏆 ${escapeHTML(name)}
                </h2>

                <p>
                    📍 <b>Venue:</b>
                    ${escapeHTML(venue)}
                </p>

                <p>
                    👥 <b>Teams:</b>
                    ${escapeHTML(teams)}
                </p>

                <div class="id-box">

                    🆔
                    <b>Tournament ID:</b>
                    ${escapeHTML(id)}

                </div>

            `;
        }


        saveTournamentId(id);


        // ====================================
        // NAVIGATION LINKS
        // ====================================

        const query =
            "?id=" +
            encodeURIComponent(id);

        if (tournamentLink) {

            tournamentLink.href =
                "tournament.html" +
                query;
        }

        if (teamsLink) {

            teamsLink.href =
                "teams.html" +
                query;
        }

        if (scheduleLink) {

            scheduleLink.href =
                "schedule.html" +
                query;
        }

        if (resultsLink) {

            resultsLink.href =
                "results.html" +
                query;
        }

        if (liveScoreLink) {

            liveScoreLink.href =
                "live-score.html" +
                query;
        }


        // ====================================
        // LOAD POINTS TABLE
        // ====================================

        await loadPointsTable(id);


    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );

        if (pointsHeader) {

            pointsHeader.innerHTML = `
                <h2>
                    ❌ Error
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>
            `;
        }
    }
}


// ========================================
// LOAD POINTS TABLE
// ========================================

async function loadPointsTable(id) {

    console.log(
        "📊 Loading points table:",
        id
    );

    if (!pointsBody) {

        console.error(
            "❌ pointsBody not found."
        );

        return;
    }

    pointsBody.innerHTML = `
        <tr>
            <td colspan="8">
                ⏳ Loading...
            </td>
        </tr>
    `;

    try {

        // ====================================
        // LOAD TEAMS
        // ====================================

        const teamsRef =
            collection(
                db,
                "tournaments",
                id,
                "teams"
            );

        const teamsSnapshot =
            await getDocs(
                teamsRef
            );

        console.log(
            "👥 TEAM COUNT:",
            teamsSnapshot.size
        );

        const teamMap =
            new Map();


        teamsSnapshot.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();

                const teamName =
                    team.teamName ||
                    team.name ||
                    team.team ||
                    teamDoc.id;

                teamMap.set(
                    teamDoc.id,
                    {

                        id:
                            teamDoc.id,

                        name:
                            teamName,

                        played:
                            0,

                        won:
                            0,

                        lost:
                            0,

                        nr:
                            0,

                        points:
                            0,

                        runsFor:
                            0,

                        runsAgainst:
                            0,

                        oversFor:
                            0,

                        oversAgainst:
                            0,

                        nrr:
                            0

                    }
                );

            }
        );


        // ====================================
        // LOAD MATCHES
        // ====================================

        const matchesRef =
            collection(
                db,
                "tournaments",
                id,
                "matches"
            );

        const matchesSnapshot =
            await getDocs(
                matchesRef
            );

        console.log(
            "🏏 MATCH COUNT:",
            matchesSnapshot.size
        );


        // ====================================
        // PROCESS MATCHES
        // ====================================

        matchesSnapshot.forEach(
            matchDoc => {

                const match =
                    matchDoc.data();

                processMatch(
                    match,
                    teamMap
                );

            }
        );


        // ====================================
        // CALCULATE NRR
        // ====================================

        teamMap.forEach(
            team => {

                team.nrr =
                    calculateNRR(
                        team
                    );

            }
        );


        // ====================================
        // DISPLAY
        // ====================================

        displayPointsTable(
            teamMap
        );


    } catch (error) {

        console.error(
            "❌ POINTS TABLE ERROR:",
            error
        );

        pointsBody.innerHTML = `

            <tr>

                <td colspan="8">

                    ❌ Unable to load points table.

                    <br><br>

                    ${escapeHTML(
                        error.message ||
                        error
                    )}

                </td>

            </tr>

        `;
    }
}


// ========================================
// PROCESS MATCH
// ========================================

function processMatch(match, teamMap) {

    const status =
        String(
            match.status || ""
        ).toLowerCase();

    const result =
        String(
            match.result || ""
        ).trim();


    // ====================================
    // COMPLETED MATCH ONLY
    // ====================================

    if (
        status !== "completed" &&
        !result
    ) {
        return;
    }


    // ====================================
    // TEAM NAMES
    // ====================================

    const teamA =
        match.teamA ||
        match.team1 ||
        match.team1Name ||
        match.homeTeam ||
        "";

    const teamB =
        match.teamB ||
        match.team2 ||
        match.team2Name ||
        match.awayTeam ||
        "";


    if (!teamA || !teamB) {

        console.warn(
            "⚠️ Team name missing:",
            match
        );

        return;
    }


    // ====================================
    // FIND TEAMS
    // ====================================

    const teamAData =
        findTeam(
            teamMap,
            teamA
        );

    const teamBData =
        findTeam(
            teamMap,
            teamB
        );


    if (
        !teamAData ||
        !teamBData
    ) {

        console.warn(
            "⚠️ Teams not found:",
            teamA,
            teamB
        );

        return;
    }


    // ====================================
    // SCORE
    // ====================================

    const scoreA =
        match.scoreA ||
        "0/0";

    const scoreB =
        match.scoreB ||
        "0/0";

    const runsA =
        getRunsFromScore(
            scoreA
        );

    const runsB =
        getRunsFromScore(
            scoreB
        );


    // ====================================
    // OVERS
    // ====================================

    const oversA =
        getOversFromMatch(
            match,
            "A"
        );

    const oversB =
        getOversFromMatch(
            match,
            "B"
        );


    console.log(
        "🏏 MATCH DATA:",
        {
            teamA,
            teamB,
            scoreA,
            scoreB,
            runsA,
            runsB,
            oversA,
            oversB
        }
    );


    console.log(
        "🔎 FULL FIREBASE MATCH:",
        match
    );


    // ====================================
    // PLAYED
    // ====================================

    teamAData.played++;
    teamBData.played++;


    // ====================================
    // RUNS
    // ====================================

    teamAData.runsFor += runsA;
    teamAData.runsAgainst += runsB;

    teamBData.runsFor += runsB;
    teamBData.runsAgainst += runsA;


    // ====================================
    // OVERS
    // ====================================

    teamAData.oversFor += oversA;
    teamAData.oversAgainst += oversB;

    teamBData.oversFor += oversB;
    teamBData.oversAgainst += oversA;


    // ====================================
    // RESULT
    // ====================================

    const resultLower =
        result.toLowerCase();


    // ====================================
    // NO RESULT
    // ====================================

    if (
        resultLower.includes("no result") ||
        resultLower === "nr"
    ) {

        teamAData.nr++;
        teamBData.nr++;

        teamAData.points += 1;
        teamBData.points += 1;

        return;
    }


    // ====================================
    // TIE / DRAW
    // ====================================

    if (
        resultLower.includes("tie") ||
        resultLower.includes("draw")
    ) {

        teamAData.points += 1;
        teamBData.points += 1;

        return;
    }


    // ====================================
    // WINNER
    // ====================================

    const winner =
        String(
            match.winner || ""
        )
        .trim()
        .toLowerCase();

    const teamALower =
        String(teamA)
        .trim()
        .toLowerCase();

    const teamBLower =
        String(teamB)
        .trim()
        .toLowerCase();


    if (
        winner &&
        winner === teamALower
    ) {

        teamAData.won++;
        teamAData.points += 2;
        teamBData.lost++;

        return;
    }


    if (
        winner &&
        winner === teamBLower
    ) {

        teamBData.won++;
        teamBData.points += 2;
        teamAData.lost++;

        return;
    }


    // ====================================
    // RESULT TEXT FALLBACK
    // ====================================

    if (
        resultLower.includes(
            teamALower
        )
    ) {

        teamAData.won++;
        teamAData.points += 2;
        teamBData.lost++;

        return;
    }


    if (
        resultLower.includes(
            teamBLower
        )
    ) {

        teamBData.won++;
        teamBData.points += 2;
        teamAData.lost++;

        return;
    }


    console.warn(
        "⚠️ Winner could not be identified:",
        {
            teamA,
            teamB,
            winner,
            result
        }
    );
}


// ========================================
// GET RUNS FROM SCORE
// ========================================

function getRunsFromScore(score) {

    if (
        score === null ||
        score === undefined
    ) {
        return 0;
    }

    const text =
        String(score).trim();

    const runs =
        parseInt(
            text.split("/")[0],
            10
        );

    return Number.isFinite(runs)
        ? runs
        : 0;
}

// ========================================
// POINTS.JS - PART 2/3
// OVERS / BALLS / NRR
// ========================================


// ========================================
// GET OVERS FROM MATCH
// ========================================

function getOversFromMatch(
    match,
    side
) {

    const isA =
        side === "A";


    // ====================================
    // DIRECT OVERS FIELDS
    // ====================================

    const directOvers = isA
        ? (
            match.oversA ??
            match.teamAOvers ??
            match.innings1Overs ??
            match.overs1 ??
            match.firstInningsOvers
        )
        : (
            match.oversB ??
            match.teamBOvers ??
            match.innings2Overs ??
            match.overs2 ??
            match.secondInningsOvers
        );


    if (
        directOvers !== undefined &&
        directOvers !== null &&
        directOvers !== ""
    ) {

        return convertOversValue(
            directOvers
        );
    }


    // ====================================
    // DIRECT BALLS FIELDS
    // ====================================

    const balls = isA
        ? (
            match.ballsA ??
            match.teamABalls ??
            match.innings1Balls ??
            match.balls1 ??
            match.firstInningsBalls
        )
        : (
            match.ballsB ??
            match.teamBBalls ??
            match.innings2Balls ??
            match.balls2 ??
            match.secondInningsBalls
        );


    if (
        balls !== undefined &&
        balls !== null &&
        balls !== ""
    ) {

        return ballsToOvers(
            balls
        );
    }


    // ====================================
    // INNINGS OBJECT
    // ====================================

    const innings = isA
        ? (
            match.innings1 ??
            match.firstInnings
        )
        : (
            match.innings2 ??
            match.secondInnings
        );


    if (
        innings &&
        typeof innings === "object"
    ) {

        if (
            innings.overs !== undefined &&
            innings.overs !== null
        ) {

            return convertOversValue(
                innings.overs
            );
        }


        if (
            innings.balls !== undefined &&
            innings.balls !== null
        ) {

            return ballsToOvers(
                innings.balls
            );
        }
    }


    // ====================================
    // SCORECARD FALLBACK
    // ====================================

    if (
        match.scorecard &&
        typeof match.scorecard === "object"
    ) {

        const scorecard =
            match.scorecard;


        const scorecardOvers = isA
            ? (
                scorecard.oversA ??
                scorecard.teamAOvers ??
                scorecard.innings1Overs
            )
            : (
                scorecard.oversB ??
                scorecard.teamBOvers ??
                scorecard.innings2Overs
            );


        if (
            scorecardOvers !== undefined &&
            scorecardOvers !== null
        ) {

            return convertOversValue(
                scorecardOvers
            );
        }


        const scorecardBalls = isA
            ? (
                scorecard.ballsA ??
                scorecard.teamABalls ??
                scorecard.innings1Balls
            )
            : (
                scorecard.ballsB ??
                scorecard.teamBBalls ??
                scorecard.innings2Balls
            );


        if (
            scorecardBalls !== undefined &&
            scorecardBalls !== null
        ) {

            return ballsToOvers(
                scorecardBalls
            );
        }
    }


    // ====================================
    // NOTHING FOUND
    // ====================================

    console.warn(
        "⚠️ Overs/Balls not found:",
        {
            side,
            match
        }
    );


    return 0;
}


// ========================================
// CONVERT OVERS VALUE
// ========================================
//
// Cricket:
// 1.0 = 1 over
// 1.1 = 1 over + 1 ball
// 1.2 = 1 over + 2 balls
// 1.5 = 1 over + 5 balls
//
// IMPORTANT:
// 1.2 is NOT 1.2 decimal overs.
// It means 8 balls.
// ========================================

function convertOversValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;
    }


    const text =
        String(value).trim();


    // ====================================
    // CRICKET OVER FORMAT
    // ====================================

    if (
        text.includes(".")
    ) {

        const parts =
            text.split(".");


        const completedOvers =
            parseInt(
                parts[0],
                10
            ) || 0;


        const balls =
            parseInt(
                parts[1],
                10
            ) || 0;


        // Safety
        if (
            balls >= 6
        ) {

            const extraOvers =
                Math.floor(
                    balls / 6
                );

            const remainingBalls =
                balls % 6;


            return (
                completedOvers +
                extraOvers +
                remainingBalls / 6
            );
        }


        return (
            completedOvers +
            balls / 6
        );
    }


    return (
        parseFloat(text) || 0
    );
}


// ========================================
// BALLS → OVERS
// ========================================
//
// 6 balls = 1 over
// 7 balls = 1 over + 1 ball
// 8 balls = 1 over + 2 balls
// 12 balls = 2 overs
// ========================================

function ballsToOvers(
    balls
) {

    const totalBalls =
        Number(balls) || 0;


    if (
        totalBalls <= 0
    ) {

        return 0;
    }


    const completedOvers =
        Math.floor(
            totalBalls / 6
        );


    const remainingBalls =
        totalBalls % 6;


    return (
        completedOvers +
        remainingBalls / 6
    );
}


// ========================================
// FORMAT OVERS FOR DISPLAY
// ========================================
//
// Internal calculation uses decimal
// equivalent of balls.
//
// Example:
// 8 balls → 1.2
// 11 balls → 1.5
//
// ========================================

function formatOvers(
    overs
) {

    if (
        !Number.isFinite(
            Number(overs)
        )
    ) {

        return "0.0";
    }


    const totalBalls =
        Math.round(
            Number(overs) * 6
        );


    const completedOvers =
        Math.floor(
            totalBalls / 6
        );


    const balls =
        totalBalls % 6;


    return (
        completedOvers +
        "." +
        balls
    );
}


// ========================================
// CALCULATE NRR
// ========================================

function calculateNRR(
    team
) {

    if (
        team.oversFor <= 0 ||
        team.oversAgainst <= 0
    ) {

        return 0;
    }


    const runRateFor =
        team.runsFor /
        team.oversFor;


    const runRateAgainst =
        team.runsAgainst /
        team.oversAgainst;


    const nrr =
        runRateFor -
        runRateAgainst;


    return Number(
        nrr.toFixed(3)
    );
}


// ========================================
// FIND TEAM
// ========================================

function findTeam(
    teamMap,
    name
) {

    if (!name) {
        return null;
    }


    const search =
        String(name)
        .trim()
        .toLowerCase();


    for (
        const team
        of teamMap.values()
    ) {

        if (
            String(team.name)
            .trim()
            .toLowerCase() === search
        ) {

            return team;
        }
    }


    return null;
}
// ========================================
// POINTS.JS - PART 3/3
// DISPLAY + DROPDOWN + START
// ========================================


// ========================================
// DISPLAY POINTS TABLE
// ========================================

function displayPointsTable(
    teamMap
) {

    if (!pointsBody) {

        console.error(
            "❌ pointsBody not found."
        );

        return;
    }


    // ====================================
    // MAP → ARRAY
    // ====================================

    const teams =
        Array.from(
            teamMap.values()
        );


    // ====================================
    // SORT
    // ====================================
    // 1. Points
    // 2. NRR
    // 3. Wins
    // ====================================

    teams.sort(
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


    // ====================================
    // EMPTY
    // ====================================

    if (
        teams.length === 0
    ) {

        pointsBody.innerHTML = `

            <tr>

                <td colspan="10">

                    ❌ No teams found.

                </td>

            </tr>

        `;

        return;
    }


    // ====================================
    // BODY CLEAR
    // ====================================

    pointsBody.innerHTML = "";


    // ====================================
    // CREATE ROWS
    // ====================================

    teams.forEach(
        (team, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <b>
                        ${index + 1}
                    </b>
                </td>


                <td>
                    <b>
                        ${escapeHTML(
                            team.name
                        )}
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
                    ${team.nr}
                </td>


                <td>
    ${
        team.nrr >= 0
            ? "+"
            : ""
    }${team.nrr.toFixed(3)}
</td>

<td>
    <b>
        ${team.points}
    </b>
</td>

<td>
    ${formatOvers(team.oversFor)}
</td>

<td>
    ${formatOvers(team.oversAgainst)}
</td>

            `;


            pointsBody.appendChild(
                row
            );

        }
    );


    // ====================================
    // CONSOLE
    // ====================================

    console.log(
        "✅ POINTS TABLE DISPLAYED"
    );


    console.table(

        teams.map(
            team => ({

                Team:
                    team.name,

                Played:
                    team.played,

                Won:
                    team.won,

                Lost:
                    team.lost,

                NR:
                    team.nr,

                OversFor:
                    formatOvers(
                        team.oversFor
                    ),

                OversAgainst:
                    formatOvers(
                        team.oversAgainst
                    ),

                NRR:
                    team.nrr,

                Points:
                    team.points

            })
        )

    );
}


// ========================================
// TOURNAMENT DROPDOWN CHANGE
// ========================================

if (
    tournamentSelect
) {

    tournamentSelect.addEventListener(
        "change",
        async function () {

            const id =
                this.value;


            if (!id) {
                return;
            }


            console.log(
                "🔄 TOURNAMENT CHANGED:",
                id
            );


            saveTournamentId(
                id
            );


            await loadTournament(
                id
            );

        }
    );
}


// ========================================
// SAFE HTML
// ========================================

function escapeHTML(
    value
) {

    return String(
        value
    )

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
// START APPLICATION
// ========================================

loadTournaments();


console.log(
    "🚀 POINTS TABLE READY"
);
