import { auth } from "../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// =========================
// CHECK LOGIN
// =========================

export function checkAuth() {

    return new Promise((resolve) => {

        onAuthStateChanged(
            auth,
            (user) => {

                if (user) {

                    console.log(
                        "✅ User logged in:",
                        user.email
                    );

                    resolve(user);

                } else {

                    console.log(
                        "❌ User not logged in"
                    );

                    window.location.href =
                        "login.html";

                }

            }
        );

    });

}


// =========================
// GET CURRENT USER
// =========================

export function getCurrentUser() {

    return auth.currentUser;

}


// =========================
// LOGOUT
// =========================

export async function logout() {

    try {

        await signOut(auth);

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(error);

        alert(
            "❌ Logout Error: " +
            error.message
        );

    }

}