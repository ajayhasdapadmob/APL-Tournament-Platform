console.log("🔥 REGISTRATION JS LOADED");

import { db } from "./firebase.js";

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

const tournamentDisplay =
    document.getElementById("tournamentDisplay");

const venueDisplay =
    document.getElementById("venueDisplay");

const tournamentIdDisplay =
    document.getElementById("tournamentIdDisplay");


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


if (!message) {

    console.error(
        "❌ message element not found"
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
    "🏆 Tournament ID:",
    tournamentId
);


/* =========================
   CHECK TOURNAMENT ID
========================= */

if (!tournamentId) {

    if (message) {

        message.innerHTML = `
            ❌ Tournament ID Missing
            <br><br>
            Please open registration
            from the Tournament page.
        `;

        message.style.color = "red";

    }

    form.style.display = "none";

    throw new Error(
        "Tournament ID Missing"
    );
}


/* =========================
   SHOW TOURNAMENT ID
========================= */

if (tournamentIdDisplay) {

    tournamentIdDisplay.textContent =
        tournamentId;

}


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

    try {

        console.log(
            "🔍 Loading tournament:",
            tournamentId
        );


        if (message) {

            message.innerHTML =
                "⏳ Loading tournament...";

            message.style.color =
                "#d97706";

        }


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


        /* =========================
           TOURNAMENT NOT FOUND
        ========================= */

        if (!tournamentSnap.exists()) {

            if (message) {

                message.innerHTML = `
                    ❌ Tournament Not Found
                    <br><br>
                    Tournament ID:
                    <br>
                    <b>${tournamentId}</b>
                `;

                message.style.color =
                    "red";

            }

            form.style.display =
                "none";

            return;

        }


        /* =========================
           TOURNAMENT DATA
        ========================= */

        const tournament =
            tournamentSnap.data();


        console.log(
            "🏆 Tournament Data:",
            tournament
        );


        const tournamentName =
            tournament.tournamentName ||
            tournament.name ||
            "APL Tournament";


        const venue =
            tournament.venue ||
            tournament.location ||
            "Venue not available";


        /* =========================
           DISPLAY INFO
        ========================= */

        if (tournamentDisplay) {

            tournamentDisplay.textContent =
                tournamentName;

        }


        if (venueDisplay) {

            venueDisplay.textContent =
                venue;

        }


        if (tournamentIdDisplay) {

            tournamentIdDisplay.textContent =
                tournamentId;

        }


        /* =========================
           FORM VALUES
        ========================= */

        if (tournamentNameInput) {

            tournamentNameInput.value =
                tournamentName;

        }


        if (venueInput) {

            venueInput.value =
                venue;

        }


        /* =========================
           SUCCESS LOAD
        ========================= */

        if (message) {

            message.innerHTML = "";

        }


        console.log(
            "✅ Tournament loaded successfully"
        );


    } catch (error) {

        console.error(
            "❌ Tournament Load Error:",
            error
        );


        if (message) {

            message.innerHTML = `
                ❌ Tournament Load Failed
                <br><br>
                <b>Error:</b>
                ${error.message}
            `;

            message.style.color =
                "red";

        }

    }

}


/* =========================
   START TOURNAMENT LOAD
========================= */

loadTournament();


/* =========================
   TEAM REGISTRATION
========================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "🏏 REGISTER BUTTON CLICKED"
        );


        /* =========================
           SUBMIT BUTTON
        ========================= */

        const submitButton =
            form.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.disabled =
                true;

            submitButton.innerHTML =
                "⏳ Registering...";

        }


        if (message) {

            message.innerHTML =
                "⏳ Registering Team...";

            message.style.color =
                "#d97706";

        }


        try {

            /* =========================
               GET FORM VALUES
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


            console.log(
                "📝 Form Values:",
                {
                    tournamentName,
                    venue,
                    teamName,
                    captainName,
                    mobile,
                    email,
                    city,
                    playersText
                }
            );


            /* =========================
               VALIDATION
            ========================= */

            if (!tournamentName) {

                throw new Error(
                    "Tournament Name is missing"
                );

            }


            if (!teamName) {

                throw new Error(
                    "Please enter Team Name"
                );

            }


            if (!captainName) {

                throw new Error(
                    "Please enter Captain Name"
                );

            }


            if (!mobile) {

                throw new Error(
                    "Please enter Mobile Number"
                );

            }


            if (!city) {

                throw new Error(
                    "Please enter City"
                );

            }


            if (!playersText) {

                throw new Error(
                    "Please enter Player Names"
                );

            }


            /* =========================
               PLAYERS ARRAY
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

                throw new Error(
                    "Please enter at least one player"
                );

            }


            console.log(
                "👥 Players:",
                players
            );


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
               FIRESTORE PATH
            ========================= */

            const teamsCollection =
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
               SAVE TEAM
            ========================= */

            const teamRef =
                await addDoc(
                    teamsCollection,
                    teamData
                );


            console.log(
                "✅ TEAM SAVED SUCCESSFULLY"
            );


            console.log(
                "🆔 TEAM ID:",
                teamRef.id
            );


            /* =========================
               SUCCESS MESSAGE
            ========================= */

            if (message) {

                message.innerHTML = `
                    ✅ Team Registration Successful!
                    <br><br>

                    <b>Team:</b>
                    ${teamName}

                    <br>

                    <b>Captain:</b>
                    ${captainName}

                    <br>

                    <b>Players:</b>
                    ${players.length}

                    <br>

                    <b>Team ID:</b>
                    ${teamRef.id}
                `;

                message.style.color =
                    "green";

                message.style.background =
                    "#dcfce7";

            }


            /* =========================
               CLEAR FORM
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
               KEEP TOURNAMENT INFO
            ========================= */

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


            /* =========================
               ENABLE BUTTON
            ========================= */

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.innerHTML =
                    "🏏 Register Team";

            }


        } catch (error) {

            console.error(
                "❌ REGISTRATION ERROR:",
                error
            );


            if (message) {

                message.innerHTML = `
                    ❌ Registration Failed
                    <br><br>

                    <b>Error:</b>
                    ${error.message}
                `;

                message.style.color =
                    "red";

                message.style.background =
                    "#fee2e2";

            }


            /* =========================
               ENABLE BUTTON AGAIN
            ========================= */

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.innerHTML =
                    "🏏 Register Team";

            }

        }

    }
);