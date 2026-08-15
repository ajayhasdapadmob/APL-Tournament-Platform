// ======================================================
// APL TOURNAMENT PLATFORM
// PROFILE.JS
// ======================================================

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


console.log("👤 PROFILE JAVASCRIPT LOADED SUCCESSFULLY");


// ======================================================
// ELEMENTS
// ======================================================

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const mobileInput =
    document.getElementById("mobile");

const cityInput =
    document.getElementById("city");

const organizationInput =
    document.getElementById("organization");

const saveProfileBtn =
    document.getElementById("saveProfileBtn");

const message =
    document.getElementById("message");

const accountStatus =
    document.getElementById("accountStatus");

const userId =
    document.getElementById("userId");

const logoutBtn =
    document.getElementById("logoutBtn");


// ======================================================
// CURRENT USER
// ======================================================

let currentUser = null;


// ======================================================
// MESSAGE
// ======================================================

function showMessage(text, type = "success") {

    if (!message) return;

    message.textContent = text;

    message.style.marginTop = "15px";
    message.style.fontWeight = "bold";

    if (type === "error") {
        message.style.color = "#dc2626";
    } else {
        message.style.color = "#16a34a";
    }

}


// ======================================================
// AUTH STATE
// ======================================================

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "PROFILE AUTH:",
            user
        );


        // ==============================================
        // NOT LOGGED IN
        // ==============================================

        if (!user) {

            currentUser = null;

            window.location.href =
                "./login.html";

            return;
        }


        // ==============================================
        // LOGGED IN
        // ==============================================

        currentUser = user;


        const uid =
            user.uid;

        const email =
            user.email || "";


        // ==============================================
        // BASIC AUTH DATA
        // ==============================================

        if (profileEmail) {

            profileEmail.textContent =
                email || "No email";

        }


        if (emailInput) {

            emailInput.value =
                email;

        }


        if (userId) {

            userId.textContent =
                uid;

        }


        if (accountStatus) {

            accountStatus.textContent =
                "Active";

        }


        // ==============================================
        // FIRESTORE PROFILE
        // ==============================================

        try {

            const profileRef =
                doc(
                    db,
                    "users",
                    uid
                );


            const profileSnap =
                await getDoc(
                    profileRef
                );


            // ==========================================
            // PROFILE EXISTS
            // ==========================================

            if (profileSnap.exists()) {

                const data =
                    profileSnap.data();


                console.log(
                    "✅ Firestore profile found:",
                    data
                );


                const fullName =
                    data.name ||
                    user.displayName ||
                    email.split("@")[0] ||
                    "Organizer";


                if (profileName) {

                    profileName.textContent =
                        fullName;

                }


                if (nameInput) {

                    nameInput.value =
                        data.name || "";

                }


                if (mobileInput) {

                    mobileInput.value =
                        data.mobile || "";

                }


                if (cityInput) {

                    cityInput.value =
                        data.city || "";

                }


                if (organizationInput) {

                    organizationInput.value =
                        data.organization || "";

                }


            }

            // ==========================================
            // PROFILE DOES NOT EXIST
            // ==========================================

            else {

                console.log(
                    "No Firestore profile found. Creating profile..."
                );


                const defaultName =
                    user.displayName ||
                    email.split("@")[0] ||
                    "Organizer";


                await setDoc(
                    profileRef,
                    {

                        uid:
                            uid,

                        name:
                            defaultName,

                        email:
                            email,

                        mobile:
                            "",

                        city:
                            "",

                        organization:
                            "",

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
                    "✅ New Firestore profile created"
                );


                if (profileName) {

                    profileName.textContent =
                        defaultName;

                }


                if (nameInput) {

                    nameInput.value =
                        defaultName;

                }

            }


        } catch (error) {

            console.error(
                "❌ PROFILE FIRESTORE ERROR:",
                error
            );


            showMessage(
                "Profile loading failed: " +
                error.message,
                "error"
            );

        }

    }
);


// ======================================================
// SAVE PROFILE
// ======================================================

if (saveProfileBtn) {

    saveProfileBtn.addEventListener(
        "click",
        async () => {

            if (!currentUser) {

                showMessage(
                    "Please login first.",
                    "error"
                );

                return;
            }


            const name =
                nameInput?.value.trim() || "";


            const mobile =
                mobileInput?.value.trim() || "";


            const city =
                cityInput?.value.trim() || "";


            const organization =
                organizationInput?.value.trim() || "";


            if (!name) {

                showMessage(
                    "Please enter your full name.",
                    "error"
                );

                return;
            }


            try {

                saveProfileBtn.disabled =
                    true;

                saveProfileBtn.textContent =
                    "Saving...";


                const profileRef =
                    doc(
                        db,
                        "users",
                        currentUser.uid
                    );


                await setDoc(
                    profileRef,
                    {

                        uid:
                            currentUser.uid,

                        name:
                            name,

                        email:
                            currentUser.email || "",

                        mobile:
                            mobile,

                        city:
                            city,

                        organization:
                            organization,

                        accountStatus:
                            "Active",

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                if (profileName) {

                    profileName.textContent =
                        name;

                }


                showMessage(
                    "✅ Profile saved successfully!",
                    "success"
                );


                console.log(
                    "✅ Profile saved successfully"
                );


            } catch (error) {

                console.error(
                    "❌ PROFILE SAVE ERROR:",
                    error
                );


                showMessage(
                    "Profile save failed: " +
                    error.message,
                    "error"
                );


            } finally {

                saveProfileBtn.disabled =
                    false;

                saveProfileBtn.textContent =
                    "💾 Save Profile";

            }

        }
    );

}


// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                localStorage.removeItem(
                    "selectedTournamentId"
                );

                localStorage.removeItem(
                    "tournamentId"
                );

                sessionStorage.removeItem(
                    "selectedTournamentId"
                );

                sessionStorage.removeItem(
                    "tournamentId"
                );


                window.location.href =
                    "./login.html";


            } catch (error) {

                console.error(
                    "❌ LOGOUT ERROR:",
                    error
                );


                showMessage(
                    "Logout failed: " +
                    error.message,
                    "error"
                );

            }

        }
    );

}