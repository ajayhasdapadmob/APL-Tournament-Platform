
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getFirestore,
  enableNetwork
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

// APL TOURNAMENT PLATFORM — existing scoring database
const tournamentConfig = {
  apiKey: "AIzaSyCEkiHDayUu5NF9g5EOsQL-Dwyg6XYz57k",
  authDomain: "apl-tournament-platform.firebaseapp.com",
  projectId: "apl-tournament-platform",
  storageBucket: "apl-tournament-platform.firebasestorage.app",
  messagingSenderId: "915381266456",
  appId: "1:915381266456:web:947236a5a210fa11bfbb6d",
  measurementId: "G-J3YWBRWVN0"
};

// APL CRICKET LEAGUE — existing registrations and players
const legacyConfig = {
  apiKey: "AIzaSyC5sHNe2gV3vJYA1F2-JQsNbZrU5DTLcPw",
  authDomain: "ajay-premier-league-apl.firebaseapp.com",
  projectId: "ajay-premier-league-apl",
  storageBucket: "ajay-premier-league-apl.firebasestorage.app",
  messagingSenderId: "514698419085",
  appId: "1:514698419085:web:30264cdf0ee9629706bbc4",
  measurementId: "G-8VMTN4PPQZ"
};

// Keep existing Tournament Platform exports unchanged.
const tournamentApp =
  getApps().some(app => app.name === "aplTournamentPlatform")
    ? getApp("aplTournamentPlatform")
    : initializeApp(tournamentConfig, "aplTournamentPlatform");

export const auth = getAuth(tournamentApp);
export const db = getFirestore(tournamentApp);
export const storage = getStorage(tournamentApp);

// Separate read source for APL League.
const legacyApp =
  getApps().some(app => app.name === "aplLeaguePlayers")
    ? getApp("aplLeaguePlayers")
    : initializeApp(legacyConfig, "aplLeaguePlayers");

export const legacyDb = getFirestore(legacyApp);

enableNetwork(db).catch(console.error);
enableNetwork(legacyDb).catch(console.error);

console.log("Tournament Firebase:", tournamentConfig.projectId);
console.log("APL League players source:", legacyConfig.projectId);
