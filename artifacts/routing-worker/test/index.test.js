import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { TOMTOM_API_KEY: "test-key", ALLOWED_ORIGIN: "https://mrp-source.github.io" };
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
