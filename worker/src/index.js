// Presence audit log — Cloudflare Worker + D1.
// Write-only event log (with a small /stats read endpoint).
// Pairs with the index.html beacon; abacus.jasoncameron.dev still drives the live GDP display.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    if (request.method === "POST" && url.pathname === "/log") {
      const body = await request.json().catch(() => ({}));
      const eventType = String(body.type || "").slice(0, 32);
      if (!eventType) return cors(json({ error: "type required" }, 400));

      const ts = Date.now();
      const day = new Date(ts).toISOString().slice(0, 10);
      const anonId = body.anonId ? String(body.anonId).slice(0, 64) : null;
      const cameFromRef = body.cameFromRef ? String(body.cameFromRef).slice(0, 64) : null;
      const ua = (request.headers.get("user-agent") || "").slice(0, 200) || null;
      const ip = request.headers.get("cf-connecting-ip") || null;
      // Hash the IP so we never store raw addresses (very-low-grade abuse signal only).
      const ipHash = ip ? await sha256(ip + "|" + day) : null;

      await env.DB.prepare(
        `INSERT INTO events (ts, day, event_type, anon_id, came_from_ref, ua, ip_day_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(ts, day, eventType, anonId, cameFromRef, ua, ipHash).run();

      return cors(json({ ok: true }));
    }

    if (request.method === "GET" && url.pathname === "/stats") {
      const today = new Date().toISOString().slice(0, 10);

      const totalCompletions = (await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM events WHERE event_type = 'completion'`
      ).first())?.n ?? 0;

      const todayCompletions = (await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM events WHERE event_type = 'completion' AND day = ?`
      ).bind(today).first())?.n ?? 0;

      const uniqueUsers = (await env.DB.prepare(
        `SELECT COUNT(DISTINCT anon_id) AS n FROM events WHERE event_type = 'completion' AND anon_id IS NOT NULL`
      ).first())?.n ?? 0;

      const last7Days = (await env.DB.prepare(
        `SELECT day, COUNT(*) AS n FROM events
         WHERE event_type = 'completion' AND day >= date('now', '-7 days')
         GROUP BY day ORDER BY day DESC`
      ).all()).results || [];

      return cors(json({
        totalCompletions,
        totalMinutes: totalCompletions * 10,
        todayCompletions,
        todayMinutes: todayCompletions * 10,
        uniqueUsers,
        last7Days,
      }));
    }

    return cors(new Response("not found", { status: 404 }));
  },
};

function cors(res) {
  // Wide-open for now; tighten Access-Control-Allow-Origin to your real domain in prod.
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256(s) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
