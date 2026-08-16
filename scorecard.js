// ========================================
// SCORECARD.JS - FINAL COMPLETE VERSION
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
// GET MATCH ID
// ========================================

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
// DEFAULT BATTER
// ========================================

function createBatter(name = "Batter") {

    return {

        name: name,

        runs: 0,

        balls: 0,

        fours: 0,

        sixes: 0,

        strikeRate: 0,

        out: false
    };
}


// ========================================
// DEFAULT BOWLER
// ========================================

function createBowler(name = "Bowler") {

    return {

        name: name,

        balls: 0,

        runs: 0,

        wickets: 0,

        wides: 0,

        noBalls: 0,

        maidens: 0,

        economy: 0,

        currentOverRuns: 0
    };
}


// ========================================
// DEFAULT EXTRAS
// ========================================

function createExtras() {

    return {

        wides: 0,

        noBalls: 0,

        byes: 0,

        legByes: 0,

        total: 0
    };
}


// ========================================
// CREATE NEW INNINGS
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

        striker:
            createBatter("Striker"),

        nonStriker:
            createBatter("Non-Striker"),

        bowler:
            createBowler("Bowler"),

        extras:
            createExtras(),

        totalFours: 0,

        totalSixes: 0,

        history: [],

        status: "Live"
    };
}


let scoreState =
    createNewInnings("A");


// ========================================
// TEAM NAMES
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


// ========================================
// OVERS
// ========================================

function getOversFromBalls(balls) {

    const b =
        Number(balls) || 0;

    return (
        Math.floor(b / 6) +
        "." +
        (b % 6)
    );
}


// ========================================
// CRR
// ========================================

function calculateCRR(
    runs,
    balls
) {

    const r =
        Number(runs) || 0;

    const b =
        Number(balls) || 0;

    if (b <= 0) {
        return "0.00";
    }

    return (
        r /
        (b / 6)
    ).toFixed(2);
}


// ========================================
// ECONOMY
// ========================================

function calculateEconomy(
    runs,
    balls
) {

    const r =
        Number(runs) || 0;

    const b =
        Number(balls) || 0;

    if (b <= 0) {
        return "0.00";
    }

    return (
        r /
        (b / 6)
    ).toFixed(2);
}


// ========================================
// STRIKE RATE
// ========================================

function calculateStrikeRate(
    runs,
    balls
) {

    const r =
        Number(runs) || 0;

    const b =
        Number(balls) || 0;

    if (b <= 0) {
        return "0.00";
    }

    return (
        r /
        b *
        100
    ).toFixed(2);
}


// ========================================
// PARSE SCORE
// ========================================

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


// ========================================
// ESCAPE HTML
// ========================================

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
// NORMALIZE SAVED BATTER
// ========================================

function normalizeBatter(
    batter,
    defaultName
) {

    return {

        name:
            batter?.name ||
            defaultName,

        runs:
            Number(
                batter?.runs || 0
            ),

        balls:
            Number(
                batter?.balls || 0
            ),

        fours:
            Number(
                batter?.fours || 0
            ),

        sixes:
            Number(
                batter?.sixes || 0
            ),

        strikeRate:
            Number(
                batter?.strikeRate || 0
            ),

        out:
            Boolean(
                batter?.out || false
            )
    };
}


// ========================================
// NORMALIZE BOWLER
// ========================================

function normalizeBowler(
    bowler
) {

    return {

        name:
            bowler?.name ||
            "Bowler",

        balls:
            Number(
                bowler?.balls || 0
            ),

        runs:
            Number(
                bowler?.runs || 0
            ),

        wickets:
            Number(
                bowler?.wickets || 0
            ),

        wides:
            Number(
                bowler?.wides || 0
            ),

        noBalls:
            Number(
                bowler?.noBalls || 0
            ),

        maidens:
            Number(
                bowler?.maidens || 0
            ),

        economy:
            Number(
                bowler?.economy || 0
            ),

        currentOverRuns:
            Number(
                bowler?.currentOverRuns || 0
            )
    };
}


// ========================================
// NORMALIZE EXTRAS
// ========================================

