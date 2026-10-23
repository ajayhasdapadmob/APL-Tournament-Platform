
import { auth, db } from "../firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const message = document.getElementById("message");
const recycleList = document.getElementById("recycleList");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function tournamentName(data) {
  return data.tournamentName || data.name || data.title || "Unnamed Tournament";
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    message.textContent = "Please log in to access the Recycle Bin.";
    return;
  }

  await loadRecycleBin();
});

async function loadRecycleBin() {
  message.textContent = "Loading recycled tournaments…";
  recycleList.replaceChildren();

  try {
    const snapshot = await getDocs(collection(db, "tournaments"));

    const deletedDocs = snapshot.docs.filter(item => {
      const data = item.data();
      return data.isDeleted === true || data.deleted === true;
    });

    if (deletedDocs.length === 0) {
      message.textContent = "Recycle Bin is empty.";
      return;
    }

    message.textContent =
      `${deletedDocs.length} recycled tournament(s) found.`;

    for (const item of deletedDocs) {
      const data = item.data();
      const card = document.createElement("article");
      card.className = "tournament";

      const heading = document.createElement("h2");
      heading.textContent = tournamentName(data);

      const details = document.createElement("p");
      details.textContent =
        `Tournament ID: ${item.id} | Status: Recycled`;

      const actions = document.createElement("div");
      actions.className = "actions";

      const restoreButton = document.createElement("button");
      restoreButton.type = "button";
      restoreButton.textContent = "♻️ Restore";
      restoreButton.addEventListener("click", async () => {
        if (!auth.currentUser) {
          message.textContent = "Please log in again.";
          return;
        }

        const confirmed = confirm(
          `Restore "${tournamentName(data)}"?`
        );

        if (!confirmed) return;

        restoreButton.disabled = true;

        try {
          await updateDoc(doc(db, "tournaments", item.id), {
            isDeleted: false,
            deleted: false,
            restoredAt: serverTimestamp(),
            restoredBy: auth.currentUser.uid
          });

          message.textContent =
            "Tournament restored. Refreshing the list…";

          await loadRecycleBin();
        } catch (error) {
          console.error("Restore failed:", error);
          message.textContent =
            "Restore failed. Check Admin permissions and Firestore rules.";
          restoreButton.disabled = false;
        }
      });

      const permanentDeleteNote = document.createElement("p");
      permanentDeleteNote.className = "status";
      permanentDeleteNote.textContent =
        "Permanent Delete: disabled until secure server-side Admin verification is configured.";

      actions.appendChild(restoreButton);
      card.append(heading, details, actions, permanentDeleteNote);
      recycleList.appendChild(card);
    }
  } catch (error) {
    console.error("Recycle Bin loading failed:", error);
    message.textContent =
      "Could not load Recycle Bin. Check Firebase access permissions.";
  }
}
