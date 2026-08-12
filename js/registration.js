console.log("🔥 REGISTRATION JS LOADED");

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    addDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const form = document.getElementById("registrationForm");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");

const tournamentDisplay =
    document.getElementById("tournamentDisplay");

const venueDisplay =
    document.getElementById("venueDisplay");

const tournamentIdDisplay =
    document.getElementById("tournamentIdDisplay");

const tournamentNameInput =
    document.getElementById("tournamentName");

const venueInput =
    document.getElementById("venue");

const teamNameInput =
    document.getElementById("teamName");

const captainNameInput =
    document.getElementById("captainName");

const mobileInput =
    document.getElementById("mobile");

const emailInput =
    document.getElementById("email");

const cityInput =
    document.getElementById("city");

const playersInput =
    document.getElementById("players");


/* =========================
   MESSAGE
========================= */

function showMessage(text, type = "") {

    if (!message) return;

    message.innerHTML = text;

    message.className = "";

    if (type) {
        message.classList.add(
            type + "-message"
        );
    }
}


/* =========================
   BASIC CHECK
========================= */

if (!form) {

    console.error(
        "❌ registrationForm not found"
    );

    throw new Error(
        "registrationForm not found"
    );
}


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const tournamentId =
    params.get("id");

console.log(
    "🏆 TOURNAMENT ID:",
    tournamentId
);


/* =========================
   TOURNAMENT ID CHECK
========================= */

if (!tournamentId) {

    showMessage(
        `
        ❌ Tournament ID Missing
        <br><br>
        Please open Team Registration
        from the Tournament page.
        `,
        "error"
    );

    form.style.display = "none";

    throw new Error(
        "Tournament ID Missing"
    );
}


if (tournamentIdDisplay) {

    tournamentIdDisplay.textContent =
        tournamentId;

}


/* =========================
   CURRENT USER
========================= */

let currentUser = null;


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    showMessage(
        "⏳ Loading Tournament...",
        "loading"
    );

    try {

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


        console.log(
            "Tournament exists:",
            tournamentSnap.exists()
        );


        if (!tournamentSnap.exists()) {

            showMessage(
                `
                ❌ Tournament Not Found
                <br><br>
                ID:
                <b>${tournamentId}</b>
                `,
                "error"
            );

            form.style.display = "none";

            return;
        }


        const tournament =
            tournamentSnap.data();


        const tournamentName =
            tournament.tournamentName ||
            tournament.name ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "Venue not available";


        if (tournamentDisplay) {

            tournamentDisplay.textContent =
                tournamentName;

        }


        if (venueDisplay) {

            venueDisplay.textContent =
                venue;

        }


        if (tournamentNameInput) {

            tournamentNameInput.value =
                tournamentName;

        }


        if (venueInput) {

            venueInput.value =
                venue;

        }


        showMessage("", "");

        console.log(
            "✅ Tournament loaded"
        );


    } catch (error) {

        console.error(
            "❌ Tournament Load Error:",
            error
        );

        showMessage(
            `
            ❌ Tournament Load Failed
            <br><br>
            ${error.message}
            `,
            "error"
        );

    }
}


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            console.log(
                "❌ User not logged in"
            );

            showMessage(
                `
                ❌ Please login first.
                <br><br>
                Team registration requires login.
                `,
                "error"
            );

            form.style.display = "none";

            return;
        }


        currentUser = user;


        console.log(
            "✅ Logged in:",
            user.uid
        );


        form.style.display = "";


        await loadTournament();

    }
);


