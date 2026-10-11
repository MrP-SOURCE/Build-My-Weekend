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
    await page.locator("#depart").fill("2020-01-01");
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), "true", "A past departure date was not rejected.");
    assert((await page.locator("#depart-error").innerText()).includes("today or a future"), "Departure-date validation message is missing.");
    await page.locator("#depart").fill(validDeparture);
    await page.locator("#trip-form button[type=submit]").click();
    assert.equal(await page.locator("#depart").getAttribute("aria-invalid"), null, "A valid departure date did not clear the validation error.");

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("4");
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Fishing controls did not appear.");
    await page.locator("#trip-form button[type=submit]").click();
    await page.locator("#results-summary").waitFor();
    assert((await page.locator("#results-summary").innerText()).includes("possible destination"), "Submitting the planner did not produce a results summary.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Fishing plan returned no destination cards.");

    // Simulate the live forecast provider being unreachable and verify the safe fallback.
    await page.route("https://api.open-meteo.com/**", route => route.abort());
    await page.locator('#recommendations button[data-action="view"]').first().click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), true, "Destination detail dialog did not open.");
    assert((await page.locator("#dialog-content").innerText()).includes("DEMONSTRATION DATA"), "Destination detail is missing its demonstration-data warning.");
    assert((await page.locator("#dialog-content").innerText()).includes("Additional fuel to buy"), "Destination detail is missing the fuel breakdown.");
    await page.locator("#live-weather").getByText("LIVE WEATHER TEMPORARILY UNAVAILABLE").waitFor({ timeout: 10000 });
    assert((await page.locator("#live-weather").innerText()).includes("Check an official weather service"), "Weather failure did not show safe fallback guidance.");
    await page.locator("#trip-dialog .dialog-close").click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), false, "Destination detail dialog did not close.");

    await page.locator("#experience").selectOption({ label: "Camping Away" });
    assert.equal(await page.locator("#camping-controls").isVisible(), true, "Camping preferences did not appear.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing controls remained visible after switching activity.");
    await page.locator("#camping-setup").selectOption("Glamping");
    await page.locator("#trip-form button[type=submit]").click();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Camping plan returned no destination cards.");

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
    console.log("Verified invalid input rejection, weather-provider failure fallback, initial render, fishing controls, recommendations, detail dialog, fuel breakdown, activity switching, camping preferences and mobile layout.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
