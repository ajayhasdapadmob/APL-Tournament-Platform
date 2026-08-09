import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const details =
    document.getElementById(
        "tournamentDetails"
    );


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament(user) {

    /* =========================
       GET ID FROM URL
    ========================= */

    const params =
        new URLSearchParams(
            window.location.search
        );


    let tournamentId =
        params.get("id");


    /* =========================
       FALLBACK LOCAL STORAGE
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


    console.log(
        "Tournament ID:",
        tournamentId
    );


    /* =========================
       CHECK ID
    ========================= */

    if (!tournamentId) {

        details.innerHTML = `

            <div class="error-box">

                <h2>
                    ❌ Tournament ID Missing
                </h2>

                <p>
                    Please open the tournament
                    from My Tournaments.
                </p>

                <br>

                <a
                    href="my-tournaments.html"
                    class="btn"
                >
                    ⬅ My Tournaments
                </a>

            </div>

        `;

        return;
    }


    /* =========================
       SAVE CURRENT TOURNAMENT
    ========================= */

    localStorage.setItem(
        "tournamentId",
        tournamentId
    );

    localStorage.setItem(
        "selectedTournamentId",
        tournamentId
    );


    try {

        /* =========================
           GET TOURNAMENT
        ========================= */

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

            details.innerHTML = `

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

            return;
        }


        const t =
            tournamentSnap.data();


        /* =========================
           DISPLAY
        ========================= */

        details.innerHTML = `

            <div class="tournament-info">


                <h2>
                    🏆
                    ${t.tournamentName || "Tournament"}
                </h2>


                <div class="info-grid">


                    <!-- TOURNAMENT ID -->

                    <div class="info-item">

                        <b>🆔 Tournament ID</b>

                        ${tournamentId}

                    </div>


                    <div class="info-item">

                        <b>📍 Venue</b>

                        ${t.venue || "-"}

                    </div>


                    <div class="info-item">

                        <b>📅 Start Date</b>

                        ${t.startDate || "-"}

                    </div>


                    <div class="info-item">

                        <b>📅 End Date</b>

                        ${t.endDate || "-"}

                    </div>


                    <div class="info-item">

                        <b>👥 Total Teams</b>

                        ${t.totalTeams || 0}

                    </div>


                    <div class="info-item">

                        <b>💰 Entry Fee</b>

                        ₹${t.entryFee || 0}

                    </div>


                    <div class="info-item">

                        <b>🥇 Winner Prize</b>

                        ₹${t.winnerPrize || 0}

                    </div>


                    <div class="info-item">

                        <b>🥈 Runner-up Prize</b>

                        ₹${t.runnerPrize || 0}

                    </div>


                    <div class="info-item">

                        <b>🏏 Format</b>

                        ${t.format || "-"}

                    </div>


                    <div class="info-item">

                        <b>📞 Contact</b>

                        ${t.contact || "-"}

                    </div>


                    <div class="info-item">

                        <b>📧 Email</b>

                        ${t.email || "-"}

                    </div>


                </div>


                <div class="description">

                    <b>📝 Description</b>

                    <br><br>

                    ${t.description || "No description"}

                </div>


                <div class="tournament-buttons">


                    <a
                        class="btn primary-btn"
                        href="registration.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        👥 Register Team
                    </a>


                    <a
                        class="btn"
                        href="admin.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        ⚙️ Manage Teams
                    </a>


                    <a
                        class="btn"
                        href="schedule.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        📅 Schedule
                    </a>


                    <a
                        class="btn"
                        href="results.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        🏆 Results
                    </a>


                    <a
                        class="btn"
                        href="points.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        📈 Points Table
                    </a>


                    <a
                        class="btn"
                        href="live-score.html?id=${encodeURIComponent(tournamentId)}"
                    >
                        🔴 Live Score
                    </a>


                </div>


            </div>

        `;


    } catch (error) {

        console.error(
            "Tournament Error:",
            error
        );


        details.innerHTML = `

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
   LOGIN CHECK
========================= */

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        loadTournament(user);

    }
);