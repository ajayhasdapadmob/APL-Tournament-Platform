
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { db } from "../firebase.js";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getTeamId(match, side) {
  return side === "A"
    ? match.teamAId || match.team1Id || ""
    : match.teamBId || match.team2Id || "";
}

function getTeamName(match, side) {
  return side === "A"
    ? match.teamAName || match.teamA || match.team1Name || match.team1 || ""
    : match.teamBName || match.teamB || match.team2Name || match.team2 || "";
}

/**
 * Call this only after a completed APPL T10 match has a confirmed winner.
 *
 * winnerTeamId: Firestore team document ID
 * winnerTeamName: display name of the winning team
 */
export async function advanceApplT10Winner({
  tournamentId,
  matchId,
  winnerTeamId,
  winnerTeamName
}) {
  if (!tournamentId || !matchId || !winnerTeamId) {
    throw new Error("Tournament, match, and winner team are required.");
  }

  const tournamentRef = doc(db, "tournaments", tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);

  if (!tournamentSnap.exists()) {
    throw new Error("Tournament not found.");
  }

  const tournament = tournamentSnap.data();

  // Never apply APPL T10 progression to the legacy APL League.
  if (normalize(tournament.tournamentType) !== "appl t10") {
    return { skipped: true, reason: "Not an APPL T10 tournament." };
  }

  const matchRef = doc(
    db,
    "tournaments",
    tournamentId,
    "matches",
    matchId
  );

  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("Match not found.");
  }

  const match = matchSnap.data();

  if (normalize(match.status) !== "completed") {
    throw new Error("Complete the match before advancing its winner.");
  }

  const teamAId = getTeamId(match, "A");
  const teamBId = getTeamId(match, "B");

  if (winnerTeamId !== teamAId && winnerTeamId !== teamBId) {
    throw new Error("The selected winner is not one of this match's teams.");
  }

  // A saved winner makes this operation idempotent.
  if (match.advancementProcessed === true) {
    return { alreadyProcessed: true };
  }

  const winnerName =
    winnerTeamName ||
    (winnerTeamId === teamAId
      ? getTeamName(match, "A")
      : getTeamName(match, "B"));

  const nextMatchId = match.nextMatchId || "";
  const nextSlot = normalize(match.nextSlot || "");

  if (nextMatchId) {
    if (!["a", "b", "teama", "teamb"].includes(nextSlot)) {
      throw new Error(
        "Next match exists, but nextSlot is missing or invalid."
      );
    }

    const nextRef = doc(
      db,
      "tournaments",
      tournamentId,
      "matches",
      nextMatchId
    );

    const nextSnap = await getDoc(nextRef);

    if (!nextSnap.exists()) {
      throw new Error("The next-round match does not exist.");
    }

    const nextMatch = nextSnap.data();
    const isA = nextSlot === "a" || nextSlot === "teama";

    const existingId = isA
      ? getTeamId(nextMatch, "A")
      : getTeamId(nextMatch, "B");

    if (existingId && existingId !== winnerTeamId) {
      throw new Error(
        "The next-round slot already contains a different team."
      );
    }

    const slotUpdate = isA
      ? {
          teamAId: winnerTeamId,
          teamAName: winnerName,
          teamA: winnerName
        }
      : {
          teamBId: winnerTeamId,
          teamBName: winnerName,
          teamB: winnerName
        };

    await updateDoc(nextRef, {
      ...slotUpdate,
      updatedAt: serverTimestamp()
    });

    await updateDoc(matchRef, {
      winnerTeamId,
      winnerTeamName: winnerName,
      advancementProcessed: true,
      advancementProcessedAt: serverTimestamp()
    });

    return {
      advanced: true,
      nextMatchId,
      winnerTeamId,
      winnerTeamName: winnerName
    };
  }

  // No nextMatchId means this must be the final match to declare champion.
  const round = normalize(match.round || match.roundName || "");

  if (!round.includes("final")) {
    throw new Error(
      "This match has no next match and is not marked as Final. Champion was not declared."
    );
  }

  await updateDoc(matchRef, {
    winnerTeamId,
    winnerTeamName: winnerName,
    advancementProcessed: true,
    advancementProcessedAt: serverTimestamp()
  });

  await updateDoc(tournamentRef, {
    championTeamId: winnerTeamId,
    championTeamName: winnerName,
    championDeclared: true,
    championDeclaredAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    championDeclared: true,
    championTeamId: winnerTeamId,
    championTeamName: winnerName
  };
}
