// ========================================
// MY TOURNAMENTS JS
// APL TOURNAMENT PLATFORM
// ========================================

console.log("🔥 MY TOURNAMENTS JS LOADED");


import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ========================================
// ELEMENT
// ========================================

const tournamentList =
    document.getElementById("tournamentList");


if (!tournamentList) {

    console.error(
        "❌ tournamentList not found"
    );

    throw new Error(
        "tournamentList not found"
    );
}


// ========================================
// MESSAGE
// ========================================

function showMessage(html) {

    tournamentList.innerHTML = `
        <div class="empty">
            ${html}
        </div>
    `;

}


// ========================================
// GET SELECTED TOURNAMENT ID
// ========================================

function getSelectedTournamentId() {

    return (
        localStorage.getItem(
            "selectedTournamentId"
        ) ||
        localStorage.getItem(
            "tournamentId"
        ) ||
        ""
    );

}


// ========================================
// SAVE SELECTED TOURNAMENT
// ========================================

function selectTournament(tournamentId) {

    if (!tournamentId) {

        console.error(
            "❌ Tournament ID missing"
        );

        return;

    }


    const cleanId =
        String(tournamentId).trim();


    if (!cleanId) return;


    // LOCAL STORAGE

    localStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    localStorage.setItem(
        "tournamentId",
        cleanId
    );


    // SESSION STORAGE

    sessionStorage.setItem(
        "selectedTournamentId",
        cleanId
    );

    sessionStorage.setItem(
        "tournamentId",
        cleanId
    );


    console.log(
        "✅ TOURNAMENT SELECTED:",
        cleanId
    );


    // GO HOME

    window.location.href =
        "index.html?id=" +
        encodeURIComponent(cleanId);

}


// ========================================
// LOAD TOURNAMENTS
// ========================================

async function loadTournaments(user) {

    console.log(
        "🔥 Loading tournaments for UID:",
        user.uid
    );


    showMessage(
        "⏳ Loading Tournaments..."
    );


    try {

        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        let tournaments = [];


        // =================================
        // SEARCH OWNER ID
        // =================================

        const ownerSnapshot =
            await getDocs(
                query(
                    tournamentsRef,
                    where(
                        "ownerId",
                        "==",
                        user.uid
                    )
                )
            );


        ownerSnapshot.forEach(
            tournamentDoc => {

                tournaments.push({

                    id:
                        tournamentDoc.id,

                    ...tournamentDoc.data()

                });

            }
        );


        console.log(
            "🔥 ownerId tournaments:",
            ownerSnapshot.size
        );


        // =================================
        // IF NOTHING FOUND
        // SEARCH createdBy
        // =================================

        if (
            tournaments.length === 0
        ) {

            const createdSnapshot =
                await getDocs(
                    query(
                        tournamentsRef,
                        where(
                            "createdBy",
                            "==",
                            user.uid
                        )
                    )
                );


            createdSnapshot.forEach(
                tournamentDoc => {

                    tournaments.push({

                        id:
                            tournamentDoc.id,

                        ...tournamentDoc.data()

                    });

                }
            );


            console.log(
                "🔥 createdBy tournaments:",
                createdSnapshot.size
            );

        }


        // =================================
        // REMOVE DUPLICATES
        // =================================

        const uniqueMap =
            new Map();


        tournaments.forEach(
            tournament => {

                uniqueMap.set(
                    tournament.id,
                    tournament
                );

            }
        );


        tournaments =
            Array.from(
                uniqueMap.values()
            );


        // =================================
        // NO TOURNAMENT
        // =================================

        if (
            tournaments.length === 0
        ) {

            showMessage(`

                <h2>
                    🏆 No Tournament Found
                </h2>

                <p>
                    अभी आपके account में कोई tournament नहीं है।
                </p>

                <br>

                <a
                    href="create-tournament.html"
                    class="create-button"
                >
                    ➕ Create Tournament
                </a>

            `);

            return;

        }


        // =================================
        // CLEAR
        // =================================

        tournamentList.innerHTML = "";


        // =================================
        // CURRENT SELECTED
        // =================================

        const selectedId =
            getSelectedTournamentId();


        // =================================
        // CREATE CARDS
        // =================================

        for (
            const tournament
            of tournaments
        ) {

            createTournamentCard(
                tournament,
                selectedId
            );

        }


        console.log(
            "✅ ALL TOURNAMENTS LOADED"
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );


        showMessage(`

            <h2>
                ❌ Error
            </h2>

            <p>
                ${error.message}
            </p>

        `);

    }

}


