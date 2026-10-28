import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = readFileSync("artifacts/build-my-weekend/js/fishing.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "fishing.js" });
const fishing = sandbox.window.BMWFishing;

test("fishing module exposes a populated, demo-labelled spot catalogue", () => {
  assert.ok(fishing);
  assert.ok(fishing.spots.length >= 15);
  assert.ok(fishing.spots.every(spot => spot.confidence === "DEMO"));
  assert.ok(fishing.getSpots("hermanus").length > 0);
  assert.deepEqual(Array.from(fishing.getSpots("unknown-destination")), []);
});

test("style and target species act as hard filters", () => {
  const rockGaljoen = fishing.bestSpot("hermanus", {
    fishingStyle: "Rock",
    targetSpecies: "Galjoen",
    spotPreference: "Let the app choose"
  });
  assert.ok(rockGaljoen);
  assert.ok(rockGaljoen.spot.styles.includes("Rock"));
  assert.ok(rockGaljoen.spot.species.includes("Galjoen"));

  assert.equal(fishing.bestSpot("hermanus", {
    fishingStyle: "Estuary",
    targetSpecies: "Galjoen",
    spotPreference: "Let the app choose"
  }), null);
  assert.equal(fishing.destinationMatch("hermanus", {
    fishingStyle: "Shore",
    targetSpecies: "Unsupported species",
    spotPreference: "Let the app choose"
  }), 0);
});

test("spot preferences reject incompatible and unsupported preferences", () => {
  assert.equal(fishing.bestSpot("hermanus", {
    fishingStyle: "Any",
    targetSpecies: "Any",
    spotPreference: "Estuary"
  }), null);
  assert.equal(fishing.bestSpot("kleinmond", {
    fishingStyle: "Any",
    targetSpecies: "Any",
    spotPreference: "Estuary"
  })?.spot.destinationId, "kleinmond");
  assert.equal(fishing.bestSpot("hermanus", {
    fishingStyle: "Any",
    targetSpecies: "Any",
    spotPreference: "Made-up spot type"
  }), null);
});

test("lunar phase accepts real calendar dates and rejects invalid input", () => {
  const phase = fishing.lunarPhase("2026-10-28");
  assert.ok(phase.label !== "Date unavailable");
  assert.ok(phase.illumination >= 0 && phase.illumination <= 100);
  assert.ok(phase.ageDays >= 0 && phase.ageDays < phase.cycleLengthDays);
  assert.equal(fishing.lunarPhase("not-a-date").label, "Date unavailable");
  assert.equal(fishing.lunarPhase("2026-02-30").label, "Date unavailable");
  assert.equal(fishing.lunarPhase("").illumination, null);
});

test("fishing condition planning labels wind, baitfish and security without claiming live data", () => {
  const lowerWind = fishing.assessFishingConditions({ windSpeedKph: 9, baitfishObserved: true, securityStatus: "on-site" });
  assert.equal(lowerWind.liveData, false);
  assert.equal(lowerWind.netCasting.level, "LOWER_WIND");
  assert.equal(lowerWind.baitfish.status, "USER_OBSERVED_PRESENT");
  assert.equal(lowerWind.security.status, "USER_REPORTED_ON_SITE");

  assert.equal(fishing.assessFishingConditions({ windSpeedKph: 10 }).netCasting.level, "CAUTION");
  assert.equal(fishing.assessFishingConditions({ windSpeedKph: 20 }).netCasting.level, "CAUTION");
  assert.equal(fishing.assessFishingConditions({ windSpeedKph: 20.1 }).netCasting.level, "HIGH_WIND");
  assert.equal(fishing.assessFishingConditions({ windSpeedKph: -1 }).netCasting.level, "UNKNOWN");
  assert.equal(fishing.assessFishingConditions({ windSpeedKph: "12", baitfishObserved: false }).baitfish.status, "USER_OBSERVED_NOT_SEEN");
  assert.equal(fishing.assessFishingConditions({}).security.status, "UNVERIFIED");
  assert.equal(fishing.assessFishingConditions({ securityStatus: "none-reported" }).security.status, "NONE_REPORTED");
});
