// ========================================
// CREATE-MATCH.JS
// APL TOURNAMENT PLATFORM
// ========================================

import { db } from "../firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 CREATE MATCH JS STARTED");


// ========================================
// HTML ELEMENTS
// ========================================

const matchForm =
    document.getElementById("matchForm");

const tournamentInfo =
    document.getElementById("tournamentInfo");

const team1Select =
    document.getElementById("team1");

const team2Select =
    document.getElementById("team2");

const venueInput =
    document.getElementById("venue") ||
    document.getElementById("matchVenue");

const messageElement =
    document.getElementById("message");

const createMatchBtn =
    document.getElementById("createMatchBtn");

const scheduleLink =
    document.getElementById("scheduleLink");

const liveLink =
    document.getElementById("liveLink");


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

    if (!id) {
        id =
            sessionStorage.getItem(
                "selectedTournamentId"
            );
    }

    if (!id) {
        id =
            sessionStorage.getItem(
                "tournamentId"
            );
    }

    if (id) {
        id =
            String(id).trim();
    }

    console.log(
        "🏆 CREATE MATCH TOURNAMENT ID:",
        id
    );

    return id || null;
}


let tournamentId =
    getTournamentId();


// ========================================
// SAVE TOURNAMENT ID
// ========================================

function saveTournamentId(id) {

    if (!id) return;

    const cleanId =
        String(id).trim();

    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    localStorage.setItem(
        "tournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );

    console.log(
        "💾 Tournament ID saved:",
        cleanId
    );
}


// ========================================
// SHOW MESSAGE
// ========================================

function showMessage(
    text,
    type = "success"
) {

    console.log(
        type === "error"
            ? "❌"
            : "✅",
        text
    );

    if (!messageElement) return;

    messageElement.textContent =
        text;

    messageElement.className =
        "message " + type;

    messageElement.style.display =
        "block";
}


// ========================================
// LOAD TOURNAMENT
// ========================================

async function loadTournament() {

    if (!tournamentId) {

        showMessage(
            "❌ Tournament ID missing.",
            "error"
        );

        return false;
    }

    try {

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

            throw new Error(
                "Tournament not found: " +
                tournamentId
            );
        }

        const tournament =
            tournamentSnap.data();

        console.log(
            "✅ Tournament loaded:",
            tournament
        );


        const name =
            tournament.tournamentName ||
            tournament.name ||
            tournament.title ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "";


        // ========================================
        // TOURNAMENT INFORMATION
        // ========================================

        if (tournamentInfo) {

            tournamentInfo.innerHTML = `

                <strong>
                    🏆 ${escapeHTML(name)}
                </strong>

                <br><br>

                🆔 Tournament ID:
                ${escapeHTML(tournamentId)}

                ${
                    venue
                    ?
                    `
                    <br><br>
                    📍 Venue:
                    ${escapeHTML(venue)}
                    `
                    :
                    ""
                }

            `;

        }


        // ========================================
        // AUTO FILL VENUE
        // ========================================

        if (
            venueInput &&
            !venueInput.value.trim()
        ) {

            venueInput.value =
                venue;

        }


        // ========================================
        // SAVE ID
        // ========================================

        saveTournamentId(
            tournamentId
        );


        // ========================================
        // LINKS
        // ========================================

        const encodedId =
            encodeURIComponent(
                tournamentId
            );


        if (scheduleLink) {

            scheduleLink.href =
                `schedule.html?id=${encodedId}`;

        }


        if (liveLink) {

            liveLink.href =
                `live-score.html?id=${encodedId}`;

        }


        return true;


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );

        showMessage(
            "❌ " + error.message,
            "error"
        );

        return false;
    }
}


// ========================================
// LOAD TEAMS
// ========================================