// ========================================
// CREATE TOURNAMENT CARD
// ========================================

function createTournamentCard(
    tournament,
    selectedId
) {

    const tournamentId =
        tournament.id;


    const name =
        tournament.tournamentName ||
        tournament.name ||
        tournament.title ||
        "Unnamed Tournament";


    const venue =
        tournament.venue ||
        tournament.location ||
        "Venue not available";


    const startDate =
        tournament.startDate ||
        "-";


    const endDate =
        tournament.endDate ||
        "-";


    const format =
        tournament.format ||
        tournament.tournamentFormat ||
        "-";


    const status =
        tournament.status ||
        "Active";


    const totalTeams =
        tournament.totalTeams ||
        0;


    const isSelected =
        String(selectedId) ===
        String(tournamentId);


    // =================================
    // CARD
    // =================================

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "tournament-card" +
        (
            isSelected
                ? " selected-tournament"
                : ""
        );


    card.innerHTML = `

        ${
            isSelected
                ? `
                    <div class="selected-label">
                        ✓ SELECTED TOURNAMENT
                    </div>
                `
                : ""
        }


        <h2>
            🏆 ${escapeHtml(name)}
        </h2>


        <div class="tournament-info">

            <p>
                🆔
                <b>Tournament ID:</b>
                ${escapeHtml(tournamentId)}
            </p>


            <p>
                📍
                <b>Venue:</b>
                ${escapeHtml(venue)}
            </p>


            <p>
                📅
                <b>Start:</b>
                ${escapeHtml(startDate)}
            </p>


            <p>
                📅
                <b>End:</b>
                ${escapeHtml(endDate)}
            </p>


            <p>
                🏏
                <b>Format:</b>
                ${escapeHtml(format)}
            </p>


            <p>
                📌
                <b>Status:</b>
                ${escapeHtml(status)}
            </p>

        </div>


        <div class="team-count">

            👥
            ${Number(totalTeams) || 0}
            Registered Teams

        </div>


        <div class="tournament-actions">


            <!-- SELECT -->

            <button
                type="button"
                class="select-btn"
                data-id="${escapeHtml(tournamentId)}"
            >
                ${
                    isSelected
                        ? "✓ Selected"
                        : "✓ Select Tournament"
                }
            </button>


            <!-- OPEN -->

            <a
                href="tournament.html?id=${encodeURIComponent(tournamentId)}"
                class="register-btn"
            >
                🏆 Open Tournament
            </a>


            <!-- TEAM -->

            <a
                href="team-registration.html?id=${encodeURIComponent(tournamentId)}"
                class="register-btn"
            >
                👥 Register Team
            </a>


            <!-- LIVE -->

            <a
                href="live-score.html?id=${encodeURIComponent(tournamentId)}"
                class="live-btn"
            >
                🔴 Live Score
            </a>


            <!-- SCHEDULE -->

            <a
                href="schedule.html?id=${encodeURIComponent(tournamentId)}"
                class="schedule-btn"
            >
                📅 Schedule
            </a>


            <!-- POINTS -->

            <a
                href="points.html?id=${encodeURIComponent(tournamentId)}"
                class="points-btn"
            >
                📊 Points Table
            </a>


            <!-- ADMIN -->

            <a
                href="admin.html?id=${encodeURIComponent(tournamentId)}"
                class="admin-btn"
            >
                ⚙️ Manage
            </a>

        </div>

    `;


    // =================================
    // SELECT BUTTON
    // =================================

    const selectButton =
        card.querySelector(
            ".select-btn"
        );


    selectButton.addEventListener(
        "click",
        () => {

            selectTournament(
                tournamentId
            );

        }
    );


    tournamentList.appendChild(
        card
    );

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================
// AUTH
// ========================================

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "🔥 AUTH STATE:",
            user
        );


        if (!user) {

            console.log(
                "❌ USER NOT LOGGED IN"
            );


            window.location.href =
                "login.html";


            return;

        }


        console.log(
            "✅ USER LOGGED IN:",
            user.uid
        );


        loadTournaments(
            user
        );

    }
);