// ========================================
// CREATE TOURNAMENT JS
// APL TOURNAMENT PLATFORM
// ========================================

import { db, auth } from "../firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


console.log("🔥 CREATE TOURNAMENT JS STARTED");


const form =
    document.getElementById("tournamentForm");


/* ========================================
   CHECK FORM
======================================== */

if (!form) {

    console.error(
        "❌ tournamentForm NOT FOUND"
    );

} else {

    console.log(
        "✅ tournamentForm FOUND"
    );

}


/* ========================================
   AUTH
======================================== */

let currentUser = null;


onAuthStateChanged(
    auth,
    user => {

        if (user) {

            currentUser = user;

            console.log(
                "✅ USER LOGGED IN:",
                user.uid
            );

        } else {

            console.warn(
                "⚠️ USER NOT LOGGED IN"
            );

        }

    }
);


/* ========================================
   FORM SUBMIT
======================================== */

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            console.log(
                "🚀 CREATE TOURNAMENT SUBMIT"
            );


            /* ================================
               GET VALUES
            ================================= */

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
                Number(
                    document
                        .getElementById(
                            "totalTeams"
                        )
                        .value || 0
                );


            const entryFee =
                Number(
                    document
                        .getElementById(
                            "entryFee"
                        )
                        .value || 0
                );


            const winnerPrize =
                Number(
                    document
                        .getElementById(
                            "winnerPrize"
                        )
                        .value || 0
                );


            const runnerPrize =
                Number(
                    document
                        .getElementById(
                            "runnerPrize"
                        )
                        .value || 0
                );


            const format =
                document
                    .getElementById(
                        "format"
                    )
                    .value;
            const registrationOpenAt =
    document.getElementById("registrationOpenAt").value;

const registrationCloseAt =
    document.getElementById("registrationCloseAt").value;

const tournamentType =
    document.getElementById("tournamentType")?.value || "APL League";

if (tournamentType === "APPL T10") {
    if (!registrationOpenAt || !registrationCloseAt) {
        alert("Please select registration opening and closing date/time.");
        return;
    }

    if (new Date(registrationCloseAt) <= new Date(registrationOpenAt)) {
        alert("Registration closing date/time must be after opening date/time.");
        return;
    }
}

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


            /* ================================
               VALIDATION
            ================================= */

            if (!tournamentName) {

                alert(
                    "Please enter Tournament Name"
                );

                return;

            }


            if (!venue) {

                alert(
                    "Please enter Venue"
                );

                return;

            }


            if (!startDate) {

                alert(
                    "Please select Start Date"
                );

                return;

            }


            if (!endDate) {

                alert(
                    "Please select End Date"
                );

                return;

            }


            if (
                new Date(endDate) <
                new Date(startDate)
            ) {

                alert(
                    "End Date cannot be before Start Date"
                );

                return;

            }


            /* ================================
               BUTTON
            ================================= */

            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "⏳ Creating Tournament...";

            }


            try {

                console.log(
                    "🔥 Saving tournament to Firestore..."
                );


                /* ================================
                   ORGANIZER ID
                ================================= */

                const organizerId =
                    currentUser
                    ? currentUser.uid
                    : "TEST_ORGANIZER";


                /* ================================
                   TOURNAMENT DATA
                ================================= */

                const tournamentData = {

                    tournamentName:
                        tournamentName,

                    venue:
                        venue,

                    startDate:
                        startDate,

                    endDate:
                        endDate,

                    totalTeams:
                        totalTeams,

                    entryFee:
                        entryFee,

                    winnerPrize:
                        winnerPrize,

                    runnerPrize:
                        runnerPrize,

                    format:
                        format,
                    registrationOpenAt: registrationOpenAt
    ? new Date(registrationOpenAt)
    : null,

registrationCloseAt: registrationCloseAt
    ? new Date(registrationCloseAt)
    : null,

registrationLocked: false,
                    tournamentType:
                        tournamentType,

                    contact:
                        contact,

                    email:
                        email,

                    description:
                        description,

                    organizerId:
                        organizerId,

                    status:
                        "Upcoming",

                    createdAt:
                        serverTimestamp()

                };


                /* ================================
                   CREATE TOURNAMENT
                ================================= */

                const tournamentsRef =
                    collection(
                        db,
                        "tournaments"
                    );


                const tournamentDoc =
                    await addDoc(
                        tournamentsRef,
                        tournamentData
                    );


                const tournamentId =
                    tournamentDoc.id;


                console.log(
                    "✅ TOURNAMENT CREATED"
                );


                console.log(
                    "🏆 Tournament ID:",
                    tournamentId
                );


                /* ================================
                   SAVE ID
                ================================= */

                localStorage.setItem(
                    "tournamentId",
                    tournamentId
                );

                localStorage.setItem(
                    "selectedTournamentId",
                    tournamentId
                );

                sessionStorage.setItem(
                    "tournamentId",
                    tournamentId
                );

                sessionStorage.setItem(
                    "selectedTournamentId",
                    tournamentId
                );


                /* ================================
                   SUCCESS
                ================================= */

                alert(
                    "✅ Tournament Created Successfully!\n\n" +
                    "Tournament ID:\n" +
                    tournamentId
                );


                /* ================================
                   GO MY TOURNAMENTS
                ================================= */

                window.location.href =
                    "my-tournaments.html";


            } catch (error) {

                console.error(
                    "❌ CREATE TOURNAMENT ERROR:",
                    error
                );


                alert(
                    "❌ Tournament Create Failed\n\n" +
                    error.message
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "🏆 Create Tournament";

                }

            }

        }
    );

}
