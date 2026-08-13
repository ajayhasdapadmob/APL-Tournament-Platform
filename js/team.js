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

const teamsHeader =
    document.getElementById(
        "teamsHeader"
    );

const teamList =
    document.getElementById(
        "teamList"
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

const liveScoreLink =
    document.getElementById(
        "liveScoreLink"
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


/* =========================
   CHECK ID
========================= */

if (!tournamentId) {

    teamsHeader.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Teams
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

    teamList.innerHTML = "";

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

liveScoreLink.href =
    "live-score.html?id=" +
    encodeURIComponent(
        tournamentId
    );


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


    if (
        !tournamentSnap.exists()
    ) {

        teamsHeader.innerHTML = `

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


    teamsHeader.innerHTML = `

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


        <p>

            👥
            <b>Total Teams:</b>

            ${
                tournament.totalTeams ||
                0
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

    try {

        const teamsRef =
            collection(

                db,

                "tournaments",

                tournamentId,

                "teams"

            );


        const snapshot =
            await getDocs(
                teamsRef
            );


        teamList.innerHTML = "";


        if (
            snapshot.empty
        ) {

            teamList.innerHTML = `

                <div class="empty">

                    <h3>
                        👥 No Teams Found
                    </h3>

                    <p>
                        No teams have been
                        registered for this
                        tournament yet.
                    </p>

                </div>

            `;

            return;

        }


        const teams = [];


        snapshot.forEach(
            teamDoc => {

                teams.push({

                    id:
                        teamDoc.id,

                    ...teamDoc.data()

                });

            }
        );


        /* =========================
           SORT
        ========================= */

        teams.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.teamName ||
                        a.name ||
                        ""
                    );

                const nameB =
                    String(
                        b.teamName ||
                        b.name ||
                        ""
                    );


                return nameA.localeCompare(
                    nameB
                );

            }
        );


        /* =========================
           DISPLAY
        ========================= */

        teams.forEach(
            (team, index) => {

                const teamName =
                    team.teamName ||
                    team.name ||
                    "Team " +
                    (index + 1);


                const captain =
                    team.captainName ||
                    team.captain ||
                    "-";


                const mobile =
                    team.mobile ||
                    team.phone ||
                    "-";


                const area =
                    team.area ||
                    "-";


                const status =
                    team.status ||
                    "Registered";


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                card.innerHTML = `

                    <h3>

                        🏏
                        ${teamName}

                    </h3>


                    <div class="team-info">

                        👤
                        <b>Captain:</b>

                        ${captain}

                    </div>


                    <div class="team-info">

                        📞
                        <b>Mobile:</b>

                        ${mobile}

                    </div>


                    <div class="team-info">

                        📍
                        <b>Area:</b>

                        ${area}

                    </div>


                    <div class="team-info">

                        📌
                        <b>Status:</b>

                        ${status}

                    </div>


                    <div
                        class="team-info"
                        style="
                            font-size:12px;
                            color:#6b7280;
                        "
                    >

                        🆔 Team ID:

                        ${team.id}

                    </div>

                `;


                teamList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Teams Error:",
            error
        );


        teamList.innerHTML = `

            <div class="empty">

                ❌
                ${error.message}

            </div>

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


            if (
                loaded
            ) {

                await loadTeams();

            }

        } catch (error) {

            console.error(
                error
            );

        }

    }
);