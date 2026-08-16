// ========================================
// SCORECARD.JS - FINAL
// APL TOURNAMENT PLATFORM
// LIVE CRICKET SCORING
// ========================================

import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("🔥 SCORECARD JS STARTED");


// ========================================
// HTML ELEMENTS
// ========================================

const matchInfo =
    document.getElementById("matchInfo");

const scoreElement =
    document.getElementById("score");

const battingTeamElement =
    document.getElementById("battingTeam");

const oversElement =
    document.getElementById("overs");

const crrElement =
    document.getElementById("crr");

const startSecondInningsBtn =
    document.getElementById("startSecondInningsBtn");

const nextMatchBtn =
    document.getElementById("nextMatchBtn");


// ========================================
// IDS
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


function getMatchId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const id =
        params.get("matchId") ||
        params.get("match") ||
        localStorage.getItem("selectedMatchId") ||
        localStorage.getItem("matchId") ||
        sessionStorage.getItem("selectedMatchId") ||
        sessionStorage.getItem("matchId");

    return id
        ? String(id).trim()
        : null;
}


let tournamentId =
    getTournamentId();

let matchId =
    getMatchId();

let currentTournament = null;

let currentMatch = null;


// ========================================
// SAVE IDS
// ========================================

function saveIds() {

    if (tournamentId) {

        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );

        sessionStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );

        sessionStorage.setItem(
            "tournamentId",
            tournamentId
        );
    }


    if (matchId) {

        localStorage.setItem(
            "selectedMatchId",
            matchId
        );

        localStorage.setItem(
            "matchId",
            matchId
        );

        sessionStorage.setItem(
            "selectedMatchId",
            matchId
        );

        sessionStorage.setItem(
            "matchId",
            matchId
        );
    }
}


// ========================================
// SCORE STATE
// ========================================

function createNewInnings(
    battingTeam
) {

    return {

        battingTeam:
            battingTeam,

        innings:
            battingTeam === "A"
                ? 1
                : 2,

        runs: 0,

        wickets: 0,

        balls: 0,

        currentOverRuns: [],

        striker: {
            name: "Striker",
            runs: 0,
            balls: 0
        },

        nonStriker: {
            name: "Non-Striker",
            runs: 0,
            balls: 0
        },

        bowler: {
            name: "Bowler",
            balls: 0,
            runs: 0,
            wickets: 0
        },

        history: [],

        status: "Live"
    };
}


let scoreState =
    createNewInnings("A");


// ========================================
// HELPERS
// ========================================

function team1Name() {

    return (
        currentMatch?.team1Name ||
        currentMatch?.teamA ||
        currentMatch?.homeTeam ||
        "Team A"
    );
}


function team2Name() {

    return (
        currentMatch?.team2Name ||
        currentMatch?.teamB ||
        currentMatch?.awayTeam ||
        "Team B"
    );
}


function getOversFromBalls(balls) {

    const b =
        Number(balls) || 0;

    return (
        Math.floor(b / 6) +
        "." +
        (b % 6)
    );
}


function parseScore(score) {

    const text =
        String(
            score || "0/0"
        );

    const parts =
        text.split("/");

    return {

        runs:
            Number(parts[0]) || 0,

        wickets:
            Number(parts[1]) || 0
    };
}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament() {

    if (!tournamentId) {

        throw new Error(
            "Tournament ID missing."
        );
    }

    const tournamentRef =
        doc(
            db,
            "tournaments",
            tournamentId
        );

    const snapshot =
        await getDoc(
            tournamentRef
        );

    if (!snapshot.exists()) {

        throw new Error(
            "Tournament not found."
        );
    }

    currentTournament =
        snapshot.data();

    console.log(
        "🏆 TOURNAMENT LOADED:",
        currentTournament
    );
}


// ========================================
// FIND FIRST MATCH
// ========================================

