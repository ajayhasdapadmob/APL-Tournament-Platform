import { db, auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const tournamentInfo =
    document.getElementById(
        "tournamentInfo"
    );

const resultsList =
    document.getElementById(
        "resultsList"
    );

const backTournament =
    document.getElementById(
        "backTournament"
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


/* =========================
   LOCAL STORAGE FALLBACK
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


/* =========================
   CHECK ID
========================= */

if (!tournamentId) {

    tournamentInfo.innerHTML = `

        <h2>
            ❌ Tournament ID Missing
        </h2>

        <p>
            Please open Results
            from a tournament.
        </p>

    `;

    resultsList.innerHTML = "";

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
   BACK BUTTON
========================= */

if (backTournament) {

    backTournament.href =
        "tournament.html?id=" +
        encodeURIComponent(
            tournamentId
        );

}


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

        const tournamentSnap =
            await getDoc(
                doc(
                    db,
                    "tournaments",
                    tournamentId
                )
            );


        if (!tournamentSnap.exists()) {

            tournamentInfo.innerHTML = `

                <h2>
                    ❌ Tournament Not Found
                </h2>

                <p>

                    Tournament ID:
                    <b>${tournamentId}</b>

                </p>

            `;

            return;
        }


        const tournament =
            tournamentSnap.data();


        tournamentInfo.innerHTML = `

            <h2>

                🏆
                ${tournament.tournamentName || "Tournament"}

            </h2>


            <p>

                🆔
                <b>Tournament ID:</b>

                ${tournamentId}

            </p>


            <p>

                📍
                <b>Venue:</b>

                ${tournament.venue || "-"}

            </p>


            <p>

                👥
                <b>Teams:</b>

                ${tournament.totalTeams || 0}

            </p>

        `;


    } catch (error) {

        console.error(
            "Tournament Error:",
            error
        );


        tournamentInfo.innerHTML = `

            <h2>
                ❌ Error
            </h2>

            <p>
                ${error.message}
            </p>

        `;

    }

}


/* =========================
   LOAD MATCHES
========================= */

async function loadMatches() {

    try {

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


        resultsList.innerHTML = "";


        if (snapshot.empty) {

            resultsList.innerHTML = `

                <div class="empty">

                    📅 No matches found.

                    <br><br>

                    Tournament ID:

                    <b>
                        ${tournamentId}
                    </b>

                    <br><br>

                    Please create matches
                    from Schedule.

                </div>

            `;

            return;
        }


        snapshot.forEach(
            (matchDoc) => {

                const match =
                    matchDoc.data();


                const result =
                    match.result || "";


                const matchUrl =
                    "match.html?id=" +
                    encodeURIComponent(
                        tournamentId
                    ) +
                    "&matchId=" +
                    encodeURIComponent(
                        matchDoc.id
                    );


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "result-card";


                card.innerHTML = `

                    <div class="match-title">

                        🏏 Match
                        ${match.matchNumber || "-"}

                    </div>


                    <div class="info">

                        🆔
                        <b>Tournament ID:</b>

                        ${tournamentId}

                    </div>


                    <div class="info">

                        🏏
                        <b>Match ID:</b>

                        ${matchDoc.id}

                    </div>


                    <div class="teams">

                        ${match.teamA || "-"}

                        🆚

                        ${match.teamB || "-"}

                    </div>


                    <div class="info">

                        📅
                        ${match.date || "-"}

                    </div>


                    <div class="info">

                        ⏰
                        ${match.time || "-"}

                    </div>


                    <div class="info">

                        📍
                        ${match.venue || "-"}

                    </div>


                    <div class="result-form">


                        <label>

                            🏆 Match Winner

                        </label>


                        <select class="winner">

                            <option value="">

                                -- Select Winner --

                            </option>


                            <option
                                value="${match.teamA || ""}"
                            >

                                ${match.teamA || "Team A"}

                            </option>


                            <option
                                value="${match.teamB || ""}"
                            >

                                ${match.teamB || "Team B"}

                            </option>


                            <option value="Draw">

                                🤝 Draw

                            </option>

                        </select>


                        <input
                            class="scoreA"
                            type="text"
                            placeholder="${match.teamA || "Team A"} Score"
                            value="${match.scoreA || ""}"
                        >


                        <input
                            class="scoreB"
                            type="text"
                            placeholder="${match.teamB || "Team B"} Score"
                            value="${match.scoreB || ""}"
                        >


                        <input
                            class="resultText"
                            type="text"
                            placeholder="Result / Remark"
                            value="${result}"
                        >


                        <button
                            class="btn save-result"
                        >

                            💾 Save Result

                        </button>


                        <button
                            class="delete-result"
                        >

                            🗑️ Clear Result

                        </button>


                        <a
                            href="${matchUrl}"
                            class="btn"
                            style="
                                display:inline-block;
                                margin-top:10px;
                                text-decoration:none;
                            "
                        >

                            👁️ Match Details

                        </a>


                        ${
                            result
                            ?
                            `
                            <div class="result-success">

                                🏆 Result:

                                ${result}

                            </div>
                            `
                            :
                            ""
                        }


                    </div>

                `;


                /* =========================
                   EXISTING WINNER
                ========================= */

                if (match.winner) {

                    card.querySelector(
                        ".winner"
                    ).value =
                        match.winner;

                }


                /* =========================
                   SAVE
                ========================= */

                card.querySelector(
                    ".save-result"
                ).addEventListener(
                    "click",
                    () => {

                        saveResult(
                            matchDoc.id,
                            card
                        );

                    }
                );


                /* =========================
                   CLEAR
                ========================= */

                card.querySelector(
                    ".delete-result"
                ).addEventListener(
                    "click",
                    () => {

                        clearResult(
                            matchDoc.id
                        );

                    }
                );


                resultsList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Results Error:",
            error
        );


        resultsList.innerHTML = `

            <div class="empty">

                ❌ ${error.message}

            </div>

        `;

    }

}


/* =========================
   SAVE RESULT
========================= */

async function saveResult(
    matchId,
    card
) {

    const winner =
        card.querySelector(
            ".winner"
        ).value;


    const scoreA =
        card.querySelector(
            ".scoreA"
        ).value.trim();


    const scoreB =
        card.querySelector(
            ".scoreB"
        ).value.trim();


    const resultText =
        card.querySelector(
            ".resultText"
        ).value.trim();


    if (!winner) {

        alert(
            "⚠️ Please select match winner."
        );

        return;
    }


    try {

        await updateDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            ),

            {

                tournamentId:
                    tournamentId,

                winner:
                    winner,

                scoreA:
                    scoreA,

                scoreB:
                    scoreB,

                result:
                    resultText ||
                    winner + " won",

                status:
                    "Completed",

                resultUpdatedAt:
                    serverTimestamp()

            }

        );


        alert(
            "✅ Result Saved Successfully"
        );


        await loadMatches();


    } catch (error) {

        console.error(
            "Save Result Error:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =========================
   CLEAR RESULT
========================= */

async function clearResult(
    matchId
) {

    if (
        !confirm(
            "क्या आप इस match का result clear करना चाहते हैं?"
        )
    ) {

        return;
    }


    try {

        await updateDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "matches",
                matchId
            ),

            {

                tournamentId:
                    tournamentId,

                winner:
                    "",

                scoreA:
                    "",

                scoreB:
                    "",

                result:
                    "",

                status:
                    "Scheduled"

            }

        );


        alert(
            "🗑️ Result Cleared"
        );


        await loadMatches();


    } catch (error) {

        console.error(
            "Clear Result Error:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

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


        loadTournament();

        loadMatches();

    }
);