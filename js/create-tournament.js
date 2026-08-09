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
    document.getElementById(
        "tournamentForm"
    );


/* =========================
   LOGIN USER
========================= */

let currentUser = null;


onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }

        currentUser = user;

    }
);


/* =========================
   FORM SUBMIT
========================= */

if (form) {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!currentUser) {

                alert(
                    "❌ Please login first."
                );

                return;

            }


            try {


                /* =========================
                   GET FORM VALUES
                ========================= */

                const tournamentName =
                    document.getElementById(
                        "tournamentName"
                    )?.value.trim();


                const venue =
                    document.getElementById(
                        "venue"
                    )?.value.trim();


                const startDate =
                    document.getElementById(
                        "startDate"
                    )?.value;


                const endDate =
                    document.getElementById(
                        "endDate"
                    )?.value;


                const totalTeams =
                    document.getElementById(
                        "totalTeams"
                    )?.value;


                const entryFee =
                    document.getElementById(
                        "entryFee"
                    )?.value;


                const winnerPrize =
                    document.getElementById(
                        "winnerPrize"
                    )?.value;


                const runnerPrize =
                    document.getElementById(
                        "runnerPrize"
                    )?.value;


                const format =
                    document.getElementById(
                        "format"
                    )?.value;


                const contact =
                    document.getElementById(
                        "contact"
                    )?.value.trim();


                const email =
                    document.getElementById(
                        "email"
                    )?.value.trim();


                const description =
                    document.getElementById(
                        "description"
                    )?.value.trim();


                /* =========================
                   VALIDATION
                ========================= */

                if (!tournamentName) {

                    alert(
                        "⚠️ Please enter tournament name."
                    );

                    return;

                }


                if (!venue) {

                    alert(
                        "⚠️ Please enter venue."
                    );

                    return;

                }


                if (!startDate) {

                    alert(
                        "⚠️ Please select start date."
                    );

                    return;

                }


                if (!endDate) {

                    alert(
                        "⚠️ Please select end date."
                    );

                    return;

                }


                /* =========================
                   TOURNAMENT DATA
                ========================= */

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
                        contact || "",

                    email:
                        email || "",

                    description:
                        description || "",


                    /* =========================
                       OWNER
                    ========================= */

                    ownerId:
                        currentUser.uid,

                    createdBy:
                        currentUser.uid,


                    /* =========================
                       STATUS
                    ========================= */

                    status:
                        "Active",


                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                };


                /* =========================
                   CREATE TOURNAMENT
                ========================= */

                const tournamentRef =
                    await addDoc(

                        collection(
                            db,
                            "tournaments"
                        ),

                        tournamentData

                    );


                /* =========================
                   REAL FIREBASE ID
                ========================= */

                const tournamentId =
                    tournamentRef.id;


                console.log(
                    "Tournament Created:",
                    tournamentId
                );


                /* =========================
                   SAVE LOCALLY
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
                    "✅ Tournament Created Successfully!"
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
                    "Create Tournament Error:",
                    error
                );


                alert(
                    "❌ " +
                    error.message
                );

            }

        }
    );

}