function normalizeExtras(
    extras
) {

    return {

        wides:
            Number(
                extras?.wides || 0
            ),

        noBalls:
            Number(
                extras?.noBalls || 0
            ),

        byes:
            Number(
                extras?.byes || 0
            ),

        legByes:
            Number(
                extras?.legByes || 0
            ),

        total:
            Number(
                extras?.total || 0
            )
    };
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
            normalizeBatter(
                saved.striker,
                "Striker"
            ),

        nonStriker:
            normalizeBatter(
                saved.nonStriker,
                "Non-Striker"
            ),

        bowler:
            normalizeBowler(
                saved.bowler
            ),

        extras:
            normalizeExtras(
                saved.extras
            ),

        totalFours:
            Number(
                saved.totalFours || 0
            ),

        totalSixes:
            Number(
                saved.totalSixes || 0
            ),

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
        calculateCRR(
            scoreState.runs,
            scoreState.balls
        );


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


    const extras =
        scoreState.extras ||
        createExtras();


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

            <span>
                Extras: ${extras.total}
                (WD ${extras.wides},
                NB ${extras.noBalls},
                B ${extras.byes},
                LB ${extras.legByes})
            </span>

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
// UPDATE BATTERS
// ========================================

function updateBatters() {

    const striker =
        scoreState.striker ||
        createBatter("Striker");


    const nonStriker =
        scoreState.nonStriker ||
        createBatter("Non-Striker");


    const sr =
        calculateStrikeRate(
            striker.runs,
            striker.balls
        );


    const nsr =
        calculateStrikeRate(
            nonStriker.runs,
            nonStriker.balls
        );


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


    // Optional 4s / 6s HTML IDs

    const strikerFours =
        document.getElementById(
            "strikerFours"
        );

    const strikerSixes =
        document.getElementById(
            "strikerSixes"
        );

    const nonStrikerFours =
        document.getElementById(
            "nonStrikerFours"
        );

    const nonStrikerSixes =
        document.getElementById(
            "nonStrikerSixes"
        );


    if (strikerFours)
        strikerFours.textContent =
            striker.fours;


    if (strikerSixes)
        strikerSixes.textContent =
            striker.sixes;


    if (nonStrikerFours)
        nonStrikerFours.textContent =
            nonStriker.fours;


    if (nonStrikerSixes)
        nonStrikerSixes.textContent =
            nonStriker.sixes;
}


// ========================================
// UPDATE BOWLER
// ========================================

function updateBowler() {

    const bowler =
        scoreState.bowler ||
        createBowler();


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

    const bowlerMaidens =
        document.getElementById(
            "bowlerMaidens"
        );

    const bowlerWides =
        document.getElementById(
            "bowlerWides"
        );

    const bowlerNoBalls =
        document.getElementById(
            "bowlerNoBalls"
        );

    const bowlerEconomy =
        document.getElementById(
            "bowlerEconomy"
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


    if (bowlerMaidens)
        bowlerMaidens.textContent =
            bowler.maidens;


    if (bowlerWides)
        bowlerWides.textContent =
            bowler.wides;


    if (bowlerNoBalls)
        bowlerNoBalls.textContent =
            bowler.noBalls;


    if (bowlerEconomy)
        bowlerEconomy.textContent =
            calculateEconomy(
                bowler.runs,
                bowler.balls
            );
}


// ========================================
// UPDATE CURRENT OVER
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
// SAVE HISTORY
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
// COMPLETE CURRENT BOWLER OVER
// ========================================

function completeBowlerOver() {

    const bowler =
        scoreState.bowler;


    if (!bowler) {
        return;
    }


    const overRuns =
        Number(
            bowler.currentOverRuns || 0
        );


    if (
        bowler.balls > 0 &&
        bowler.balls % 6 === 0
    ) {

        if (overRuns === 0) {

            bowler.maidens += 1;
        }


        bowler.currentOverRuns = 0;
    }
}


// ========================================
// ADD NORMAL RUNS
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


    const value =
        Number(runs);


    if (
        !Number.isFinite(value) ||
        value < 0
    ) {

        return;
    }


    saveHistory();


    // Team runs

    scoreState.runs +=
        value;


    // Legal ball

    scoreState.balls +=
        1;


    // Batter

    scoreState.striker.runs +=
        value;

    scoreState.striker.balls +=
        1;


    // Boundary statistics

    if (value === 4) {

        scoreState.striker.fours += 1;

        scoreState.totalFours += 1;
    }


    if (value === 6) {

        scoreState.striker.sixes += 1;

        scoreState.totalSixes += 1;
    }


    // Bowler

    scoreState.bowler.runs +=
        value;

    scoreState.bowler.balls +=
        1;

    scoreState.bowler.currentOverRuns +=
        value;


    scoreState.bowler.economy =
        Number(
            calculateEconomy(
                scoreState.bowler.runs,
                scoreState.bowler.balls
            )
        );


    // Current over

    scoreState.currentOverRuns.push(
        String(value)
    );


    // Odd runs = strike change

    if (
        value % 2 === 1
    ) {

        swapBatters(false);
    }


    // Over completed

    if (
        scoreState.balls % 6 === 0
    ) {

        completeBowlerOver();

        scoreState.currentOverRuns = [];

        swapBatters(false);
    }


    renderScore();

    await autoSave();
}


// ========================================
// ADD EXTRAS
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


    const value =
        Number(runs) || 1;


    saveHistory();


    // ====================================
    // WIDE
    // ====================================

    if (
        type === "Wide"
    ) {

        scoreState.runs +=
            value;


        scoreState.extras.wides +=
            value;


        scoreState.extras.total +=
            value;


        scoreState.bowler.runs +=
            value;


        scoreState.bowler.wides +=
            value;


        scoreState.bowler.currentOverRuns +=
            value;


        scoreState.currentOverRuns.push(
            value === 1
                ? "Wd"
                : `Wd+${value}`
        );
    }


    // ====================================
    // NO BALL
    // ====================================

    else if (
        type === "No Ball"
    ) {

        scoreState.runs +=
            value;


        scoreState.extras.noBalls +=
            value;


        scoreState.extras.total +=
            value;


        scoreState.bowler.runs +=
            value;


        scoreState.bowler.noBalls +=
            value;


        scoreState.bowler.currentOverRuns +=
            value;


        scoreState.currentOverRuns.push(
            value === 1
                ? "NB"
                : `NB+${value}`
        );
    }


    // ====================================
    // BYE
    // ====================================

    else if (
        type === "Bye"
    ) {

        scoreState.runs +=
            value;


        scoreState.extras.byes +=
            value;


        scoreState.extras.total +=
            value;


        // Bye does NOT count to bowler runs

        scoreState.currentOverRuns.push(
            value === 1
                ? "B"
                : `B+${value}`
        );


        // Bye is a legal delivery

        scoreState.balls +=
            1;

        scoreState.striker.balls +=
            1;

        scoreState.bowler.balls +=
            1;
    }


    // ====================================
    // LEG BYE
    // ====================================

    else if (
        type === "Leg Bye"
    ) {

        scoreState.runs +=
            value;


        scoreState.extras.legByes +=
            value;


        scoreState.extras.total +=
            value;


        // Leg bye does NOT count to bowler runs

        scoreState.currentOverRuns.push(
            value === 1
                ? "LB"
                : `LB+${value}`
        );


        // Legal delivery

        scoreState.balls +=
            1;

        scoreState.striker.balls +=
            1;

        scoreState.bowler.balls +=
            1;
    }


    // ====================================
    // OVER COMPLETE
    // ====================================

    if (
        scoreState.balls > 0 &&
        scoreState.balls % 6 === 0
    ) {

        completeBowlerOver();

        scoreState.currentOverRuns = [];

        swapBatters(false);
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


    scoreState.wickets +=
        1;


    scoreState.balls +=
        1;


    scoreState.striker.balls +=
        1;


    scoreState.striker.out =
        true;


    scoreState.bowler.balls +=
        1;


    scoreState.bowler.wickets +=
        1;


    scoreState.currentOverRuns.push(
        "W"
    );


    // New batter placeholder

    scoreState.striker =
        createBatter(
            "New Batter"
        );


    if (
        scoreState.balls > 0 &&
        scoreState.balls % 6 === 0
    ) {

        completeBowlerOver();

        scoreState.currentOverRuns = [];

        swapBatters(false);
    }


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
// PREPARE SCORECARD FOR FIREBASE
// ========================================

function prepareScorecardData() {

    return {

        battingTeam:
            scoreState.battingTeam,

        innings:
            scoreState.innings,

        runs:
            Number(
                scoreState.runs || 0
            ),

        wickets:
            Number(
                scoreState.wickets || 0
            ),

        balls:
            Number(
                scoreState.balls || 0
            ),

        overs:
            getOversFromBalls(
                scoreState.balls
            ),

        crr:
            Number(
                calculateCRR(
                    scoreState.runs,
                    scoreState.balls
                )
            ),

        striker:
            scoreState.striker,

        nonStriker:
            scoreState.nonStriker,

        bowler:
            scoreState.bowler,

        extras:
            scoreState.extras,

        totalFours:
            scoreState.totalFours,

        totalSixes:
            scoreState.totalSixes,

        currentOverRuns:
            scoreState.currentOverRuns,

        status:
            scoreState.status
    };
}


// ========================================
// WRITE MATCH DATA
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


    const scoreText =
        `${scoreState.runs}/${scoreState.wickets}`;


    let scoreA =
        currentMatch.scoreA ||
        "0/0";


    let scoreB =
        currentMatch.scoreB ||
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


    const scorecard =
        prepareScorecardData();


    const data = {

        scoreA:
            scoreA,

        scoreB:
            scoreB,

        scorecard:
            scorecard,

        innings:
            scoreState.innings,

        currentBall:
            scoreState.balls,

        currentOvers:
            getOversFromBalls(
                scoreState.balls
            ),

        currentRuns:
            scoreState.runs,

        currentWickets:
            scoreState.wickets,

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


    currentMatch = {

        ...currentMatch,

        ...data
    };
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
// CALCULATE NRR
// ========================================

function calculateNRR(
    teamRuns,
    teamBalls,
    opponentRuns,
    opponentBalls
) {

    const tr =
        Number(teamRuns) || 0;

    const tb =
        Number(teamBalls) || 0;

    const or =
        Number(opponentRuns) || 0;

    const ob =
        Number(opponentBalls) || 0;


    if (
        tb <= 0 ||
        ob <= 0
    ) {

        return 0;
    }


    const teamRunRate =
        tr /
        (tb / 6);


    const opponentRunRate =
        or /
        (ob / 6);


    return Number(
        (
            teamRunRate -
            opponentRunRate
        ).toFixed(3)
    );
}


// ========================================
// SAVE FIRST INNINGS DATA
// ========================================

function getFirstInningsData() {

    const firstTeam =
        scoreState.battingTeam === "A"
            ? team1Name()
            : team2Name();


    return {

        firstInningsTeam:
            firstTeam,

        firstInningsScore:
            `${scoreState.runs}/${scoreState.wickets}`,

        firstInningsRuns:
            scoreState.runs,

        firstInningsWickets:
            scoreState.wickets,

        firstInningsBalls:
            scoreState.balls,

        firstInningsOvers:
            getOversFromBalls(
                scoreState.balls
            ),

        firstInningsCRR:
            Number(
                calculateCRR(
                    scoreState.runs,
                    scoreState.balls
                )
            ),

        firstInningsExtras:
            scoreState.extras,

        firstInningsScorecard:
            prepareScorecardData()
    };
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


    const firstInningsData =
        getFirstInningsData();


    if (
        scoreState.battingTeam === "A"
    ) {

        currentMatch.scoreA =
            firstScore;

    } else {

        currentMatch.scoreB =
            firstScore;
    }


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
                currentMatch.scoreA ||
                "0/0",

            scoreB:
                currentMatch.scoreB ||
                "0/0",

            innings:
                2,

            currentBall:
                0,

            currentOvers:
                "0.0",

            currentRuns:
                0,

            currentWickets:
                0,

            status:
                "Live",

            scorecard:
                prepareScorecardData(),

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

            secondInningsCRR:
                0,

            ...firstInningsData,

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


    // ====================================
    // FIRST INNINGS
    // ====================================

    if (
        scoreState.innings === 1
    ) {

        scoreState.status =
            "Completed";


        await autoSave();


        renderScore();


        updateSecondInningsButton();


        alert(
            `${scoreState.battingTeam === "A"
                ? team1Name()
                : team2Name()
            } innings completed.\n\n` +
            `Now click "Start 2nd Innings".`
        );


        return;
    }


    // ====================================
    // SECOND INNINGS
    // ====================================

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


    // ====================================
    // WINNER
    // ====================================

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


    // ====================================
    // FIRST INNINGS DETAILS
    // ====================================

    const firstTeam =
        currentMatch.firstInningsTeam ||
        (
            scoreState.battingTeam === "A"
                ? team2Name()
                : team1Name()
        );


    const firstRuns =
        Number(
            currentMatch.firstInningsRuns ||
            0
        );


    const firstBalls =
        Number(
            currentMatch.firstInningsBalls ||
            0
        );


    const firstTeamIsA =
        firstTeam === team1Name();


    const firstTeamRuns =
        firstRuns;


    const secondTeamRuns =
        scoreState.runs;


    const firstTeamBalls =
        firstBalls;


    const secondTeamBalls =
        scoreState.balls;


    let nrrA = 0;

    let nrrB = 0;


    if (firstTeamIsA) {

        nrrA =
            calculateNRR(
                firstTeamRuns,
                firstTeamBalls,
                secondTeamRuns,
                secondTeamBalls
            );

        nrrB =
            calculateNRR(
                secondTeamRuns,
                secondTeamBalls,
                firstTeamRuns,
                firstTeamBalls
            );

    } else {

        nrrB =
            calculateNRR(
                firstTeamRuns,
                firstTeamBalls,
                secondTeamRuns,
                secondTeamBalls
            );

        nrrA =
            calculateNRR(
                secondTeamRuns,
                secondTeamBalls,
                firstTeamRuns,
                firstTeamBalls
            );
    }


// ====================================
    // CONFIRM
    // ====================================

    const ok =
        confirm(
            `🏆 MATCH RESULT\n\n` +

            `${team1Name()}: ${scoreA}\n` +

            `${team2Name()}: ${scoreB}\n\n` +

            `Winner: ${winner}\n\n` +

            `${result}\n\n` +

            `NRR ${team1Name()}: ${nrrA}\n` +

            `NRR ${team2Name()}: ${nrrB}\n\n` +

            `Complete this match?`
        );


    if (!ok) {
        return;
    }


    try {

        scoreState.status =
            "Completed";


        const secondInningsData = {

            secondInningsTeam:
                scoreState.battingTeam === "A"
                    ? team1Name()
                    : team2Name(),

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

            secondInningsCRR:
                Number(
                    calculateCRR(
                        scoreState.runs,
                        scoreState.balls
                    )
                ),

            secondInningsExtras:
                scoreState.extras,

            secondInningsScorecard:
                prepareScorecardData()
        };


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

            currentOvers:
                getOversFromBalls(
                    scoreState.balls
                ),

            currentRuns:
                scoreState.runs,

            currentWickets:
                scoreState.wickets,

            scorecard:
                {
                    ...prepareScorecardData(),
                    status: "Completed"
                },

            team1NRR:
                nrrA,

            team2NRR:
                nrrB,

            nrrTeamA:
                nrrA,

            nrrTeamB:
                nrrB,

            ...secondInningsData,

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
            `${result}\n\n` +
            `${team1Name()} NRR: ${nrrA}\n` +
            `${team2Name()} NRR: ${nrrB}`
        );


        console.log(
            "✅ WINNER SAVED:",
            winner
        );

        console.log(
            "📊 TEAM A NRR:",
            nrrA
        );

        console.log(
            "📊 TEAM B NRR:",
            nrrB
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


    // ====================================
    // NORMAL RUN BUTTONS
    // ====================================

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


// ====================================
    // WIDE
    // ====================================

    const wideBtn =
        document.getElementById(
            "wideBtn"
        );


    if (wideBtn) {

        wideBtn.addEventListener(
            "click",
            async () => {

                const runs =
                    Number(
                        wideBtn.dataset.runs ||
                        1
                    );

                await addExtra(
                    "Wide",
                    runs
                );
            }
        );
    }


    // ====================================
    // NO BALL
    // ====================================

    const noBallBtn =
        document.getElementById(
            "noBallBtn"
        );


    if (noBallBtn) {

        noBallBtn.addEventListener(
            "click",
            async () => {

                const runs =
                    Number(
                        noBallBtn.dataset.runs ||
                        1
                    );

                await addExtra(
                    "No Ball",
                    runs
                );
            }
        );
    }


    // ====================================
    // BYE
    // ====================================

    const byeBtn =
        document.getElementById(
            "byeBtn"
        );


    if (byeBtn) {

        byeBtn.addEventListener(
            "click",
            async () => {

                const runs =
                    Number(
                        byeBtn.dataset.runs ||
                        1
                    );

                await addExtra(
                    "Bye",
                    runs
                );
            }
        );
    }


    // ====================================
    // LEG BYE
    // ====================================

    const legByeBtn =
        document.getElementById(
            "legByeBtn"
        );


    if (legByeBtn) {

        legByeBtn.addEventListener(
            "click",
            async () => {

                const runs =
                    Number(
                        legByeBtn.dataset.runs ||
                        1
                    );

                await addExtra(
                    "Leg Bye",
                    runs
                );
            }
        );
    }


    // ====================================
    // WICKET
    // ====================================

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


    // ====================================
    // UNDO
    // ====================================

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


    // ====================================
    // SWAP
    // ====================================

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


    // ====================================
    // SAVE
    // ====================================

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


    // ====================================
    // END MATCH
    // ====================================

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


// ====================================
    // SECOND INNINGS
    // ====================================

    if (
        startSecondInningsBtn
    ) {

        startSecondInningsBtn.addEventListener(
            "click",
            startSecondInnings
        );
    }


    // ====================================
    // NEXT MATCH
    // ====================================

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
// NAVIGATION LINKS
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