const COOKIE_NAME = "workouts";
const tbody = document.getElementById("workout-tbody");
const emailSection = document.getElementById("email-section");

let workouts = [];
let registeredEmail = "";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function persistCookie() {
  setCookie(COOKIE_NAME, JSON.stringify({
    email: registeredEmail || "",
    workouts
  }));
}

function loadWorkouts() {
  const raw = getCookie(COOKIE_NAME);
  workouts = [];
  registeredEmail = "";

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        workouts = parsed;
      } else if (parsed && typeof parsed === "object") {
        workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
        registeredEmail = parsed.email || "";
      }
    } catch {
      workouts = [];
    }
  }

  sortWorkouts();
  renderEmailSection();
  renderTable();
}

function saveWorkouts() {
  persistCookie();
}

function sortWorkouts() {
  workouts.sort((a, b) => {
    const da = a.date + "T" + (a.time || "00:00");
    const db = b.date + "T" + (b.time || "00:00");
    return db.localeCompare(da);
  });
}

function buildTimeOptions(selected = "") {
  let html = "";
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const val = `${hh}:${mm}`;
      html += `<option value="${val}" ${val === selected ? "selected" : ""}>${val}</option>`;
    }
  }
  return html;
}

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLatestDefaults() {
  if (workouts.length === 0) {
    return { type: "walk", distance: "" };
  }
  return {
    type: workouts[0].type || "walk",
    distance: workouts[0].distance != null ? workouts[0].distance : ""
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createInputRow() {
  const defaults = getLatestDefaults();
  const tr = document.createElement("tr");
  tr.className = "input-row";
  tr.innerHTML = `
    <td><input type="date" id="new-date" value="${getToday()}"></td>
    <td><select id="new-time">${buildTimeOptions("07:00")}</select></td>
    <td>
      <select id="new-type">
        <option value="walk" ${defaults.type === "walk" ? "selected" : ""}>walk</option>
        <option value="run" ${defaults.type === "run" ? "selected" : ""}>run</option>
        <option value="swim" ${defaults.type === "swim" ? "selected" : ""}>swim</option>
        <option value="bike" ${defaults.type === "bike" ? "selected" : ""}>bike</option>
        <option value="other" ${defaults.type === "other" ? "selected" : ""}>other</option>
      </select>
    </td>
    <td><input type="number" id="new-distance" step="0.01" min="0" value="${defaults.distance}" placeholder="0.00"></td>
    <td><input type="number" id="new-pace" step="0.1" min="0" placeholder="0.0"></td>
    <td><input type="text" id="new-bp" placeholder="120/80"></td>
    <td><input type="number" id="new-temp" step="1" placeholder="°F"></td>
    <td><input type="text" id="new-weather" placeholder="sunny, rainy..."></td>
    <td><textarea id="new-comments" rows="1" placeholder="notes..."></textarea></td>
    <td>
      <button type="button" class="btn-save" id="btn-add-save">Save</button>
      <button type="button" class="btn-cancel" id="btn-add-cancel">Cancel</button>
    </td>
  `;
  return tr;
}

function clearInputRow() {
  document.getElementById("new-date").value = getToday();
  document.getElementById("new-time").value = "07:00";
  const defaults = getLatestDefaults();
  document.getElementById("new-type").value = defaults.type;
  document.getElementById("new-distance").value = defaults.distance;
  document.getElementById("new-pace").value = "";
  document.getElementById("new-bp").value = "";
  document.getElementById("new-temp").value = "";
  document.getElementById("new-weather").value = "";
  document.getElementById("new-comments").value = "";
}

function collectInputValues(prefix = "new-") {
  return {
    date: document.getElementById(prefix + "date").value,
    time: document.getElementById(prefix + "time").value,
    type: document.getElementById(prefix + "type").value,
    distance: parseFloat(document.getElementById(prefix + "distance").value) || 0,
    pace: parseFloat(document.getElementById(prefix + "pace").value) || 0,
    bp: document.getElementById(prefix + "bp").value.trim(),
    temp: document.getElementById(prefix + "temp").value
      ? parseFloat(document.getElementById(prefix + "temp").value)
      : null,
    weather: document.getElementById(prefix + "weather").value.trim(),
    comments: document.getElementById(prefix + "comments").value.trim()
  };
}

function renderEmailSection() {
  emailSection.innerHTML = "";

  if (isValidEmail(registeredEmail)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-email";
    btn.textContent = "Email";
    btn.addEventListener("click", sendWorkoutsEmail);
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

function registerEmail() {
  const email = prompt("Enter your email address:");
  if (!email) return;
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    alert("Please enter a valid email address.");
    return;
  }
  registeredEmail = trimmed;
  persistCookie();
  renderEmailSection();
  alert("Email registered successfully.");
}

function buildEmailTableHtml(list) {
  const rows = list.map((w) => `
    <tr>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.date)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.time)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.type)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.distance)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.pace)}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.bp || "")}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${w.temp != null ? escapeHtml(w.temp) : ""}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:center;">${escapeHtml(w.weather || "")}</td>
      <td style="padding:8px;border:1px solid #ccc;text-align:left;">${escapeHtml(w.comments || "")}</td>
    </tr>
  `).join("");

  return `
    <h1 style="font-family:Arial,sans-serif;color:#ff1493;">Workout Tracker</h1>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
      <thead>
        <tr>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Date</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Time</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Type</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Distance (mi)</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Pace (min/mi)</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">BP</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Temp (°F)</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Weather</th>
          <th style="background:#ff69b4;color:#fff;padding:8px;border:1px solid #ff69b4;">Comments</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function sendWorkoutsEmail() {
  if (!isValidEmail(registeredEmail)) {
    alert("No valid email registered.");
    renderEmailSection();
    return;
  }
  if (workouts.length === 0) {
    alert("No workouts to email.");
    return;
  }
  if (!confirm(`Send all ${workouts.length} workout(s) to ${registeredEmail}?`)) return;

  try {
    const res = await fetch("/api/send-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: registeredEmail,
        subject: "Workout Tracker",
        html: buildEmailTableHtml(workouts),
        workouts
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

function renderTable() {
  tbody.innerHTML = "";

  const inputRow = createInputRow();
  tbody.appendChild(inputRow);

  document.getElementById("btn-add-save").addEventListener("click", () => {
    const data = collectInputValues("new-");
    if (!data.date || !data.time) {
      alert("Date and time are required.");
      return;
    }
    workouts.unshift({ id: generateId(), ...data });
    sortWorkouts();
    saveWorkouts();
    renderTable();
  });

  document.getElementById("btn-add-cancel").addEventListener("click", clearInputRow);

  if (workouts.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.innerHTML = `<td colspan="10" class="empty-message">No workouts yet. Add your first one above!</td>`;
    tbody.appendChild(emptyTr);
    return;
  }

  workouts.forEach((w) => {
    const tr = document.createElement("tr");
    tr.dataset.id = w.id;
    tr.innerHTML = `
      <td class="display">${escapeHtml(w.date)}</td>
      <td class="display">${escapeHtml(w.time)}</td>
      <td class="display">${escapeHtml(w.type)}</td>
      <td class="display">${escapeHtml(w.distance)}</td>
      <td class="display">${escapeHtml(w.pace)}</td>
      <td class="display">${escapeHtml(w.bp || "")}</td>
      <td class="display">${w.temp != null ? escapeHtml(w.temp) : ""}</td>
      <td class="display">${escapeHtml(w.weather || "")}</td>
      <td class="display">${escapeHtml(w.comments || "")}</td>
      <td>
        <button type="button" class="btn-edit">Edit</button>
        <button type="button" class="btn-delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".btn-edit").addEventListener("click", () => startInlineEdit(tr, w));
    tr.querySelector(".btn-delete").addEventListener("click", () => {
      if (!confirm("Delete this workout?")) return;
      workouts = workouts.filter((item) => item.id !== w.id);
      saveWorkouts();
      renderTable();
    });
  });
}

function startInlineEdit(tr, w) {
  tr.classList.add("editing");
  tr.innerHTML = `
    <td><input type="date" class="edit-date" value="${escapeHtml(w.date)}"></td>
    <td><select class="edit-time">${buildTimeOptions(w.time)}</select></td>
    <td>
      <select class="edit-type">
        <option value="walk" ${w.type === "walk" ? "selected" : ""}>walk</option>
        <option value="run" ${w.type === "run" ? "selected" : ""}>run</option>
        <option value="swim" ${w.type === "swim" ? "selected" : ""}>swim</option>
        <option value="bike" ${w.type === "bike" ? "selected" : ""}>bike</option>
        <option value="other" ${w.type === "other" ? "selected" : ""}>other</option>
      </select>
    </td>
    <td><input type="number" class="edit-distance" step="0.01" min="0" value="${w.distance}"></td>
    <td><input type="number" class="edit-pace" step="0.1" min="0" value="${w.pace}"></td>
    <td><input type="text" class="edit-bp" value="${escapeHtml(w.bp || "")}" placeholder="120/80"></td>
    <td><input type="number" class="edit-temp" step="1" value="${w.temp != null ? w.temp : ""}"></td>
    <td><input type="text" class="edit-weather" value="${escapeHtml(w.weather || "")}"></td>
    <td><textarea class="edit-comments" rows="1">${escapeHtml(w.comments || "")}</textarea></td>
    <td>
      <button type="button" class="btn-save">Save</button>
      <button type="button" class="btn-cancel">Cancel</button>
    </td>
  `;

  tr.querySelector(".btn-save").addEventListener("click", () => {
    const updated = {
      id: w.id,
      date: tr.querySelector(".edit-date").value,
      time: tr.querySelector(".edit-time").value,
      type: tr.querySelector(".edit-type").value,
      distance: parseFloat(tr.querySelector(".edit-distance").value) || 0,
      pace: parseFloat(tr.querySelector(".edit-pace").value) || 0,
      bp: tr.querySelector(".edit-bp").value.trim(),
      temp: tr.querySelector(".edit-temp").value
        ? parseFloat(tr.querySelector(".edit-temp").value)
        : null,
      weather: tr.querySelector(".edit-weather").value.trim(),
      comments: tr.querySelector(".edit-comments").value.trim()
    };

    if (!updated.date || !updated.time) {
      alert("Date and time are required.");
      return;
    }

    const idx = workouts.findIndex((item) => item.id === w.id);
    if (idx !== -1) {
      workouts[idx] = updated;
      sortWorkouts();
      saveWorkouts();
      renderTable();
    }
  });

  tr.querySelector(".btn-cancel").addEventListener("click", () => {
    renderTable();
  });
}

document.addEventListener("DOMContentLoaded", loadWorkouts);