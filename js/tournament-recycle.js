
import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";

const functions = getFunctions(undefined, "asia-south1");
const permanentDeleteTournament = httpsCallable(
  functions,
  "permanentDeleteTournament"
);

const TOURNAMENTS = "tournaments";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function tournamentTitle(tournament, id) {
  return (
    tournament.name ||
    tournament.tournamentName ||
    tournament.title ||
    tournament.leagueName ||
    `Tournament ${id}`
  );
}

function tournamentIsRecycled(data) {
  return data.isDeleted === true || data.deleted === true;
}

function showRecycleMessage(message, isError = false) {
  let element = document.getElementById("tournamentRecycleMessage");

  if (!element) {
    element = document.createElement("p");
    element.id = "tournamentRecycleMessage";
    element.style.cssText = "padding:10px;border-radius:8px;margin:10px 0;";
    document.body.prepend(element);
  }

  element.textContent = message;
  element.style.background = isError ? "#fee2e2" : "#dcfce7";
  element.style.color = isError ? "#991b1b" : "#166534";
}

async function loadTournamentDocument(id) {
  const snapshot = await getDocs(
    query(collection(db, TOURNAMENTS), where("__name__", "==", id))
  );

  if (snapshot.empty) {
    throw new Error("Tournament not found.");
  }

  return snapshot.docs[0];
}

/**
 * Soft-delete: tournament document and its subcollections remain intact.
 * Only the Tournament Platform's tournaments collection is changed.
 */
export async function recycleTournament(id) {
  if (!id) throw new Error("Tournament ID is missing.");

  const confirmed = confirm(
    "Move this tournament to Recycle Bin?\n\n" +
    "It will be hidden from normal lists. Its teams and matches will be preserved."
  );

  if (!confirmed) return false;

  try {
    const tournament = await loadTournamentDocument(id);

    if (tournamentIsRecycled(tournament.data())) {
      showRecycleMessage("Tournament is already in Recycle Bin.");
      return false;
    }

    await updateDoc(doc(db, TOURNAMENTS, id), {
      isDeleted: true,
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedFrom: "APL Tournament Platform"
    });

    showRecycleMessage("Tournament moved to Recycle Bin.");
    window.dispatchEvent(new CustomEvent("apl:tournaments-changed"));
    return true;
  } catch (error) {
    console.error(error);
    showRecycleMessage(
      "Could not recycle tournament. Check admin login and Firebase rules.",
      true
    );
    return false;
  }
}

/**
 * Restore the existing tournament document.
 * Teams and matches are not recreated or overwritten.
 */
export async function restoreTournament(id) {
  if (!id) throw new Error("Tournament ID is missing.");

  try {
    const tournament = await loadTournamentDocument(id);

    if (!tournamentIsRecycled(tournament.data())) {
      showRecycleMessage("Tournament is already active.");
      return false;
    }

    await updateDoc(doc(db, TOURNAMENTS, id), {
      isDeleted: false,
      deleted: false,
      restoredAt: serverTimestamp()
    });

    showRecycleMessage("Tournament restored successfully.");
    window.dispatchEvent(new CustomEvent("apl:tournaments-changed"));
    return true;
  } catch (error) {
    console.error(error);
    showRecycleMessage(
      "Restore failed. Check admin login and Firebase rules.",
      true
    );
    return false;
  }
}

/**
 * Permanently deletes through a trusted Cloud Function.
 * Never recursively delete Firestore data from an unrestricted browser client.
 */
export async function permanentlyDeleteTournament(id) {
  if (!id) throw new Error("Tournament ID is missing.");

  const confirmed = confirm(
    "PERMANENT DELETE\n\n" +
    "This permanently removes the tournament and its nested records. " +
    "This action cannot be undone.\n\nContinue?"
  );

  if (!confirmed) return false;

  const secondConfirmation = prompt(
    "Type DELETE to confirm permanent deletion:"
  );

  if (secondConfirmation !== "DELETE") {
    showRecycleMessage("Permanent deletion cancelled.");
    return false;
  }

  try {
    await permanentDeleteTournament({ tournamentId: id });

    showRecycleMessage("Tournament permanently deleted.");
    window.dispatchEvent(new CustomEvent("apl:tournaments-changed"));
    return true;
  } catch (error) {
    console.error(error);
    showRecycleMessage(
      error?.message || "Permanent delete failed. Check admin access.",
      true
    );
    return false;
  }
}

