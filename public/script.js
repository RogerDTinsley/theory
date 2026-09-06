const SCRIPTURES_URL = "/scriptures.xml";
const API_URL = "/api/scriptures";
const tbody = document.getElementById("theory-tbody");
const emailSection = document.getElementById("email-section");

let theory = [];
let registeredEmail = "";
const REFERENCE_PATTERN = /^\d{1,2}:\d{1,3}-\d{1,3}$/;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildDefaultScripturesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<scriptures>
  <email></email>
  <entries></entries>
</scriptures>`;
}

function parseScripturesXml(xmlText) {
  const text = (xmlText || "").trim();
  if (!text) {
    return { email: "", theory: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const parseError = doc.querySelector("parsererror");

  if (parseError) {
    return { email: "", theory: [] };
  }

  const email = doc.querySelector("email")?.textContent?.trim() || "";
  const entries = Array.from(doc.querySelectorAll("entry")).map((entry) => ({
    id: entry.querySelector("id")?.textContent?.trim() || generateId(),
    reference: entry.querySelector("reference")?.textContent?.trim() || "",
    text: entry.querySelector("text")?.textContent?.trim() || "",
    stance: entry.querySelector("stance")?.textContent?.trim() || "pro"
  }));

  return { email, theory: entries };
}

function buildScripturesXml(data) {
  const list = (data.theory || []).map((item) => `
    <entry>
      <id>${escapeXml(item.id || generateId())}</id>
      <reference>${escapeXml(item.reference || "")}</reference>
      <text>${escapeXml(item.text || "")}</text>
      <stance>${escapeXml(item.stance || "pro")}</stance>
    </entry>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<scriptures>
  <email>${escapeXml(data.email || "")}</email>
  <entries>${list}</entries>
</scriptures>`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidReference(reference) {
  return REFERENCE_PATTERN.test(String(reference || "").trim());
}

async function persistScriptures() {
  const xml = buildScripturesXml({ email: registeredEmail || "", theory });
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml
  });

  if (!response.ok) {
    throw new Error("Unable to save the scriptures file.");
  }
}

async function loadtheory() {
  theory = [];
  registeredEmail = "";

  try {
    const response = await fetch(SCRIPTURES_URL, { cache: "no-store" });
    const raw = await response.text();
    const parsed = parseScripturesXml(raw || buildDefaultScripturesXml());
    theory = parsed.theory;
    registeredEmail = parsed.email || "";
  } catch {
    theory = [];
    registeredEmail = "";
  }

  renderEmailSection();
  renderTable();
}

async function savetheory() {
  await persistScriptures();
}

function sorttheory() {
  theory.sort((a, b) => {
    const aRef = (a.reference || "0:0-0").split(":");
    const bRef = (b.reference || "0:0-0").split(":");
    const aStart = Number((aRef[1] || "0").split("-")[0]);
    const bStart = Number((bRef[1] || "0").split("-")[0]);
    const aMain = Number(aRef[0] || 0);
    const bMain = Number(bRef[0] || 0);
    return bMain - aMain || bStart - aStart;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createInputRow() {
  const tr = document.createElement("tr");
  tr.className = "input-row";
  tr.innerHTML = `
    <td colspan="2">
      <div class="input-form">
        <input type="text" id="new-reference" placeholder="12:345-347" maxlength="12">
        <textarea id="new-text" rows="2" placeholder="Enter the scripture text..."></textarea>
        <select id="new-stance">
          <option value="pro">pro</option>
          <option value="con">con</option>
        </select>
        <button type="button" class="btn-save" id="btn-add-save">Save</button>
        <button type="button" class="btn-cancel" id="btn-add-cancel">Clear</button>
      </div>
    </td>
  `;
  return tr;
}

function clearInputRow() {
  document.getElementById("new-reference").value = "";
  document.getElementById("new-text").value = "";
  document.getElementById("new-stance").value = "pro";
}

function collectInputValues(prefix = "new-") {
  return {
    reference: document.getElementById(prefix + "reference").value.trim(),
    text: document.getElementById(prefix + "text").value.trim(),
    stance: document.getElementById(prefix + "stance").value.trim().toLowerCase()
  };
}

function renderEmailSection() {
  emailSection.innerHTML = "";

  if (isValidEmail(registeredEmail)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-email";
    btn.textContent = "Email";
    btn.addEventListener("click", sendtheoryEmail);
    emailSection.appendChild(btn);
  } else {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-register";
    btn.textContent = "Register my email";
    btn.addEventListener("click", registerEmail);
    emailSection.appendChild(btn);
  }
}

async function registerEmail() {
  const email = prompt("Enter your email address:");
  if (!email) return;
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    alert("Please enter a valid email address.");
    return;
  }
  registeredEmail = trimmed;
  try {
    await persistScriptures();
  } catch (err) {
    console.error(err);
  }
  renderEmailSection();
  alert("Email registered successfully.");
}

function buildEmailTableHtml(list) {
  const rows = list.map((item) => `
    <tr>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(item.reference)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:left;">${escapeHtml(item.text)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(item.stance || "pro")}</td>
    </tr>
  `).join("");

  return `
    <h1 style="font-family:Arial,sans-serif;color:#ff1493;">Scripture Tracker</h1>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
      <thead>
        <tr>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Reference</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Scripture Text</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Pro / Con</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function sendtheoryEmail() {
  if (!isValidEmail(registeredEmail)) {
    alert("No valid email registered.");
    renderEmailSection();
    return;
  }
  if (theory.length === 0) {
    alert("No scripture notes to email.");
    return;
  }
  if (!confirm(`Send all ${theory.length} scripture note(s) to ${registeredEmail}?`)) return;

  try {
    const res = await fetch("/api/send-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: registeredEmail,
        subject: "Scripture Tracker",
        html: buildEmailTableHtml(theory),
        theory
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert("Email sent successfully!");
    } else {
      alert("Failed to send email: " + (data.error || res.statusText || "Unknown error"));
    }
  } catch (err) {
    alert("Network error while sending email. Please try again.");
    console.error(err);
  }
}

