import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 TEAM JS LOADED");


/* =========================================
   ELEMENTS
========================================= */

const tournamentName =
    document.getElementById("tournamentName");

const tournamentIdElement =
    document.getElementById("tournamentId");

const venue =
    document.getElementById("venue");

const totalTeams =
    document.getElementById("totalTeams");

const teamList =
    document.getElementById("teamList");

const tournamentLink =
    document.getElementById("tournamentLink");

const registrationLink =
    document.getElementById("registrationLink");

const scheduleLink =
    document.getElementById("scheduleLink");


/* =========================================
   GET TOURNAMENT ID
========================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


let tournamentId =
    params.get("id");


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


console.log(
    "🏆 Teams Tournament ID:",
    tournamentId
);


/* =========================================
   NO ID
========================================= */

if (!tournamentId) {

    tournamentName.textContent =
        "No Tournament Selected";

    tournamentIdElement.textContent =
        "-";

    venue.textContent =
        "-";

    teamList.innerHTML = `
        <div class="message">

            ❌ Tournament ID Missing

            <br><br>

            Please open Teams
            from Dashboard.

        </div>
    `;

} else {

    startTeamsPage();

}


/* =========================================
   START
========================================= */

async function startTeamsPage() {

    try {

        /* SAVE ID */

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );

        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );


        /* =====================================
           LOAD TOURNAMENT
        ===================================== */

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


        if (!tournamentSnap.exists()) {

            tournamentName.textContent =
                "Tournament Not Found";

            tournamentIdElement.textContent =
                tournamentId;

            teamList.innerHTML = `
                <div class="message">

                    ❌ Tournament not found.

                    <br><br>

                    ID:
                    ${tournamentId}

                </div>
            `;

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


        const tournamentVenue =
            tournament.venue ||
            tournament.location ||
            "Not Set";


        tournamentName.textContent =
            name;


        tournamentIdElement.textContent =
            tournamentId;


        venue.textContent =
            tournamentVenue;


        /* =====================================
           LINKS
        ===================================== */

        tournamentLink.href =
            `./dashboard.html?id=${encodeURIComponent(tournamentId)}`;


        registrationLink.href =
            `./registration.html?id=${encodeURIComponent(tournamentId)}`;


        scheduleLink.href =
            `./schedule.html?id=${encodeURIComponent(tournamentId)}`;


        /* =====================================
           LOAD TEAMS
        ===================================== */

        await loadTeams();


    } catch (error) {

        console.error(
            "❌ TEAM PAGE ERROR:",
            error
        );


        teamList.innerHTML = `
            <div class="message">

                ❌ Unable to load Teams.

                <br><br>

                ${error.message}

            </div>
        `;

    }

}


/* =========================================
   LOAD TEAMS
========================================= */

async function loadTeams() {

    try {

        console.log(
            "👥 Loading teams..."
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
            "👥 Tournament teams:",
            snapshot.size
        );


        totalTeams.textContent =
            snapshot.size;


        /* =====================================
           NO TEAMS
        ===================================== */

        if (snapshot.empty) {

            teamList.innerHTML = `
                <div class="message">

                    👥 No registered teams yet.

                    <br><br>

                    Click
                    <b>Register Team</b>
                    to add a team.

                </div>
            `;

            return;
        }


        /* =====================================
           DISPLAY TEAMS
        ===================================== */

        teamList.innerHTML = "";


        snapshot.forEach(
            (teamDoc) => {

                const team =
                    teamDoc.data();


                const teamName =
                    team.teamName ||
                    team.name ||
                    "Unnamed Team";


                const captain =
                    team.captainName ||
                    team.captain ||
                    "Not provided";


                const mobile =
                    team.mobile ||
                    team.phone ||
                    "Not provided";


                const city =
                    team.city ||
                    team.area ||
                    "Not provided";


                const players =
                    Array.isArray(
                        team.players
                    )
                    ? team.players
                    : [];


                const status =
                    team.status ||
                    "Pending";


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                card.innerHTML = `

                    <h3>
                        🏏 ${teamName}
                    </h3>

                    <p>
                        👤
                        <b>Captain:</b>
                        ${captain}
                    </p>

                    <p>
                        📱
                        <b>Mobile:</b>
                        ${mobile}
                    </p>

                    <p>
                        🏙️
                        <b>City:</b>
                        ${city}
                    </p>

                    <p>
                        👥
                        <b>Players:</b>
                        ${
                            players.length
                            ? players.join(", ")
                            : "Not provided"
                        }
                    </p>

                    <span class="status">
                        ${status}
                    </span>

                `;


                teamList.appendChild(
                    card
                );

            }
        );


        console.log(
            "✅ Teams displayed:",
            snapshot.size
        );


    } catch (error) {

        console.error(
            "❌ Team loading error:",
            error
        );


        totalTeams.textContent =
            "0";


        teamList.innerHTML = `
            <div class="message">

                ❌ Unable to load registered teams.

                <br><br>

                ${error.message}

            </div>
        `;

    }

}