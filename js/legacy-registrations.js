
import { legacyDb } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const COLLECTIONS_TO_CHECK = [
  "registrations",
  "teamRegistrations",
  "aplRegistrations",
  "playerRegistrations",
  "teams",
  "players"
];

function getValue(data, keys, fallback = "") {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "object") {
        if (value.name) return String(value.name);
        continue;
      }

      return String(value);
    }
  }

  return fallback;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function findRegistrationHeading() {
  const elements = document.querySelectorAll("h1,h2,h3,h4,h5,strong");
  return [...elements].find(el =>
    el.textContent.trim().toLowerCase().includes("apl league registrations")
  );
}

function createPanel() {
  let panel = document.getElementById("legacyRegistrationsFixPanel");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "legacyRegistrationsFixPanel";
  panel.style.cssText =
    "margin:16px 0;padding:16px;border:1px solid #ccc;border-radius:10px;overflow-x:auto;";

  const heading = findRegistrationHeading();

  if (heading?.parentElement) {
    heading.insertAdjacentElement("afterend", panel);
  } else {
    document.body.appendChild(panel);
  }

  return panel;
}

function renderMessage(message, isError = false) {
  const panel = createPanel();

  panel.innerHTML = `
    <div style="font-weight:600;color:${isError ? "#b91c1c" : "inherit"}">
      ${escapeHtml(message)}
    </div>
  `;
}

function renderRegistrations(records, errors) {
  const panel = createPanel();

  if (records.length === 0) {
    panel.innerHTML = `
      <h3>APL League Registrations</h3>
      <p>No records found in the checked collections.</p>
      <p><b>Important:</b> Iska matlab registration delete hona nahi hai.
      Ho sakta hai actual collection ka naam alag ho.</p>
      ${
        errors.length
          ? `<details><summary>Read errors dekhein</summary>
             <ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
             </details>`
          : ""
      }
      <button id="refreshLegacyRegistrations">Refresh Registrations</button>
    `;

    document.getElementById("refreshLegacyRegistrations")
      ?.addEventListener("click", loadLegacyRegistrations);

    return;
  }

  const rows = records.map((record, index) => {
    const d = record.data;

    const team = getValue(d, [
      "teamName", "team", "name", "clubName", "registeredTeam",
      "team_name"
    ], "Team name not found");

    const contact = getValue(d, [
      "contactPerson", "captainName", "ownerName", "playerName",
      "fullName", "name"
    ], "—");

    const phone = getValue(d, [
      "phone", "mobile", "mobileNumber", "phoneNumber",
      "contact", "whatsapp"
    ], "—");

    const status = getValue(d, [
      "status", "registrationStatus", "paymentStatus"
    ], "Not specified");

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(team)}</td>
        <td>${escapeHtml(contact)}</td>
        <td>${escapeHtml(phone)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(record.collection)}</td>
        <td>${escapeHtml(record.id)}</td>
      </tr>
    `;
  }).join("");

  panel.innerHTML = `
    <h3>APL League Registrations</h3>
    <p>Read-only view · ${records.length} record(s) found</p>
    <table style="width:100%;border-collapse:collapse;min-width:700px">
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>Contact / Player</th>
          <th>Phone</th><th>Status</th><th>Collection</th><th>Record ID</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${
      errors.length
        ? `<details style="margin-top:12px">
             <summary>Collections read errors</summary>
             <ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
           </details>`
        : ""
    }
    <button id="refreshLegacyRegistrations" style="margin-top:12px">
      Refresh Registrations
    </button>
  `;

  panel.querySelector("#refreshLegacyRegistrations")
    ?.addEventListener("click", loadLegacyRegistrations);
}

async function loadLegacyRegistrations() {
  renderMessage("Purane APL Firebase se registrations load ho rahe hain...");

  const records = [];
  const errors = [];
  const seen = new Set();

  for (const collectionName of COLLECTIONS_TO_CHECK) {
    try {
      const snapshot = await getDocs(
        collection(legacyDb, collectionName)
      );

      snapshot.forEach(docSnap => {
        const uniqueKey = `${collectionName}/${docSnap.id}`;

        if (seen.has(uniqueKey)) return;
        seen.add(uniqueKey);

        records.push({
          collection: collectionName,
          id: docSnap.id,
          data: docSnap.data()
        });
      });
    } catch (error) {
      console.error(
        `Legacy collection "${collectionName}" read failed:`,
        error
      );

      errors.push(
        `${collectionName}: ${error.code || error.message || "Read failed"}`
      );
    }
  }

  console.log("Legacy registration collections checked:", COLLECTIONS_TO_CHECK);
  console.log("Legacy records found:", records.length);

  renderRegistrations(records, errors);
}

loadLegacyRegistrations().catch(error => {
  console.error("APL legacy registrations failed:", error);
  renderMessage(
    `Registration load error: ${error.code || error.message || "Unknown error"}`,
    true
  );
});
