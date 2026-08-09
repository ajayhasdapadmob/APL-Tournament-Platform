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


// =========================
// ELEMENTS
// =========================

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

const userId =
    document.getElementById("userId");

const logoutBtn =
    document.getElementById("logoutBtn");


// =========================
// SHOW MESSAGE
// =========================

function showMessage(text, success = true) {

    if (!message) return;

    message.textContent = text;

    message.style.color =
        success ? "#059669" : "#dc2626";

}


// =========================
// LOAD PROFILE
// =========================

async function loadProfile(user) {

    try {

        const profileRef =
            doc(
                db,
                "users",
                user.uid
            );


        const profileSnap =
            await getDoc(profileRef);


        // Firebase account information

        const firebaseName =
            user.displayName || "Organizer";

        const firebaseEmail =
            user.email || "";


        profileName.textContent =
            firebaseName;

        profileEmail.textContent =
            firebaseEmail;


        emailInput.value =
            firebaseEmail;


        userId.textContent =
            user.uid;


        // Firestore profile

        if (profileSnap.exists()) {

            const data =
                profileSnap.data();


            nameInput.value =
                data.name ||
                firebaseName;


            mobileInput.value =
                data.mobile ||
                "";


            cityInput.value =
                data.city ||
                "";


            organizationInput.value =
                data.organization ||
                "";


            profileName.textContent =
                data.name ||
                firebaseName;

        } else {

            nameInput.value =
                firebaseName;

        }


    } catch (error) {

        console.error(error);

        showMessage(
            "❌ " + error.message,
            false
        );

    }

}


// =========================
// SAVE PROFILE
// =========================

if (saveProfileBtn) {

    saveProfileBtn.addEventListener(
        "click",
        async () => {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "❌ Please login first."
                );

                window.location.href =
                    "login.html";

                return;

            }


            const name =
                nameInput.value.trim();

            const mobile =
                mobileInput.value.trim();

            const city =
                cityInput.value.trim();

            const organization =
                organizationInput.value.trim();


            if (!name) {

                showMessage(
                    "⚠️ Please enter your name.",
                    false
                );

                return;

            }


            try {

                saveProfileBtn.disabled =
                    true;

                saveProfileBtn.textContent =
                    "⏳ Saving...";


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
                            user.email || "",

                        mobile:
                            mobile,

                        city:
                            city,

                        organization:
                            organization,

                        updatedAt:
                            serverTimestamp()

                    },

                    {
                        merge: true
                    }

                );


                profileName.textContent =
                    name;


                profileEmail.textContent =
                    user.email || "";


                showMessage(
                    "✅ Profile Saved Successfully!"
                );


            } catch (error) {

                console.error(error);

                showMessage(
                    "❌ " + error.message,
                    false
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


// =========================
// LOGOUT
// =========================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

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
    );

}


// =========================
// AUTH STATE
// =========================

onAuthStateChanged(
    auth,
    (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        loadProfile(user);

    }
);