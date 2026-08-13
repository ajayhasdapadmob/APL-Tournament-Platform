console.log("🔥 ADMIN JS LOADED");


import { auth, db } from "../firebase.js";


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


/* =====================================================
   ELEMENTS
===================================================== */

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

const adminMessage =
    document.getElementById("adminMessage");


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(text, type = "") {

    if (!adminMessage) return;

    adminMessage.innerHTML = text;

    adminMessage.className = "";

    if (type) {
        adminMessage.classList.add(type);
    }

}


/* =====================================================
   RESET
===================================================== */

function resetCounters() {

    totalTeams.textContent = "0";
    pendingTeams.textContent = "0";
    approvedTeams.textContent = "0";
    rejectedTeams.textContent = "0";
    paidTeams.textContent = "0";
    holdTeams.textContent = "0";
    cancelledTeams.textContent = "0";

}


/* =====================================================
   LOAD TOURNAMENTS
===================================================== */

async function loadTournaments() {

    console.log("🏆 Loading tournaments...");

    try {

        showMessage(
            "⏳ Loading tournaments...",
            "loading"
        );


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
            "🏆 Tournament count:",
            snapshot.size
        );


        tournamentSelect.innerHTML = `
            <option value="">
                -- Select Tournament --
            </option>
        `;


        if (snapshot.empty) {

            showMessage(
                "❌ No tournaments found.",
                "error"
            );


            teamList.innerHTML = `
                <div class="empty">

                    🏆 No Tournament Found

                    <br><br>

                    Please create a tournament first.

                </div>
            `;

            resetCounters();

            return;

        }


        /* =================================================
           ADD TOURNAMENTS
        ================================================= */

        snapshot.forEach(
            tournamentDoc => {

                const data =
                    tournamentDoc.data();


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    tournamentDoc.id;


                option.textContent =
                    data.tournamentName ||
                    data.name ||
                    "Unnamed Tournament";


                tournamentSelect.appendChild(
                    option
                );

            }
        );


        /* =================================================
           GET URL ID
        ================================================= */

        const params =
            new URLSearchParams(
                window.location.search
            );


        const urlId =
            params.get("id");


        const localId =
            localStorage.getItem(
                "tournamentId"
            );


        const selectedId =
            localStorage.getItem(
                "selectedTournamentId"
            );


        let tournamentId = null;


        /* URL FIRST */

        if (
            urlId &&
            [...tournamentSelect.options]
                .some(
                    option =>
                        option.value === urlId
                )
        ) {

            tournamentId = urlId;

        }


        /* SELECTED ID */

        else if (
            selectedId &&
            [...tournamentSelect.options]
                .some(
                    option =>
                        option.value === selectedId
                )
        ) {

            tournamentId = selectedId;

        }


        /* LOCAL ID */

        else if (
            localId &&
            [...tournamentSelect.options]
                .some(
                    option =>
                        option.value === localId
                )
        ) {

            tournamentId = localId;

        }


        /* FIRST TOURNAMENT */

        else {

            tournamentId =
                snapshot.docs[0].id;

        }


        /* =================================================
           SAVE ID
        ================================================= */

        tournamentSelect.value =
            tournamentId;


        localStorage.setItem(
            "tournamentId",
            tournamentId
        );


        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );


        console.log(
            "🏆 Selected Tournament:",
            tournamentId
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );


        showMessage(
            "❌ " + error.message,
            "error"
        );


        teamList.innerHTML = `
            <div class="empty">

                ❌ Tournament Load Failed

                <br><br>

                ${error.message}

            </div>
        `;

    }

}


/* =====================================================
   LOAD TEAMS
===================================================== */

