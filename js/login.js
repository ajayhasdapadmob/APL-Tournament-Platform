// ========================================
// APL TOURNAMENT PLATFORM
// ORGANIZER LOGIN / CREATE ACCOUNT
// ========================================

import { auth, db } from "../firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("🔥 ORGANIZER LOGIN JS LOADED");


// ========================================
// ELEMENTS
// ========================================

const loginForm =
    document.getElementById("loginForm");

const loginModeBtn =
    document.getElementById("loginModeBtn");

const registerModeBtn =
    document.getElementById("registerModeBtn");

const nameGroup =
    document.getElementById("nameGroup");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const confirmPasswordGroup =
    document.getElementById("confirmPasswordGroup");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const submitBtn =
    document.getElementById("submitBtn");

const message =
    document.getElementById("message");

const pageTitle =
    document.getElementById("pageTitle");

const pageDescription =
    document.getElementById("pageDescription");


// ========================================
// MODE
// ========================================

let registerMode = false;


// ========================================
// MESSAGE
// ========================================

function showMessage(text, type) {

    if (!message) return;

    message.textContent = text;

    message.className = type || "";

}


// ========================================
// LOGIN MODE
// ========================================

function setLoginMode() {

    registerMode = false;

    loginModeBtn?.classList.add("active");
    registerModeBtn?.classList.remove("active");

    nameGroup?.classList.add("hidden");
    confirmPasswordGroup?.classList.add("hidden");

    if (nameInput) {
        nameInput.required = false;
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.required = false;
    }

    if (pageTitle) {
        pageTitle.textContent =
            "Organizer Login";
    }

    if (pageDescription) {
        pageDescription.textContent =
            "Login to create and manage your tournaments.";
    }

    if (submitBtn) {
        submitBtn.textContent =
            "🔐 Login";
    }

    showMessage("", "");

}


// ========================================
// REGISTER MODE
// ========================================

function setRegisterMode() {

    registerMode = true;

    loginModeBtn?.classList.remove("active");
    registerModeBtn?.classList.add("active");

    nameGroup?.classList.remove("hidden");
    confirmPasswordGroup?.classList.remove("hidden");

    if (nameInput) {
        nameInput.required = true;
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.required = true;
    }

    if (pageTitle) {
        pageTitle.textContent =
            "Create Organizer Account";
    }

    if (pageDescription) {
        pageDescription.textContent =
            "Create your organizer account to manage tournaments.";
    }

    if (submitBtn) {
        submitBtn.textContent =
            "📝 Create Account";
    }

    showMessage("", "");

}


// ========================================
// MODE BUTTONS
// ========================================

loginModeBtn?.addEventListener(
    "click",
    setLoginMode
);

registerModeBtn?.addEventListener(
    "click",
    setRegisterMode
);


// ========================================
// FORM SUBMIT
// ========================================

loginForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        showMessage("", "");

        const email =
            emailInput?.value.trim();

        const password =
            passwordInput?.value;

        if (!email || !password) {

            showMessage(
                "Please enter email and password.",
                "error"
            );

            return;
        }


        // ====================================
        // CREATE ACCOUNT
        // ====================================

        if (registerMode) {

            const name =
                nameInput?.value.trim();

            const confirmPassword =
                confirmPasswordInput?.value;


            if (!name) {

                showMessage(
                    "Please enter your full name.",
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

                submitBtn.disabled = true;

                submitBtn.textContent =
                    "Creating Account...";


                console.log(
                    "📝 Creating organizer account..."
                );


                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "✅ Firebase Auth account created:",
                    user.uid
                );


                // =================================
                // UPDATE DISPLAY NAME
                // =================================

                await updateProfile(
                    user,
                    {
                        displayName: name
                    }
                );


                // =================================
                // SAVE USER PROFILE
                // =================================

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {
                        uid: user.uid,

                        name: name,

                        email: user.email || email,

                        role: "organizer",

                        accountStatus: "Active",

                        createdAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                console.log(
                    "✅ Organizer profile saved"
                );


                showMessage(
                    "✅ Account created successfully! Opening dashboard...",
                    "success"
                );


                // =================================
                // SAVE LOGIN INFO
                // =================================

                localStorage.setItem(
                    "organizerLoggedIn",
                    "true"
                );


                // =================================
                // DASHBOARD
                // =================================

                setTimeout(
                    () => {

                        window.location.href =
                            "./dashboard.html";

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "❌ CREATE ACCOUNT ERROR:",
                    error
                );


                let errorMessage =
                    error.message;


                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    errorMessage =
                        "This email already has an account. Please Login.";

                }
                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    errorMessage =
                        "Please enter a valid email address.";

                }
                else if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    errorMessage =
                        "Password is too weak. Use at least 6 characters.";

                }
                else if (
                    error.code ===
                    "auth/operation-not-allowed"
                ) {

                    errorMessage =
                        "Email/Password login is disabled in Firebase Authentication.";

                }
                else if (
                    error.code ===
                    "permission-denied"
                ) {

                    errorMessage =
                        "Firestore permission denied. Check Firestore Rules.";

                }


                showMessage(
                    "❌ " + errorMessage,
                    "error"
                );


            } finally {

                submitBtn.disabled = false;

                submitBtn.textContent =
                    "📝 Create Account";

            }

            return;
        }


        // ====================================
        // LOGIN
        // ====================================

        try {

            submitBtn.disabled = true;

            submitBtn.textContent =
                "Logging in...";


            console.log(
                "🔐 Organizer login..."
            );


            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "✅ Organizer logged in:",
                user.uid
            );


            localStorage.setItem(
                "organizerLoggedIn",
                "true"
            );


            showMessage(
                "✅ Login successful! Opening dashboard...",
                "success"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "./dashboard.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "❌ LOGIN ERROR:",
                error
            );


            let errorMessage =
                error.message;


            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                errorMessage =
                    "Invalid email or password.";

            }
            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                errorMessage =
                    "Account not found. Please Create Account first.";

            }
            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                errorMessage =
                    "Incorrect password.";

            }
            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                errorMessage =
                    "Please enter a valid email.";

            }


            showMessage(
                "❌ " + errorMessage,
                "error"
            );


        } finally {

            submitBtn.disabled = false;

            submitBtn.textContent =
                registerMode
                    ? "📝 Create Account"
                    : "🔐 Login";

        }

    }
);


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "👤 Current organizer:",
                user.email,
                user.uid
            );

        }

    }
);


// ========================================
// DEFAULT MODE
// ========================================

setLoginMode();


console.log(
    "✅ ORGANIZER LOGIN JS READY"
);