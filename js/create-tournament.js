console.log("🔥 CREATE TOURNAMENT JS LOADED");

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   FORM
========================= */

const form =
    document.getElementById("tournamentForm");


if (!form) {

    console.error(
        "❌ tournamentForm not found"
    );

    throw new Error(
        "tournamentForm not found"
    );
}


/* =========================
   LOGIN USER
========================= */

let currentUser = null;

let authReady = false;


onAuthStateChanged(
    auth,
    (user) => {

        authReady = true;

        console.log(
            "🔥 AUTH USER:",
            user
                ? user.uid
                : "NOT LOGGED IN"
        );


        if (!user) {

            currentUser = null;

            window.location.href =
                "login.html";

            return;

        }


        currentUser = user;

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
            "🏆 CREATE TOURNAMENT BUTTON CLICKED"
        );


        /* =========================
           CHECK LOGIN
        ========================= */

        if (!authReady) {

            alert(
                "⏳ Please wait. Checking login..."
            );

            return;

        }


        if (!currentUser) {

            alert(
                "❌ Please login first."
            );

            window.location.href =
                "login.html";

            return;

        }


        /* =========================
           BUTTON
        ========================= */

        const button =
            form.querySelector(
                'button[type="submit"]'
            );


        if (button) {

            button.disabled = true;

            button.textContent =
                "⏳ Creating Tournament...";

        }


        try {

            /* =========================
               GET VALUES
            ========================= */

            const tournamentName =
                document
                    .getElementById(
                        "tournamentName"
                    )
                    .value
                    .trim();


            const venue =
                document
                    .getElementById(
                        "venue"
                    )
                    .value
                    .trim();


            const startDate =
                document
                    .getElementById(
                        "startDate"
                    )
                    .value;


            const endDate =
                document
                    .getElementById(
                        "endDate"
                    )
                    .value;


            const totalTeams =
                document
                    .getElementById(
                        "totalTeams"
                    )
                    .value;


            const entryFee =
                document
                    .getElementById(
                        "entryFee"
                    )
                    .value;


            const winnerPrize =
                document
                    .getElementById(
                        "winnerPrize"
                    )
                    .value;


            const runnerPrize =
                document
                    .getElementById(
                        "runnerPrize"
                    )
                    .value;


            const format =
                document
                    .getElementById(
                        "format"
                    )
                    .value;


            const contact =
                document
                    .getElementById(
                        "contact"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim();


            const description =
                document
                    .getElementById(
                        "description"
                    )
                    .value
                    .trim();


            /* =========================
               VALIDATION
            ========================= */

            if (!tournamentName) {

                throw new Error(
                    "Please enter Tournament Name."
                );

            }


            if (!venue) {

                throw new Error(
                    "Please enter Venue."
                );

            }


            if (!startDate) {

                throw new Error(
                    "Please select Start Date."
                );

            }


            if (!endDate) {

                throw new Error(
                    "Please select End Date."
                );

            }


            if (
                new Date(endDate) <
                new Date(startDate)
            ) {

                throw new Error(
                    "End Date cannot be before Start Date."
                );

            }


            /* =========================
               TOURNAMENT DATA
            ========================= */

            const tournamentData = {

                tournamentName:
                    tournamentName,

                name:
                    tournamentName,

                venue:
                    venue,

                location:
                    venue,

                startDate:
                    startDate,

                endDate:
                    endDate,

                totalTeams:
                    Number(
                        totalTeams || 0
                    ),

                entryFee:
                    Number(
                        entryFee || 0
                    ),

                winnerPrize:
                    Number(
                        winnerPrize || 0
                    ),

                runnerPrize:
                    Number(
                        runnerPrize || 0
                    ),

                format:
                    format || "League",

                contact:
                    contact,

                email:
                    email,

                description:
                    description,

                ownerId:
                    currentUser.uid,

                createdBy:
                    currentUser.uid,

                status:
                    "Active",

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            };


            console.log(
                "📦 Tournament Data:",
                tournamentData
            );


            /* =========================
               FIRESTORE
            ========================= */

            console.log(
                "📁 Saving to Firestore..."
            );


            const tournamentRef =
                await addDoc(

                    collection(
                        db,
                        "tournaments"
                    ),

                    tournamentData

                );


            /* =========================
               REAL ID
            ========================= */

            const tournamentId =
                tournamentRef.id;


            console.log(
                "✅ TOURNAMENT CREATED"
            );

            console.log(
                "🏆 TOURNAMENT ID:",
                tournamentId
            );


            /* =========================
               LOCAL STORAGE
            ========================= */

            localStorage.setItem(
                "tournamentId",
                tournamentId
            );

            localStorage.setItem(
                "selectedTournamentId",
                tournamentId
            );


            /* =========================
               SUCCESS
            ========================= */

            alert(
                "✅ Tournament Created Successfully!\n\nTournament ID:\n" +
                tournamentId
            );


            /* =========================
               OPEN TOURNAMENT
            ========================= */

            window.location.href =
                "tournament.html?id=" +
                encodeURIComponent(
                    tournamentId
                );


        } catch (error) {

            console.error(
                "❌ CREATE TOURNAMENT ERROR:",
                error
            );


            alert(
                "❌ Tournament Create Failed\n\n" +
                error.message
            );


            if (button) {

                button.disabled = false;

                button.textContent =
                    "🏆 Create Tournament";

            }

        }

    }
);