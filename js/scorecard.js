import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const tournamentInfo =
    document.getElementById("tournamentInfo");

const matchCard =
    document.getElementById("matchCard");

const message =
    document.getElementById("message");

const tournamentLink =
    document.getElementById("tournamentLink");

const scheduleLink =
    document.getElementById("scheduleLink");

const resultsLink =
    document.getElementById("resultsLink");

const pointsLink =
    document.getElementById("pointsLink");


/* =========================
   GET URL PARAMETERS
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

let tournamentId =
    params.get("id");

let matchId =
    params.get("matchId");


/* =========================
   FALLBACK
========================= */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );
}


if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );
}


if (!matchId) {

    matchId =
        localStorage.getItem(
            "matchId"
        );
}


/* =========================
   DEBUG
========================= */

console.log(
    "Score Tournament ID:",
    tournamentId
);

console.log(
    "Score Match ID:",
    matchId
);


/* =========================
   CHECK TOURNAMENT
========================= */

if (!tournamentId) {

    tournamentInfo.innerHTML = `

        <div class="error-box">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Score from
                a tournament match.
            </p>

        </div>

    `;

    matchCard.innerHTML = "";

    throw new Error(
        "Tournament ID Missing"
    );
}


/* =========================
   CHECK MATCH
========================= */

if (!matchId) {

    tournamentInfo.innerHTML = `

        <div class="error-box">

            <h2>
                ❌ Match ID Missing
            </h2>

            <p>
                Please open Score from
                Schedule or Results.
            </p>

        </div>

    `;

    matchCard.innerHTML = "";

    throw new Error(
        "Match ID Missing"
    );
}


/* =========================
   SAVE IDs
========================= */

localStorage.setItem(
    "tournamentId",
    tournamentId
);

localStorage.setItem(
    "selectedTournamentId",
    tournamentId
);

localStorage.setItem(
    "matchId",
    matchId
);


/* =========================
   NAVIGATION
========================= */

tournamentLink.href =
    "tournament.html?id=" +
    encodeURIComponent(
        tournamentId
    );


scheduleLink.href =
    "schedule.html?id=" +
    encodeURIComponent(
        tournamentId
    );


resultsLink.href =
    "results.html?id=" +
    encodeURIComponent(
        tournamentId
    );


pointsLink.href =
    "points.html?id=" +
    encodeURIComponent(
        tournamentId
    );


/* =========================
   LOAD SCORE PAGE
========================= */

async function loadScore() {

    try {

        /* =========================
           TOURNAMENT
        ========================= */

        const tournamentSnap =
            await getDoc(

                doc(
                    db,
                    "tournaments",
                    tournamentId
                )

            );


        if (
            !tournamentSnap.exists()
        ) {

            tournamentInfo.innerHTML = `

                <div class="error-box">

                    <h2>
                        ❌ Tournament Not Found
                    </h2>

                    <p>

                        Tournament ID:
                        <b>${tournamentId}</b>

                    </p>

                </div>

            `;

            matchCard.innerHTML = "";

            return;
        }


        const tournament =
            tournamentSnap.data();


        tournamentInfo.innerHTML = `

            <h2>

                🏆
                ${
                    tournament.tournamentName ||
                    "Tournament"
                }

            </h2>


            <div class="id-box">

                🆔
                <b>Tournament ID:</b>

                ${tournamentId}

            </div>

        `;


        /* =========================
           MATCH
        ========================= */

        const matchRef =
            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            );


        const matchSnap =
            await getDoc(
                matchRef
            );


        if (
            !matchSnap.exists()
        ) {

            matchCard.innerHTML = `

                <div class="error-box">

                    <h2>
                        ❌ Match Not Found
                    </h2>

                    <p>

                        Match ID:
                        <b>${matchId}</b>

                    </p>

                </div>

            `;

            return;
        }


        const match =
            matchSnap.data();


        displayMatch(
            match
        );


    } catch (error) {

        console.error(
            "Score Error:",
            error
        );


        matchCard.innerHTML = `

            <div class="error-box">

                <h2>
                    ❌ Error
                </h2>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

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
        "Team A";

    const teamB =
        match.teamB ||
        "Team B";


    matchCard.innerHTML = `

        <h2>
            🏏 Match
            ${match.matchNumber || "-"}
        </h2>


        <div class="id-box">

            🆔
            <b>Match ID:</b>

            ${matchId}

        </div>


        <div class="teams">

            ${teamA}

            🆚

            ${teamB}

        </div>


        <p style="text-align:center;">

            📅
            ${match.date || "-"}

            &nbsp;&nbsp;

            ⏰
            ${match.time || "-"}

        </p>


        <div class="score-grid">


            <div class="score-box">

                <h3>
                    ${teamA}
                </h3>

                <input
                    id="scoreA"
                    type="text"
                    placeholder="Score"
                    value="${match.scoreA || ""}"
                >

            </div>


            <div class="score-box">

                <h3>
                    ${teamB}
                </h3>

                <input
                    id="scoreB"
                    type="text"
                    placeholder="Score"
                    value="${match.scoreB || ""}"
                >

            </div>


        </div>


        <div class="result-box">

            <label>

                <b>
                    🏆 Match Winner
                </b>

            </label>


            <select id="winner">

                <option value="">
                    -- Select Winner --
                </option>

                <option
                    value="${teamA}"
                >

                    ${teamA}

                </option>

                <option
                    value="${teamB}"
                >

                    ${teamB}

                </option>

                <option value="Draw">

                    🤝 Draw

                </option>

            </select>

        </div>


        <div class="result-box">

            <label>

                <b>
                    📝 Result / Remark
                </b>

            </label>


            <input
                id="resultText"
                type="text"
                placeholder="Example: Team A won by 20 runs"
                value="${match.result || ""}"
            >

        </div>


        <button
            id="saveScore"
            class="btn primary-btn save-btn"
        >

            💾 Save Score

        </button>

    `;


    /* =========================
       EXISTING WINNER
    ========================= */

    if (
        match.winner
    ) {

        document.getElementById(
            "winner"
        ).value =
            match.winner;

    }


    /* =========================
       SAVE BUTTON
    ========================= */

    document.getElementById(
        "saveScore"
    ).addEventListener(
        "click",
        saveScore
    );

}


/* =========================
   SAVE SCORE
========================= */

async function saveScore() {

    const scoreA =
        document.getElementById(
            "scoreA"
        ).value.trim();


    const scoreB =
        document.getElementById(
            "scoreB"
        ).value.trim();


    const winner =
        document.getElementById(
            "winner"
        ).value;


    const resultText =
        document.getElementById(
            "resultText"
        ).value.trim();


    if (!winner) {

        showMessage(
            "⚠️ Please select match winner.",
            "error"
        );

        return;

    }


    try {

        const matchRef =
            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            );


        await updateDoc(

            matchRef,

            {

                scoreA:
                    scoreA,

                scoreB:
                    scoreB,

                winner:
                    winner,

                result:
                    resultText ||
                    winner + " won",

                status:
                    "Completed",

                resultUpdatedAt:
                    serverTimestamp()

            }

        );


        showMessage(
            "✅ Score saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save Score Error:",
            error
        );


        showMessage(
            "❌ " +
            error.message,
            "error"
        );

    }

}


/* =========================
   MESSAGE
========================= */

function showMessage(
    text,
    type
) {

    message.textContent =
        text;

    message.className =
        "message " +
        type;

    message.style.display =
        "block";

}


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        loadScore();

    }
);