
import { legacyDb } from "../firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const REGISTRATIONS_COLLECTION = "registrations";
const PLAYERS_COLLECTION = "players";

let registrations = [];
let playersByTeamId = new Map();
let readErrors = [];

function textValue(value) {
  if (value === undefined || value === null) return "";

  if (typeof value === "object") {
    return value.name ? String(value.name).trim() : "";
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
  return String(value ?? "").replace(/[&<>"']/g, char => ({
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
  const value = textValue(name).toLowerCase();

  return (
    !value ||
    value.length === 1 ||
    ["n/a", "na", "null", "undefined", "none", "not available"].includes(value)
  );
}

function extractPlayerNames(data) {
  const names = [];
  const captain = textValue(data?.captainName);

  if (!isPlaceholderName(captain)) names.push(captain);

  for (let i = 2; i <= 15; i++) {
    const name = textValue(data?.[`player${i}`]);
    if (!isPlaceholderName(name)) names.push(name);
  }

  return [...new Map(names.map(name => [name.toLowerCase(), name])).values()];
}

function registrationStatus(data) {
  return getValue(data, ["status", "registrationStatus"], "Not specified");
}

function paymentStatus(data) {
  return getValue(data, ["paymentStatus"], "Not specified");
}

function badgeClass(status) {
  const value = String(status).toLowerCase();

  if (value.includes("reject")) return "apl-status-rejected";
  if (value.includes("approv")) return "apl-status-approved";
  if (value.includes("pending")) return "apl-status-pending";
  if (value.includes("paid")) return "apl-status-paid";
  if (value.includes("hold")) return "apl-status-hold";
  if (value.includes("cancel")) return "apl-status-cancelled";

  return "apl-status-neutral";
}

function addStyles() {
  if (document.getElementById("aplLegacyRegistrationStyles")) return;

  const style = document.createElement("style");
  style.id = "aplLegacyRegistrationStyles";

  style.textContent = `
    #legacyRegistrationsFixPanel {
      width: 100%;
      margin: 18px 0;
      color: #e8f5ec;
      font-family: Arial, sans-serif;
    }

    #legacyRegistrationsFixPanel * {
      box-sizing: border-box;
    }

    #legacyRegistrationsFixPanel .apl-reg-shell {
      padding: 20px;
      background: linear-gradient(145deg, #10251b, #0b1712);
      border: 1px solid #285b3b;
      border-radius: 16px;
    }

    #legacyRegistrationsFixPanel .apl-reg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    #legacyRegistrationsFixPanel .apl-reg-header h3 {
      margin: 0 0 8px;
      color: #a7f3b9;
      font-size: 23px;
    }

    #legacyRegistrationsFixPanel .apl-reg-subtitle {
      margin: 0;
      color: #b9cebf;
      font-size: 13px;
      line-height: 1.6;
    }

    #legacyRegistrationsFixPanel .apl-reg-controls {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(150px, 220px) auto;
      gap: 10px;
      margin-bottom: 18px;
    }

    #legacyRegistrationsFixPanel input,
    #legacyRegistrationsFixPanel select {
      width: 100%;
      min-width: 0;
      padding: 12px;
      color: #f0fff4;
      background: #14271c;
      border: 1px solid #356c49;
      border-radius: 9px;
      font-size: 14px;
    }

    #legacyRegistrationsFixPanel input::placeholder {
      color: #a4bca9;
    }

    #legacyRegistrationsFixPanel button {
      padding: 12px 15px;
      color: #082512;
      background: #52d879;
      border: none;
      border-radius: 9px;
      font-weight: 700;
      cursor: pointer;
    }

    #legacyRegistrationsFixPanel button:hover {
      background: #7bea98;
    }

    #legacyRegistrationsFixPanel .apl-reg-stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }

    #legacyRegistrationsFixPanel .apl-reg-stat {
      padding: 14px;
      background: #152c20;
      border: 1px solid #285b3b;
      border-radius: 12px;
    }

    #legacyRegistrationsFixPanel .apl-reg-stat span {
      display: block;
      margin-bottom: 8px;
      color: #b9cebf;
      font-size: 12px;
    }

    #legacyRegistrationsFixPanel .apl-reg-stat strong {
      color: #a7f3b9;
      font-size: 25px;
    }

    #legacyRegistrationsFixPanel .apl-reg-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));
      gap: 14px;
    }

    #legacyRegistrationsFixPanel .apl-reg-card {
      min-width: 0;
      padding: 17px;
      background: #13271c;
      border: 1px solid #2c6140;
      border-radius: 13px;
    }

    #legacyRegistrationsFixPanel .apl-reg-card h4 {
      margin: 0;
      color: #f0fff4;
      font-size: 19px;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .apl-reg-card-number {
      margin-top: 5px;
      color: #9fceb0;
      font-size: 12px;
    }

    #legacyRegistrationsFixPanel .apl-reg-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: 14px 0;
    }

    #legacyRegistrationsFixPanel .apl-reg-badge {
      display: inline-block;
      padding: 6px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .apl-status-approved,
    #legacyRegistrationsFixPanel .apl-status-paid {
      color: #c4fbd3;
      background: #14532d;
    }

    #legacyRegistrationsFixPanel .apl-status-pending,
    #legacyRegistrationsFixPanel .apl-status-hold {
      color: #ffedab;
      background: #654b12;
    }

    #legacyRegistrationsFixPanel .apl-status-rejected,
    #legacyRegistrationsFixPanel .apl-status-cancelled {
      color: #ffcaca;
      background: #6b2020;
    }

    #legacyRegistrationsFixPanel .apl-status-neutral {
      color: #d5e7da;
      background: #344b3b;
    }

    #legacyRegistrationsFixPanel .apl-reg-detail {
      padding: 10px 0;
      border-bottom: 1px solid #294333;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .apl-reg-label {
      display: block;
      margin-bottom: 5px;
      color: #91b59d;
      font-size: 11px;
    }

    #legacyRegistrationsFixPanel .apl-reg-value {
      color: #f0fff4;
      font-size: 13px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .apl-reg-players {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 9px;
    }

    #legacyRegistrationsFixPanel .apl-reg-player {
      padding: 6px 9px;
      color: #d9fbe3;
      background: #203d2b;
      border: 1px solid #315d40;
      border-radius: 8px;
      font-size: 12px;
    }

    #legacyRegistrationsFixPanel .apl-reg-message {
      margin: 12px 0 18px;
      padding: 11px 13px;
      color: #d8fbe2;
      background: #173c25;
      border-radius: 9px;
      font-size: 13px;
      line-height: 1.6;
    }

    #legacyRegistrationsFixPanel .apl-reg-error {
      color: #ffd0d0;
      background: #4a2020;
    }

    #legacyRegistrationsFixPanel .apl-reg-empty {
      padding: 24px;
      color: #bdd3c3;
      text-align: center;
      background: #13271c;
      border: 1px dashed #356c49;
      border-radius: 12px;
    }

    @media (max-width: 700px) {
      #legacyRegistrationsFixPanel .apl-reg-shell {
        padding: 13px;
      }

      #legacyRegistrationsFixPanel .apl-reg-controls {
        grid-template-columns: 1fr;
      }

      #legacyRegistrationsFixPanel .apl-reg-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;

  document.head.appendChild(style);
}

function createPanel() {
  let panel = document.getElementById("legacyRegistrationsFixPanel");

  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "legacyRegistrationsFixPanel";

  const section = document.getElementById("legacyRegistrationsSection");

  if (section) {
    // IMPORTANT: do not hide or remove any existing section or controls.
    const list = document.getElementById("legacyRegistrationList");

    if (list) {
      list.replaceWith(panel);
    } else {
      section.appendChild(panel);
    }
  } else {
    const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,strong")]
      .find(el =>
        el.textContent.trim().toLowerCase().includes("apl league registrations")
      );

    if (heading?.parentElement) {
      heading.insertAdjacentElement("afterend", panel);
    } else {
      document.body.appendChild(panel);
    }
  }

  return panel;
}

function renderRegistrations() {
  const panel = createPanel();

  const oldSearch = panel.querySelector("#aplRegSearch")?.value ?? "";
  const oldFilter = panel.querySelector("#aplRegFilter")?.value ?? "";

  const filtered = registrations.filter(record => {
    const data = record.data;
    const teamId = normalizeTeamId(data.teamId);
    const team = getValue(
      data,
      ["teamName", "team_name", "team", "clubName", "registeredTeam"],
      "Team name not found"
    );
    const captain = getValue(data, ["captainName", "contactPerson", "ownerName"]);
    const regId = getValue(data, ["registrationId"], record.id);
    const status = registrationStatus(data);
    const payment = paymentStatus(data);
    const players = playersByTeamId.get(teamId) || [];

    const searchable = [
      team,
      captain,
      regId,
      teamId,
      status,
      payment,
      getValue(data, ["mobile", "phone", "mobileNumber", "contactNumber"], ""),
      ...players
    ].join(" ").toLowerCase();

    if (oldSearch && !searchable.includes(oldSearch.toLowerCase())) {
      return false;
    }

    if (oldFilter) {
      const matchesStatus = status.toLowerCase().includes(oldFilter);
      const matchesPayment = payment.toLowerCase().includes(oldFilter);

      if (!matchesStatus && !matchesPayment) return false;
    }

    return true;
  });

  const count = predicate =>
    registrations.filter(record => predicate(record.data)).length;

  const pending = count(data => registrationStatus(data).toLowerCase().includes("pending"));
  const approved = count(data => registrationStatus(data).toLowerCase().includes("approv"));
  const paid = count(data => paymentStatus(data).toLowerCase().includes("paid"));
  const rejected = count(data => registrationStatus(data).toLowerCase().includes("reject"));

  panel.innerHTML = `
    <div class="apl-reg-shell">
      <div class="apl-reg-header">
        <div>
          <h3>📋 APL League Registrations</h3>
          <p class="apl-reg-subtitle">
            Legacy APL registrations · Read-only view · Original records are not modified.
          </p>
        </div>
        <button type="button" id="aplRegRefresh">↻ Refresh</button>
      </div>

      <div class="apl-reg-controls">
        <input id="aplRegSearch" type="search"
          placeholder="Search team, captain, player, mobile or ID"
          value="${escapeHtml(oldSearch)}">

        <select id="aplRegFilter">
          <option value="">All statuses</option>
          <option value="pending" ${oldFilter === "pending" ? "selected" : ""}>Pending</option>
          <option value="approved" ${oldFilter === "approved" ? "selected" : ""}>Approved</option>
          <option value="rejected" ${oldFilter === "rejected" ? "selected" : ""}>Rejected</option>
          <option value="paid" ${oldFilter === "paid" ? "selected" : ""}>Paid</option>
          <option value="unpaid" ${oldFilter === "unpaid" ? "selected" : ""}>Unpaid</option>
          <option value="hold" ${oldFilter === "hold" ? "selected" : ""}>On Hold</option>
          <option value="cancelled" ${oldFilter === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>

        <button type="button" id="aplRegClear">Clear Filters</button>
      </div>

      <div class="apl-reg-stats">
        <div class="apl-reg-stat"><span>Total Registrations</span><strong>${registrations.length}</strong></div>
        <div class="apl-reg-stat"><span>Pending</span><strong>${pending}</strong></div>
        <div class="apl-reg-stat"><span>Approved</span><strong>${approved}</strong></div>
        <div class="apl-reg-stat"><span>Paid</span><strong>${paid}</strong></div>
        <div class="apl-reg-stat"><span>Rejected</span><strong>${rejected}</strong></div>
      </div>

      <div class="apl-reg-message ${readErrors.length ? "apl-reg-error" : ""}" role="status" aria-live="polite">
        ${readErrors.length
          ? `Some data could not be read: ${readErrors.map(escapeHtml).join("; ")}`
          : `${filtered.length} registration(s) shown out of ${registrations.length}.`}
      </div>

      <div class="apl-reg-cards">
        ${filtered.map((record, index) => {
          const data = record.data;
          const teamId = normalizeTeamId(data.teamId);
          const team = getValue(
            data,
            ["teamName", "team_name", "team", "clubName", "registeredTeam"],
            "Team name not found"
          );
          const captain = getValue(data, ["captainName", "contactPerson", "ownerName"]);
          const status = registrationStatus(data);
          const payment = paymentStatus(data);
          const regId = getValue(data, ["registrationId"], record.id);
          const players = playersByTeamId.get(teamId) || [];

          return `
            <article class="apl-reg-card">
              <h4>${escapeHtml(team)}</h4>
              <div class="apl-reg-card-number">Registration #${index + 1}</div>

              <div class="apl-reg-badges">
                <span class="apl-reg-badge ${badgeClass(status)}">${escapeHtml(status)}</span>
                <span class="apl-reg-badge ${badgeClass(payment)}">Payment: ${escapeHtml(payment)}</span>
              </div>

              <div class="apl-reg-detail">
                <span class="apl-reg-label">Captain</span>
                <div class="apl-reg-value">${escapeHtml(captain)}</div>
              </div>

              <div class="apl-reg-detail">
                <span class="apl-reg-label">Registration ID</span>
                <div class="apl-reg-value">${escapeHtml(regId)}</div>
              </div>

              <div class="apl-reg-detail">
                <span class="apl-reg-label">Team ID</span>
                <div class="apl-reg-value">${escapeHtml(teamId || "—")}</div>
              </div>

              <div class="apl-reg-detail">
                <span class="apl-reg-label">Registered Players (${players.length})</span>
                ${players.length
                  ? `<div class="apl-reg-players">${players.map(name => `<span class="apl-reg-player">${escapeHtml(name)}</span>`).join("")}</div>`
                  : `<div class="apl-reg-value">Player list not found for this teamId.</div>`}
              </div>
            </article>
          `;
        }).join("") || `<div class="apl-reg-empty">No registrations match your search or filter.</div>`}
      </div>
    </div>
  `;

  panel.querySelector("#aplRegSearch").addEventListener("input", () => {
    renderRegistrations();
    const input = panel.querySelector("#aplRegSearch");
    input?.focus();
    if (input) input.setSelectionRange(input.value.length, input.value.length);
  });

  panel.querySelector("#aplRegFilter").addEventListener("change", renderRegistrations);

  panel.querySelector("#aplRegClear").addEventListener("click", () => {
    const search = panel.querySelector("#aplRegSearch");
    const filter = panel.querySelector("#aplRegFilter");

    if (search) search.value = "";
    if (filter) filter.value = "";

    renderRegistrations();
  });

  panel.querySelector("#aplRegRefresh").addEventListener("click", loadLegacyRegistrations);
}

async function loadLegacyRegistrations() {
  addStyles();

  const panel = createPanel();
  panel.innerHTML = `
    <div class="apl-reg-shell">
      <h3>📋 APL League Registrations</h3>
      <div class="apl-reg-message">Loading legacy APL registrations...</div>
    </div>
  `;

  readErrors = [];

  try {
    const snapshot = await getDocs(
      collection(legacyDb, REGISTRATIONS_COLLECTION)
    );

    registrations = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
  } catch (error) {
    console.error("Legacy registrations read failed:", error);

    panel.innerHTML = `
      <div class="apl-reg-shell">
        <h3>APL League Registrations</h3>
        <div class="apl-reg-message apl-reg-error">
          Registration load failed: ${escapeHtml(error.code || error.message || "Unknown error")}
        </div>
        <button type="button" id="aplRegRetry">Try Again</button>
      </div>
    `;

    panel.querySelector("#aplRegRetry")?.addEventListener("click", loadLegacyRegistrations);
    return;
  }

  playersByTeamId = new Map();

  try {
    const snapshot = await getDocs(
      collection(legacyDb, PLAYERS_COLLECTION)
    );

    snapshot.forEach(doc => {
      const data = doc.data();
      const teamId = normalizeTeamId(data.teamId);

      if (!teamId) return;

      if (!playersByTeamId.has(teamId)) {
        playersByTeamId.set(teamId, new Map());
      }

      const teamPlayers = playersByTeamId.get(teamId);

      for (const name of extractPlayerNames(data)) {
        const key = name.toLowerCase();
        if (!teamPlayers.has(key)) teamPlayers.set(key, name);
      }
    });

    for (const [teamId, namesMap] of playersByTeamId) {
      playersByTeamId.set(teamId, [...namesMap.values()]);
    }
  } catch (error) {
    console.error("Legacy players read failed:", error);
    readErrors.push(`Players: ${error.code || error.message || "Read failed"}`);
  }

  console.log("Legacy registrations loaded:", registrations.length);
  console.log("Legacy player teams matched:", playersByTeamId.size);

  renderRegistrations();
}

loadLegacyRegistrations().catch(error => {
  console.error("Legacy registration loading error:", error);

  const panel = createPanel();

  panel.innerHTML = `
    <div class="apl-reg-shell">
      <h3>APL League Registrations</h3>
      <div class="apl-reg-message apl-reg-error">
        Error: ${escapeHtml(error.code || error.message || "Unknown error")}
      </div>
      <button type="button" id="aplRegRetry">Try Again</button>
    </div>
  `;

  panel.querySelector("#aplRegRetry")?.addEventListener("click", loadLegacyRegistrations);
});