/* =========================
   SUBMIT
========================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "🏏 REGISTER TEAM CLICKED"
        );


        /* =========================
           LOGIN CHECK
        ========================= */

        if (!currentUser) {

            showMessage(
                "❌ Please login first.",
                "error"
            );

            return;
        }


        /* =========================
           VALUES
        ========================= */

        const tournamentName =
            tournamentNameInput.value.trim();

        const venue =
            venueInput.value.trim();

        const teamName =
            teamNameInput.value.trim();

        const captainName =
            captainNameInput.value.trim();

        const mobile =
            mobileInput.value.trim();

        const email =
            emailInput.value.trim();

        const city =
            cityInput.value.trim();

        const playersText =
            playersInput.value.trim();


        /* =========================
           VALIDATION
        ========================= */

        if (!teamName) {

            showMessage(
                "❌ Please enter Team Name.",
                "error"
            );

            teamNameInput.focus();

            return;
        }


        if (!captainName) {

            showMessage(
                "❌ Please enter Captain Name.",
                "error"
            );

            captainNameInput.focus();

            return;
        }


        if (!mobile) {

            showMessage(
                "❌ Please enter Mobile Number.",
                "error"
            );

            mobileInput.focus();

            return;
        }


        if (!city) {

            showMessage(
                "❌ Please enter City.",
                "error"
            );

            cityInput.focus();

            return;
        }


        if (!playersText) {

            showMessage(
                "❌ Please enter Player Names.",
                "error"
            );

            playersInput.focus();

            return;
        }


        const players =
            playersText
                .split(",")
                .map(
                    p => p.trim()
                )
                .filter(
                    p => p.length > 0
                );


        if (players.length === 0) {

            showMessage(
                "❌ Please enter at least one player.",
                "error"
            );

            return;
        }


        /* =========================
           BUTTON
        ========================= */

        submitButton.disabled = true;

        submitButton.innerHTML =
            "⏳ Registering...";


        showMessage(
            "⏳ Saving registration to Firebase...",
            "loading"
        );


        try {

            /* =========================
               TEAM DATA
            ========================= */

            const teamData = {

                tournamentId:
                    tournamentId,

                tournamentName:
                    tournamentName,

                venue:
                    venue,

                teamName:
                    teamName,

                captainName:
                    captainName,

                mobile:
                    mobile,

                email:
                    email,

                city:
                    city,

                players:
                    players,

                playerCount:
                    players.length,

                status:
                    "Pending",

                paymentStatus:
                    "Unpaid",

                registeredBy:
                    currentUser.uid,

                registeredEmail:
                    currentUser.email || "",

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            };


            console.log(
                "📦 TEAM DATA:",
                teamData
            );


            /* =========================
               SAME PATH ADMIN USES
            ========================= */

            const teamsRef =
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams"
                );


            console.log(
                "📁 FIRESTORE PATH:",
                `tournaments/${tournamentId}/teams`
            );


            /* =========================
               ADD TEAM
            ========================= */

            const teamRef =
                await addDoc(
                    teamsRef,
                    teamData
                );


            console.log(
                "✅ TEAM SAVED:",
                teamRef.id
            );


            /* =========================
               SUCCESS
            ========================= */

            showMessage(
                `
                ✅ Team Registration Successful!
                <br><br>

                🏏 <b>Team:</b>
                ${teamName}

                <br>

                👤 <b>Captain:</b>
                ${captainName}

                <br>

                🆔 <b>Team ID:</b>
                ${teamRef.id}

                <br><br>

                🟢 Registration saved successfully.
                `,
                "success"
            );


            /* =========================
               CLEAR
            ========================= */

            teamNameInput.value = "";
            captainNameInput.value = "";
            mobileInput.value = "";
            emailInput.value = "";
            cityInput.value = "";
            playersInput.value = "";


            tournamentNameInput.value =
                tournamentName;

            venueInput.value =
                venue;


            submitButton.disabled = false;

            submitButton.innerHTML =
                "🏏 Register Another Team";


        } catch (error) {

            console.error(
                "❌ REGISTRATION ERROR:",
                error
            );


            showMessage(
                `
                ❌ Registration Failed
                <br><br>

                <b>Error:</b>
                ${error.message}

                <br><br>

                Please check Firebase Firestore Rules.
                `,
                "error"
            );


            submitButton.disabled = false;

            submitButton.innerHTML =
                "🏏 Register Team";

        }

    }
);