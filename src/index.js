import { Resend } from "resend";

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

function buildWorkoutTable(workouts) {
  const rows = (workouts || []).map((w) => `
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

        const html = body.html || buildWorkoutTable(body.workouts || []);
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