
import { legacyDb } from "../firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const REGISTRATIONS_COLLECTION = "registrations";
const PLAYERS_COLLECTION = "players";

function textValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    if (value.name) return String(value.name).trim();
    return "";
  }
  return String(value).trim();
}

function getValue(data, keys, fallback = "—") {
  for (const key of keys) {
    const value = textValue(data?.[key]);
    if (value) return value;
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

function normalizeTeamId(value) {
  return textValue(value);
}

function isPlaceholderName(name) {
  const normalized = textValue(name).toLowerCase();

  if (!normalized || normalized === "w") return true;

  // Ignore single-character placeholder entries such as A, Q, D.
  if (normalized.length === 1) return true;

  return [
    "n/a",
    "na",
    "null",
    "undefined",
    "none",
    "not available"
  ].includes(normalized);
}

function extractPlayerNames(data) {
  const names = [];

  // Captain may also be included in the player document.
  const captain = textValue(data?.captainName);

  if (!isPlaceholderName(captain)) {
    names.push(captain);
  }

  // Existing legacy player documents use fields such as player2 ... player15.
  for (let number = 2; number <= 15; number++) {
    const name = textValue(data?.[`player${number}`]);

    if (!isPlaceholderName(name)) {
      names.push(name);
    }
  }

  // Deduplicate names without changing their displayed spelling.
  const unique = new Map();

  for (const name of names) {
    const key = name.toLowerCase();
    if (!unique.has(key)) unique.set(key, name);
  }

  return [...unique.values()];
}

function findRegistrationHeading() {
  const elements = document.querySelectorAll("h1,h2,h3,h4,h5,strong");

  return [...elements].find(element =>
    element.textContent
      .trim()
      .toLowerCase()
      .includes("apl league registrations")
  );
}

function createPanel() {
  let panel = document.getElementById("legacyRegistrationsFixPanel");

  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "legacyRegistrationsFixPanel";
  panel.style.cssText = [
    "margin:16px 0",
    "padding:16px",
    "border:1px solid #ccc",
    "border-radius:10px",
    "overflow-x:auto"
  ].join(";");

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

function renderRegistrations(registrations, playersByTeamId, errors) {
  const panel = createPanel();

  const rows = registrations.map((record, index) => {
    const data = record.data;
    const teamId = normalizeTeamId(data.teamId);

    const teamName = getValue(data, [
      "teamName",
      "team_name",
      "team",
      "clubName",
      "registeredTeam"
    ], "Team name not found");

    const captain = getValue(data, [
      "captainName",
      "contactPerson",
      "ownerName"
    ]);

    const status = getValue(data, [
      "status",
      "registrationStatus"
    ], "Not specified");

    const paymentStatus = getValue(data, [
      "paymentStatus"
    ], "Not specified");

    const players = teamId
      ? playersByTeamId.get(teamId) || []
      : [];

    const playerText = players.length
      ? players.join(", ")
      : "Player list not found for this teamId";

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(teamName)}</td>
        <td>${escapeHtml(captain)}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(paymentStatus)}</td>
        <td style="min-width:220px;white-space:normal">
          ${escapeHtml(playerText)}
        </td>
        <td>${escapeHtml(teamId || "—")}</td>
        <td>${escapeHtml(getValue(data, ["registrationId"], record.id))}</td>
      </tr>
    `;
  }).join("");

  panel.innerHTML = `
    <h3>APL League Registrations</h3>

    <p>
      Read-only view · ${registrations.length} registration(s) found
    </p>

    <p>
      Player names are matched using teamId from the legacy players
      collection. This page does not edit or delete legacy records.
    </p>

    <table style="width:100%;border-collapse:collapse;min-width:1000px">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Captain</th>
          <th>Registration Status</th>
          <th>Payment Status</th>
          <th>Registered Players</th>
          <th>Team ID</th>
          <th>Registration ID</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `
          <tr>
            <td colspan="8">No registrations found.</td>
          </tr>
        `}
      </tbody>
    </table>

    ${
      errors.length
        ? `
          <details style="margin-top:12px">
            <summary>Read errors</summary>
            <ul>
              ${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}
            </ul>
          </details>
        `
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
  renderMessage("Purane APL Firebase se registrations aur players load ho rahe hain...");

  const errors = [];

  let registrations = [];
  let playersSnapshot;

  try {
    const snapshot = await getDocs(
      collection(legacyDb, REGISTRATIONS_COLLECTION)
    );

    registrations = snapshot.docs.map(document => ({
      id: document.id,
      data: document.data()
    }));
  } catch (error) {
    console.error("Legacy registrations read failed:", error);

    renderMessage(
      `Registrations load nahi hue: ${error.code || error.message || "Unknown error"}`,
      true
    );
    return;
  }

  try {
    playersSnapshot = await getDocs(
      collection(legacyDb, PLAYERS_COLLECTION)
    );
  } catch (error) {
    console.error("Legacy players read failed:", error);

    errors.push(
      `players: ${error.code || error.message || "Read failed"}`
    );
  }

  const playersByTeamId = new Map();

  if (playersSnapshot) {
    playersSnapshot.forEach(document => {
      const data = document.data();
      const teamId = normalizeTeamId(data.teamId);

      if (!teamId) return;

      const names = extractPlayerNames(data);

      if (!playersByTeamId.has(teamId)) {
        playersByTeamId.set(teamId, new Map());
      }

      const teamPlayers = playersByTeamId.get(teamId);

      for (const name of names) {
        const key = name.toLowerCase();

        if (!teamPlayers.has(key)) {
          teamPlayers.set(key, name);
        }
      }
    });
  }

  // Convert the joined player maps to arrays for display.
  const normalizedPlayers = new Map();

  for (const [teamId, namesMap] of playersByTeamId) {
    normalizedPlayers.set(teamId, [...namesMap.values()]);
  }

  console.log("Legacy registrations loaded:", registrations.length);
  console.log("Legacy player teams matched:", normalizedPlayers.size);

  renderRegistrations(registrations, normalizedPlayers, errors);
}

loadLegacyRegistrations().catch(error => {
  console.error("APL legacy registrations failed:", error);

  renderMessage(
    `Registration load error: ${error.code || error.message || "Unknown error"}`,
    true
  );
});
