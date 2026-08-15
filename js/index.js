import { db, auth } from "../firebase.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


/* =========================================
   ELEMENTS
========================================= */

const tournamentNameEl =
    document.getElementById("homeTournamentName");

const tournamentIdEl =
    document.getElementById("homeTournamentId");

const totalTeamsEl =
    document.getElementById("homeTotalTeams");

const teamListEl =
    document.getElementById("homeTeamList");


/* =========================================
   MESSAGE
========================================= */

function showMessage(message) {

    if (!teamListEl) return;

    teamListEl.innerHTML = `
        <div class="empty-teams">
            ${message}
        </div>
    `;
}


/* =========================================
   GET TOURNAMENT ID
========================================= */

function getTournamentId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const urlId =
        params.get("id");

    if (urlId) {

        localStorage.setItem(
            "tournamentId",
            urlId
        );

        localStorage.setItem(
            "selectedTournamentId",
            urlId
        );

        return urlId;
    }


    const selectedId =
        localStorage.getItem(
            "selectedTournamentId"
        );

    if (selectedId) {
        return selectedId;
    }


    const savedId =
        localStorage.getItem(
            "tournamentId"
        );

    if (savedId) {
        return savedId;
    }


    return null;
}


/* =========================================
   LOAD TOURNAMENT
========================================= */

async function loadTournament(tournamentId) {

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

        tournamentNameEl.textContent =
            "Tournament Not Found";

        tournamentIdEl.textContent =
            tournamentId;

        totalTeamsEl.textContent =
            "0";

        showMessage(
            "❌ Tournament not found."
        );

        return false;
    }


    const tournament =
        tournamentSnap.data();


    const name =
        tournament.tournamentName ||
        tournament.name ||
        tournament.title ||
        "Tournament";


    tournamentNameEl.textContent =
        name;

    tournamentIdEl.textContent =
        tournamentId;


    return true;
}


/* =========================================
   LOAD REGISTERED TEAMS
========================================= */

async function loadTeams(tournamentId) {

    try {

        if (!tournamentId) {

            totalTeamsEl.textContent =
                "0";

            showMessage(`
                🏆 No tournament selected.
                <br><br>
                <a
                    href="my-tournaments.html"
                    class="btn primary-btn"
                >
                    Select Tournament
                </a>
            `);

            return;
        }


        console.log(
            "🏆 Loading teams for:",
            tournamentId
        );


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


        console.log(
            "👥 Firebase team count:",
            snapshot.size
        );


        totalTeamsEl.textContent =
            snapshot.size;


        teamListEl.innerHTML =
            "";


        /* =================================
           NO TEAMS
        ================================= */

        if (snapshot.empty) {

            showMessage(`
                👥 No registered teams yet.
                <br><br>
                <a
                    href="team-registration.html?id=${encodeURIComponent(tournamentId)}"
                    class="btn primary-btn"
                >
                    🏏 Register Team
                </a>
            `);

            return;
        }


        /* =================================
           DISPLAY TEAMS
        ================================= */

        snapshot.forEach((teamDoc) => {

            const team =
                teamDoc.data();


            const teamName =
                team.teamName ||
                team.name ||
                "Unnamed Team";


            const captain =
                team.captainName ||
                team.captain ||
                "-";


            const mobile =
                team.mobile ||
                "-";


            const city =
                team.city ||
                "-";


            const players =
                Array.isArray(team.players)
                    ? team.players
                    : [];


            const playerCount =
                team.playerCount ||
                players.length;


            const status =
                team.status ||
                "Pending";


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "team-card-home";


            card.innerHTML = `

                <h3>
                    🏏 ${teamName}
                </h3>

                <p>
                    👤 <b>Captain:</b>
                    ${captain}
                </p>

                <p>
                    📱 <b>Mobile:</b>
                    ${mobile}
                </p>

                <p>
                    🏙️ <b>City:</b>
                    ${city}
                </p>

                <p>
                    👥 <b>Players:</b>
                    ${playerCount}
                </p>

                <span class="status-badge">
                    ${status}
                </span>

            `;


            teamListEl.appendChild(
                card
            );

        });


    } catch (error) {

        console.error(
            "❌ LOAD TEAMS ERROR:",
            error
        );


        totalTeamsEl.textContent =
            "0";


        showMessage(`
            ❌ Unable to load registered teams.
            <br><br>
            ${error.message}
        `);
    }
}


/* =========================================
   MAIN LOAD
========================================= */

async function loadHome() {

    try {

        const tournamentId =
            getTournamentId();


        console.log(
            "🏆 HOME TOURNAMENT:",
            tournamentId
        );


        if (!tournamentId) {

            tournamentNameEl.textContent =
                "Select Tournament";

            tournamentIdEl.textContent =
                "-";

            totalTeamsEl.textContent =
                "0";

            showMessage(`
                🏆 Please select a tournament.
                <br><br>
                <a
                    href="my-tournaments.html"
                    class="btn primary-btn"
                >
                    Select Tournament
                </a>
            `);

            return;
        }


        await loadTournament(
            tournamentId
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ HOME LOAD ERROR:",
            error
        );


        showMessage(
            "❌ Unable to load tournament."
        );
    }
}


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    async () => {

        await loadHome();

    }
);