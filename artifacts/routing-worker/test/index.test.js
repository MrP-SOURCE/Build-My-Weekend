import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const allowLimiter = { limit: async () => ({ success: true }) };
const env = { TOMTOM_API_KEY: "test-key", ALLOWED_ORIGIN: "https://mrp-source.github.io", ROUTE_RATE_LIMITER: allowLimiter };
const origin = "https://mrp-source.github.io";

test("health check does not expose the API key", async () => {
  const response = await worker.fetch(new Request("https://worker.example/healthz", { headers: { Origin: origin } }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.routingConfigured, true);
  assert.equal(JSON.stringify(body).includes("test-key"), false);
});

test("rejects an unapproved browser origin", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/route", {
    method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: JSON.stringify({ origin: "Cape Town", destination: "Hermanus" })
  }), env);
  assert.equal(response.status, 403);
});

test("rejects malformed or missing place names before calling TomTom", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/route", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ origin: "", destination: "Hermanus" })
  }), env);
  assert.equal(response.status, 400);
});

test("returns a clear configuration error when no API key is set", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/route", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ origin: "Cape Town, South Africa", destination: "Hermanus, Western Cape, South Africa" })
  }), { ALLOWED_ORIGIN: origin });
  assert.equal(response.status, 503);
});

test("does not route unsupported paths", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/routes", { method: "POST" }), env);
  assert.equal(response.status, 404);
});


test("rejects route requests when rate limiting is not configured", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/route", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10" },
    body: JSON.stringify({ origin: "Cape Town", destination: "Hermanus" })
  }), { TOMTOM_API_KEY: "test-key", ALLOWED_ORIGIN: origin });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /protection is not configured/i);
});

