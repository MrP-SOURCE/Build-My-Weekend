const MAX_TEXT_LENGTH = 180;
const MAX_BODY_BYTES = 8_000;
const DEFAULT_ALLOWED_ORIGIN = "https://mrp-source.github.io";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN).split(",").map(x => x.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}

function validPlace(value) {
  return typeof value === "string" && value.trim().length > 1 && value.trim().length <= MAX_TEXT_LENGTH;
}

function parsePosition(data) {
  const p = data?.results?.[0]?.position;
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  if (p.lat < -35 || p.lat > -22 || p.lon < 16 || p.lon > 34) return null;
  return { lat: p.lat, lon: p.lon };
}

async function geocode(place, key) {
  const url = new URL("https://api.tomtom.com/search/2/geocode/" + encodeURIComponent(place.trim()) + ".json");
  url.searchParams.set("key", key);
  url.searchParams.set("countrySet", "ZAF");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    const error = new Error("TomTom geocoding request failed");
    error.status = response.status === 429 ? 503 : 502;
    throw error;
  }
  const position = parsePosition(await response.json());
  if (!position) {
    const error = new Error("Could not find a suitable South African location for one of the places.");
    error.status = 422;
    throw error;
  }
  return position;
}

async function calculateRoute(origin, destination, key) {
  const coords = `${origin.lat},${origin.lon}:${destination.lat},${destination.lon}`;
  const url = new URL("https://api.tomtom.com/routing/1/calculateRoute/" + coords + "/json");
  url.searchParams.set("key", key);
  url.searchParams.set("routeType", "fastest");
  url.searchParams.set("travelMode", "car");
  url.searchParams.set("traffic", "false");
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    const error = new Error("TomTom route calculation failed");
    error.status = response.status === 429 ? 503 : 502;
    throw error;
  }
  const data = await response.json();
  const summary = data?.routes?.[0]?.summary;
  if (!summary || !Number.isFinite(summary.lengthInMeters) || !Number.isFinite(summary.travelTimeInSeconds)) {
    const error = new Error("TomTom did not return a usable driving route.");
    error.status = 502;
    throw error;
  }
  return {
    distanceKmOneWay: Math.round((summary.lengthInMeters / 1000) * 10) / 10,
    driveMinutesOneWay: Math.round(summary.travelTimeInSeconds / 60),
    source: "TomTom Routing API",
    routeType: "fastest",
    trafficIncluded: false,
    calculatedAt: new Date().toISOString()
  };
}

export default {
  async fetch(request, env) {
    const originHeader = request.headers.get("Origin");
    const cors = corsHeaders(originHeader, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!cors["access-control-allow-origin"]) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ status: "ok", service: "build-my-weekend-routing", routingConfigured: Boolean(env.TOMTOM_API_KEY) }, 200, cors);
    }
    if (request.method !== "POST" || url.pathname !== "/api/route") {
      return json({ error: "Not found" }, 404, cors);
    }
    if (originHeader && !cors["access-control-allow-origin"]) return json({ error: "Origin not allowed" }, 403);
    if (!env.TOMTOM_API_KEY) return json({ error: "Routing service is not configured yet." }, 503, cors);

    // Fail closed if the Cloudflare Rate Limiting binding has not been configured.
    if (!env.ROUTE_RATE_LIMITER || typeof env.ROUTE_RATE_LIMITER.limit !== "function") {
      return json({ error: "Routing protection is not configured yet." }, 503, cors);
    }
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    let rateLimit;
    try {
      rateLimit = await env.ROUTE_RATE_LIMITER.limit({ key: clientIp });
    } catch {
      return json({ error: "Routing protection is temporarily unavailable." }, 503, cors);
    }
    if (!rateLimit?.success) {
      return json({ error: "Too many route requests. Please wait a minute and try again." }, 429, { ...cors, "retry-after": "60" });
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "Request body is too large." }, 413, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Send a valid JSON body." }, 400, cors); }

    if (!validPlace(body?.origin) || !validPlace(body?.destination)) {
      return json({ error: "Provide an origin and destination, each between 2 and 180 characters." }, 400, cors);
    }

    try {
      const from = await geocode(body.origin, env.TOMTOM_API_KEY);
      const to = await geocode(body.destination, env.TOMTOM_API_KEY);
      const route = await calculateRoute(from, to, env.TOMTOM_API_KEY);
      return json({
        origin: body.origin.trim(),
        destination: body.destination.trim(),
        ...route,
        disclaimer: "Route distance and time are estimates from TomTom. Traffic is not included; confirm road conditions and access before travel."
      }, 200, cors);
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 502;
      return json({ error: status === 422 ? error.message : "Routing is temporarily unavailable. Try again later." }, status, cors);
    }
  }
};
