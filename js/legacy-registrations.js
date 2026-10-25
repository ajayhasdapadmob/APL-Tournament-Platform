
import { legacyDb } from "../firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const REGISTRATIONS_COLLECTION = "registrations";
const PLAYERS_COLLECTION = "players";

let allRegistrations = [];
let playersByTeamId = new Map();
let loadErrors = [];

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function valueOf(data, keys, fallback = "—") {
  for (const key of keys) {
    const value = data?.[key];

    if (value === undefined || value === null) continue;

    const result =
      typeof value === "object"
        ? String(value.name ?? "").trim()
        : String(value).trim();

    if (result) return result;
  }

  return fallback;
}

function normalizeTeamId(value) {
  return String(value ?? "").trim();
}

function isPlaceholderName(name) {
  const value = String(name ?? "").trim().toLowerCase();

  return (
    !value ||
    value.length === 1 ||
    ["n/a", "na", "null", "undefined", "none", "not available"].includes(value)
  );
}

function extractPlayerNames(data) {
  const names = [];
  const captain = String(data?.captainName ?? "").trim();

  if (!isPlaceholderName(captain)) names.push(captain);

  for (let i = 2; i <= 15; i++) {
    const name = String(data?.[`player${i}`] ?? "").trim();

    if (!isPlaceholderName(name)) names.push(name);
  }

  return [...new Map(names.map(name => [name.toLowerCase(), name])).values()];
}

function getStatus(data) {
  return valueOf(data, ["status", "registrationStatus"], "Not specified");
}

function getPaymentStatus(data) {
  return valueOf(data, ["paymentStatus"], "Not specified");
}

function statusClass(status) {
  const s = String(status).toLowerCase();

  if (s.includes("reject")) return "rejected";
  if (s.includes("approv")) return "approved";
  if (s.includes("pending")) return "pending";
  if (s.includes("paid")) return "paid";
  if (s.includes("hold")) return "hold";
  if (s.includes("cancel")) return "cancelled";

  return "neutral";
}

