
import { db, auth } from "../firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const state = {
  user: null,
  bound: false,
  saving: false
};

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "info") {
  const box = $("message") || $("tournamentMessage");

  if (box) {
    box.textContent = message;
    box.style.color =
      type === "error" ? "#dc2626" :
      type === "success" ? "#15803d" :
      "#334155";
  } else {
    alert(message);
  }
}

function getValue(id) {
  return $(id)?.value?.trim() || "";
}

function getNumber(id) {
  const value = getValue(id);
  if (value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateForm() {
  const name = getValue("tournamentName");
  const venue = getValue("venue");
  const startDate = getValue("startDate");
  const endDate = getValue("endDate");
  const totalTeams = getNumber("totalTeams");
  const entryFee = getNumber("entryFee");
  const winnerPrize = getNumber("winnerPrize");
  const runnerPrize = getNumber("runnerPrize");
  const format = getValue("format");

  if (!name) return "Tournament ka naam bhariye.";
  if (!venue) return "Venue bhariye.";
  if (!startDate || !endDate) return "Start aur end date select kijiye.";
  if (endDate < startDate) return "End date, start date se pehle nahi ho sakti.";
  if (!totalTeams || !Number.isInteger(totalTeams) || totalTeams < 2) {
    return "Total teams kam se kam 2 honi chahiye.";
  }

  for (const [label, value] of [
    ["Entry fee", entryFee],
    ["Winner prize", winnerPrize],
    ["Runner-up prize", runnerPrize]
  ]) {
    if (value === null || value < 0) {
      return `${label} sahi tarah bhariye.`;
    }
  }

  if (!format) return "Tournament format select kijiye.";

  return null;
}

async function createTournament(event) {
  event.preventDefault();

  if (state.saving) return;

  if (!state.user) {
    showMessage("Pehle admin account se login kijiye.", "error");
    return;
  }

  const error = validateForm();

  if (error) {
    showMessage(error, "error");
    return;
  }

  state.saving = true;

  const submitButton =
    $("createTournamentBtn") ||
    $("submitBtn") ||
    $("tournamentSubmitBtn") ||
    document.querySelector(
      "#tournamentForm button[type='submit']"
    );

  if (submitButton) submitButton.disabled = true;

  const name = getValue("tournamentName");

  const tournamentData = {
    name,
    tournamentName: name,
    venue: getValue("venue"),
    startDate: getValue("startDate"),
    endDate: getValue("endDate"),
    totalTeams: getNumber("totalTeams"),
    entryFee: getNumber("entryFee"),
    winnerPrize: getNumber("winnerPrize"),
    runnerPrize: getNumber("runnerPrize"),
    format: getValue("format"),
    contact: getValue("contact"),
    email: getValue("email"),
    description: getValue("description"),

    status: "Upcoming",
    createdBy: state.user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    isDeleted: false,
    deleted: false
  };

  try {
    showMessage("Tournament save ho raha hai...");

    // Naya document create hota hai.
    // Koi purana tournament update ya delete nahi hota.
    const newTournament = await addDoc(
      collection(db, "tournaments"),
      tournamentData
    );

    showMessage("Tournament successfully save ho gaya!", "success");

    window.location.href =
      `./my-tournaments.html?tournamentId=${encodeURIComponent(newTournament.id)}`;

  } catch (error) {
    console.error("Create tournament error:", error);

    showMessage(
      error.code === "permission-denied"
        ? "Firebase permission denied. Firestore Rules aur admin login check kijiye."
        : "Tournament save nahi hua. Internet aur Firebase settings check karke dobara try kijiye.",
      "error"
    );
  } finally {
    state.saving = false;
    if (submitButton) submitButton.disabled = false;
  }
}

onAuthStateChanged(auth, (user) => {
  state.user = user;

  if (!user) {
    showMessage("Tournament banane ke liye pehle login kijiye.", "error");
    return;
  }

  const form = $("tournamentForm");

  if (!form) {
    console.error("tournamentForm nahi mila. HTML form ID check kijiye.");
    showMessage("Form nahi mila. create-tournament.html check kijiye.", "error");
    return;
  }

  if (!state.bound) {
    form.addEventListener("submit", createTournament);
    state.bound = true;
  }
});

console.log("Create Tournament JS loaded.");
