const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  const failedLocalAssets = [];

  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    if (new URL(request.url()).origin === new URL(process.env.BMW_BASE_URL).origin) {
      failedLocalAssets.push(request.url() + " — " + (request.failure()?.errorText || "request failed"));
    }
  });

  try {
    const baseUrl = process.env.BMW_BASE_URL || "http://127.0.0.1:4173/Build-My-Weekend/";
    const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    assert(response && response.ok(), "Planner page did not return a successful HTTP response.");
    await page.locator("#trip-form").waitFor();
    const originScope = page.locator('.origin-scope-note');
    assert(await originScope.isVisible(), "Cape Town pilot origin limitation is not visible before planning.");
    assert((await originScope.innerText()).includes("cannot yet be changed"), "Origin disclosure does not explain that other departure areas are unsupported.");
    assert((await page.title()).includes("Build My Weekend"), "Unexpected page title.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Initial destination cards did not render.");

    // Reject invalid inputs in the real browser before producing a plan.
    await page.locator("#budget").fill("0");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#budget").getAttribute("aria-invalid"), "true", "Zero budget was not rejected.");
    assert((await page.locator("#budget-error").innerText()).includes("greater than R0"), "Budget validation message is missing.");

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("11");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#people").getAttribute("aria-invalid"), "true", "Group size above 10 was not rejected.");
    assert((await page.locator("#people-error").innerText()).includes("between 1 and 10"), "Group-size validation message is missing.");

    await page.locator("#people").fill("4");
    await page.locator("#consumption").fill("0");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#consumption").getAttribute("aria-invalid"), "true", "Zero fuel consumption was not rejected.");
    assert((await page.locator("#consumption-error").innerText()).includes("greater than 0"), "Fuel-consumption validation message is missing.");

    await page.locator("#consumption").fill("8");
    const validDeparture = await page.locator("#depart").inputValue();
    const validReturn = await page.locator("#return").inputValue();
    await page.locator("#depart").fill("2020-01-01");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), "true", "A past departure date was not rejected.");
    assert((await page.locator("#depart-error").innerText()).includes("today or a future"), "Departure-date validation message is missing.");
    await page.locator("#depart").fill(validDeparture);
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), null, "A valid departure date did not clear the validation error.");

    // Reject a return date earlier than departure, then recover when the dates are corrected.
    const invalidReturn = new Date(validDeparture + "T12:00:00Z");
    invalidReturn.setUTCDate(invalidReturn.getUTCDate() - 1);
    await page.locator("#return").fill(invalidReturn.toISOString().slice(0, 10));
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#return").getAttribute("aria-invalid"), "true", "A return date before departure was not rejected.");
    assert((await page.locator("#return-error").innerText()).includes("on or after departure"), "Return-date validation message is missing.");
    await page.locator("#return").fill(validReturn);
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#return").getAttribute("aria-invalid"), null, "A valid return date did not clear the validation error.");

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("4");
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Fishing controls did not appear.");
    await page.locator("#trip-form button[type=submit]").click();
    await page.locator("#results-summary").waitFor();
    assert((await page.locator("#results-summary").innerText()).includes("possible destination"), "Submitting the planner did not produce a results summary.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Fishing plan returned no destination cards.");

    // Confirm that a successful plan persists the user's planner preferences across reloads.
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#budget").inputValue(), "3000", "Budget preference was not restored after reload.");
    assert.equal(await page.locator("#people").inputValue(), "4", "Group size was not restored after reload.");
    assert.equal(await page.locator("#experience").inputValue(), "Fishing Away", "Weekend type was not restored after reload.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Restored fishing preference did not restore its controls.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Restored planner settings did not produce destination cards.");

    // Incompatible fishing requirements must not fall back to a misleading spot.
    await page.locator("#fishing-style").selectOption("Estuary");
    await page.locator("#target-species").selectOption("Galjoen");
    await page.locator("#spot-preference").selectOption("River Mouth");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#no-results").isVisible(), true,
      "An incompatible estuary + Galjoen + river-mouth request did not explain that no matching destination exists.");
    assert.equal(await page.locator("#recommendations .trip-card").count(), 0,
      "Fishing planner returned destinations that do not meet all selected fishing requirements.");

    await page.locator("#fishing-style").selectOption("Any");
    await page.locator("#target-species").selectOption("Any");
    await page.locator("#spot-preference").selectOption("Let the app choose");
    await page.locator("#trip-form button[type=submit]").click();
    assert(await page.locator("#recommendations .trip-card").count() > 0,
      "Fishing planner did not recover after clearing incompatible requirements.");

    // Use a deterministic forecast fixture to test the successful weather-rendering path.
    const forecastDates = [...new Set([
      await page.locator("#depart").inputValue(),
      await page.locator("#return").inputValue()
    ])];
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
    await page.locator('#recommendations button[data-action="view"]').first().click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), true, "Destination detail dialog did not open.");
    assert((await page.locator("#dialog-content").innerText()).includes("DEMONSTRATION DATA"), "Destination detail is missing its demonstration-data warning.");
    assert((await page.locator("#dialog-content").innerText()).includes("Additional fuel to buy"), "Destination detail is missing the fuel breakdown.");
    assert((await page.locator("#dialog-content").innerText()).includes("km one way from Cape Town"), "Destination detail does not disclose the Cape Town basis for distance.");
    await page.locator("#live-weather .weather-day").first().waitFor({ timeout: 10000 });
    assert((await page.locator("#live-weather").innerText()).includes("Mainly clear / partly cloudy"), "Successful weather data was not rendered.");
    assert((await page.locator("#live-weather").innerText()).includes("Open-Meteo"), "Rendered weather is missing its source attribution.");

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
    assert(sharedPayload.text.includes("DRIVING ROUTE FROM CAPE TOWN"), "Shared trip summary is missing its declared Cape Town departure origin.");
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

    await page.locator("#experience").selectOption({ label: "Camping Away" });
    assert.equal(await page.locator("#camping-controls").isVisible(), true, "Camping preferences did not appear.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing controls remained visible after switching activity.");
    await page.locator("#camping-setup").selectOption("Glamping");
    await page.locator("#trip-form button[type=submit]").click();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Camping plan returned no destination cards.");

    // Verify specialist outdoor controls appear only for relevant trip types.
    await page.locator("#experience").selectOption({ label: "Hiking Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), true, "Hiking preferences did not appear.");
    await page.locator("#hiking-difficulty").selectOption("Easy");
    await page.locator("#trip-form button[type=submit]").click();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Hiking plan returned no destination cards.");
    await page.locator("#experience").selectOption({ label: "Climbing Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), true, "Climbing preferences did not appear.");
    await page.locator("#experience").selectOption({ label: "Family Away" });
    assert.equal(await page.locator("#outdoor-controls").isVisible(), false, "Outdoor specialist controls remained visible for Family Away.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing specialist controls remained visible for Family Away.");

    // Verify a restrictive search explains no matches and the recovery action widens the search.
    await page.locator("#budget").fill("3000");
    await page.locator("#experience").selectOption({ label: "Wildlife Away" });
    await page.locator('label:has(input[name="distance"][value="100"]) span').click();
    assert.equal(await page.locator('input[name="distance"][value="100"]').isChecked(), true, "The 100 km distance filter was not selected.");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#no-results").isVisible(), true, "An impossible activity/distance combination did not show the no-results guidance.");
    await page.locator("#reset-filters").click();
    assert.equal(await page.locator("#experience").inputValue(), "Any", "Widen the Search did not reset the activity filter.");
    assert.equal(await page.locator('input[name="distance"][value="any"]').isChecked(), true, "Widen the Search did not clear the distance limit.");
    assert.equal(await page.locator("#no-results").isVisible(), false, "Widen the Search did not restore available destination cards.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Widen the Search returned no destination cards.");

    // Re-check the production page at a common phone viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#trip-form").waitFor();
    assert(await page.locator("#budget").isVisible(), "Budget input is not visible on mobile.");
    assert(await page.locator("#experience").isVisible(), "Weekend type selector is not visible on mobile.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Destination cards did not render on mobile.");
    const mobileLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    assert(mobileLayout.documentWidth <= mobileLayout.viewportWidth + 1,
      "Mobile layout has horizontal overflow: " + JSON.stringify(mobileLayout));

    assert.deepEqual(pageErrors, [], "Browser runtime errors were detected: " + pageErrors.join(" | "));
    assert.deepEqual(failedLocalAssets, [], "Local assets failed to load: " + failedLocalAssets.join(" | "));
    console.log("Browser journey smoke: PASS");
    console.log("Verified invalid budget, group size, fuel and date rejection with recovery, saved planner preferences after reload, successful weather rendering and failure fallback, stay-search focus, route hand-off, share-summary contents, recommendations, detail dialog, activity switching, camping preferences, no-results recovery and mobile layout.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
