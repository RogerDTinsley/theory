import { Resend } from "resend";

const SCRIPTURES_KEY = "__scriptures_xml__";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function getScripturesXml() {
  return typeof globalThis[SCRIPTURES_KEY] === "string" ? globalThis[SCRIPTURES_KEY] : null;
}

function setScripturesXml(xml) {
  globalThis[SCRIPTURES_KEY] = String(xml || "");
}

function buildDefaultScripturesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<scriptures>
  <email></email>
  <entries></entries>
</scriptures>`;
}

function buildWorkoutTable(theory) {
  const rows = (theory || []).map((w) => `
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/scriptures.xml" && request.method === "GET") {
      const xml = getScripturesXml();
      if (xml) {
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8" }
        });
      }
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/scriptures" && request.method === "POST") {
      try {
        const xml = await request.text();
        setScripturesXml(xml && xml.trim() ? xml : buildDefaultScripturesXml());
        return Response.json({ success: true });
      } catch (err) {
        return Response.json(
          { success: false, error: err.message || "Unknown error" },
          { status: 500 }
        );
      }
    }

    if (url.pathname === "/api/send-mail" && request.method === "POST") {
      try {
        const body = await request.json();
        const to = (body.to || body.email || "").trim();

        if (!isValidEmail(to)) {
          return Response.json(
            { success: false, error: "A valid registered email is required." },
            { status: 400 }
          );
        }

        const html = body.html || buildWorkoutTable(body.theory || []);
        const subject = body.subject || "Workout Tracker";
        const from = env.RESEND_FROM || "Workout Tracker <onboarding@resend.dev>";

        const resend = new Resend(env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
          from,
          to: [to],
          subject,
          html
        });

        if (error) {
          return Response.json(
            { success: false, error: error.message || "Resend error" },
            { status: 500 }
          );
        }

        return Response.json({ success: true, id: data?.id });
      } catch (err) {
        return Response.json(
          { success: false, error: err.message || "Unknown error" },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};