async function findFirstMatch() {

    const matchesRef =
        collection(
            db,
            "tournaments",
            tournamentId,
            "matches"
        );

    const snapshot =
        await getDocs(matchesRef);

    if (snapshot.empty) {

        throw new Error(
            "No matches found."
        );
    }

    const matches =
        snapshot.docs.map(
            item => ({
                id: item.id,
                ...item.data()
            })
        );

    matches.sort(
        (a, b) =>
            Number(
                a.matchNumber ??
                a.matchNo ??
                999999
            ) -
            Number(
                b.matchNumber ??
                b.matchNo ??
                999999
            )
    );

    matchId =
        matches[0].id;

    saveIds();

    return matches[0];
}


// ========================================
// LOAD MATCH
// ========================================

async function loadMatch() {

    if (!tournamentId) {

        throw new Error(
            "Tournament ID missing."
        );
    }


    if (!matchId) {

        currentMatch =
            await findFirstMatch();

        console.log(
            "🏏 FIRST MATCH:",
            currentMatch
        );

        return;
    }


    const matchRef =
        doc(
            db,
            "tournaments",
            tournamentId,
            "matches",
            matchId
        );

    const snapshot =
        await getDoc(matchRef);


    if (!snapshot.exists()) {

        currentMatch =
            await findFirstMatch();

        return;
    }


    currentMatch = {

        id:
            snapshot.id,

        ...snapshot.data()
    };


    console.log(
        "🏏 MATCH LOADED:",
        currentMatch
    );
}


// ========================================
// LOAD SAVED SCORE
// ========================================

function loadSavedScore() {

    if (!currentMatch) {
        return;
    }


    const saved =
        currentMatch.scorecard;


    if (!saved) {

        scoreState =
            createNewInnings("A");

        return;
    }


    scoreState = {

        battingTeam:
            saved.battingTeam ||
            "A",

        innings:
            Number(
                saved.innings || 1
            ),

        runs:
            Number(
                saved.runs || 0
            ),

        wickets:
            Number(
                saved.wickets || 0
            ),

        balls:
            Number(
                saved.balls || 0
            ),

        currentOverRuns:
            Array.isArray(
                saved.currentOverRuns
            )
                ? saved.currentOverRuns
                : [],

        striker:
            saved.striker || {
                name: "Striker",
                runs: 0,
                balls: 0
            },

        nonStriker:
            saved.nonStriker || {
                name: "Non-Striker",
                runs: 0,
                balls: 0
            },

        bowler:
            saved.bowler || {
                name: "Bowler",
                balls: 0,
                runs: 0,
                wickets: 0
            },

        history: [],

        status:
            saved.status ||
            currentMatch.status ||
            "Live"
    };


    console.log(
        "☁️ SAVED SCORE LOADED:",
        scoreState
    );
}


// ========================================
// DISPLAY MATCH
// ========================================

function displayMatch() {

    if (!currentMatch) {
        return;
    }


    const tournamentName =
        currentTournament?.tournamentName ||
        currentTournament?.name ||
        currentTournament?.title ||
        "Tournament";


    if (matchInfo) {

        matchInfo.innerHTML = `

            <h2>
                🏆 ${escapeHTML(
                    tournamentName
                )}
            </h2>

            <p>
                🏏 Match
                <b>
                    ${escapeHTML(
                        currentMatch.matchNumber ||
                        currentMatch.matchNo ||
                        "-"
                    )}
                </b>
            </p>

            <h3>
                ${escapeHTML(
                    team1Name()
                )}
                VS
                ${escapeHTML(
                    team2Name()
                )}
            </h3>

            <p>
                📅
                ${escapeHTML(
                    currentMatch.date ||
                    currentMatch.matchDate ||
                    "-"
                )}
            </p>

            <p>
                ⏰
                ${escapeHTML(
                    currentMatch.time ||
                    currentMatch.matchTime ||
                    "-"
                )}
            </p>

            <p>
                📍
                ${escapeHTML(
                    currentMatch.venue ||
                    currentTournament?.venue ||
                    "-"
                )}
            </p>

            <p>
                🆔 Match:
                ${escapeHTML(matchId)}
            </p>

        `;
    }


    renderScore();

    updateSecondInningsButton();

    updateNextMatchButton();
}


// ========================================
// RENDER SCORE
// ========================================

