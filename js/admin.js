import { auth, db } from "./../firebase.js";

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


console.log("🔥 ADMIN JS LOADED");


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


const params =
    new URLSearchParams(
        window.location.search
    );

const urlTournamentId =
    params.get("id");


/* =========================
   RESET
========================= */

function resetCounters() {

    totalTeams.textContent = "0";
    pendingTeams.textContent = "0";
    approvedTeams.textContent = "0";
    rejectedTeams.textContent = "0";
    paidTeams.textContent = "0";
    holdTeams.textContent = "0";
    cancelledTeams.textContent = "0";

}


/* =========================
   LOAD TOURNAMENTS
========================= */

async function loadTournaments() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments"
                )
            );


        console.log(
            "🏆 TOURNAMENTS:",
            snapshot.size
        );


        tournamentSelect.innerHTML = `
            <option value="">
                -- Select Tournament --
            </option>
        `;


        snapshot.forEach(
            tournamentDoc => {

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
                    tournamentDoc.id;


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        if (urlTournamentId) {

            tournamentSelect.value =
                urlTournamentId;

            await loadTeams(
                urlTournamentId
            );

        }

        else if (!snapshot.empty) {

            const firstId =
                snapshot.docs[0].id;


            tournamentSelect.value =
                firstId;


            await loadTeams(
                firstId
            );

        }

    } catch (error) {

        console.error(
            "❌ TOURNAMENT ERROR:",
            error
        );


        teamList.innerHTML =
            `
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

        teamList.innerHTML =
            `
            <div class="empty">
                Select a tournament.
            </div>
            `;

        resetCounters();

        return;
    }


    try {

        console.log(
            "📁 Loading:",
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
            "👥 TEAMS FOUND:",
            snapshot.size
        );


        let total = 0;
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        let paid = 0;
        let hold = 0;
        let cancelled = 0;


        teamList.innerHTML = "";


        if (snapshot.empty) {

            teamList.innerHTML =
                `
                <div class="empty">
                    👥 No Teams Registered
                </div>
                `;

        }


        snapshot.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();


                const status =
                    team.status ||
                    "Pending";


                total++;


                if (status === "Pending")
                    pending++;

                if (status === "Approved")
                    approved++;

                if (status === "Rejected")
                    rejected++;

                if (status === "Paid")
                    paid++;

                if (status === "On Hold")
                    hold++;

                if (status === "Cancelled")
                    cancelled++;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                const players =
                    Array.isArray(team.players)
                        ? team.players.join(", ")
                        : team.players || "-";


                card.innerHTML = `

                    <h3>
                        🏏 ${team.teamName || "-"}
                    </h3>

                    <p>
                        🆔 <b>Team ID:</b>
                        ${teamDoc.id}
                    </p>

                    <p>
                        🏆 <b>Tournament:</b>
                        ${team.tournamentName || "-"}
                    </p>

                    <p>
                        👤 <b>Captain:</b>
                        ${team.captainName || "-"}
                    </p>

                    <p>
                        📞 <b>Mobile:</b>
                        ${team.mobile || "-"}
                    </p>

                    <p>
                        📧 <b>Email:</b>
                        ${team.email || "-"}
                    </p>

                    <p>
                        🏙️ <b>City:</b>
                        ${team.city || "-"}
                    </p>

                    <p>
                        👥 <b>Players:</b>
                        ${players}
                    </p>

                    <p class="status">
                        📌 Status:
                        <b>${status}</b>
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


                card.querySelectorAll(
                    "[data-status]"
                ).forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                updateTeamStatus(
                                    tournamentId,
                                    teamDoc.id,
                                    button.dataset.status
                                );

                            }
                        );

                    }
                );


                card.querySelector(
                    "[data-delete]"
                ).addEventListener(
                    "click",
                    () => {

                        deleteTeam(
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


    } catch (error) {

        console.error(
            "❌ TEAM LOAD ERROR:",
            error
        );


        teamList.innerHTML =
            `
            <div class="empty">
                ❌ ${error.message}
            </div>
            `;

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

        await updateDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "teams",
                teamId
            ),

            {
                status: status
            }

        );


        alert(
            "✅ Status updated: " +
            status
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ " +
            error.message
        );

    }

}


/* =========================
   DELETE
========================= */

async function deleteTeam(
    tournamentId,
    teamId
) {

    if (
        !confirm(
            "क्या आप इस team को delete करना चाहते हैं?"
        )
    ) {

        return;

    }


    try {

        await deleteDoc(

            doc(
                db,
                "tournaments",
                tournamentId,
                "teams",
                teamId
            )

        );


        alert(
            "🗑️ Team Deleted"
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ " +
            error.message
        );

    }

}


/* =========================
   SELECT CHANGE
========================= */

tournamentSelect.addEventListener(
    "change",
    () => {

        loadTeams(
            tournamentSelect.value
        );

    }
);


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        console.log(
            "✅ ADMIN USER:",
            user.uid
        );


        await loadTournaments();

    }
);