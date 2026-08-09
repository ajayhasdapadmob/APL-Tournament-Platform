// Firebase App
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";


// Firebase Authentication
import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


// Firebase Firestore
import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// Firebase Storage
import {
    getStorage
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


// ===============================
// Firebase Configuration
// ===============================

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


// ===============================
// Initialize Firebase
// ===============================

const app =
    initializeApp(firebaseConfig);


// ===============================
// Export Firebase Services
// ===============================

export const auth =
    getAuth(app);


export const db =
    getFirestore(app);


export const storage =
    getStorage(app);