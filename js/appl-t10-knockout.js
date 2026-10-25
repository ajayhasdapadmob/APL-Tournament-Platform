
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { db } from "../firebase.js";

const norm = value => String(value ?? "").trim().toLowerCase();

function roundName(roundNumber, totalRounds) {
  const remaining = totalRounds - roundNumber;

  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semi Final";
  if (remaining === 2) return "Quarter Final";

  return `Round of ${2 ** (remaining + 1)}`;
}

function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * APPL T10 knockout fixtures.
 * Eligible teams must be Approved AND Paid.
 * Existing matches are never overwritten.
 */
export async function generateApplT10Knockout(tournamentId) {
  if (!tournamentId) {
    throw new Error("Tournament ID nahi mila.");
  }

  const tournamentRef = doc(db, "tournaments", tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);

  if (!tournamentSnap.exists()) {
    throw new Error("Tournament nahi mila.");
  }

  const tournament = tournamentSnap.data();

  if (tournament.knockoutGenerated === true) {
    throw new Error("Knockout fixtures pehle hi generate ho chuke hain.");
  }

  const teamsSnap = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  const teams = teamsSnap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(team =>
      norm(team.status) === "approved" &&
      norm(team.paymentStatus) === "paid"
    );

  if (teams.length < 2) {
    throw new Error(
      "Knockout ke liye kam se kam 2 Approved aur Paid teams chahiye."
    );
  }

  const now = Date.now();
  const opensAt = tournament.registrationOpenAt?.toMillis?.();
  const closesAt = tournament.registrationCloseAt?.toMillis?.();

  if (opensAt && now < opensAt) {
    throw new Error("Registration opening time abhi nahi aaya.");
  }

  if (closesAt && now < closesAt) {
    throw new Error("Registration closing time abhi nahi aaya.");
  }

  if (tournament.registrationLocked !== true) {
    throw new Error(
      "Pehle Admin panel se registration lock hona chahiye."
    );
  }

  const existingMatches = await getDocs(
    collection(db, "tournaments", tournamentId, "matches")
  );

  if (!existingMatches.empty) {
    throw new Error(
      "Is tournament mein pehle se matches hain. Existing schedule ko safe rakhne ke liye fixtures nahi banaye gaye."
    );
  }

  const bracketSize = nextPowerOfTwo(teams.length);
  const totalRounds = Math.log2(bracketSize);

  // Team order is deterministic; random seeding is intentionally avoided.
  const slots = [...teams];
  while (slots.length < bracketSize) slots.push(null);

  const batch = writeBatch(db);
  const rounds = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const roundNumber = roundIndex + 1;
    const matchesInRound = bracketSize / (2 ** roundNumber);
    const roundMatches = [];

    for (let i = 0; i < matchesInRound; i++) {
      const matchRef = doc(
        collection(db, "tournaments", tournamentId, "matches")
      );

      roundMatches.push({
        id: matchRef.id,
        ref: matchRef,
        roundNumber,
        matchNumber: i + 1,
        round: roundName(roundNumber, totalRounds),
        teamA: null,
        teamB: null,
        winner: "",
        status: "Upcoming",
        nextMatchId: null,
        nextSlot: null
      });
    }

    rounds.push(roundMatches);
  }

  // Link every match to its next-round destination.
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].forEach((match, i) => {
      match.nextMatchId = rounds[r + 1][Math.floor(i / 2)].id;
      match.nextSlot = i % 2 === 0 ? "teamA" : "teamB";
    });
  }

  // Fill the first round and record byes.
  rounds[0].forEach((match, i) => {
    match.teamA = slots[i * 2];
    match.teamB = slots[i * 2 + 1];

    if (match.teamA && !match.teamB) {
      match.winner = match.teamA.id;
      match.status = "Completed";
      match.result = "Bye";
    } else if (!match.teamA && match.teamB) {
      match.winner = match.teamB.id;
      match.status = "Completed";
      match.result = "Bye";
    }
  });

  // Write all rounds. Bye winners are propagated in memory.
  for (let r = 0; r < rounds.length; r++) {
    for (const match of rounds[r]) {
      if (match.winner && match.nextMatchId) {
        const nextRound = rounds[r + 1];
        const nextMatch = nextRound.find(
          item => item.id === match.nextMatchId
        );

        if (nextMatch && match.nextSlot) {
          nextMatch[match.nextSlot] =
            teams.find(team => team.id === match.winner) ?? null;

          if (nextMatch.teamA && !nextMatch.teamB) {
            // Do not auto-complete a match with only one participant
            // unless the missing participant is a genuine bye.
            // It will be evaluated after all feeder matches are processed.
          }
        }
      }
    }

    for (const match of rounds[r]) {
      batch.set(match.ref, {
        tournamentId,
        source: "appl-t10-knockout",
        round: match.round,
        roundNumber: match.roundNumber,
        matchNumber: match.matchNumber,
        teamAId: match.teamA?.id ?? "",
        teamAName: match.teamA?.teamName ?? "TBD",
        teamBId: match.teamB?.id ?? "",
        teamBName: match.teamB?.teamName ?? "TBD",
        status: match.status,
        winner: match.winner,
        result: match.result ?? "",
        nextMatchId: match.nextMatchId,
        nextSlot: match.nextSlot,
        thirdPlaceMatch: false,
        createdAt: serverTimestamp()
      });
    }
  }

  batch.update(tournamentRef, {
    tournamentType: "APPL T10",
    format: "Knockout",
    knockoutGenerated: true,
    knockoutGeneratedAt: serverTimestamp(),
    eligibleTeamCount: teams.length,
    bracketSize,
    byeCount: bracketSize - teams.length,
    totalRounds
  });

  await batch.commit();

  return {
    teamCount: teams.length,
    bracketSize,
    byeCount: bracketSize - teams.length,
    totalRounds,
    matchCount: rounds.reduce((sum, round) => sum + round.length, 0)
  };
}