async function loadTeams() {

    if (!tournamentId) {

        console.error(
            "❌ Tournament ID missing while loading teams."
        );

        return [];

    }


    try {

        console.log(
            "🔥 Loading teams..."
        );

        console.log(
            "📂 Firebase teams path:",
            `tournaments/${tournamentId}/teams`
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
            "📦 Teams found:",
            snapshot.size
        );


        if (!team1Select || !team2Select) {

            throw new Error(
                "Team select element not found in HTML."
            );

        }


        team1Select.innerHTML = `
            <option value="">
                Select Team 1
            </option>
        `;


        team2Select.innerHTML = `
            <option value="">
                Select Team 2
            </option>
        `;


        if (snapshot.empty) {

            team1Select.innerHTML = `
                <option value="">
                    ❌ No teams found
                </option>
            `;

            team2Select.innerHTML = `
                <option value="">
                    ❌ No teams found
                </option>
            `;


            showMessage(
                "❌ No teams found. Please register teams first.",
                "error"
            );


            if (createMatchBtn) {

                createMatchBtn.disabled =
                    true;

            }


            return [];

        }


        const teams = [];


        snapshot.forEach(
            teamDoc => {

                const data =
                    teamDoc.data();


                console.log(
                    "🏏 TEAM:",
                    teamDoc.id,
                    data
                );


                const teamName =
                    data.teamName ||
                    data.name ||
                    data.team ||
                    data.teamName1 ||
                    data.team_name ||
                    "Unnamed Team";


                teams.push({

                    id:
                        teamDoc.id,

                    name:
                        String(
                            teamName
                        ).trim()

                });

            }
        );


        // ========================================
        // SORT TEAMS
        // ========================================

        teams.sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        );


        // ========================================
        // ADD TEAMS
        // ========================================

        teams.forEach(
            team => {

                const option1 =
                    document.createElement(
                        "option"
                    );

                option1.value =
                    team.id;

                option1.textContent =
                    team.name;


                team1Select.appendChild(
                    option1
                );


                const option2 =
                    document.createElement(
                        "option"
                    );

                option2.value =
                    team.id;

                option2.textContent =
                    team.name;


                team2Select.appendChild(
                    option2
                );

            }
        );


        console.log(
            "✅ Teams loaded:",
            teams
        );


        // ========================================
        // TEAM COUNT
        // ========================================

        if (teams.length < 2) {

            showMessage(
                "⚠️ At least 2 teams are required.",
                "error"
            );


            if (createMatchBtn) {

                createMatchBtn.disabled =
                    true;

            }

        } else {

            if (createMatchBtn) {

                createMatchBtn.disabled =
                    false;

            }


            console.log(
                "✅ Enough teams available."
            );

        }


        return teams;


    } catch (error) {

        console.error(
            "❌ TEAM LOAD ERROR:",
            error
        );


        showMessage(
            "❌ Unable to load teams: " +
            error.message,
            "error"
        );


        return [];

    }

}


// ========================================
// CREATE MATCH
// ========================================

