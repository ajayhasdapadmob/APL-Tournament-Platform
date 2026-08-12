console.log("🔥 ADMIN JS LOADED");

import { db, auth } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const tournamentSelect =
    document.getElementById("tournamentSelect");

const teamList =
    document.getElementById("teamList");

const totalTeams =
    document.getElementById("totalTeams");

const pendingTeams =
    document.getElementById("pendingTeams");

const approvedTeams =
    document.getElementById("approvedTeams");

const rejectedTeams =
    document.getElementById("rejectedTeams");

const paidTeams =
    document.getElementById("paidTeams");

const holdTeams =
    document.getElementById("holdTeams");

const cancelledTeams =
    document.getElementById("cancelledTeams");


/* =========================
   URL TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const urlTournamentId =
    params.get("id");

console.log(
    "🏆 URL Tournament ID:",
    urlTournamentId
);


/* =========================
   LOAD TOURNAMENTS
========================= */

async function loadTournaments() {

    try {

        console.log(
            "🔥 Loading tournaments..."
        );


        const tournamentsSnapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments"
                )
            );


        console.log(
            "🏆 Tournaments found:",
            tournamentsSnapshot.size
        );


        tournamentSelect.innerHTML = `
            <option value="">
                -- Select Tournament --
            </option>
        `;


        tournamentsSnapshot.forEach(
            (tournamentDoc) => {

                const tournament =
                    tournamentDoc.data();


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournamentDoc.id;


                option.textContent =
                    tournament.tournamentName ||
                    tournament.name ||
                    "Unnamed Tournament";


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        /* =========================
           OPEN FROM URL
        ========================= */

        if (urlTournamentId) {

            const tournamentExists =
                [...tournamentSelect.options]
                    .some(
                        option =>
                            option.value ===
                            urlTournamentId
                    );


            if (tournamentExists) {

                tournamentSelect.value =
                    urlTournamentId;


                await loadTeams(
                    urlTournamentId
                );

            } else {

                teamList.innerHTML = `
                    <div class="empty">
                        ❌ Tournament not found
                    </div>
                `;

                resetCounters();

            }

            return;

        }


        /* =========================
           AUTO SELECT FIRST
        ========================= */

        if (!tournamentsSnapshot.empty) {

            const firstTournament =
                tournamentsSnapshot.docs[0];


            tournamentSelect.value =
                firstTournament.id;


            await loadTeams(
                firstTournament.id
            );

        }


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );


        teamList.innerHTML = `
            <div class="empty">
                ❌ ${error.message}
            </div>
        `;

    }

}


/* =========================
   LOAD TEAMS
========================= */