test("returns 429 before routing when the rate limit is exceeded", async () => {
  const response = await worker.fetch(new Request("https://worker.example/api/route", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.11" },
    body: JSON.stringify({ origin: "Cape Town", destination: "Hermanus" })
  }), {
    ...env,
    ROUTE_RATE_LIMITER: { limit: async ({ key }) => ({ success: key !== "203.0.113.11" }) }
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
});


test("chooses matching TomTom place results instead of an unrelated first result", async () => {
  const originalFetch = globalThis.fetch;
  const routeCalls = [];
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.includes("/geocode/")) {
      const query = decodeURIComponent(url.pathname.split("/").pop().replace(/\\.json$/, ""));
      if (query.startsWith("Stellenbosch")) {
        return Response.json({ results: [
          { position: { lat: -34.08, lon: 18.85 }, address: { freeformAddress: "Somerset West, Western Cape" } },
          { position: { lat: -33.93, lon: 18.86 }, address: { freeformAddress: "Stellenbosch, Western Cape" } }
        ] });
      }
      return Response.json({ results: [
        { position: { lat: -34.15, lon: 18.87 }, address: { freeformAddress: "Gordon's Bay, Western Cape" } },
        { position: { lat: -34.20, lon: 18.86 }, address: { freeformAddress: "Kogel Bay, Western Cape" } }
      ] });
    }
    routeCalls.push(url.pathname);
    return Response.json({ routes: [{ summary: { lengthInMeters: 34000, travelTimeInSeconds: 2160 } }] });
  };
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/route", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.12" },
      body: JSON.stringify({ origin: "Stellenbosch, South Africa", destination: "Kogel Bay, Cape Helderberg, Western Cape, South Africa" })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.distanceKmOneWay, 34);
    assert.equal(body.driveMinutesOneWay, 36);
    assert.equal(routeCalls.length, 1);
    assert.match(routeCalls[0], /-33.93,18.86:-34.2,18.86/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects ambiguous geocoding instead of routing to an unrelated result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.includes("/geocode/")) {
      return Response.json({ results: [
        { position: { lat: -34.15, lon: 18.87 }, address: { freeformAddress: "Gordon's Bay, Western Cape" } }
      ] });
    }
    throw new Error("Routing should not be called after a place mismatch");
  };
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/route", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.13" },
      body: JSON.stringify({ origin: "Kogel Bay, Western Cape, South Africa", destination: "Hermanus, Western Cape, South Africa" })
    }), env);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /confidently match/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("rejects a route shorter than the straight-line distance between matched places", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.includes("/geocode/")) {
      const query = decodeURIComponent(url.pathname.split("/").pop().replace(/\\.json$/, ""));
      if (query.startsWith("Stellenbosch")) {
        return Response.json({ results: [
          { position: { lat: -33.93, lon: 18.86 }, address: { freeformAddress: "Stellenbosch, Western Cape" } }
        ] });
      }
      return Response.json({ results: [
        { position: { lat: -34.20, lon: 18.86 }, address: { freeformAddress: "Kogel Bay, Western Cape" } }
      ] });
    }
    return Response.json({ routes: [{ summary: { lengthInMeters: 16000, travelTimeInSeconds: 1260 } }] });
  };
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/route", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.14" },
      body: JSON.stringify({ origin: "Stellenbosch, South Africa", destination: "Kogel Bay, Cape Helderberg, Western Cape, South Africa" })
    }), env);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /inconsistent with the matched places/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("uses canonical destination coordinates and rejects a suspicious Kogel Bay route", async () => {
  const originalFetch = globalThis.fetch;
  const called = [];
  globalThis.fetch = async input => {
    const url = new URL(input);
    called.push(url.pathname);
    if (url.pathname.includes("/geocode/")) {
      return Response.json({ results: [
        { position: { lat: -33.93, lon: 18.86 }, address: { freeformAddress: "Stellenbosch, Western Cape" } }
      ] });
    }
    return Response.json({ routes: [{ summary: { lengthInMeters: 16000, travelTimeInSeconds: 1260 } }] });
  };
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/route", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.15" },
      body: JSON.stringify({ origin: "Stellenbosch, South Africa", destination: "Kogel Bay, Cape Helderberg, Western Cape, South Africa", destinationCoordinates: { lat: -34.20, lon: 18.86 } })
    }), env);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /inconsistent with the matched places/i);
    assert.equal(called.filter(path => path.includes("/geocode/")).length, 1, "destination must use the canonical coordinates");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("shoreline topography endpoint returns False Bay regional reference data", async () => {
  const response = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=False%20Bay",
    { headers: { Origin: origin } }
  ), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.count, 1);
  assert.equal(body.regions[0].destination, "False Bay");
  assert.equal(body.regions[0].data_status, "DEMO_REGIONAL_REFERENCE");
  assert.ok(body.regions[0].topography_description);
  assert.ok(body.regions[0].map_reading_instruction);
  assert.ok(Array.isArray(body.regions[0].accumulating_fish));
  assert.ok(body.disclaimer.includes("not live reports"));
});

test("shoreline endpoint applies length threshold and coordinate bounding-box filters", async () => {
  const response = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=Bay&shoreline_length_km=110&lat=-34.1&lon=18.7",
    { headers: { Origin: origin } }
  ), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.count, 1);
  assert.equal(body.regions[0].destination, "False Bay");
  assert.equal(body.filters.coordinate_bounding_box_match, true);
  const outside = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=False%20Bay&lat=-30&lon=25",
    { headers: { Origin: origin } }
  ), env);
  assert.equal((await outside.json()).count, 0);
});

test("shoreline endpoint validates missing destinations, invalid length filters and incomplete coordinates", async () => {
  const missing = await worker.fetch(new Request("https://worker.example/api/shoreline-topography", { headers: { Origin: origin } }), env);
  assert.equal(missing.status, 400);
  const length = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=False%20Bay&shoreline_length_km=-1",
    { headers: { Origin: origin } }
  ), env);
  assert.equal(length.status, 400);
  const coords = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=False%20Bay&lat=-34",
    { headers: { Origin: origin } }
  ), env);
  assert.equal(coords.status, 400);
});

test("shoreline endpoint rejects unapproved browser origins", async () => {
  const response = await worker.fetch(new Request(
    "https://worker.example/api/shoreline-topography?destination=False%20Bay",
    { headers: { Origin: "https://evil.example" } }
  ), env);
  assert.equal(response.status, 403);
});
