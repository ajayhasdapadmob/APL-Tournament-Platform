import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const organizerName =
    document.getElementById("organizerName");

const logoutBtn =
    document.getElementById("logoutBtn");



/* =========================
   CHECK LOGIN
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(userRef);


            if (userSnap.exists()) {

                const data =
                    userSnap.data();


                organizerName.textContent =
                    data.name ||
                    user.displayName ||
                    "Organizer";

            } else {

                organizerName.textContent =
                    "Organizer";

            }

        } catch (error) {

            console.error(error);

            organizerName.textContent =
                "Organizer";

        }

    }
);



/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        } catch (error) {

            alert(
                "❌ Logout Error: " +
                error.message
            );

        }

    }
);