function renderScore() {

    if (!scoreElement) {
        return;
    }


    const scoreText =
        `${scoreState.runs}/${scoreState.wickets}`;


    const oversText =
        getOversFromBalls(
            scoreState.balls
        );


    const crr =
        scoreState.balls > 0
            ? (
                scoreState.runs /
                (
                    scoreState.balls / 6
                )
            ).toFixed(2)
            : "0.00";


    let scoreA =
        currentMatch?.scoreA ||
        "0/0";


    let scoreB =
        currentMatch?.scoreB ||
        "0/0";


    if (
        scoreState.battingTeam === "A"
    ) {

        scoreA =
            scoreText;

    } else {

        scoreB =
            scoreText;
    }


    scoreElement.innerHTML = `

        <div style="
            display:flex;
            justify-content:space-around;
            align-items:center;
            gap:10px;
            width:100%;
        ">

            <div>

                <h2>
                    ${escapeHTML(
                        team1Name()
                    )}
                </h2>

                <div class="big-score">
                    ${escapeHTML(
                        scoreA
                    )}
                </div>

            </div>


            <div>
                <strong>VS</strong>
            </div>


            <div>

                <h2>
                    ${escapeHTML(
                        team2Name()
                    )}
                </h2>

                <div class="big-score">
                    ${escapeHTML(
                        scoreB
                    )}
                </div>

            </div>

        </div>


        <div style="
            width:100%;
            text-align:center;
            margin-top:12px;
            font-weight:bold;
        ">

            ${oversText} Overs

            <br>

            CRR: ${crr}

            <br>

            <span style="
                display:inline-block;
                margin-top:8px;
                padding:5px 10px;
                border-radius:20px;
                background:${
                    scoreState.status === "Completed"
                        ? "#16a34a"
                        : "#ef4444"
                };
                color:white;
            ">

                ${
                    scoreState.status === "Completed"
                        ? "🟢 Completed"
                        : "🔴 LIVE"
                }

            </span>

        </div>
    `;


    if (battingTeamElement) {

        battingTeamElement.textContent =
            scoreState.battingTeam === "A"
                ? team1Name()
                : team2Name();
    }


    if (oversElement) {

        oversElement.textContent =
            `${oversText} Overs`;
    }


    if (crrElement) {

        crrElement.textContent =
            `CRR: ${crr}`;
    }


    updateBatters();

    updateBowler();

    updateCurrentOver();
}


// ========================================
// BATTERS
// ========================================

function updateBatters() {

    const striker =
        scoreState.striker ||
        {
            name: "Striker",
            runs: 0,
            balls: 0
        };


    const nonStriker =
        scoreState.nonStriker ||
        {
            name: "Non-Striker",
            runs: 0,
            balls: 0
        };


    const sr =
        striker.balls > 0
            ? (
                striker.runs /
                striker.balls *
                100
            ).toFixed(2)
            : "0.00";


    const nsr =
        nonStriker.balls > 0
            ? (
                nonStriker.runs /
                nonStriker.balls *
                100
            ).toFixed(2)
            : "0.00";


    const strikerName =
        document.getElementById(
            "strikerName"
        );

    const strikerRuns =
        document.getElementById(
            "strikerRuns"
        );

    const strikerBalls =
        document.getElementById(
            "strikerBalls"
        );

    const strikerSR =
        document.getElementById(
            "strikerSR"
        );


    const nonStrikerName =
        document.getElementById(
            "nonStrikerName"
        );

    const nonStrikerRuns =
        document.getElementById(
            "nonStrikerRuns"
        );

    const nonStrikerBalls =
        document.getElementById(
            "nonStrikerBalls"
        );

    const nonStrikerSR =
        document.getElementById(
            "nonStrikerSR"
        );


    if (strikerName)
        strikerName.textContent =
            striker.name;


    if (strikerRuns)
        strikerRuns.textContent =
            striker.runs;


    if (strikerBalls)
        strikerBalls.textContent =
            striker.balls;


    if (strikerSR)
        strikerSR.textContent =
            sr;


    if (nonStrikerName)
        nonStrikerName.textContent =
            nonStriker.name;


    if (nonStrikerRuns)
        nonStrikerRuns.textContent =
            nonStriker.runs;


    if (nonStrikerBalls)
        nonStrikerBalls.textContent =
            nonStriker.balls;


    if (nonStrikerSR)
        nonStrikerSR.textContent =
            nsr;


// Compatibility with existing HTML

    const oldStrikerRuns =
        document.getElementById(
            "strikerRuns"
        );

    if (oldStrikerRuns)
        oldStrikerRuns.textContent =
            striker.runs;


    const oldStrikerBalls =
        document.getElementById(
            "strikerBalls"
        );

    if (oldStrikerBalls)
        oldStrikerBalls.textContent =
            striker.balls;


    const oldStrikerSR =
        document.getElementById(
            "strikerSR"
        );

    if (oldStrikerSR)
        oldStrikerSR.textContent =
            sr;


    const oldNonRuns =
        document.getElementById(
            "nonStrikerRuns"
        );

    if (oldNonRuns)
        oldNonRuns.textContent =
            nonStriker.runs;


    const oldNonBalls =
        document.getElementById(
            "nonStrikerBalls"
        );

    if (oldNonBalls)
        oldNonBalls.textContent =
            nonStriker.balls;


    const oldNonSR =
        document.getElementById(
            "nonStrikerSR"
        );

    if (oldNonSR)
        oldNonSR.textContent =
            nsr;
}


