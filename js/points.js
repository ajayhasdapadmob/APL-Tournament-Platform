// ========================================
// POINTS TABLE
// APL TOURNAMENT PLATFORM
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
// ELEMENTS
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

    let id =
        params.get("id");

    if (!id) {
        id =
            params.get("tournamentId");
    }

    if (!id) {
        id =
            localStorage.getItem(
                "selectedTournamentId"
            );
    }

    if (!id) {
        id =
            localStorage.getItem(
                "tournamentId"
            );
    }

    return id
        ? String(id).trim()
        : null;
}


// ========================================
// SAVE TOURNAMENT
// ========================================

function saveTournamentId(id) {

    if (!id) return;

    localStorage.setItem(
        "selectedTournamentId",
        id
    );

    localStorage.setItem(
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

            pointsHeader.innerHTML = `
                <h2>
                    ❌ No Tournament Found
                </h2>
            `;

            return;
        }


        // ========================================
        // ADD EVERY TOURNAMENT
        // ========================================

        snapshot.forEach(
            tournamentDoc => {

                const data =
                    tournamentDoc.data();


                console.log(
                    "🏆 TOURNAMENT:",
                    tournamentDoc.id,
                    data
                );


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


        console.log(
            "✅ ALL TOURNAMENTS ADDED TO DROPDOWN"
        );


        // ========================================
        // SELECT SAVED TOURNAMENT
        // ========================================

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
                tournamentSelect.options[0].value;

        }


        tournamentSelect.value =
            selectedId;


        saveTournamentId(
            selectedId
        );


        console.log(
            "🏆 SELECTED:",
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

        pointsHeader.innerHTML = `
            <h2>❌ Error</h2>
            <p>${escapeHTML(error.message)}</p>
        `;

    }

}


// ========================================
// LOAD SELECTED TOURNAMENT
// ========================================

async function loadTournament(id) {

    if (!id) return;


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

            pointsHeader.innerHTML = `
                <h2>
                    ❌ Tournament Not Found
                </h2>
            `;

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
            tournament.totalTeams ||
            tournament.teamCount ||
            0;


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


        saveTournamentId(id);


        // ========================================
        // UPDATE LINKS
        // ========================================

        const query =
            "?id=" +
            encodeURIComponent(id);


        if (tournamentLink) {

            tournamentLink.href =
                "tournament.html" + query;

        }


        if (teamsLink) {

            teamsLink.href =
                "teams.html" + query;

        }


        if (scheduleLink) {

            scheduleLink.href =
                "schedule.html" + query;

        }


        if (resultsLink) {

            resultsLink.href =
                "results.html" + query;

        }


        if (liveScoreLink) {

            liveScoreLink.href =
                "live-score.html" + query;

        }


        // ========================================
        // LOAD POINTS
        // ========================================

        await loadPointsTable(id);


    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );

        pointsHeader.innerHTML = `
            <h2>❌ Error</h2>
            <p>${escapeHTML(error.message)}</p>
        `;

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


    pointsBody.innerHTML = `
        <tr>
            <td colspan="8">
                ⏳ Loading...
            </td>
        </tr>
    `;


    try {

        // ========================================
        // LOAD TEAMS
        // ========================================

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


        const teamMap = new Map();


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
                        id: teamDoc.id,
                        name: teamName,
                        played: 0,
                        won: 0,
                        lost: 0,
                        nr: 0,
                        points: 0,
                        nrr: Number(
                            team.nrr || 0
                        )
                    }
                );

            }
        );


        // ========================================
        // LOAD MATCHES
        // ========================================

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


        // ========================================
        // PROCESS MATCHES
        // ========================================

        matchesSnapshot.forEach(
            matchDoc => {

                const match =
                    matchDoc.data();


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


                const result =
                    String(
                        match.result || ""
                    ).trim();


                if (!result) {

                    return;

                }


                // Find teams by name

                let teamAData =
                    findTeam(
                        teamMap,
                        teamA
                    );


                let teamBData =
                    findTeam(
                        teamMap,
                        teamB
                    );


                if (!teamAData || !teamBData) {

                    return;

                }


                teamAData.played++;
                teamBData.played++;


                const resultLower =
                    result.toLowerCase();


                // ==================================
                // NO RESULT
                // ==================================

                if (
                    resultLower.includes(
                        "no result"
                    ) ||
                    resultLower === "nr"
                ) {

                    teamAData.nr++;
                    teamBData.nr++;

                    teamAData.points += 1;
                    teamBData.points += 1;

                    return;

                }


                // ==================================
                // DRAW / TIE
                // ==================================

                if (
                    resultLower.includes(
                        "tie"
                    ) ||
                    resultLower.includes(
                        "draw"
                    )
                ) {

                    teamAData.points += 1;
                    teamBData.points += 1;

                    return;

                }


                // ==================================
                // WINNER
                // ==================================

                if (
                    resultLower.includes(
                        String(teamA).toLowerCase()
                    )
                ) {

                    teamAData.won++;
                    teamAData.points += 2;
                    teamBData.lost++;

                }

                else if (
                    resultLower.includes(
                        String(teamB).toLowerCase()
                    )
                ) {

                    teamBData.won++;
                    teamBData.points += 2;
                    teamAData.lost++;

                }

            }
        );


        // ========================================
        // NO TEAMS
        // ========================================

        if (teamMap.size === 0) {

            pointsBody.innerHTML = `

                <tr>

                    <td colspan="8">

                        👥 No teams found.

                        <br><br>

                        Please add teams
                        to this tournament.

                    </td>

                </tr>

            `;

            return;

        }


        // ========================================
        // SORT
        // ========================================

        const teams =
            Array.from(
                teamMap.values()
            );


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
                    b.won !==
                    a.won
                ) {

                    return (
                        b.won -
                        a.won
                    );

                }


                return (
                    b.nrr -
                    a.nrr
                );

            }
        );


        // ========================================
        // DISPLAY
        // ========================================

        pointsBody.innerHTML = "";


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
                        <b>
                            ${team.points}
                        </b>
                    </td>

                    <td>
                        ${team.nrr.toFixed(3)}
                    </td>

                `;


                pointsBody.appendChild(
                    row
                );

            }
        );


        console.log(
            "✅ POINTS TABLE DISPLAYED"
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
                        error.message
                    )}

                </td>

            </tr>

        `;

    }

}


// ========================================
// FIND TEAM
// ========================================

function findTeam(
    teamMap,
    name
) {

    if (!name) return null;


    const search =
        String(name)
        .trim()
        .toLowerCase();


    for (
        const team of teamMap.values()
    ) {

        if (
            team.name
                .trim()
                .toLowerCase()
            === search
        ) {

            return team;

        }

    }


    return null;

}


// ========================================
// DROPDOWN CHANGE
// ========================================

if (tournamentSelect) {

    tournamentSelect.addEventListener(
        "change",
        async function() {

            const id =
                this.value;


            if (!id) return;


            console.log(
                "🔄 TOURNAMENT CHANGED:",
                id
            );


            saveTournamentId(id);


            await loadTournament(
                id
            );

        }
    );

}


// ========================================
// SAFE HTML
// ========================================

function escapeHTML(value) {

    return String(value)
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
// START
// ========================================

loadTournaments();


console.log(
    "🚀 POINTS TABLE READY"
);