export async function getTournaments({ recycled = false } = {}) {
  const snapshot = await getDocs(collection(db, TOURNAMENTS));

  return snapshot.docs
    .map(item => ({
      id: item.id,
      ...item.data()
    }))
    .filter(item => tournamentIsRecycled(item) === recycled)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
}

/**
 * Standalone rendering helper.
 *
 * Use this in both the tournament list and the Admin Panel.
 * Existing page layouts do not need to be replaced.
 */
export async function renderTournamentRecycle(container, {
  recycled = false,
  admin = false
} = {}) {
  const root = typeof container === "string"
    ? document.querySelector(container)
    : container;

  if (!root) {
    throw new Error("Tournament list container was not found.");
  }

  root.textContent = "Loading tournaments...";

  try {
    const tournaments = await getTournaments({ recycled });

    if (!tournaments.length) {
      root.textContent = recycled
        ? "Recycle Bin is empty."
        : "No tournaments found.";
      return;
    }

    root.innerHTML = tournaments.map(item => {
      const title = escapeHTML(tournamentTitle(item, item.id));
      const id = escapeHTML(item.id);

      const action = recycled
        ? `
          <button type="button" data-action="restore" data-id="${id}">
            Restore
          </button>
          ${admin ? `
            <button type="button" data-action="permanent" data-id="${id}">
              Permanent Delete
            </button>
          ` : ""}
        `
        : `
          <button type="button" data-action="recycle" data-id="${id}">
            Move to Recycle Bin
          </button>
        `;

      return `
        <article class="apl-recycle-card">
          <div>
            <strong>${title}</strong>
            <small>Tournament ID: ${id}</small>
            ${recycled ? "<small>In Recycle Bin</small>" : ""}
          </div>
          <div class="apl-recycle-actions">${action}</div>
        </article>
      `;
    }).join("");

    root.querySelectorAll("button[data-action]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const action = button.dataset.action;

        button.disabled = true;

        try {
          if (action === "recycle") await recycleTournament(id);
          if (action === "restore") await restoreTournament(id);

          if (action === "permanent") {
            if (!admin) {
              throw new Error("Only an authorized admin can permanently delete.");
            }
            await permanentlyDeleteTournament(id);
          }

          await renderTournamentRecycle(root, { recycled, admin });
        } catch (error) {
          console.error(error);
          showRecycleMessage(error.message || "Action failed.", true);
        } finally {
          button.disabled = false;
        }
      });
    });
  } catch (error) {
    console.error(error);
    root.textContent =
      "Could not load tournaments. Check Firebase configuration and access rules.";
  }
}

export function addRecycleStyles() {
  if (document.getElementById("apl-recycle-styles")) return;

  const style = document.createElement("style");
  style.id = "apl-recycle-styles";
  style.textContent = `
    .apl-recycle-card {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      padding:16px;
      margin:12px 0;
      border:1px solid #d1d5db;
      border-radius:12px;
      background:#fff;
      color:#111827;
      flex-wrap:wrap;
    }
    .apl-recycle-card small {
      display:block;
      margin-top:5px;
      color:#6b7280;
      overflow-wrap:anywhere;
    }
    .apl-recycle-actions {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }
    .apl-recycle-actions button {
      border:0;
      border-radius:8px;
      padding:10px 14px;
      cursor:pointer;
      background:#166534;
      color:#fff;
      font-weight:600;
    }
    .apl-recycle-actions button[data-action="recycle"] {
      background:#b45309;
    }
    .apl-recycle-actions button[data-action="permanent"] {
      background:#b91c1c;
    }
    .apl-recycle-actions button:disabled {
      opacity:.55;
      cursor:wait;
    }
  `;

  document.head.appendChild(style);
}
