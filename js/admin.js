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
   FIREBASE TEST
========================= */

console.log("🔥 FIREBASE TEST START");

try {

    const testSnapshot =
        await getDocs(
            collection(
                db,
                "tournaments"
            )
        );

    console.log(
        "🔥 FIRESTORE TOURNAMENT COUNT:",
        testSnapshot.size
    );

    testSnapshot.forEach(
        (tournamentDoc) => {

            console.log(
                "🏆 TOURNAMENT:",
                tournamentDoc.id,
                tournamentDoc.data()
            );

        }
    );

} catch (error) {

    console.error(
        "❌ FIRESTORE ERROR:",
        error
    );

}


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


        tournamentSelect.innerHTML = `
            <option value="">
                -- Select Tournament --
            </option>
        `;


        snapshot.forEach(
            (tournamentDoc) => {

                const t =
                    tournamentDoc.data();

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    tournamentDoc.id;

                option.textContent =
                    t.tournamentName ||
                    t.name ||
                    "Unnamed Tournament";

                tournamentSelect.appendChild(
                    option
                );

            }
        );


        /* =========================
           URL ID
        ========================= */

        if (urlTournamentId) {

            tournamentSelect.value =
                urlTournamentId;

            loadTeams(
                urlTournamentId
            );

        }


        /*
         * अगर URL ID नहीं है और
         * tournament मौजूद है तो
         * पहला tournament select करें
         */

        else if (!snapshot.empty) {

            const firstTournamentId =
                snapshot.docs[0].id;

            tournamentSelect.value =
                firstTournamentId;

            loadTeams(
                firstTournamentId
            );

        }


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );

        teamList.innerHTML =
            `<div class="empty">
                ❌ ${error.message}
            </div>`;

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
                Select a tournament.
            </div>
        `;

        resetCounters();

        return;
    }


    try {

        console.log(
            "🔥 Loading teams:",
            tournamentId
        );


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams"
                )
            );


        console.log(
            "🔥 TEAMS FOUND:",
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

            teamList.innerHTML = `
                <div class="empty">
                    👥 No Teams Registered
                </div>
            `;

        }


        snapshot.forEach(
            (teamDoc) => {

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


                card.innerHTML = `

                    <h3>
                        🏏 ${team.teamName || "-"}
                    </h3>

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
                        ${team.players || "-"}
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


                /* =========================
                   DELETE
                ========================= */

                card
                    .querySelector(
                        "[data-delete]"
                    )
                    .addEventListener(
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

        teamList.innerHTML = `
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
            "Team status updated to " +
            status
        );


        loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ UPDATE ERROR:",
            error
        );

        alert(
            "❌ " +
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


        loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ DELETE ERROR:",
            error
        );

        alert(
            "❌ " +
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
    function () {

        loadTeams(
            this.value
        );

    }
);


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


        console.log(
            "🔥 ADMIN USER:",
            user.uid
        );


        loadTournaments();

    }
);