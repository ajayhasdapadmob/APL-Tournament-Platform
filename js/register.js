// ======================================================
// APL TOURNAMENT PLATFORM
// ORGANIZER REGISTER.JS
// ======================================================

import { auth, db } from "../firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 ORGANIZER REGISTER JS LOADED");


// ======================================================
// ELEMENTS
// ======================================================

const registerForm =
    document.getElementById("registerForm");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const registerBtn =
    document.getElementById("registerBtn");

const message =
    document.getElementById("message");


// ======================================================
// MESSAGE
// ======================================================

function showMessage(text, type = "success") {

    if (!message) return;

    message.textContent = text;

    message.style.display = "block";
    message.style.padding = "12px";
    message.style.borderRadius = "10px";

    if (type === "error") {

        message.style.background = "#fee2e2";
        message.style.color = "#991b1b";

    } else {

        message.style.background = "#dcfce7";
        message.style.color = "#166534";

    }

}


// ======================================================
// REGISTER
// ======================================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            console.log(
                "📝 CREATE ORGANIZER ACCOUNT CLICKED"
            );


            const name =
                nameInput.value.trim();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;


            // ==========================================
            // VALIDATION
            // ==========================================

            if (!name) {

                showMessage(
                    "Please enter your full name.",
                    "error"
                );

                return;
            }


            if (!email) {

                showMessage(
                    "Please enter your email.",
                    "error"
                );

                return;
            }


            if (password.length < 6) {

                showMessage(
                    "Password must be at least 6 characters.",
                    "error"
                );

                return;
            }


            if (password !== confirmPassword) {

                showMessage(
                    "Passwords do not match.",
                    "error"
                );

                return;
            }


            try {

                registerBtn.disabled =
                    true;

                registerBtn.textContent =
                    "Creating Account...";


                showMessage(
                    "Creating your account...",
                    "success"
                );


                // ======================================
                // FIREBASE AUTH ACCOUNT
                // ======================================

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "✅ Firebase Auth Account Created:",
                    user.uid
                );


                // ======================================
                // SAVE DISPLAY NAME
                // ======================================

                await updateProfile(
                    user,
                    {
                        displayName: name
                    }
                );


                console.log(
                    "✅ Display name saved"
                );


                // ======================================
                // CREATE FIRESTORE USER PROFILE
                // ======================================

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {

                        uid:
                            user.uid,

                        name:
                            name,

                        email:
                            user.email || email,

                        mobile:
                            "",

                        city:
                            "",

                        organization:
                            "",

                        role:
                            "organizer",

                        accountStatus:
                            "Active",

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                console.log(
                    "✅ Firestore user profile created"
                );


                // ======================================
                // SUCCESS
                // ======================================

                showMessage(
                    "✅ Account created successfully! Opening dashboard...",
                    "success"
                );


                // ======================================
                // DASHBOARD
                // ======================================

                setTimeout(
                    () => {

                        window.location.href =
                            "./dashboard.html";

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "❌ ACCOUNT CREATION ERROR:",
                    error
                );


                let errorMessage =
                    "Account creation failed.";


                switch (error.code) {

                    case "auth/email-already-in-use":

                        errorMessage =
                            "This email is already registered. Please login.";

                        break;


                    case "auth/invalid-email":

                        errorMessage =
                            "Please enter a valid email address.";

                        break;


                    case "auth/weak-password":

                        errorMessage =
                            "Password is too weak. Use at least 6 characters.";

                        break;


                    case "auth/operation-not-allowed":

                        errorMessage =
                            "Email/Password login is disabled in Firebase Authentication.";

                        break;


                    case "auth/network-request-failed":

                        errorMessage =
                            "Network error. Please check your internet connection.";

                        break;


                    case "permission-denied":

                        errorMessage =
                            "Firestore permission denied. Please check Firestore Rules.";

                        break;


                    default:

                        errorMessage =
                            error.message ||
                            "Unable to create account.";

                }


                showMessage(
                    "❌ " + errorMessage,
                    "error"
                );


            } finally {

                registerBtn.disabled =
                    false;

                registerBtn.textContent =
                    "📝 Create Account";

            }

        }
    );

}


console.log(
    "✅ ORGANIZER REGISTER JS READY"
);