// ========================================
// BOWLER
// ========================================

function updateBowler() {

    const bowler =
        scoreState.bowler ||
        {
            name: "Bowler",
            balls: 0,
            runs: 0,
            wickets: 0
        };


    const bowlerName =
        document.getElementById(
            "bowlerName"
        );

    const bowlerOvers =
        document.getElementById(
            "bowlerOvers"
        );

    const bowlerRuns =
        document.getElementById(
            "bowlerRuns"
        );

    const bowlerWickets =
        document.getElementById(
            "bowlerWickets"
        );


    if (bowlerName)
        bowlerName.textContent =
            bowler.name;


    if (bowlerOvers)
        bowlerOvers.textContent =
            getOversFromBalls(
                bowler.balls
            );


    if (bowlerRuns)
        bowlerRuns.textContent =
            bowler.runs;


    if (bowlerWickets)
        bowlerWickets.textContent =
            bowler.wickets;
}


// ========================================
// CURRENT OVER
// ========================================

function updateCurrentOver() {

    const currentOver =
        document.getElementById(
            "currentOver"
        );


    if (!currentOver) {
        return;
    }


    currentOver.innerHTML = "";


    const balls =
        scoreState.currentOverRuns ||
        [];


    if (!balls.length) {

        currentOver.innerHTML =
            `<div class="ball">-</div>`;

        return;
    }


    balls.forEach(
        value => {

            const ball =
                document.createElement(
                    "div"
                );

            ball.className =
                "ball";

            ball.textContent =
                value;

            currentOver.appendChild(
                ball
            );
        }
    );
}


// ========================================
// HISTORY
// ========================================

function saveHistory() {

    const copy =
        JSON.parse(
            JSON.stringify({
                ...scoreState,
                history: []
            })
        );


    scoreState.history.push(
        copy
    );


    if (
        scoreState.history.length > 30
    ) {

        scoreState.history.shift();
    }
}


// ========================================
// SAVE MATCH DATA
// ========================================

async function writeMatchData(
    statusOverride = null
) {

    if (
        !tournamentId ||
        !matchId ||
        !currentMatch
    ) {
        return;
    }


    const scoreA =
        scoreState.battingTeam === "A"
            ? `${scoreState.runs}/${scoreState.wickets}`
            : (
                currentMatch.scoreA ||
                "0/0"
            );


    const scoreB =
        scoreState.battingTeam === "B"
            ? `${scoreState.runs}/${scoreState.wickets}`
            : (
                currentMatch.scoreB ||
                "0/0"
            );


    const data = {

        scoreA: scoreA,

        scoreB: scoreB,

        scorecard: scoreState,

        innings:
            scoreState.innings,

        currentBall:
            scoreState.balls,

        status:
            statusOverride ||
            scoreState.status ||
            "Live",

        updatedAt:
            serverTimestamp()
    };


    await updateDoc(

        doc(
            db,
            "tournaments",
            tournamentId,
            "matches",
            matchId
        ),

        data
    );


    currentMatch.scoreA =
        scoreA;

    currentMatch.scoreB =
        scoreB;

    currentMatch.status =
        data.status;
}