function ensureStyles() {
  if (document.getElementById("legacyRegistrationCardStyles")) return;

  const style = document.createElement("style");
  style.id = "legacyRegistrationCardStyles";

  style.textContent = `
    #legacyRegistrationsFixPanel {
      margin: 18px 0;
      color: #e8f5ec;
      font-family: Arial, sans-serif;
    }

    #legacyRegistrationsFixPanel * {
      box-sizing: border-box;
    }

    #legacyRegistrationsFixPanel .legacy-shell {
      padding: 20px;
      background: linear-gradient(145deg, #10251b, #0b1712);
      border: 1px solid #245c3b;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,.16);
    }

    #legacyRegistrationsFixPanel .legacy-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    #legacyRegistrationsFixPanel h3 {
      margin: 0 0 7px;
      color: #a7f3b9;
      font-size: 23px;
    }

    #legacyRegistrationsFixPanel .legacy-subtitle {
      margin: 0;
      color: #b6cbbd;
      font-size: 13px;
      line-height: 1.6;
    }

    #legacyRegistrationsFixPanel .legacy-controls {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(160px, 230px) auto;
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
      border-radius: 10px;
      font-size: 14px;
    }

    #legacyRegistrationsFixPanel input::placeholder {
      color: #9db7a4;
    }

    #legacyRegistrationsFixPanel button {
      padding: 12px 16px;
      color: #062311;
      background: #52d879;
      border: 0;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
    }

    #legacyRegistrationsFixPanel button:hover {
      background: #7bea98;
    }

    #legacyRegistrationsFixPanel .legacy-stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }

    #legacyRegistrationsFixPanel .legacy-stat {
      padding: 14px;
      background: #152c20;
      border: 1px solid #285b3b;
      border-radius: 12px;
    }

    #legacyRegistrationsFixPanel .legacy-stat span {
      display: block;
      color: #b7cdbd;
      font-size: 12px;
      margin-bottom: 8px;
    }

    #legacyRegistrationsFixPanel .legacy-stat strong {
      color: #a7f3b9;
      font-size: 25px;
    }

    #legacyRegistrationsFixPanel .legacy-card-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
      gap: 14px;
    }

    #legacyRegistrationsFixPanel .legacy-card {
      padding: 17px;
      background: #13271c;
      border: 1px solid #2c6140;
      border-radius: 14px;
      min-width: 0;
    }

    #legacyRegistrationsFixPanel .legacy-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
    }

    #legacyRegistrationsFixPanel .legacy-team-name {
      margin: 0;
      color: #f0fff4;
      font-size: 19px;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .legacy-number {
      color: #9fceb0;
      font-size: 12px;
      margin-top: 5px;
    }

    #legacyRegistrationsFixPanel .legacy-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin: 12px 0;
    }

    #legacyRegistrationsFixPanel .legacy-badge {
      display: inline-block;
      padding: 5px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .approved,
    #legacyRegistrationsFixPanel .paid {
      color: #b9ffd0;
      background: #14532d;
    }

    #legacyRegistrationsFixPanel .pending,
    #legacyRegistrationsFixPanel .hold {
      color: #ffedab;
      background: #654b12;
    }

    #legacyRegistrationsFixPanel .rejected,
    #legacyRegistrationsFixPanel .cancelled {
      color: #ffc6c6;
      background: #6b2020;
    }

    #legacyRegistrationsFixPanel .neutral {
      color: #d5e7da;
      background: #344b3b;
    }

    #legacyRegistrationsFixPanel .legacy-details {
      display: grid;
      gap: 10px;
    }

    #legacyRegistrationsFixPanel .legacy-detail {
      padding-bottom: 9px;
      border-bottom: 1px solid #294333;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .legacy-label {
      display: block;
      color: #91b59d;
      font-size: 11px;
      margin-bottom: 4px;
    }

    #legacyRegistrationsFixPanel .legacy-value {
      color: #f0fff4;
      font-size: 13px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    #legacyRegistrationsFixPanel .legacy-players {
      margin-top: 14px;
    }

    #legacyRegistrationsFixPanel .legacy-player-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    #legacyRegistrationsFixPanel .legacy-player {
      padding: 6px 9px;
      color: #d9fbe3;
      background: #203d2b;
      border: 1px solid #315d40;
      border-radius: 8px;
      font-size: 12px;
    }

    #legacyRegistrationsFixPanel .legacy-message {
      margin: 12px 0;
      padding: 11px 13px;
      color: #d8fbe2;
      background: #173c25;
      border-radius: 9px;
      font-size: 13px;
      line-height: 1.6;
    }

    #legacyRegistrationsFixPanel .legacy-message.error {
      color: #ffd0d0;
      background: #4a2020;
    }

    #legacyRegistrationsFixPanel .legacy-empty {
      padding: 24px;
      text-align: center;
      color: #bdd3c3;
      background: #13271c;
      border: 1px dashed #356c49;
      border-radius: 12px;
    }

    @media (max-width: 700px) {
      #legacyRegistrationsFixPanel .legacy-shell {
        padding: 13px;
      }

      #legacyRegistrationsFixPanel .legacy-controls {
        grid-template-columns: 1fr;
      }

      #legacyRegistrationsFixPanel .legacy-stats {
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

  const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,strong")]
    .find(el => el.textContent.trim().toLowerCase().includes("apl league registrations"));

  const section = heading?.closest("#legacyRegistrationsSection");

  if (section) {
    // Insert the redesigned view inside the existing registration section.
    // Hide only the old section contents; leave the rest of the admin page unchanged.
    [...section.children].forEach(child => {
      if (child.id !== "legacyRegistrationsFixPanel") {
        child.hidden = true;
      }
    });

    section.appendChild(panel);
  } else if (heading?.parentElement) {
    heading.insertAdjacentElement("afterend", panel);
  } else {
    document.body.appendChild(panel);
  }

  return panel;
}

function render() {
  ensureStyles();

  const panel = createPanel();
  const search = panel.querySelector("#legacyCardSearch")?.value.trim().toLowerCase() || "";
  const filter = panel.querySelector("#legacyCardFilter")?.value.trim().toLowerCase() || "";

  const filtered = allRegistrations.filter(record => {
    const data = record.data;
    const teamId = normalizeTeamId(data.teamId);
    const teamName = valueOf(data, ["teamName", "team_name", "team", "clubName", "registeredTeam"], "Team name not found");
    const captain = valueOf(data, ["captainName", "contactPerson", "ownerName"]);
    const registrationId = valueOf(data, ["registrationId"], record.id);
    const status = getStatus(data);
    const payment = getPaymentStatus(data);

    const players = playersByTeamId.get(teamId) || [];
    const searchable = [
      teamName, captain, registrationId, teamId, status, payment,
      valueOf(data, ["mobile", "phone", "mobileNumber", "contactNumber"]),
      ...players
    ].join(" ").toLowerCase();

    if (search && !searchable.includes(search)) return false;

    if (filter) {
      const statusMatches = status.toLowerCase().includes(filter);
      const paymentMatches = payment.toLowerCase().includes(filter);

      if (!statusMatches && !paymentMatches) return false;
    }

    return true;
  });

  const count = (fn) => allRegistrations.filter(record => fn(record.data)).length;

  const pendingCount = count(data => getStatus(data).toLowerCase().includes("pending"));
  const approvedCount = count(data => getStatus(data).toLowerCase().includes("approv"));
  const paidCount = count(data => getPaymentStatus(data).toLowerCase().includes("paid"));
  const rejectedCount = count(data => getStatus(data).toLowerCase().includes("reject"));

  panel.innerHTML = `
    <div class="legacy-shell">
      <div class="legacy-heading">
        <div>
          <h3>📋 APL League Registrations</h3>
          <p class="legacy-subtitle">
            Purane APL Firebase se read-only registrations. Yahan se legacy data edit ya delete nahi hota.
          </p>
        </div>
        <button type="button" id="legacyCardRefresh">↻ Refresh</button>
      </div>

      <div class="legacy-controls">
        <input id="legacyCardSearch" type="search"
          placeholder="🔎 Search team, captain, player, mobile or ID"
          value="${escapeHtml(search)}">
        <select id="legacyCardFilter">
          <option value="">All statuses</option>
          <option value="pending" ${filter === "pending" ? "selected" : ""}>Pending</option>
          <option value="approved" ${filter === "approved" ? "selected" : ""}>Approved</option>
          <option value="rejected" ${filter === "rejected" ? "selected" : ""}>Rejected</option>
          <option value="paid" ${filter === "paid" ? "selected" : ""}>Paid</option>
          <option value="unpaid" ${filter === "unpaid" ? "selected" : ""}>Unpaid</option>
          <option value="hold" ${filter === "hold" ? "selected" : ""}>On Hold</option>
          <option value="cancelled" ${filter === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
        <button type="button" id="legacyCardClear">Clear Filters</button>
      </div>

      <div class="legacy-stats">
        <div class="legacy-stat"><span>Total Registrations</span><strong>${allRegistrations.length}</strong></div>
        <div class="legacy-stat"><span>Pending</span><strong>${pendingCount}</strong></div>
        <div class="legacy-stat"><span>Approved</span><strong>${approvedCount}</strong></div>
        <div class="legacy-stat"><span>Paid</span><strong>${paidCount}</strong></div>
        <div class="legacy-stat"><span>Rejected</span><strong>${rejectedCount}</strong></div>
      </div>

      <div class="legacy-message ${loadErrors.length ? "error" : ""}" role="status" aria-live="polite">
        ${loadErrors.length
          ? `Some data could not be read: ${loadErrors.map(escapeHtml).join("; ")}`
          : `${filtered.length} registration(s) displayed · ${allRegistrations.length} total · Read-only mode`}
      </div>

      <div class="legacy-card-list">
        ${filtered.map((record, index) => {
          const data = record.data;
          const teamId = normalizeTeamId(data.teamId);
          const teamName = valueOf(data, ["teamName", "team_name", "team", "clubName", "registeredTeam"], "Team name not found");
          const captain = valueOf(data, ["captainName", "contactPerson", "ownerName"]);
          const status = getStatus(data);
          const payment = getPaymentStatus(data);
          const registrationId = valueOf(data, ["registrationId"], record.id);
          const players = playersByTeamId.get(teamId) || [];

          return `
            <article class="legacy-card">
              <div class="legacy-card-top">
                <div>
                  <h4 class="legacy-team-name">${escapeHtml(teamName)}</h4>
                  <div class="legacy-number">Registration #${index + 1}</div>
                </div>
              </div>

              <div class="legacy-badges">
                <span class="legacy-badge ${statusClass(status)}">${escapeHtml(status)}</span>
                <span class="legacy-badge ${statusClass(payment)}">Payment: ${escapeHtml(payment)}</span>
              </div>

              <div class="legacy-details">
                <div class="legacy-detail">
                  <span class="legacy-label">Captain</span>
                  <div class="legacy-value">${escapeHtml(captain)}</div>
                </div>
                <div class="legacy-detail">
                  <span class="legacy-label">Registration ID</span>
                  <div class="legacy-value">${escapeHtml(registrationId)}</div>
                </div>
                <div class="legacy-detail">
                  <span class="legacy-label">Team ID</span>
                  <div class="legacy-value">${escapeHtml(teamId || "—")}</div>
                </div>
              </div>

              <div class="legacy-players">
                <span class="legacy-label">Registered Players (${players.length})</span>
                ${players.length
                  ? `<div class="legacy-player-list">${players.map(name => `<span class="legacy-player">${escapeHtml(name)}</span>`).join("")}</div>`
                  : `<div class="legacy-value">Player list not found for this teamId.</div>`}
              </div>
            </article>
          `;
        }).join("") || `<div class="legacy-empty">No registrations match your search/filter.</div>`}
      </div>
    </div>
  `;

  panel.querySelector("#legacyCardSearch").addEventListener("input", render);
  panel.querySelector("#legacyCardFilter").addEventListener("change", render);

  panel.querySelector("#legacyCardClear").addEventListener("click", () => {
    render();
    const input = panel.querySelector("#legacyCardSearch");
    const select = panel.querySelector("#legacyCardFilter");

    if (input) input.value = "";
    if (select) select.value = "";

    render();
  });

  panel.querySelector("#legacyCardRefresh").addEventListener("click", loadLegacyRegistrations);
}

async function loadLegacyRegistrations() {
  ensureStyles();

  const panel = createPanel();
  panel.innerHTML = `
    <div class="legacy-shell">
      <h3>📋 APL League Registrations</h3>
      <div class="legacy-message">Purane APL Firebase se registrations aur players load ho rahe hain...</div>
    </div>
  `;

  loadErrors = [];
  let registrationSnapshot;

  try {
    registrationSnapshot = await getDocs(
      collection(legacyDb, REGISTRATIONS_COLLECTION)
    );

    allRegistrations = registrationSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
  } catch (error) {
    console.error("Legacy registrations read failed:", error);

    panel.innerHTML = `
      <div class="legacy-shell">
        <h3>APL League Registrations</h3>
        <div class="legacy-message error">
          Registrations load nahi hue: ${escapeHtml(error.code || error.message || "Unknown error")}
        </div>
        <button type="button" id="legacyCardRetry">Try Again</button>
      </div>
    `;

    panel.querySelector("#legacyCardRetry")?.addEventListener("click", loadLegacyRegistrations);
    return;
  }

  playersByTeamId = new Map();

  try {
    const playersSnapshot = await getDocs(
      collection(legacyDb, PLAYERS_COLLECTION)
    );

    playersSnapshot.forEach(doc => {
      const data = doc.data();
      const teamId = normalizeTeamId(data.teamId);

      if (!teamId) return;

      const names = extractPlayerNames(data);

      if (!playersByTeamId.has(teamId)) {
        playersByTeamId.set(teamId, new Map());
      }

      const map = playersByTeamId.get(teamId);

      names.forEach(name => {
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, name);
      });
    });

    for (const [teamId, namesMap] of playersByTeamId) {
      playersByTeamId.set(teamId, [...namesMap.values()]);
    }
  } catch (error) {
    console.error("Legacy players read failed:", error);
    loadErrors.push(`Players: ${error.code || error.message || "Read failed"}`);
  }

  console.log("Legacy registrations loaded:", allRegistrations.length);
  console.log("Legacy player teams matched:", playersByTeamId.size);

  render();
}

loadLegacyRegistrations().catch(error => {
  console.error("APL legacy registrations failed:", error);

  const panel = createPanel();
  panel.innerHTML = `
    <div class="legacy-shell">
      <h3>APL League Registrations</h3>
      <div class="legacy-message error">
        Registration load error: ${escapeHtml(error.code || error.message || "Unknown error")}
      </div>
      <button type="button" id="legacyCardRetry">Try Again</button>
    </div>
  `;

  panel.querySelector("#legacyCardRetry")?.addEventListener("click", loadLegacyRegistrations);
});
