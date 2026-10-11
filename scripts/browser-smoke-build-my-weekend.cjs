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

    await page.locator("#budget").fill("3000");
    await page.locator("#people").fill("4");
    await page.locator("#experience").selectOption({ label: "Fishing Away" });
    assert.equal(await page.locator("#fishing-controls").isVisible(), true, "Fishing controls did not appear.");
    await page.locator("#trip-form button[type=submit]").click();
    await page.locator("#results-summary").waitFor();
    assert((await page.locator("#results-summary").innerText()).includes("possible destination"), "Submitting the planner did not produce a results summary.");
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Fishing plan returned no destination cards.");

    await page.locator('#recommendations button[data-action="view"]').first().click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), true, "Destination detail dialog did not open.");
    assert((await page.locator("#dialog-content").innerText()).includes("DEMONSTRATION DATA"), "Destination detail is missing its demonstration-data warning.");
    assert((await page.locator("#dialog-content").innerText()).includes("Additional fuel to buy"), "Destination detail is missing the fuel breakdown.");
    await page.locator("#trip-dialog .dialog-close").click();
    assert.equal(await page.locator("#trip-dialog").evaluate(dialog => dialog.open), false, "Destination detail dialog did not close.");

    await page.locator("#experience").selectOption({ label: "Camping Away" });
    assert.equal(await page.locator("#camping-controls").isVisible(), true, "Camping preferences did not appear.");
    assert.equal(await page.locator("#fishing-controls").isVisible(), false, "Fishing controls remained visible after switching activity.");
    await page.locator("#camping-setup").selectOption("Glamping");
    await page.locator("#trip-form button[type=submit]").click();
    assert(await page.locator("#recommendations .trip-card").count() > 0, "Camping plan returned no destination cards.");

    assert.deepEqual(pageErrors, [], "Browser runtime errors were detected: " + pageErrors.join(" | "));
    assert.deepEqual(failedLocalAssets, [], "Local assets failed to load: " + failedLocalAssets.join(" | "));
    console.log("Browser journey smoke: PASS");
    console.log("Verified initial render, budget/group input, fishing controls, recommendations, detail dialog, fuel breakdown, activity switching and camping preferences.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