// ========================================
// ADD RUNS
// ========================================

async function addRuns(
    runs
) {

    if (
        scoreState.status === "Completed"
    ) {

        alert(
            "This innings is completed."
        );

        return;
    }


    saveHistory();


    scoreState.runs +=
        Number(runs);


    scoreState.balls += 1;


    scoreState.striker.runs +=
        Number(runs);


    scoreState.striker.balls +=
        1;


    scoreState.bowler.runs +=
        Number(runs);


    scoreState.bowler.balls +=
        1;


    scoreState.currentOverRuns.push(
        String(runs)
    );


    if (
        Number(runs) % 2 === 1
    ) {

        swapBatters(false);
    }


    if (
        scoreState.balls % 6 === 0
    ) {

        scoreState.currentOverRuns =
            [];

        swapBatters(false);
    }


    renderScore();


    await autoSave();
}


// ========================================
// EXTRAS
// ========================================

async function addExtra(
    type,
    runs = 1
) {

    if (
        scoreState.status === "Completed"
    ) {

        alert(
            "This innings is completed."
        );

        return;
    }


    saveHistory();


    scoreState.runs +=
        Number(runs);


    if (
        type === "Wide"
    ) {

        scoreState.bowler.runs +=
            Number(runs);

        scoreState.currentOverRuns.push(
            `Wd+${runs}`
        );

    } else if (
        type === "No Ball"
    ) {

        scoreState.bowler.runs +=
            Number(runs);

        scoreState.currentOverRuns.push(
            `NB+${runs}`
        );

    } else {

        scoreState.currentOverRuns.push(
            `${type}+${runs}`
        );
    }


    renderScore();


    await autoSave();
}


// ========================================
// WICKET
// ========================================

async function addWicket() {

    if (
        scoreState.status === "Completed"
    ) {
        return;
    }


    saveHistory();


    scoreState.wickets += 1;

    scoreState.balls += 1;

    scoreState.striker.balls += 1;

    scoreState.bowler.balls += 1;

    scoreState.bowler.wickets += 1;


    scoreState.currentOverRuns.push(
        "W"
    );


    renderScore();


    await autoSave();
}


// ========================================
// SWAP BATTERS
// ========================================

function swapBatters(
    save = true
) {

    const temp =
        scoreState.striker;


    scoreState.striker =
        scoreState.nonStriker;


    scoreState.nonStriker =
        temp;


    renderScore();


    if (save) {

        autoSave();
    }
}


// ========================================
// UNDO
// ========================================

async function undoScore() {

    if (
        !scoreState.history.length
    ) {

        alert(
            "Nothing to undo."
        );

        return;
    }


    scoreState =
        scoreState.history.pop();


    scoreState.history =
        [];


    renderScore();


    await autoSave();
}


// ========================================
// AUTO SAVE
// ========================================

async function autoSave() {

    try {

        await writeMatchData();

        console.log(
            "☁️ AUTO SAVED"
        );

    } catch (error) {

        console.error(
            "⚠️ AUTO SAVE ERROR:",
            error
        );
    }
}


// ========================================
// MANUAL SAVE
// ========================================

async function saveScore() {

    try {

        await writeMatchData();

        alert(
            "✅ Score saved successfully!"
        );

    } catch (error) {

        console.error(
            "❌ SAVE ERROR:",
            error
        );

        alert(
            "❌ Save failed: " +
            (
                error?.message ||
                String(error)
            )
        );
    }
}


// ========================================
// START SECOND INNINGS
// ========================================

