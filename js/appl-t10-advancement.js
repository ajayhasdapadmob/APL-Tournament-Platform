```javascript
import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { db } from "../firebase.js";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
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

function isSupportedTournamentType(value) {
  const type = normalize(value);
  return type === "apl t10" || type === "appl t10";
}

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
  const matchRef = doc(
    db,
    "tournaments",
    tournamentId,
    "matches",
    matchId
  );

  return runTransaction(db, async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef);

    if (!tournamentSnap.exists()) {
      throw new Error("Tournament not found.");
    }

    const tournament = tournamentSnap.data();

    if (!isSupportedTournamentType(tournament.tournamentType)) {
      return {
        skipped: true,
        reason: "Not an APL T10/APPL T10 tournament."
      };
    }

    const matchSnap = await transaction.get(matchRef);

    if (!matchSnap.exists()) {
      throw new Error("Match not found.");
    }

    const match = matchSnap.data();

    if (normalize(match.status) !== "completed") {
      throw new Error("Match is not completed.");
    }

    const teamAId = getTeamId(match, "A");
    const teamBId = getTeamId(match, "B");

    if (!teamAId || !teamBId) {
      throw new Error("Both match teams must be set.");
    }

    if (teamAId === teamBId) {
      throw new Error("Both match slots contain the same team.");
    }

    const scoreA = Number(match.scoreA ?? match.teamAScore ?? NaN);
    const scoreB = Number(match.scoreB ?? match.teamBScore ?? NaN);

    if (
      Number.isFinite(scoreA) &&
      Number.isFinite(scoreB) &&
      scoreA === scoreB
    ) {
      throw new Error("Scores are tied. Confirm a tiebreak result first.");
    }

    if (winnerTeamId !== teamAId && winnerTeamId !== teamBId) {
      throw new Error("Winner is not one of this match's teams.");
    }

    if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
      const scoreWinnerId = scoreA > scoreB ? teamAId : teamBId;

      if (scoreWinnerId !== winnerTeamId) {
        throw new Error("Winner does not match the saved scores.");
      }
    }

    if (match.advancementProcessed === true) {
      return { alreadyProcessed: true };
    }

    const winnerName =
      winnerTeamName ||
      (winnerTeamId === teamAId
        ? getTeamName(match, "A")
        : getTeamName(match, "B"));

    if (!winnerName) {
      throw new Error("Winner team name is missing.");
    }

    const nextMatchId = match.nextMatchId || "";
    const nextSlot = normalize(match.nextSlot || "");

    if (nextMatchId) {
      if (nextMatchId === matchId) {
        throw new Error("A match cannot advance into itself.");
      }

      if (!["a", "b", "teama", "teamb"].includes(nextSlot)) {
        throw new Error("Next match slot must be A or B.");
      }

      const nextRef = doc(
        db,
        "tournaments",
        tournamentId,
        "matches",
        nextMatchId
      );

      const nextSnap = await transaction.get(nextRef);

      if (!nextSnap.exists()) {
        throw new Error("Next-round match not found.");
      }

      const nextMatch = nextSnap.data();

      if (normalize(nextMatch.status) === "completed") {
        throw new Error("Cannot change a completed next-round match.");
      }

      const isA = nextSlot === "a" || nextSlot === "teama";
      const existingId = getTeamId(nextMatch, isA ? "A" : "B");

      if (existingId && existingId !== winnerTeamId) {
        throw new Error("Next-round slot already contains another team.");
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

      transaction.update(nextRef, {
        ...slotUpdate,
        updatedAt: serverTimestamp()
      });

      transaction.update(matchRef, {
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

    const round = normalize(match.round || match.roundName || "");

    if (!round.includes("final")) {
      throw new Error(
        "No next match is configured and this match is not marked Final."
      );
    }

    transaction.update(matchRef, {
      winnerTeamId,
      winnerTeamName: winnerName,
      advancementProcessed: true,
      advancementProcessedAt: serverTimestamp()
    });

    transaction.update(tournamentRef, {
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
  });
}