function createEntryCard(item) {
  return `
    <div class="entry-card ${item.stance || "pro"}" data-id="${item.id}">
      <div class="entry-reference">${escapeHtml(item.reference)}</div>
      <div class="entry-text">${escapeHtml(item.text)}</div>
      <div class="entry-actions">
        <button type="button" class="btn-edit">Edit</button>
        <button type="button" class="btn-delete">Delete</button>
      </div>
    </div>
  `;
}

function createEntryEditor(item) {
  return `
    <div class="entry-card editing ${item.stance || "pro"}" data-id="${item.id}">
      <input type="text" class="edit-reference" value="${escapeHtml(item.reference)}" maxlength="12">
      <textarea class="edit-text" rows="2">${escapeHtml(item.text)}</textarea>
      <select class="edit-stance">
        <option value="pro" ${item.stance === "pro" ? "selected" : ""}>pro</option>
        <option value="con" ${item.stance === "con" ? "selected" : ""}>con</option>
      </select>
      <div class="entry-actions">
        <button type="button" class="btn-save">Save</button>
        <button type="button" class="btn-cancel">Cancel</button>
      </div>
    </div>
  `;
}

function renderTable() {
  tbody.innerHTML = "";

  const inputRow = createInputRow();
  tbody.appendChild(inputRow);

  document.getElementById("btn-add-save").addEventListener("click", () => {
    const data = collectInputValues("new-");
    if (!isValidReference(data.reference)) {
      alert("Reference must use the format dd:ddd-ddd.");
      return;
    }
    if (!data.text) {
      alert("Scripture text is required.");
      return;
    }
    if (!["pro", "con"].includes(data.stance)) {
      alert("Please choose pro or con.");
      return;
    }

    theory.unshift({ id: generateId(), ...data });
    sorttheory();
    savetheory().then(() => renderTable()).catch(() => renderTable());
  });

  document.getElementById("btn-add-cancel").addEventListener("click", clearInputRow);

  const tableHeaderRow = document.createElement("tr");
  tableHeaderRow.className = "side-by-side-header";
  tableHeaderRow.innerHTML = `
    <th class="pro-column-header">Pro</th>
    <th class="con-column-header">Con</th>
  `;
  tbody.appendChild(tableHeaderRow);

  const leftCell = document.createElement("td");
  leftCell.className = "pro-column";
  const rightCell = document.createElement("td");
  rightCell.className = "con-column";

  const proEntries = theory.filter((item) => item.stance === "pro");
  const conEntries = theory.filter((item) => item.stance === "con");

  leftCell.innerHTML = proEntries.length
    ? proEntries.map(createEntryCard).join("")
    : '<div class="empty-column">No pro entries yet.</div>';

  rightCell.innerHTML = conEntries.length
    ? conEntries.map(createEntryCard).join("")
    : '<div class="empty-column">No con entries yet.</div>';

  const columnsRow = document.createElement("tr");
  columnsRow.appendChild(leftCell);
  columnsRow.appendChild(rightCell);
  tbody.appendChild(columnsRow);

  tbody.querySelectorAll(".entry-card").forEach((card) => {
    const item = theory.find((entry) => entry.id === card.dataset.id);
    if (!item) return;

    card.querySelector(".btn-edit")?.addEventListener("click", () => startInlineEdit(card, item));
    card.querySelector(".btn-delete")?.addEventListener("click", () => {
      if (!confirm("Delete this scripture note?")) return;
      theory = theory.filter((entry) => entry.id !== item.id);
      savetheory().then(() => renderTable()).catch(() => renderTable());
    });
  });
}

function startInlineEdit(card, item) {
  card.classList.add("editing");
  card.innerHTML = createEntryEditor(item).replace(/^\s*<div[^>]*>|<\/div>\s*$/g, "");

  const saveButton = card.querySelector(".btn-save");
  const cancelButton = card.querySelector(".btn-cancel");

  saveButton?.addEventListener("click", () => {
    const updated = {
      id: item.id,
      reference: card.querySelector(".edit-reference").value.trim(),
      text: card.querySelector(".edit-text").value.trim(),
      stance: card.querySelector(".edit-stance").value.trim().toLowerCase()
    };

    if (!isValidReference(updated.reference)) {
      alert("Reference must use the format dd:ddd-ddd.");
      return;
    }
    if (!updated.text) {
      alert("Scripture text is required.");
      return;
    }
    if (!["pro", "con"].includes(updated.stance)) {
      alert("Please choose pro or con.");
      return;
    }

    const idx = theory.findIndex((entry) => entry.id === item.id);
    if (idx !== -1) {
      theory[idx] = updated;
      sorttheory();
      savetheory().then(() => renderTable()).catch(() => renderTable());
    }
  });

  cancelButton?.addEventListener("click", () => {
    renderTable();
  });
}

document.addEventListener("DOMContentLoaded", loadtheory);