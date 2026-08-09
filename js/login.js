import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const form =
    document.getElementById("loginForm");

const message =
    document.getElementById("message");


form.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();


        const email =
            document.getElementById("email")
            .value
            .trim();

        const password =
            document.getElementById("password")
            .value;


        message.innerHTML =
            "⏳ Logging in...";


        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            message.innerHTML =
                "✅ Login Successful";


            setTimeout(() => {

                window.location.href =
                    "dashboard.html";

            }, 1000);


        } catch (error) {

            console.error(error);


            message.innerHTML =
                "❌ " + error.message;

        }

    }
);