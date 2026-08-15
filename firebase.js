// ========================================
// FIREBASE APP
// ========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";


// ========================================
// FIREBASE AUTHENTICATION
// ========================================

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// ========================================
// FIRESTORE
// ========================================

import {
    getFirestore,
    enableNetwork
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ========================================
// FIREBASE STORAGE
// ========================================

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {

    apiKey:
        "AIzaSyCEkiHDayUu5NF9g5EOsQL-Dwyg6XYz57k",

    authDomain:
        "apl-tournament-platform.firebaseapp.com",

    projectId:
        "apl-tournament-platform",

    storageBucket:
        "apl-tournament-platform.firebasestorage.app",

    messagingSenderId:
        "915381266456",

    appId:
        "1:915381266456:web:947236a5a210fa11bfbb6d",

    measurementId:
        "G-J3YWBRWVN0"

};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app =
    initializeApp(firebaseConfig);


// ========================================
// AUTH
// ========================================

export const auth =
    getAuth(app);


// ========================================
// FIRESTORE
// ========================================

export const db =
    getFirestore(app);


// ========================================
// STORAGE
// ========================================

export const storage =
    getStorage(app);


// ========================================
// FIRESTORE NETWORK
// ========================================

enableNetwork(db)
    .then(() => {

        console.log(
            "🔥 Firestore network enabled"
        );

    })
    .catch((error) => {

        console.error(
            "❌ Firestore network error:",
            error
        );

    });


console.log(
    "✅ Firebase initialized successfully"
);

console.log(
    "🔥 Project:",
    firebaseConfig.projectId
);