async function startSecondInnings() {

    if (!currentMatch) {

        alert(
            "❌ Match data missing."
        );

        return;
    }


    if (
        scoreState.innings === 2
    ) {

        alert(
            "2nd innings already started."
        );

        return;
    }


    const firstTeam =
        scoreState.battingTeam === "A"
            ? team1Name()
            : team2Name();


    const secondTeam =
        scoreState.battingTeam === "A"
            ? team2Name()
            : team1Name();


    const firstScore =
        `${scoreState.runs}/${scoreState.wickets}`;


    const ok =
        confirm(
            `${firstTeam} finished at ${firstScore}.\n\n` +
            `Start ${secondTeam} innings?`
        );


    if (!ok) {
        return;
    }


    // First innings data

    const firstInningsData = {

        firstInningsTeam:
            firstTeam,

        firstInningsScore:
            firstScore,

        firstInningsRuns:
            scoreState.runs,

        firstInningsWickets:
            scoreState.wickets,

        firstInningsBalls:
            scoreState.balls,

        firstInningsOvers:
            getOversFromBalls(
                scoreState.balls
            )
    };


    if (
        scoreState.battingTeam === "A"
    ) {

        currentMatch.scoreA =
            firstScore;

    } else {

        currentMatch.scoreB =
            firstScore;
    }


    // Second innings

    const secondBattingTeam =
        scoreState.battingTeam === "A"
            ? "B"
            : "A";


    scoreState =
        createNewInnings(
            secondBattingTeam
        );


    scoreState.innings =
        2;


    try {

        const updateData = {

            scoreA:
                secondBattingTeam === "B"
                    ? currentMatch.scoreA ||
                      firstScore
                    : "0/0",

            scoreB:
                secondBattingTeam === "A"
                    ? currentMatch.scoreB ||
                      firstScore
                    : "0/0",

            scorecard:
                scoreState,

            innings: 2,

            status: "Live",

            currentBall: 0,

            ...firstInningsData,

            secondInningsTeam:
                secondTeam,

            secondInningsScore:
                "0/0",

            secondInningsRuns:
                0,

            secondInningsWickets:
                0,

            secondInningsBalls:
                0,

            secondInningsOvers:
                "0.0",

            updatedAt:
                serverTimestamp()
        };


        await updateDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            ),

            updateData
        );


        currentMatch = {

            ...currentMatch,

            ...updateData
        };


        renderScore();

        updateSecondInningsButton();

        updateNextMatchButton();


        alert(
            `🔄 ${secondTeam} 2nd innings started!`
        );


    } catch (error) {

        console.error(
            "❌ SECOND INNINGS ERROR:",
            error
        );

        alert(
            "❌ Unable to start 2nd innings:\n" +
            (
                error?.message ||
                String(error)
            )
        );
    }
}


// ========================================
// END MATCH
// ========================================

async function endMatch() {

    if (!currentMatch) {

        alert(
            "❌ Match data missing."
        );

        return;
    }


    // -------------------------------
    // FIRST INNINGS
    // -------------------------------

    if (
        scoreState.innings === 1
    ) {

        scoreState.status =
            "Completed";


        await autoSave();


        renderScore();


        updateSecondInningsButton();


        alert(
            `✅ ${team1Name()} innings completed.\n\n` +
            `Now click "Start 2nd Innings".`
        );


        return;
    }


    // -------------------------------
    // SECOND INNINGS
    // -------------------------------

    const currentScore =
        `${scoreState.runs}/${scoreState.wickets}`;


    if (
        scoreState.battingTeam === "A"
    ) {

        currentMatch.scoreA =
            currentScore;

    } else {

        currentMatch.scoreB =
            currentScore;
    }


    const scoreA =
        currentMatch.scoreA ||
        "0/0";


    const scoreB =
        currentMatch.scoreB ||
        "0/0";


    const parsedA =
        parseScore(scoreA);


    const parsedB =
        parseScore(scoreB);


    let winner = "";

    let result = "";


    if (
        parsedA.runs >
        parsedB.runs
    ) {

        winner =
            team1Name();

        result =
            `${team1Name()} won by ` +
            `${parsedA.runs - parsedB.runs} runs`;

    } else if (
        parsedB.runs >
        parsedA.runs
    ) {

        winner =
            team2Name();

        result =
            `${team2Name()} won by ` +
            `${parsedB.runs - parsedA.runs} runs`;

    } else {

        winner =
            "Tie";

        result =
            "Match tied";
    }


    const ok =
        confirm(
            `🏆 MATCH RESULT\n\n` +

            `${team1Name()}: ${scoreA}\n` +

            `${team2Name()}: ${scoreB}\n\n` +

            `Winner: ${winner}\n` +

            `${result}\n\n` +

            `Complete this match?`
        );


    if (!ok) {
        return;
    }


    try {

        scoreState.status =
            "Completed";


        const updateData = {

            scoreA:
                scoreA,

            scoreB:
                scoreB,

            winner:
                winner,

            result:
                result,

            status:
                "Completed",

            innings:
                2,

            currentBall:
                scoreState.balls,

            secondInningsScore:
                currentScore,

            secondInningsRuns:
                scoreState.runs,

            secondInningsWickets:
                scoreState.wickets,

            secondInningsBalls:
                scoreState.balls,

            secondInningsOvers:
                getOversFromBalls(
                    scoreState.balls
                ),

            scorecard:
                {
                    ...scoreState,
                    status: "Completed"
                },

            updatedAt:
                serverTimestamp()
        };


        await updateDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            ),

            updateData
        );


        currentMatch = {

            ...currentMatch,

            ...updateData
        };


        renderScore();

        updateSecondInningsButton();

        updateNextMatchButton();


        alert(
            `🏆 MATCH COMPLETED!\n\n` +
            `Winner: ${winner}\n\n` +
            result
        );


        console.log(
            "✅ WINNER SAVED:",
            winner
        );


    } catch (error) {

        console.error(
            "❌ WINNER SAVE ERROR:",
            error
        );

        alert(
            "❌ Winner save failed:\n" +
            (
                error?.message ||
                String(error)
            )
        );
    }
}


