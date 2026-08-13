import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

console.log("🔥 CREATE TOURNAMENT JS LOADED");

const form = document.getElementById("tournamentForm");

if (!form) {
    console.error("❌ tournamentForm NOT FOUND");
    alert("❌ Create Tournament form not found.");
    throw new Error("tournamentForm not found");
}

let currentUser = null;
let authReady = false;


/* =====================================
   AUTH
===================================== */

onAuthStateChanged(auth, (user) => {

    console.log("🔥 AUTH STATE:", user);

    if (!user) {

        authReady = true;
        currentUser = null;

        console.log("⚠️ User not logged in");

        return;
    }

    currentUser = user;
    authReady = true;

    console.log("✅ USER LOGGED IN");
    console.log("UID:", user.uid);

});


/* =====================================
   FORM SUBMIT
===================================== */

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    console.log("🏆 CREATE TOURNAMENT BUTTON CLICKED");


    /* =====================================
       WAIT FOR AUTH
    ===================================== */

    if (!authReady) {

        alert("⏳ Firebase login check ho raha hai. 2 seconds baad try karein.");

        return;
    }


    /* =====================================
       LOGIN REQUIRED
    ===================================== */

    if (!currentUser) {

        alert(
            "❌ Login required.\n\n" +
            "Pehle login kijiye, phir Create Tournament karein."
        );

        return;
    }


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

        /* =====================================
           GET VALUES
        ===================================== */

        const tournamentName =
            document.getElementById(
                "tournamentName"
            ).value.trim();


        const venue =
            document.getElementById(
                "venue"
            ).value.trim();


        const startDate =
            document.getElementById(
                "startDate"
            ).value;


        const endDate =
            document.getElementById(
                "endDate"
            ).value;


        const totalTeams =
            document.getElementById(
                "totalTeams"
            ).value;


        const entryFee =
            document.getElementById(
                "entryFee"
            ).value;


        const winnerPrize =
            document.getElementById(
                "winnerPrize"
            ).value;


        const runnerPrize =
            document.getElementById(
                "runnerPrize"
            ).value;


        const format =
            document.getElementById(
                "format"
            ).value;


        const contact =
            document.getElementById(
                "contact"
            ).value.trim();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const description =
            document.getElementById(
                "description"
            ).value.trim();


        /* =====================================
           VALIDATION
        ===================================== */

        if (!tournamentName) {
            throw new Error(
                "Tournament Name enter kijiye."
            );
        }


        if (!venue) {
            throw new Error(
                "Venue enter kijiye."
            );
        }


        if (!startDate) {
            throw new Error(
                "Start Date select kijiye."
            );
        }


        if (!endDate) {
            throw new Error(
                "End Date select kijiye."
            );
        }


        if (endDate < startDate) {
            throw new Error(
                "End Date Start Date se pehle nahi ho sakti."
            );
        }


        /* =====================================
           DATA
        ===================================== */

        const tournamentData = {

            tournamentName: tournamentName,

            name: tournamentName,

            venue: venue,

            location: venue,

            startDate: startDate,

            endDate: endDate,

            totalTeams:
                Number(totalTeams || 0),

            entryFee:
                Number(entryFee || 0),

            winnerPrize:
                Number(winnerPrize || 0),

            runnerPrize:
                Number(runnerPrize || 0),

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
            "📦 TOURNAMENT DATA:",
            tournamentData
        );


        /* =====================================
           FIRESTORE
        ===================================== */

        console.log(
            "🔥 Saving tournament..."
        );


        const tournamentRef =
            await addDoc(
                collection(
                    db,
                    "tournaments"
                ),
                tournamentData
            );


        const tournamentId =
            tournamentRef.id;


        console.log(
            "✅ TOURNAMENT CREATED:",
            tournamentId
        );


        /* =====================================
           LOCAL STORAGE
        ===================================== */

        localStorage.setItem(
            "tournamentId",
            tournamentId
        );

        localStorage.setItem(
            "selectedTournamentId",
            tournamentId
        );


        /* =====================================
           SUCCESS
        ===================================== */

        alert(
            "✅ Tournament Created Successfully!\n\n" +
            "Tournament: " +
            tournamentName +
            "\n\nTournament ID: " +
            tournamentId
        );


        /* =====================================
           OPEN TOURNAMENT
        ===================================== */

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

});