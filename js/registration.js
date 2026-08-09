import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const form =
    document.getElementById("registrationForm");

const message =
    document.getElementById("message");


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
    "Tournament ID:",
    tournamentId
);


/* =========================
   CHECK TOURNAMENT ID
========================= */

if (!tournamentId) {

    message.innerHTML =
        "❌ Tournament ID Missing";

    message.style.color = "red";

    form.style.display = "none";

    throw new Error(
        "Tournament ID Missing"
    );
}


/* =========================
   LOAD TOURNAMENT
========================= */

async function loadTournament() {

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


        if (!tournamentSnap.exists()) {

            message.innerHTML =
                "❌ Tournament Not Found";

            message.style.color = "red";

            form.style.display = "none";

            return;
        }


        const tournament =
            tournamentSnap.data();


        document
            .getElementById("tournamentName")
            .value =
                tournament.tournamentName || "";


        document
            .getElementById("venue")
            .value =
                tournament.venue || "";


    } catch (error) {

        console.error(error);

        message.innerHTML =
            "❌ " + error.message;

        message.style.color = "red";

    }

}


loadTournament();


/* =========================
   TEAM REGISTRATION
========================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "Register Team clicked"
        );


        message.innerHTML =
            "⏳ Registering Team...";

        message.style.color =
            "#d97706";


        try {


            const teamData = {

                tournamentId:
                    tournamentId,

                tournamentName:
                    document
                        .getElementById(
                            "tournamentName"
                        )
                        .value
                        .trim(),

                venue:
                    document
                        .getElementById(
                            "venue"
                        )
                        .value
                        .trim(),

                teamName:
                    document
                        .getElementById(
                            "teamName"
                        )
                        .value
                        .trim(),

                captainName:
                    document
                        .getElementById(
                            "captainName"
                        )
                        .value
                        .trim(),

                mobile:
                    document
                        .getElementById(
                            "mobile"
                        )
                        .value
                        .trim(),

                email:
                    document
                        .getElementById(
                            "email"
                        )
                        .value
                        .trim(),

                city:
                    document
                        .getElementById(
                            "city"
                        )
                        .value
                        .trim(),

                players:
                    document
                        .getElementById(
                            "players"
                        )
                        .value
                        .trim(),

                status:
                    "Pending",

                paymentStatus:
                    "Unpaid",

                createdAt:
                    serverTimestamp()

            };


            /* =========================
               SAVE TEAM
            ========================= */

            const teamRef =
                await addDoc(

                    collection(
                        db,
                        "tournaments",
                        tournamentId,
                        "teams"
                    ),

                    teamData

                );


            console.log(
                "Team ID:",
                teamRef.id
            );


            /* =========================
               SUCCESS
            ========================= */

            message.innerHTML =
                "✅ Team Registration Successful";

            message.style.color =
                "green";


            /* =========================
               CLEAR FORM
            ========================= */

            form.reset();


            /* Tournament details वापस भरें */

            document
                .getElementById(
                    "tournamentName"
                )
                .value =
                    teamData.tournamentName;


            document
                .getElementById(
                    "venue"
                )
                .value =
                    teamData.venue;


        } catch (error) {

            console.error(
                "Registration Error:",
                error
            );


            message.innerHTML =
                "❌ Registration Failed: " +
                error.message;

            message.style.color =
                "red";

        }

    }
);