// ========================================
// SECOND INNINGS BUTTON
// ========================================

function updateSecondInningsButton() {

    if (!startSecondInningsBtn) {
        return;
    }


    if (
        scoreState.innings === 1 &&
        scoreState.status === "Completed"
    ) {

        startSecondInningsBtn.style.display =
            "block";

        startSecondInningsBtn.disabled =
            false;

        startSecondInningsBtn.textContent =
            "🔄 Start 2nd Innings";

        return;
    }


    startSecondInningsBtn.style.display =
        "none";
}


// ========================================
// NEXT MATCH BUTTON
// ========================================

function updateNextMatchButton() {

    if (!nextMatchBtn) {
        return;
    }


    nextMatchBtn.disabled =
        false;

    nextMatchBtn.innerHTML =
        "🔄 Next Match";
}


// ========================================
// OPEN NEXT MATCH
// ========================================

async function openNextMatch() {

    if (!tournamentId) {

        alert(
            "❌ Tournament ID missing."
        );

        return;
    }


    const snapshot =
        await getDocs(
            collection(
                db,
                "tournaments",
                tournamentId,
                "matches"
            )
        );


    const matches =
        snapshot.docs.map(
            d => ({
                id: d.id,
                ...d.data()
            })
        );


    matches.sort(
        (a, b) =>
            Number(
                a.matchNumber ??
                a.matchNo ??
                999999
            ) -
            Number(
                b.matchNumber ??
                b.matchNo ??
                999999
            )
    );


    const index =
        matches.findIndex(
            item =>
                item.id === matchId
        );


    if (index < 0) {

        alert(
            "❌ Current match not found."
        );

        return;
    }


    const next =
        matches[index + 1];


    if (!next) {

        alert(
            "🏆 This is the last match."
        );

        return;
    }


    matchId =
        next.id;


    saveIds();


    window.location.href =
        "scorecard.html?id=" +
        encodeURIComponent(
            tournamentId
        ) +
        "&matchId=" +
        encodeURIComponent(
            matchId
        );
}


// ========================================
// BUTTON SETUP
// ========================================

