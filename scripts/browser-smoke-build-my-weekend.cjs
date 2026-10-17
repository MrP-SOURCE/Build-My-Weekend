const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  const failedLocalAssets = [];
  let simulateRoutingOutage = false;
  let simulateInvalidRouteResponse = false;
  let delayNextRoute = false;
  let delayedRouteStarted = false;
  let sawKogelBayRoute = false;

  page.on("pageerror", error => pageErrors.push(error.message));
  // Keep CI deterministic while exercising the real planner's route-response handling.
  await page.route("https://go.build-my-weekend.workers.dev/**", async route => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type"
      }});
    }
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/route") {
      if (delayNextRoute && !delayedRouteStarted) {
        delayedRouteStarted = true;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (simulateRoutingOutage) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ error: "Routing is temporarily unavailable." })
        });
      }
      const body = route.request().postDataJSON();
      if (String(body.destination || "").startsWith("Kogel Bay")) {
        assert.deepEqual(body.destinationCoordinates, { lat: -34.23646, lon: 18.85178 },
          "Kogel Bay routing must use the campsite-area coordinates, not the inaccurate broad-area pin.");
        sawKogelBayRoute = true;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          origin: body.origin,
          destination: body.destination,
          distanceKmOneWay: simulateInvalidRouteResponse ? "not-a-number" : 45,
          driveMinutesOneWay: 39,
          source: "TomTom Routing API",
          disclaimer: "Deterministic route fixture for browser testing."
        })
      });
    }
    if (pathname === "/api/shoreline-topography") {
      const params = new URL(route.request().url()).searchParams;
      const region = {
        id: "false-bay", destination: "False Bay", province: "Western Cape",
        shoreline_length_km: 120, data_status: "DEMO_REGIONAL_REFERENCE",
        bounding_box: { min_lat: -34.35, max_lat: -33.95, min_lon: 18.35, max_lon: 19.15 },
        topography_description: "Fixture topography description.",
        hotspot_features: [{ name: "Rocky points", feature: "reef edge", status: "not verified" }],
        map_reading_instruction: "Read official chart contours and restrictions.",
        accumulating_fish: [{ species: "Yellowtail", habitat: "offshore", evidence: "illustrative only" }]
      };
      const matchesLength = region.shoreline_length_km >= Number(params.get("shoreline_length_km") || 0);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          schema_version: "1.0", count: matchesLength ? 1 : 0, disclaimer: "Demo data only.",
          regions: matchesLength ? [region] : []
        })
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) });
  });
  page.on("requestfailed", request => {
    if (new URL(request.url()).origin === new URL(process.env.BMW_BASE_URL).origin) {
      // The bathymetry GeoJSON is intentionally optional until real, licensed,
      // provenance-checked data is published. Its expected 404 must not fail CI.
      if (new URL(request.url()).pathname.endsWith("/data/bathymetry/candidate-structure-zones.geojson")) return;
      failedLocalAssets.push(request.url() + " — " + (request.failure()?.errorText || "request failed"));
    }
  });
  const waitForRouteResults = async () => page.waitForFunction(() => {
    const summary = document.querySelector("#results-summary")?.innerText || "";
    return !summary.includes("Checking real driving routes") &&
      (summary.includes("route-verified destination") || summary.includes("No route-verified destination passed") || summary.includes("routing service is temporarily unavailable"));
  }, null, { timeout: 15000 });

  try {
    const baseUrl = process.env.BMW_BASE_URL || "http://127.0.0.1:4173/Build-My-Weekend/";
    const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    assert(response && response.ok(), "Planner page did not return a successful HTTP response.");
    await page.locator("#trip-form").waitFor();
    const originScope = page.locator('.origin-scope-note');
    assert(await originScope.isVisible(), "Cape Town pilot origin limitation is not visible before planning.");
    assert((await originScope.innerText()).includes("not a nationwide destination directory"), "Origin disclosure does not explain the Western Cape destination-catalogue limit.");
    assert(await page.locator("#origin").inputValue() === "Cape Town, South Africa", "Default departure location is missing.");
    assert((await page.title()).includes("Build My Weekend"), "Unexpected page title.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Initial destination cards did not render.");
    assert(await page.locator("#reset-filters").isVisible(), "RESET TO DEFAULTS must remain visible while destination recommendations are displayed.");
    const costBreakdown = firstCard.locator('[data-testid^="cost-breakdown-"]');
    assert.equal(await costBreakdown.count(), 1, "Each destination must provide a cost-breakdown disclosure.");
    assert((await costBreakdown.locator("summary").innerText()).includes("COST BREAKDOWN"), "Cost breakdown disclosure label is missing.");
    await costBreakdown.locator("summary").click();
    const costBreakdownText = await costBreakdown.innerText();
    for (const label of ["Accommodation", "Food", "Activities", "Fuel consumed for return trip", "Fuel already paid for (credited)", "Estimated additional fuel to buy", "Estimated new spend"]) {
      assert(costBreakdownText.includes(label), `Cost breakdown is missing the "${label}" line.`);
    }
    assert(costBreakdownText.includes("demonstration estimates, not live quotes"), "Cost breakdown must disclose estimated, non-quote values.");
    const firstCard = page.locator("#recommendations .trip-card").first();
    const mapLink = firstCard.locator('a[data-testid="destination-map-link"]');
    assert.equal(await mapLink.count(), 1, "Each destination result must include a direct map link.");
    const mapHref = await mapLink.getAttribute("href");
    assert(mapHref && mapHref.startsWith("https://www.google.com/maps/search/?api=1&query="),
      "Destination map link must use the HTTPS Google Maps search endpoint.");
    assert(decodeURIComponent(mapHref).includes(await firstCard.locator("h3").innerText()),
      "Destination map link must search for the actual recommended destination.");

    // Reject invalid inputs in the real browser before producing a plan.
    await page.locator("#budget").fill("0");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#budget").getAttribute("aria-invalid"), "true", "Zero budget was not rejected.");
    assert((await page.locator("#budget-error").innerText()).includes("greater than R0"), "Budget validation message is missing.");

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("11");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#people").getAttribute("aria-invalid"), "true", "Group size above 10 was not rejected.");
    assert((await page.locator("#people-error").innerText()).includes("between 1 and 10"), "Group-size validation message is missing.");

    await page.locator("#people").fill("4");
    await page.locator("#consumption").fill("0");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#consumption").getAttribute("aria-invalid"), "true", "Zero fuel consumption was not rejected.");
    assert((await page.locator("#consumption-error").innerText()).includes("greater than 0"), "Fuel-consumption validation message is missing.");

    await page.locator("#consumption").fill("8");
    const validDeparture = await page.locator("#depart").inputValue();
    const validReturn = await page.locator("#return").inputValue();
    await page.locator("#depart").fill("2020-01-01");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), "true", "A past departure date was not rejected.");
    assert((await page.locator("#depart-error").innerText()).includes("today or a future"), "Departure-date validation message is missing.");
    await page.locator("#depart").fill(validDeparture);
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), null, "A valid departure date did not clear the validation error.");

    // Reject a return date earlier than departure, then recover when the dates are corrected.
    const invalidReturn = new Date(validDeparture + "T12:00:00Z");
    invalidReturn.setUTCDate(invalidReturn.getUTCDate() - 1);
    await page.locator("#return").fill(invalidReturn.toISOString().slice(0, 10));
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#return").getAttribute("aria-invalid"), "true", "A return date before departure was not rejected.");
    assert((await page.locator("#return-error").innerText()).includes("on or after departure"), "Return-date validation message is missing.");
    await page.locator("#return").fill(validReturn);
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#return").getAttribute("aria-invalid"), null, "A valid return date did not clear the validation error.");

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("4");
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Fishing controls did not appear.");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    await page.locator("#results-summary").waitFor();
    assert((await page.locator("#results-summary").innerText()).includes("route-verified destination"), "Submitting the planner did not produce a route-verified results summary.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Fishing plan returned no destination cards.");

    // Fishing constraints are requirements, not soft ranking hints. A rock-style
    // Galjoen search must not be satisfied by an estuary-only spot.
    await page.locator("#fishing-style").selectOption("Rock");
    await page.locator("#target-species").selectOption("Galjoen");
    await page.locator("#spot-preference").selectOption("Estuary");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#no-results").isVisible(), true,
      "An incompatible fishing style/species/spot combination should show no-results guidance.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0,
      "An incompatible fishing search returned destination cards.");

    // A compatible combination must recover without a reload and return a relevant match.
    await page.locator("#fishing-style").selectOption("Shore");
    await page.locator("#target-species").selectOption("Galjoen");
    await page.locator("#spot-preference").selectOption("Bay");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#no-results").isVisible(), false,
      "A compatible fishing search did not recover from no-results.");
    assert(await page.locator("#recommendations .trip-card").count() > 0,
      "A compatible fishing search returned no destination cards.");
    const fishingCards = await page.locator("#recommendations .trip-card").allInnerTexts();
    assert(fishingCards.some(text => /Gordon.?s Bay/i.test(text)),
      "A Shore/Galjoen/Bay search did not include the expected compatible Gordon's Bay result.");

    // Reset clears trip criteria and stale results while retaining vehicle fuel assumptions.
    await page.locator("#origin").fill("Stellenbosch, South Africa");
    await page.locator("#budget").fill("7800");
    await page.locator("#people").fill("2");
    await page.locator("#experience").selectOption({ label: "Camping Away" });
    await page.locator("#consumption").fill("7.2");
    await page.locator("#fuel-price").fill("25.10");
    await page.locator("#fuel-existing").fill("0");
    await page.locator("#reset-filters").click();
    assert.equal(await page.locator("#origin").inputValue(), "Cape Town, South Africa", "Reset did not restore the default origin.");
    assert.equal(await page.locator("#budget").inputValue(), "3000", "Reset did not restore the default group budget.");
    assert.equal(await page.locator("#people").inputValue(), "4", "Reset did not restore the default group size.");
    assert.equal(await page.locator("#experience").inputValue(), "Any", "Reset did not clear the selected weekend type.");
    assert.equal(await page.locator("#consumption").inputValue(), "7.2", "Reset must preserve the user's fuel-consumption assumption.");
    assert.equal(await page.locator("#fuel-price").inputValue(), "25.10", "Reset must preserve the user's fuel-price assumption.");
    assert.equal(await page.locator("#fuel-existing").inputValue(), "650", "Reset should restore the default fuel-already-in-tank value.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0, "Reset must clear old destination recommendations.");
    assert.equal(await page.locator("#no-results").isVisible(), false, "Reset must hide stale no-results guidance.");
    assert((await page.locator("#results-summary").innerText()).includes("Trip criteria are reset"), "Reset status message is missing.");

    // Each fresh page visit starts with clean defaults, not the previous trip's inputs.
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#budget").inputValue(), "3000", "Default budget was not restored after reload.");
    assert.equal(await page.locator("#people").inputValue(), "4", "Default group size was not restored after reload.");
    assert.equal(await page.locator("#experience").inputValue(), "Any", "Previous weekend type leaked across reload.");
    assert.equal(await page.locator("#origin").inputValue(), "Cape Town, South Africa", "Previous origin leaked across reload.");
    assert.equal(await page.locator('input[name="distance"]:checked').inputValue(), "200", "Default distance was not restored after reload.");
    assert.equal(await page.locator("#camping-setup").inputValue(), "Any", "Previous camping preference leaked across reload.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fresh planner load should not retain the previous fishing selection.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Restored planner settings did not produce destination cards.");

    // Specialist controls are hidden for the default activity; switch to Fishing Away before testing them.
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Fishing controls did not appear after selecting Fishing Away.");

    // Incompatible fishing requirements must not fall back to a misleading spot.
    await page.locator("#fishing-style").selectOption("Estuary");
    await page.locator("#target-species").selectOption("Galjoen");
    await page.locator("#spot-preference").selectOption("River Mouth");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#no-results").isVisible(), true,
      "An incompatible estuary + Galjoen + river-mouth request did not explain that no matching destination exists.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0,
      "Fishing planner returned destinations that do not meet all selected fishing requirements.");

    await page.locator("#fishing-style").selectOption("Any");
    await page.locator("#target-species").selectOption("Any");
    await page.locator("#spot-preference").selectOption("Let the app choose");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert(await page.locator("#recommendations .trip-card").count() > 0,
      "Fishing planner did not recover after clearing incompatible requirements.");

    // Use a deterministic forecast fixture to test the successful weather-rendering path.
    const forecastDates = [...new Set([
      await page.locator("#depart").inputValue(),
      await page.locator("#return").inputValue()
    ])];
    await page.route("https://marine-api.open-meteo.com/**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: forecastDates,
          wave_height_max: forecastDates.map(() => 1.4),
          swell_wave_height_max: forecastDates.map(() => 0.9),
          wave_period_max: forecastDates.map(() => 8),
          swell_wave_period_max: forecastDates.map(() => 10),
          swell_wave_direction_dominant: forecastDates.map(() => 225)
        }
      })
    }));
    await page.route("https://api.open-meteo.com/**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: forecastDates,
          weather_code: forecastDates.map(() => 1),
          temperature_2m_max: forecastDates.map(() => 22),
          temperature_2m_min: forecastDates.map(() => 14),
          precipitation_probability_max: forecastDates.map(() => 10),
          wind_speed_10m_max: forecastDates.map(() => 18)
        }
      })
    }));
    const coastalFishingCard = page.locator("#recommendations .trip-card").filter({ hasText: /Hermanus|Gordon.?s Bay/i }).first();
    await coastalFishingCard.locator('button[data-action="view"]').click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), true, "Destination detail dialog did not open.");
    assert((await page.locator("#dialog-content").innerText()).includes("DEMONSTRATION DATA"), "Destination detail is missing its demonstration-data warning.");
    assert((await page.locator("#dialog-content").innerText()).includes("Additional fuel to buy"), "Destination detail is missing the fuel breakdown.");
    assert((await page.locator("#dialog-content").innerText()).includes("km one way from Cape Town, South Africa"), "Destination detail does not show the selected departure origin.");
    await page.locator("#live-weather .weather-day").first().waitFor({ timeout: 10000 });
    assert((await page.locator("#live-weather").innerText()).includes("Mainly clear / partly cloudy"), "Successful weather data was not rendered.");
    assert((await page.locator("#live-weather").innerText()).includes("Open-Meteo"), "Rendered weather is missing its source attribution.");
    await page.locator("#marine-forecast .weather-day").first().waitFor({ timeout: 10000 });
    assert((await page.locator("#marine-forecast").innerText()).includes("Max wave: 1.4 m"), "Marine wave forecast fixture was not rendered.");
    assert((await page.locator("#marine-forecast").innerText()).includes("Max swell: 0.9 m"), "Marine swell forecast fixture was not rendered.");
    assert((await page.locator("#marine-forecast").innerText()).includes("Open-Meteo Marine API"), "Marine forecast is missing its source attribution.");

    // Null measurements must stay unknown, not be coerced to zero.
    await page.locator("#trip-dialog .dialog-close").click();
    await page.unroute("https://marine-api.open-meteo.com/**");
    await page.route("https://marine-api.open-meteo.com/**", route => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        daily: {
          time: forecastDates,
          wave_height_max: forecastDates.map(() => null),
          swell_wave_height_max: forecastDates.map(() => null),
          wave_period_max: forecastDates.map(() => null),
          swell_wave_period_max: forecastDates.map(() => null),
          swell_wave_direction_dominant: forecastDates.map(() => null)
        }
      })
    }));
    await coastalFishingCard.locator('button[data-action="view"]').click();
    await page.locator("#marine-forecast .weather-day").first().waitFor({ timeout: 10000 });
    const missingMarineText = await page.locator("#marine-forecast").innerText();
    assert(missingMarineText.includes("Max wave: n/a"), "Missing wave measurements were not rendered as n/a.");
    assert(missingMarineText.includes("Max swell: n/a"), "Missing swell measurements were not rendered as n/a.");
    assert(!missingMarineText.includes("0.0 m"), "Missing marine measurements were incorrectly rendered as zero.");

    // Verify that fuel already paid for reduces only the remaining cash spend.
    const readAdditionalFuelLine = async () => page.locator("#dialog-content").evaluate(root => {
      const label = [...root.querySelectorAll("*")].find(element =>
        element.children.length === 0 && element.textContent.trim() === "Additional fuel to buy"
      );
      return label?.parentElement?.innerText.trim() || "";
    });
    const additionalFuelWithTankCredit = await readAdditionalFuelLine();
    assert(additionalFuelWithTankCredit.includes("Additional fuel to buy"), "Could not read the additional-fuel cost row.");
    await page.locator("#trip-dialog .dialog-close").click();
    await page.locator("#fuel-existing").fill("0");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    await page.locator('#recommendations button[data-action="view"]').first().click();
    const additionalFuelWithoutTankCredit = await readAdditionalFuelLine();
    assert(additionalFuelWithoutTankCredit.includes("Additional fuel to buy"), "Additional-fuel cost row disappeared after recalculation.");
    assert.notEqual(additionalFuelWithoutTankCredit, additionalFuelWithTankCredit,
      "Setting fuel already in the tank to zero did not recalculate additional fuel spend.");

    // Exercise stay-search focus, external route hand-off and share-summary contents without leaving the test browser.
    await page.evaluate(() => {
      window.__bmwSharedPayload = null;
      window.__bmwOpenedUrl = null;
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async payload => { window.__bmwSharedPayload = payload; }
      });
      window.open = url => { window.__bmwOpenedUrl = url; return null; };
    });
    await page.locator('[data-testid="availability-button"]').click();
    const focusedStayLink = await page.evaluate(() => ({
      href: document.activeElement?.href || "",
      label: document.activeElement?.innerText || ""
    }));
    assert(focusedStayLink.href.includes("booking.com"), "Find Stay Options did not focus the first accommodation search link.");
    await page.locator('[data-testid="navigate-button"]').click();
    const openedRoute = await page.evaluate(() => window.__bmwOpenedUrl);
    assert(openedRoute && openedRoute.includes("google.com/maps/dir"), "Navigate did not hand off to a Google Maps driving route.");
    const decodedRoute = decodeURIComponent(openedRoute || "");
    assert(decodedRoute.includes("Cape Town, South Africa"), "Google Maps route origin does not match the Cape Town pilot disclosure.");
    await page.locator('[data-testid="detail-share-button"]').click();
    const sharedPayload = await page.evaluate(() => window.__bmwSharedPayload);
    assert(sharedPayload && sharedPayload.title.includes("Weekend in"), "Share Trip did not invoke the native share hand-off.");
    assert(sharedPayload.text.includes("Demonstration estimates only"), "Shared trip summary is missing the estimate disclosure.");
    assert(sharedPayload.text.includes("STAY SEARCH LINKS"), "Shared trip summary is missing accommodation research links.");
    assert(sharedPayload.text.toLowerCase().includes("additional fuel to buy"), "Shared trip summary is missing its fuel breakdown.");
    assert(sharedPayload.text.includes("DRIVING ROUTE FROM Cape Town, South Africa"), "Shared trip summary is missing its declared Cape Town departure origin.");
    assert(sharedPayload.text.includes("origin=Cape%20Town%2C%20South%20Africa"), "Shared trip summary route hand-off does not encode the same Cape Town origin as the planner disclosure.");
    await page.locator("#trip-dialog .dialog-close").click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), false, "Destination detail dialog did not close.");

    // Simulate the forecast provider being unreachable and verify the safe fallback.
    await page.unroute("https://api.open-meteo.com/**");
    await page.route("https://api.open-meteo.com/**", route => route.abort());
    await page.locator('#recommendations button[data-action="view"]').first().click();
    await page.locator("#live-weather").getByText("LIVE WEATHER TEMPORARILY UNAVAILABLE").waitFor({ timeout: 10000 });
    assert((await page.locator("#live-weather").innerText()).includes("Check an official weather service"), "Weather failure did not show safe fallback guidance.");
    await page.locator("#trip-dialog .dialog-close").click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), false, "Destination detail dialog did not close after weather failure.");

    // The marine forecast must fail safely as well, without blocking the detail dialog.
    await page.unroute("https://marine-api.open-meteo.com/**");
    await page.route("https://marine-api.open-meteo.com/**", route => route.abort());
    await page.locator("#recommendations .trip-card").filter({ hasText: /Hermanus|Gordon.?s Bay/i }).first().locator('button[data-action="view"]').click();
    await page.locator("#marine-forecast").getByText("MARINE FORECAST TEMPORARILY UNAVAILABLE").waitFor({ timeout: 10000 });
    assert((await page.locator("#marine-forecast").innerText()).includes("Check an official marine forecast"),
      "Marine forecast failure did not show safe fallback guidance.");
    assert((await page.locator("#marine-forecast").innerText()).includes("No fishing-day recommendation is inferred"),
      "Marine forecast failure implied a fishing-day recommendation.");
    await page.locator("#trip-dialog .dialog-close").click();

    await page.locator("#experience").selectOption({ label: "Camping Away" });
    assert.equal(await page.locator("#camping-controls").isVisible(), true, "Camping preferences did not appear.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing controls remained visible after switching activity.");
    await page.locator("#camping-setup").selectOption("Glamping");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Camping plan returned no destination cards.");
    assert.equal(sawKogelBayRoute, true, "Camping search did not exercise the Kogel Bay route-coordinate regression check.");

    // Verify specialist outdoor controls appear only for relevant trip types.
    await page.locator("#experience").selectOption({ label: "Hiking Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), true, "Hiking preferences did not appear.");
    await page.locator("#hiking-difficulty").selectOption("Easy");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Hiking plan returned no destination cards.");
    await page.locator("#experience").selectOption({ label: "Climbing Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), true, "Climbing preferences did not appear.");
    await page.locator("#experience").selectOption({ label: "Family Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), false, "Outdoor specialist controls remained visible for Family Away.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing specialist controls remained visible for Family Away.");

    // Verify a restrictive search explains no matches and the recovery action widens the search.
    await page.locator("#budget").fill("1");
    await page.locator("#experience").selectOption({ label: "Wildlife Away" });
    await page.locator('label:has(input[name="distance"][value="100"]) span').click();
    assert.equal(await page.locator('input[name="distance"][value="100"]').isChecked(), true, "The 100 km distance filter was not selected.");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#no-results").isVisible(), true, "An impossible activity/distance combination did not show the no-results guidance.");
    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("2");
    await page.locator("#fuel-price").fill("29.99");
    await page.locator("#fuel-price").dispatchEvent("change");
    await page.locator("#consumption").fill("8.1");
    await page.locator("#consumption").dispatchEvent("change");
    await page.locator("#fuel-existing").fill("125");
    await page.locator("#origin").fill("Stellenbosch, South Africa");
    await page.locator("#depart").fill("2026-11-10");
    await page.locator("#return").fill("2026-11-12");
    await page.locator("#experience").selectOption({ label: "Camping Away" });
    await page.locator("#camping-setup").selectOption("Glamping");
    await page.locator("#camping-power").selectOption("Required");
    await page.locator("#camping-ablutions").selectOption("Full");
    await page.locator("#camping-shade").selectOption("Shaded");
    await page.locator("#camping-terrain").selectOption("Grass");
    await page.locator("#reset-filters").click();
    assert.equal(await page.locator("#experience").inputValue(), "Any", "Reset did not restore the default activity filter.");
    assert.equal(await page.locator('input[name="distance"][value="200"]').isChecked(), true, "Reset did not restore the default distance limit.");
    assert.equal(await page.locator("#origin").inputValue(), "Cape Town, South Africa", "Reset did not restore the default starting location.");
    assert.equal(await page.locator("#budget").inputValue(), "3000", "Reset did not restore the default budget.");
    assert.equal(await page.locator("#people").inputValue(), "4", "Reset did not restore the default group size.");
    assert.notEqual(await page.locator("#depart").inputValue(), "2026-11-10", "Reset did not restore the default departure date.");
    assert.notEqual(await page.locator("#return").inputValue(), "2026-11-12", "Reset did not restore the default return date.");
    assert.equal(await page.locator("#fuel-existing").inputValue(), "650", "Reset did not restore the default value of fuel already in the tank.");
    assert.equal(await page.locator("#fuel-price").inputValue(), "29.99", "Reset did not preserve the user fuel price.");
    assert.equal(await page.locator("#consumption").inputValue(), "8.1", "Reset did not preserve the user fuel consumption.");
    assert.equal(await page.locator("#camping-setup").inputValue(), "Any", "Reset did not clear camping setup preferences.");
    assert.equal(await page.locator("#camping-power").inputValue(), "Any", "Reset did not clear camping power preferences.");
    assert.equal(await page.locator("#camping-ablutions").inputValue(), "Any", "Reset did not clear camping ablution preferences.");
    assert.equal(await page.locator("#camping-shade").inputValue(), "Any", "Reset did not clear camping shade preferences.");
    assert.equal(await page.locator("#camping-terrain").inputValue(), "Any", "Reset did not clear camping terrain preferences.");
    assert.equal(await page.locator("#camping-controls").isVisible(), false, "Reset left camping specialist controls open.");
    assert.equal(await page.locator("#no-results").isVisible(), false, "Reset did not restore the default result state.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0, "Reset should leave results empty until the user submits new criteria.");
    assert((await page.locator("#results-summary").innerText()).includes("fuel price and consumption are retained"), "Reset did not explain that fuel assumptions are retained.");

    // A slower response from an older submission must not overwrite a newer plan.
    // Remove route-cache entries so this regression test guarantees a fresh request.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("bmwRoute:v3:")) localStorage.removeItem(key);
      }
    });
    delayNextRoute = true;
    delayedRouteStarted = false;
    const olderRouteRequest = page.waitForRequest(request => request.url().includes("/api/route"));
    await page.locator("#trip-form button[type=submit]").click();
    await olderRouteRequest;
    await page.waitForTimeout(100);
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    await page.locator("#fishing-style").selectOption("Estuary");
    await page.locator("#target-species").selectOption("Galjoen");
    await page.locator("#spot-preference").selectOption("River Mouth");
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert.equal(await page.locator("#no-results").isVisible(), true,
      "The newer incompatible fishing plan should show no-results guidance.");
    await page.waitForTimeout(1700);
    assert.equal(delayedRouteStarted, true, "The test did not delay an earlier route response.");
    assert.equal(await page.locator("#no-results").isVisible(), true,
      "A stale route response overwrote the newer no-results state.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0,
      "A stale route response repopulated cards after a newer no-results plan.");
    delayNextRoute = false;

    // Simulate a temporary route-service outage. Trip ideas must remain visible,
    // with clear labels that the route, distance filter and origin-based costs are unverified.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("bmwRoute:v3:")) localStorage.removeItem(key);
      }
    });
    // Use a compatible general search so the outage path actually attempts routes.
    await page.locator("#experience").selectOption({ label: "Any" });
    simulateRoutingOutage = true;
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert((await page.locator("#results-summary").innerText()).includes("routing service is temporarily unavailable"),
      "Routing outage did not produce the explicit fallback disclosure.");
    assert(await page.locator("#recommendations .trip-card").count() > 0,
      "Routing outage incorrectly left the user with no trip ideas.");
    assert((await page.locator(".trip-card").first().innerText()).includes("ROUTE NOT VERIFIED"),
      "Fallback card did not clearly label its route as unverified.");
    await page.locator('.trip-card button[data-action="view"]').first().click();
    assert((await page.locator("#trip-dialog").innerText()).includes("ROUTE STATUS: NOT VERIFIED"),
      "Fallback detail view falsely implies that the route was verified.");
    await page.locator("#trip-dialog .dialog-close").click();
    simulateRoutingOutage = false;

    // A nominally successful HTTP response with invalid route fields must not be trusted.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("bmwRoute:v3:")) localStorage.removeItem(key);
      }
    });
    simulateInvalidRouteResponse = true;
    await page.locator("#trip-form button[type=submit]").click();
    await waitForRouteResults();
    assert((await page.locator("#results-summary").innerText()).includes("routing service is temporarily unavailable"),
      "Malformed route data was treated as a verified route.");
    assert((await page.locator(".trip-card").first().innerText()).includes("ROUTE NOT VERIFIED"),
      "Malformed route data did not use the explicitly unverified fallback.");
    simulateInvalidRouteResponse = false;

    // Re-check the production page at a common phone viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#trip-form").waitFor();
    assert.equal(await page.locator("#fuel-price").inputValue(), "29.99", "Fuel price retained through Reset did not persist after reload.");
    assert.equal(await page.locator("#consumption").inputValue(), "8.1", "Fuel consumption retained through Reset did not persist after reload.");

    // Separately verify that user-edited fuel assumptions still persist when the user chooses to keep them.
    await page.locator("#fuel-price").fill("27.15");
    await page.locator("#fuel-price").dispatchEvent("change");
    await page.locator("#consumption").fill("6.5");
    await page.locator("#consumption").dispatchEvent("change");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#trip-form").waitFor();
    assert.equal(await page.locator("#fuel-price").inputValue(), "27.15", "Manual fuel price did not persist after reload.");
    assert.equal(await page.locator("#consumption").inputValue(), "6.5", "Manual fuel consumption did not persist after reload.");
    assert(await page.locator("#budget").isVisible(), "Budget input is not visible on mobile.");
    assert(await page.locator("#experience").isVisible(), "Weekend type selector is not visible on mobile.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Destination cards did not render on mobile.");
    const mobileLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    assert(mobileLayout.documentWidth <= mobileLayout.viewportWidth + 1,
      "Mobile layout has horizontal overflow: " + JSON.stringify(mobileLayout));

    // Exercise the standalone shoreline topography page with a deterministic API fixture.
    const explorerUrl = new URL("shoreline-explorer.html", process.env.BMW_BASE_URL || "http://127.0.0.1:4173/Build-My-Weekend/").toString();
    const explorerResponse = await page.goto(explorerUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    assert(explorerResponse && explorerResponse.ok(), "Shoreline Explorer page did not return a successful HTTP response.");
    await page.locator("#search-form").waitFor();
    await page.locator(".region-card").waitFor({ timeout: 10000 });
    assert((await page.locator(".region-card").innerText()).includes("False Bay"), "Shoreline Explorer did not render the region card.");
    assert((await page.locator("#bathymetry-status").innerText()).includes("not published yet"), "Missing bathymetry data did not fail closed with an explicit status.");
    assert.equal(await page.locator(".leaflet-control-layers").count(), 0, "An unavailable bathymetry dataset must not create a misleading map overlay control.");
    assert((await page.locator(".region-card").innerText()).includes("Yellowtail"), "Shoreline Explorer did not render the fish-habitat reference.");
    assert((await page.locator(".region-card").innerText()).includes("Fixture topography description."), "Shoreline Explorer did not render topography details.");
    await page.locator("#shoreline-length").fill("200");
    await page.locator("#search-form button[type=submit]").click();
    await page.locator("#status").getByText("No region matched", { exact: false }).waitFor({ state: "visible" });
    assert((await page.locator("#status").innerText()).includes("No region matched"), "Shoreline Explorer did not apply the shoreline-length filter.");

    // Supply a deterministic synthetic GeoJSON fixture to exercise the optional map layer.
    // This fixture exists only inside CI; production must still fail closed when no real data is published.
    await page.route("**/data/bathymetry/candidate-structure-zones.geojson", route => route.fulfill({
      status: 200,
      contentType: "application/geo+json",
      body: JSON.stringify({
        type: "FeatureCollection",
        metadata: { source_raster: "CI synthetic fixture only" },
        features: [{
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[
            [18.55,-34.12],[18.62,-34.12],[18.62,-34.08],[18.55,-34.08],[18.55,-34.12]
          ]]},
          properties: {
            feature_type: "potential_coastal_seabed_structure_zone",
            deepest_candidate_depth_m: 32,
            maximum_local_depth_difference_m: 7,
            verification_status: "bathymetry_derived_candidate_not_field_verified"
          }
        }]
      })
    }));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".region-card").waitFor({ timeout: 10000 });
    await page.locator(".leaflet-control-layers").waitFor({ timeout: 10000 });
    assert((await page.locator("#bathymetry-status").innerText()).includes("CI synthetic fixture only"),
      "Available GeoJSON source metadata was not shown in the bathymetry status.");
    assert.equal(await page.locator(".leaflet-control-layers").count(), 1,
      "A valid, region-matching candidate polygon did not produce an optional map overlay control.");
    assert.deepEqual(pageErrors, [], "Browser runtime errors were detected: " + pageErrors.join(" | "));
    assert.deepEqual(failedLocalAssets, [], "Local assets failed to load: " + failedLocalAssets.join(" | "));
    console.log("Browser journey smoke: PASS");
    console.log("Verified planner recovery, saved fuel settings, mobile layout and shoreline explorer map cards/filter interaction.");
    console.log("Verified invalid budget, group size, fuel and date rejection with recovery, clean default planner state after reload, successful weather rendering and failure fallback, stay-search focus, route hand-off, share-summary contents, recommendations, detail dialog, activity switching, camping preferences, no-results recovery and mobile layout.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
