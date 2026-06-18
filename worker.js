// Cloudflare Worker — proxies IDFM PRIM API with CORS headers
// Deploy: npx wrangler deploy worker.js --name train-board
// Then set your API key: npx wrangler secret put IDFM_API_KEY
// Then set allowed origin: npx wrangler secret put ALLOWED_ORIGIN
//   (e.g. "https://yourusername.github.io" or "null" for local file://)
// Then set a bearer token: npx wrangler secret put AUTH_TOKEN
//   (generate one with: openssl rand -hex 32)

const ALLOWED_STOPS = [
  "STIF:StopPoint:Q:43729:",
  "STIF:StopArea:SP:43118:",
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";

    if (allowed !== "*" && origin !== allowed) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...corsHeaders(allowed),
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const monitoringRef = url.searchParams.get("MonitoringRef");
    if (!monitoringRef) {
      return json({ error: "MonitoringRef required" }, 400);
    }

    if (!ALLOWED_STOPS.includes(monitoringRef)) {
      return json({ error: "Stop not allowed" }, 403);
    }

    const apiUrl = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${encodeURIComponent(monitoringRef)}`;

    const resp = await fetch(apiUrl, {
      headers: { apiKey: env.IDFM_API_KEY },
    });

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        ...corsHeaders(allowed),
        "Content-Type": "application/json",
      },
    });
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}