function setupButtons() {

    // RUNS

    document
        .querySelectorAll(".run-btn")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await addRuns(
                            Number(
                                button.dataset.runs
                            )
                        );
                    }
                );
            }
        );


    // WIDE

    const wideBtn =
        document.getElementById(
            "wideBtn"
        );

    if (wideBtn) {

        wideBtn.addEventListener(
            "click",
            () =>
                addExtra(
                    "Wide",
                    1
                )
        );
    }


    // NO BALL

    const noBallBtn =
        document.getElementById(
            "noBallBtn"
        );

    if (noBallBtn) {

        noBallBtn.addEventListener(
            "click",
            () =>
                addExtra(
                    "No Ball",
                    1
                )
        );
    }


    // BYE

    const byeBtn =
        document.getElementById(
            "byeBtn"
        );

    if (byeBtn) {

        byeBtn.addEventListener(
            "click",
            () =>
                addExtra(
                    "Bye",
                    1
                )
        );
    }


    // LEG BYE

    const legByeBtn =
        document.getElementById(
            "legByeBtn"
        );

    if (legByeBtn) {

        legByeBtn.addEventListener(
            "click",
            () =>
                addExtra(
                    "Leg Bye",
                    1
                )
        );
    }


    // WICKET

    const wicketBtn =
        document.getElementById(
            "wicketBtn"
        );

    if (wicketBtn) {

        wicketBtn.addEventListener(
            "click",
            addWicket
        );
    }


    // UNDO

    const undoBtn =
        document.getElementById(
            "undoBtn"
        );

    if (undoBtn) {

        undoBtn.addEventListener(
            "click",
            undoScore
        );
    }


    // SWAP

    const swapBtn =
        document.getElementById(
            "swapBtn"
        );

    if (swapBtn) {

        swapBtn.addEventListener(
            "click",
            () =>
                swapBatters()
        );
    }


    // SAVE

    const saveBtn =
        document.getElementById(
            "saveBtn"
        );

    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            saveScore
        );
    }


    // END MATCH

    const endMatchBtn =
        document.getElementById(
            "endMatchBtn"
        );

    if (endMatchBtn) {

        endMatchBtn.addEventListener(
            "click",
            endMatch
        );
    }


    // SECOND INNINGS

    if (
        startSecondInningsBtn
    ) {

        startSecondInningsBtn.addEventListener(
            "click",
            startSecondInnings
        );
    }


    // NEXT MATCH

    if (nextMatchBtn) {

        nextMatchBtn.addEventListener(
            "click",
            async () => {

                nextMatchBtn.disabled =
                    true;

                nextMatchBtn.textContent =
                    "🔄 Loading...";

                try {

                    await openNextMatch();

                } catch (error) {

                    console.error(
                        "❌ NEXT MATCH ERROR:",
                        error
                    );

                    alert(
                        "❌ " +
                        (
                            error?.message ||
                            String(error)
                        )
                    );

                    nextMatchBtn.disabled =
                        false;

                    nextMatchBtn.textContent =
                        "🔄 Next Match";
                }
            }
        );
    }
}


// ========================================
// NAVIGATION
// ========================================

function setupLinks() {

    const pages = [

        [
            "tournamentLink",
            "tournament.html"
        ],

        [
            "scheduleLink",
            "schedule.html"
        ],

        [
            "resultsLink",
            "results.html"
        ],

        [
            "pointsLink",
            "points.html"
        ]
    ];


    pages.forEach(
        ([id, page]) => {

            const link =
                document.getElementById(
                    id
                );


            if (
                link &&
                tournamentId
            ) {

                link.href =
                    page +
                    "?id=" +
                    encodeURIComponent(
                        tournamentId
                    );
            }
        }
    );
}


// ========================================
// INIT
// ========================================

async function init() {

    console.log(
        "🚀 STARTING SCORECARD..."
    );


    try {

        if (!tournamentId) {

            throw new Error(
                "Tournament ID missing."
            );
        }


        saveIds();


        await loadTournament();


        await loadMatch();


        saveIds();


        loadSavedScore();


        displayMatch();


        setupButtons();


        setupLinks();


        updateSecondInningsButton();


        updateNextMatchButton();


        console.log(
            "🏏 SCORECARD STATE:",
            scoreState
        );


        console.log(
            "🏏 MATCH DATA:",
            currentMatch
        );


        console.log(
            "✅ SCORECARD READY"
        );


    } catch (error) {

        console.error(
            "❌ SCORECARD ERROR:",
            error
        );


        if (matchInfo) {

            matchInfo.innerHTML = `

                <div class="empty">

                    ❌ ${
                        escapeHTML(
                            error?.message ||
                            String(error)
                        )
                    }

                </div>

            `;
        }
    }
}


// ========================================
// START
// ========================================

init();