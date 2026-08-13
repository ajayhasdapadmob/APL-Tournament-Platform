console.log("🔥 REGISTRATION JS LOADED");


/* =========================
   IMPORTANT:
   registration.js is inside js/
   firebase.js is outside js/
========================= */

import { db } from "../firebase.js";


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

const form =
    document.getElementById("registrationForm");

const message =
    document.getElementById("message");

const submitButton =
    document.getElementById("submitButton");

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
   MESSAGE
========================= */

function showMessage(text, type = "") {

    message.innerHTML = text;

    message.className = "";

    if (type) {

        message.classList.add(
            type + "-message"
        );

    }

}


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );


/* First: URL */

let tournamentId =
    params.get("id");


/* Second: selectedTournamentId */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );

}


/* Third: tournamentId */

if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

}


console.log(
    "🏆 FINAL TOURNAMENT ID:",
    tournamentId
);


/* =========================
   CHECK ID
========================= */

if (!tournamentId) {

    tournamentIdDisplay.textContent =
        "Not Found";

    showMessage(
        `
        ❌ Tournament ID Missing
        <br><br>
        Please open Team Registration
        from a tournament.
        `,
        "error"
    );

    form.style.display = "none";

    throw new Error(
        "Tournament ID Missing"
    );

}


/* =========================
   SHOW ID
========================= */

tournamentIdDisplay.textContent =
    tournamentId;


/* =========================
   ENABLE BUTTON
========================= */

submitButton.disabled = false;

submitButton.innerHTML =
    "🏏 Register Team";


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

        console.log(
            "🔍 Loading tournament:",
            tournamentId
        );


        showMessage(
            "⏳ Loading Tournament...",
            "loading"
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


        console.log(
            "🏆 Tournament exists:",
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

            return;

        }


        const tournament =
            tournamentSnap.data();


        console.log(
            "🏆 Tournament Data:",
            tournament
        );


        const tournamentName =
            tournament.tournamentName ||
            tournament.name ||
            "Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "Venue";


        /* =========================
           DISPLAY
        ========================= */

        tournamentDisplay.textContent =
            tournamentName;


        venueDisplay.textContent =
            venue;


        tournamentIdDisplay.textContent =
            tournamentId;


        /* =========================
           INPUTS
        ========================= */

        tournamentNameInput.value =
            tournamentName;


        venueInput.value =
            venue;


        /* =========================
           ENABLE FORM
        ========================= */

        submitButton.disabled =
            false;

        submitButton.innerHTML =
            "🏏 Register Team";


        message.innerHTML = "";

        message.className = "";


        console.log(
            "✅ Tournament loaded"
        );

    } catch (error) {

        console.error(
            "❌ TOURNAMENT LOAD ERROR:",
            error
        );


        submitButton.disabled =
            false;

        submitButton.innerHTML =
            "🏏 Register Team";


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
   START LOAD
========================= */

loadTournament();


/* =========================
   FORM SUBMIT
========================= */

form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        console.log(
            "🏏 REGISTER TEAM CLICKED"
        );


        /* =========================
           GET VALUES
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


        /* =========================
           PLAYERS
        ========================= */

        const players =
            playersText
                .split(",")
                .map(
                    player =>
                        player.trim()
                )
                .filter(
                    player =>
                        player.length > 0
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

        submitButton.disabled =
            true;

        submitButton.innerHTML =
            "⏳ Registering...";


        showMessage(
            "⏳ Registering Team...",
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

                createdAt:
                    serverTimestamp()

            };


            console.log(
                "📦 TEAM DATA:",
                teamData
            );


            /* =========================
               FIRESTORE COLLECTION
            ========================= */

            const teamsRef =
                collection(
                    db,
                    "tournaments",
                    tournamentId,
                    "teams"
                );


            console.log(
                "📁 SAVING:",
                `tournaments/${tournamentId}/teams`
            );


            /* =========================
               SAVE
            ========================= */

            const teamRef =
                await addDoc(
                    teamsRef,
                    teamData
                );


            console.log(
                "✅ TEAM SAVED"
            );


            console.log(
                "🏏 TEAM ID:",
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
               CLEAR TEAM FIELDS
            ========================= */

            teamNameInput.value =
                "";

            captainNameInput.value =
                "";

            mobileInput.value =
                "";

            emailInput.value =
                "";

            cityInput.value =
                "";

            playersInput.value =
                "";


            /* =========================
               BUTTON
            ========================= */

            submitButton.disabled =
                false;

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
                `,
                "error"
            );


            submitButton.disabled =
                false;

            submitButton.innerHTML =
                "🏏 Register Team";

        }

    }
);