async function loadTeams(
    tournamentId
) {

    console.log(
        "👥 Loading teams:",
        tournamentId
    );


    resetCounters();


    if (!tournamentId) {

        teamList.innerHTML = `
            <div class="empty">

                🏆 Please select a tournament.

            </div>
        `;

        return;

    }


    try {

        showMessage(
            "⏳ Loading registered teams...",
            "loading"
        );


        const teamsRef =
            collection(
                db,
                "tournaments",
                tournamentId,
                "teams"
            );


        console.log(
            "📁 Firestore:",
            `tournaments/${tournamentId}/teams`
        );


        const snapshot =
            await getDocs(
                teamsRef
            );


        console.log(
            "👥 Teams found:",
            snapshot.size
        );


        teamList.innerHTML = "";


        let pending = 0;
        let approved = 0;
        let rejected = 0;
        let paid = 0;
        let hold = 0;
        let cancelled = 0;


        if (snapshot.empty) {

            teamList.innerHTML = `
                <div class="empty">

                    👥 No Teams Registered Yet

                    <br><br>

                    <b>Tournament ID:</b>
                    ${tournamentId}

                    <br><br>

                    Registration करने के बाद
                    team यहाँ दिखाई देगी।

                </div>
            `;


            showMessage(
                "ℹ️ No team registered yet."
            );


            return;

        }


        /* =================================================
           DISPLAY EACH TEAM
        ================================================= */

        snapshot.forEach(
            teamDoc => {

                const team =
                    teamDoc.data();


                const status =
                    team.status ||
                    "Pending";


                /* COUNTERS */

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


                /* PLAYERS */

                let players = "-";


                if (
                    Array.isArray(
                        team.players
                    )
                ) {

                    players =
                        team.players.join(
                            ", "
                        );

                } else if (
                    team.players
                ) {

                    players =
                        team.players;

                }


                /* CARD */

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "team-card";


                card.innerHTML = `

                    <h3>
                        🏏
                        ${team.teamName || "-"}
                    </h3>


                    <p>
                        🆔
                        <b>Team ID:</b>
                        ${teamDoc.id}
                    </p>


                    <p>
                        🏆
                        <b>Tournament:</b>
                        ${team.tournamentName || "-"}
                    </p>


                    <p>
                        📍
                        <b>Venue:</b>
                        ${team.venue || "-"}
                    </p>


                    <p>
                        👤
                        <b>Captain:</b>
                        ${team.captainName || "-"}
                    </p>


                    <p>
                        📞
                        <b>Mobile:</b>
                        ${team.mobile || "-"}
                    </p>


                    <p>
                        📧
                        <b>Email:</b>
                        ${team.email || "-"}
                    </p>


                    <p>
                        🏙️
                        <b>City:</b>
                        ${team.city || "-"}
                    </p>


                    <div class="players-box">

                        👥
                        <b>Players:</b>

                        <br><br>

                        ${players}

                    </div>


                    <p>
                        👥
                        <b>Player Count:</b>
                        ${team.playerCount || 0}
                    </p>


                    <p>
                        💰
                        <b>Payment:</b>
                        ${team.paymentStatus || "Unpaid"}
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
                            💰 Paid
                        </button>


                        <button
                            class="hold-btn"
                            data-status="On Hold"
                        >
                            ⏸️ Hold
                        </button>


                        <button
                            class="cancel-btn"
                            data-status="Cancelled"
                        >
                            🚫 Cancel
                        </button>


                        <button
                            class="delete-btn"
                            data-delete="true"
                        >
                            🗑️ Delete
                        </button>


                    </div>

                `;


                /* STATUS BUTTONS */

                card
                    .querySelectorAll(
                        "[data-status]"
                    )
                    .forEach(
                        button => {

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


                /* DELETE */

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


        /* =================================================
           COUNTERS
        ================================================= */

        totalTeams.textContent =
            snapshot.size;

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


        showMessage(
            `✅ ${snapshot.size} team(s) loaded.`,
            "success"
        );


    } catch (error) {

        console.error(
            "❌ TEAM LOAD ERROR:",
            error
        );


        teamList.innerHTML = `
            <div class="empty">

                ❌ Team Load Failed

                <br><br>

                ${error.message}

            </div>
        `;


        showMessage(
            "❌ " + error.message,
            "error"
        );

    }

}


/* =====================================================
   UPDATE STATUS
===================================================== */

async function updateTeamStatus(
    tournamentId,
    teamId,
    status
) {

    try {

        console.log(
            "🔄 Updating status:",
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


        alert(
            "✅ Team status updated: " +
            status
        );


        await loadTeams(
            tournamentId
        );


    } catch (error) {

        console.error(
            "❌ STATUS ERROR:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =====================================================
   DELETE TEAM
===================================================== */

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
            "❌ DELETE ERROR:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


/* =====================================================
   TOURNAMENT CHANGE
===================================================== */

if (tournamentSelect) {

    tournamentSelect.addEventListener(
        "change",
        async () => {

            const tournamentId =
                tournamentSelect.value;


            if (!tournamentId) {

                resetCounters();

                teamList.innerHTML = `
                    <div class="empty">
                        🏆 Please select a tournament.
                    </div>
                `;

                return;

            }


            localStorage.setItem(
                "tournamentId",
                tournamentId
            );


            localStorage.setItem(
                "selectedTournamentId",
                tournamentId
            );


            console.log(
                "🔄 Tournament changed:",
                tournamentId
            );


            await loadTeams(
                tournamentId
            );

        }
    );

}


/* =====================================================
   AUTH
===================================================== */

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "🔥 AUTH USER:",
            user
        );


        if (!user) {

            console.log(
                "❌ User not logged in"
            );


            window.location.href =
                "login.html";


            return;

        }


        console.log(
            "✅ Logged in:",
            user.uid
        );


        await loadTournaments();

    }
);