async function loadTeams(
    tournamentId
) {

    if (!tournamentId) {

        teamList.innerHTML = `
            <div class="empty">
                🏆 Please select a tournament.
            </div>
        `;

        resetCounters();

        return;

    }


    try {

        console.log(
            "🔥 Loading teams for:",
            tournamentId
        );


        const teamsRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "teams"
            );


        const teamsSnapshot =
            await getDocs(
                teamsRef
            );


        console.log(
            "👥 Teams found:",
            teamsSnapshot.size
        );


        let total = 0;
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        let paid = 0;
        let hold = 0;
        let cancelled = 0;


        teamList.innerHTML = "";


        /* =========================
           NO TEAMS
        ========================= */

        if (teamsSnapshot.empty) {

            teamList.innerHTML = `
                <div class="empty">
                    👥 No Teams Registered
                    <br><br>
                    Registration data will
                    appear here after submission.
                </div>
            `;

            resetCounters();

            return;

        }


        /* =========================
           LOOP TEAMS
        ========================= */

        teamsSnapshot.forEach(
            (teamDoc) => {

                const team =
                    teamDoc.data();


                const status =
                    team.status ||
                    "Pending";


                total++;


                /* =========================
                   COUNTERS
                ========================= */

                if (status === "Pending") {
                    pending++;
                }

                if (status === "Approved") {
                    approved++;
                }

                if (status === "Rejected") {
                    rejected++;
                }

                if (status === "Paid") {
                    paid++;
                }

                if (status === "On Hold") {
                    hold++;
                }

                if (status === "Cancelled") {
                    cancelled++;
                }


                /* =========================
                   PLAYERS
                ========================= */

                let playersText = "-";


                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    playersText =
                        team.players.join(
                            ", "
                        );

                } else if (
                    team.players
                ) {

                    playersText =
                        team.players;

                }


                /* =========================
                   CARD
                ========================= */

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                card.innerHTML = `

                    <h3>
                        🏏
                        ${
                            team.teamName ||
                            "Team"
                        }
                    </h3>

                    <p>
                        🆔
                        <b>Team ID:</b>
                        ${teamDoc.id}
                    </p>

                    <p>
                        🏆
                        <b>Tournament:</b>
                        ${
                            team.tournamentName ||
                            "-"
                        }
                    </p>

                    <p>
                        📍
                        <b>Venue:</b>
                        ${
                            team.venue ||
                            "-"
                        }
                    </p>

                    <p>
                        👤
                        <b>Captain:</b>
                        ${
                            team.captainName ||
                            "-"
                        }
                    </p>

                    <p>
                        📞
                        <b>Mobile:</b>
                        ${
                            team.mobile ||
                            "-"
                        }
                    </p>

                    <p>
                        📧
                        <b>Email:</b>
                        ${
                            team.email ||
                            "-"
                        }
                    </p>

                    <p>
                        🏙️
                        <b>City:</b>
                        ${
                            team.city ||
                            "-"
                        }
                    </p>

                    <p>
                        👥
                        <b>Players:</b>
                        ${playersText}
                    </p>

                    <p>
                        👥
                        <b>Player Count:</b>
                        ${
                            team.playerCount ||
                            (
                                Array.isArray(
                                    team.players
                                )
                                    ? team.players.length
                                    : 0
                            )
                        }
                    </p>

                    <p class="status">
                        📌
                        <b>Status:</b>
                        ${status}
                    </p>

                    <div class="action-buttons">

                        <button
                            class="pending-btn"
                            data-status="Pending"
                        >
                            ⏳ Pending
                        </button>

                        <button
                            class="approved-btn"
                            data-status="Approved"
                        >
                            ✅ Approved
                        </button>

                        <button
                            class="rejected-btn"
                            data-status="Rejected"
                        >
                            ❌ Rejected
                        </button>

                        <button
                            class="paid-btn"
                            data-status="Paid"
                        >
                            💰 Payment Paid
                        </button>

                        <button
                            class="hold-btn"
                            data-status="On Hold"
                        >
                            ⏸️ On Hold
                        </button>

                        <button
                            class="cancel-btn"
                            data-status="Cancelled"
                        >
                            🚫 Cancelled
                        </button>

                        <button
                            class="delete-btn"
                            data-delete="true"
                        >
                            🗑️ Delete
                        </button>

                    </div>

                `;


                /* =========================
                   STATUS BUTTONS
                ========================= */

                card
                    .querySelectorAll(
                        "[data-status]"
                    )
                    .forEach(
                        (button) => {

                            button.addEventListener(
                                "click",
                                async () => {

                                    await updateTeamStatus(
                                        tournamentId,
                                        teamDoc.id,
                                        button.dataset.status
                                    );

                                }
                            );

                        }
                    );


                /* =========================
                   DELETE
                ========================= */

                const deleteButton =
                    card.querySelector(
                        "[data-delete]"
                    );


                deleteButton.addEventListener(
                    "click",
                    async () => {

                        await deleteTeam(
                            tournamentId,
                            teamDoc.id
                        );

                    }
                );


                teamList.appendChild(
                    card
                );

            }
        );


        /* =========================
           UPDATE COUNTERS
        ========================= */

        totalTeams.textContent =
            total;

        pendingTeams.textContent =
            pending;

        approvedTeams.textContent =
            approved;

        rejectedTeams.textContent =
            rejected;

        paidTeams.textContent =
            paid;

        holdTeams.textContent =
            hold;

        cancelledTeams.textContent =
            cancelled;


        console.log(
            "📊 Counters:",
            {
                total,
                pending,
                approved,
                rejected,
                paid,
                hold,
                cancelled
            }
        );


    } catch (error) {

        console.error(
            "❌ TEAM LOAD ERROR:",
            error
        );


        teamList.innerHTML = `
            <div class="empty">
                ❌ Team Load Error
                <br><br>
                ${error.message}
            </div>
        `;

        resetCounters();

    }

}


/* =========================
   UPDATE STATUS
========================= */

async function updateTeamStatus(
    tournamentId,
    teamId,
    status
) {

    try {

        console.log(
            "🔄 Updating:",
            teamId,
            status
        );


        const teamRef =
            doc(
                db,
                "tournaments",
                tournamentId,
                "teams",
                teamId
            );


        await updateDoc(
            teamRef,
            {
                status: status
            }
        );


        console.log(
            "✅ Status updated"
        );


        alert(
            "✅ Team status updated to " +
            status
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ UPDATE ERROR:",
            error
        );


        alert(
            "❌ Update failed: " +
            error.message
        );

    }

}


/* =========================
   DELETE TEAM
========================= */

async function deleteTeam(
    tournamentId,
    teamId
) {

    const confirmDelete =
        confirm(
            "क्या आप इस team को delete करना चाहते हैं?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        const teamRef =
            doc(
                db,
                "tournaments",
                tournamentId,
                "teams",
                teamId
            );


        await deleteDoc(
            teamRef
        );


        console.log(
            "🗑️ Team deleted:",
            teamId
        );


        alert(
            "🗑️ Team Deleted"
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ DELETE ERROR:",
            error
        );


        alert(
            "❌ Delete failed: " +
            error.message
        );

    }

}


/* =========================
   RESET COUNTERS
========================= */

function resetCounters() {

    totalTeams.textContent =
        "0";

    pendingTeams.textContent =
        "0";

    approvedTeams.textContent =
        "0";

    rejectedTeams.textContent =
        "0";

    paidTeams.textContent =
        "0";

    holdTeams.textContent =
        "0";

    cancelledTeams.textContent =
        "0";

}


/* =========================
   TOURNAMENT CHANGE
========================= */

tournamentSelect.addEventListener(
    "change",
    async function () {

        console.log(
            "🏆 Selected tournament:",
            this.value
        );


        await loadTeams(
            this.value
        );

    }
);


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        console.log(
            "🔥 ADMIN USER:",
            user.uid
        );


        await loadTournaments();

    }
);