if (matchForm) {

    matchForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            console.log(
                "🚀 CREATE MATCH SUBMITTED"
            );


            if (!tournamentId) {

                showMessage(
                    "❌ Tournament ID missing.",
                    "error"
                );

                return;

            }


            const matchNumber =
                document.getElementById(
                    "matchNumber"
                )?.value.trim();


            const matchDate =
                document.getElementById(
                    "matchDate"
                )?.value;


            const matchTime =
                document.getElementById(
                    "matchTime"
                )?.value;


            const overs =
                Number(
                    document.getElementById(
                        "overs"
                    )?.value || 20
                );


            const team1Id =
                team1Select?.value;


            const team2Id =
                team2Select?.value;


            const venue =
                venueInput?.value.trim();


            const status =
                document.getElementById(
                    "status"
                )?.value ||
                "Scheduled";


            // ========================================
            // VALIDATION
            // ========================================

            if (!matchNumber) {

                showMessage(
                    "❌ Please enter Match Number.",
                    "error"
                );

                return;
            }


            if (!team1Id || !team2Id) {

                showMessage(
                    "❌ Please select both teams.",
                    "error"
                );

                return;
            }


            if (team1Id === team2Id) {

                showMessage(
                    "❌ Team 1 and Team 2 cannot be same.",
                    "error"
                );

                return;
            }


            if (!matchDate) {

                showMessage(
                    "❌ Please select match date.",
                    "error"
                );

                return;
            }


            if (!matchTime) {

                showMessage(
                    "❌ Please select match time.",
                    "error"
                );

                return;
            }


            if (!venue) {

                showMessage(
                    "❌ Please enter venue.",
                    "error"
                );

                return;
            }


            try {

                if (createMatchBtn) {

                    createMatchBtn.disabled =
                        true;

                    createMatchBtn.textContent =
                        "⏳ Creating Match...";

                }


                // ========================================
                // LOAD TEAM 1
                // ========================================

                const team1Ref =
                    doc(
                        db,
                        "tournaments",
                        tournamentId,
                        "teams",
                        team1Id
                    );


                // ========================================
                // LOAD TEAM 2
                // ========================================

                const team2Ref =
                    doc(
                        db,
                        "tournaments",
                        tournamentId,
                        "teams",
                        team2Id
                    );


                const [
                    team1Snap,
                    team2Snap
                ] =
                    await Promise.all([
                        getDoc(team1Ref),
                        getDoc(team2Ref)
                    ]);


                if (
                    !team1Snap.exists() ||
                    !team2Snap.exists()
                ) {

                    throw new Error(
                        "Selected team document not found."
                    );

                }


                const team1Data =
                    team1Snap.data();


                const team2Data =
                    team2Snap.data();


                const team1Name =
                    team1Data.teamName ||
                    team1Data.name ||
                    team1Data.team ||
                    "Team 1";


                const team2Name =
                    team2Data.teamName ||
                    team2Data.name ||
                    team2Data.team ||
                    "Team 2";


                // ========================================
                // MATCH DATA
                // ========================================

                const matchData = {

                    tournamentId:
                        tournamentId,

                    matchNumber:
                        Number(matchNumber),

                    team1Id:
                        team1Id,

                    team1Name:
                        team1Name,

                    team2Id:
                        team2Id,

                    team2Name:
                        team2Name,

                    teamA:
                        team1Name,

                    teamB:
                        team2Name,

                    date:
                        matchDate,

                    time:
                        matchTime,

                    matchDate:
                        matchDate,

                    matchTime:
                        matchTime,

                    venue:
                        venue,

                    overs:
                        overs,

                    status:
                        status,

                    scoreA:
                        "0/0",

                    scoreB:
                        "0/0",

                    winner:
                        "",

                    result:
                        "",

                    currentInnings:
                        1,

                    currentOver:
                        0,

                    currentBall:
                        0,

                    totalRuns:
                        0,

                    totalWickets:
                        0,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                };


                console.log(
                    "📦 MATCH DATA:",
                    matchData
                );


                // ========================================
                // FIRESTORE MATCH COLLECTION
                // ========================================

                const matchesRef =
                    collection(
                        db,
                        "tournaments",
                        tournamentId,
                        "matches"
                    );


                const matchDoc =
                    await addDoc(
                        matchesRef,
                        matchData
                    );


                console.log(
                    "✅ MATCH CREATED:",
                    matchDoc.id
                );


                // ========================================
                // SAVE MATCH ID
                // ========================================

                localStorage.setItem(
                    "selectedMatchId",
                    matchDoc.id
                );

                localStorage.setItem(
                    "matchId",
                    matchDoc.id
                );

                sessionStorage.setItem(
                    "selectedMatchId",
                    matchDoc.id
                );

                sessionStorage.setItem(
                    "matchId",
                    matchDoc.id
                );


                // ========================================
                // SUCCESS
                // ========================================

                showMessage(
                    "✅ Match created successfully! Match ID: " +
                    matchDoc.id,
                    "success"
                );


                if (createMatchBtn) {

                    createMatchBtn.textContent =
                        "✅ Match Created";

                }


// ========================================
                // OPEN SCORECARD
                // ========================================

                setTimeout(
                    () => {

                        window.location.href =
                            `scorecard.html?id=${encodeURIComponent(
                                tournamentId
                            )}&matchId=${encodeURIComponent(
                                matchDoc.id
                            )}`;

                    },
                    1200
                );


            } catch (error) {

                console.error(
                    "❌ CREATE MATCH ERROR:",
                    error
                );


                showMessage(
                    "❌ Match creation failed: " +
                    error.message,
                    "error"
                );


                if (createMatchBtn) {

                    createMatchBtn.disabled =
                        false;

                    createMatchBtn.textContent =
                        "🏏 Create Match";

                }

            }

        }
    );

} else {

    console.error(
        "❌ matchForm NOT FOUND"
    );

}


// ========================================
// INIT
// ========================================

async function init() {

    console.log(
        "🚀 CREATE MATCH INIT"
    );


    if (!tournamentId) {

        showMessage(
            "❌ Tournament ID missing. Open Create Match from your tournament.",
            "error"
        );

        return;
    }


    saveTournamentId(
        tournamentId
    );


    // ========================================
    // LOAD TOURNAMENT
    // ========================================

    const loaded =
        await loadTournament();


    if (!loaded) {

        return;

    }


    // ========================================
    // LOAD TEAMS
    // ========================================

    await loadTeams();


    console.log(
        "🏁 CREATE MATCH READY"
    );

}


init();


// ========================================
// SAFE HTML
// ========================================

function escapeHTML(value) {

    return String(
        value ?? ""
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