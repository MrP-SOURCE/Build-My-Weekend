import fs from "node:fs";
import vm from "node:vm";

const root = "artifacts/build-my-weekend";
const html = fs.readFileSync(root + "/index.html", "utf8");
const app = fs.readFileSync(root + "/js/app.js", "utf8");
const fishing = fs.readFileSync(root + "/js/fishing.js", "utf8");
const accommodation = fs.readFileSync(root + "/js/accommodation.js", "utf8");
const camping = fs.readFileSync(root + "/js/camping.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idsFromHtml(source) {
  return [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
}

assert(app.includes('${money(cost.perPerson)} per person'), "Recommendation cards must show the typical cost per person before opening trip details.");
assert(app.includes("GLAMPING STAY PRICE NOT INCLUDED"), "Glamping recommendation cards and shared trip summaries must disclose that the property stay price is excluded.");
assert(app.includes("Glamping budget warning: the property-specific stay price is not included"), "Glamping trip details must disclose that the property stay price is excluded from the demo total.");

const ids = idsFromHtml(html);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(!duplicates.length, "Duplicate HTML ids: " + [...new Set(duplicates)].join(", "));

const requiredScripts = [
  '<script src="./js/fishing.js"></script>',
  '<script src="./js/accommodation.js"></script>',
  '<script src="./js/camping.js"></script>',
  '<script type="module" src="./js/app.js"></script>'
];
for (const scriptTag of requiredScripts) {
  assert(html.includes(scriptTag), "Missing required script tag: " + scriptTag);
}
assert(html.indexOf(requiredScripts[0]) < html.indexOf(requiredScripts[1]), "Fishing layer must load before accommodation layer.");
assert(html.indexOf(requiredScripts[1]) < html.indexOf(requiredScripts[2]), "Accommodation layer must load before camping layer.");
assert(html.indexOf(requiredScripts[2]) < html.indexOf(requiredScripts[3]), "Camping layer must load before app.js.");

for (const id of ["trip-form","experience","fishing-controls","fishing-style","target-species","spot-preference","fishing-priority","recommendations","trip-dialog","dialog-content"]) {
  assert(ids.includes(id), "Missing required HTML id: " + id);
}

for (const marker of [
  "function setupFishingControls()",
  "window.testHermanusCalculation",
  "window.testWeekendScenarios",
  "window.testFishingPriorities",
  "window.BMWAccommodation",
  "window.BMWFishing",
  "accommodationSummary(destination, settings)",
  'fishingStyle: settings.fishingStyle',
  '["fishingStyle", "fishing-style"]',
  'form.elements.experience.dispatchEvent(new Event("change"',
  "Check tide times",
  "wind swell forecast",
  "recent fishing reports",
  "Check permits and catch limits",
  "site:dffe.gov.za recreational fishing permit bag limits size limits South Africa",
  "site:gov.za recreational fishing regulations South Africa",
  "not live forecasts or verified fishing reports"
]) {
  assert(app.includes(marker), "Missing app integration marker: " + marker);
}

for (const marker of ["window.BMWFishing", "function bestSpot", "function destinationMatch"]) {
  assert(fishing.includes(marker), "Missing fishing layer marker: " + marker);
}

for (const marker of ["window.BMWAccommodation", "Booking.com", "Airbnb", "LekkeSlaap", "SafariNow", "SA-Venues", "Google Maps"]) {
  assert(accommodation.includes(marker), "Missing accommodation layer marker: " + marker);
}

for (const marker of ["window.BMWCamping", "function setupCampingControls", "function glampingLinks", "function glampingSummary", "function glampingProfiles", "function detailSummary", "function relevantSiteProfiles", "function profileFit", "Camp SA Directory", "Caravan & Outdoor Life", "CapeNature", "SANParks", "Booking.com", "Glamping Hub", "LekkeSlaap", "SafariNow"]) {
  assert(camping.includes(marker), "Missing camping/glamping layer marker: " + marker);
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fishing, context);
const fishingApi = context.window.BMWFishing;
assert(fishingApi && fishingApi.spots.length >= 15, "Fishing demo dataset is unexpectedly small.");
assert(fishingApi.bestSpot("hermanus", { fishingStyle: "Shore", targetSpecies: "Galjoen", spotPreference: "Let the app choose" }), "Hermanus fishing match failed.");
assert(!fishingApi.bestSpot("hermanus", { fishingStyle: "Freshwater", targetSpecies: "Any", spotPreference: "Let the app choose" }), "Unsupported freshwater style must not return a spot.");
assert(!fishingApi.bestSpot("hermanus", { fishingStyle: "Any", targetSpecies: "Other", spotPreference: "Let the app choose" }), "Unsupported species must not return a spot.");
assert(!fishingApi.bestSpot("hermanus", { fishingStyle: "Any", targetSpecies: "Any", spotPreference: "Reef" }), "Unsupported reef preference must not return a spot.");
assert(!fishingApi.bestSpot("hermanus", { fishingStyle: "Boat", targetSpecies: "Any", spotPreference: "Let the app choose" }), "Boat style must not return a shore spot.");
assert(fishingApi.bestSpot("hermanus", { fishingStyle: "Rock", targetSpecies: "Galjoen", spotPreference: "Rocks" }), "Supported rock preference should match.");


vm.runInContext(accommodation, context);
const accommodationApi = context.window.BMWAccommodation;
assert(accommodationApi && accommodationApi.TYPES.length === 9, "Accommodation type coverage changed.");
assert(accommodationApi.TYPES.includes("Glamping / Boutique outdoor stay"), "Glamping must be a first-class accommodation type.");
const glampingRank = accommodationApi.rank({ name: "Hermanus" }, { experience: "Camping Away", campingSetup: "Glamping" });
assert(glampingRank.preferred[0] === "Glamping / Boutique outdoor stay", "Glamping must rank first when selected as the camping setup.");
assert(glampingRank.note.includes("full stay price"), "Glamping ranking must remind users to confirm full stay price.");
const links = accommodationApi.links(
  { name: "Hermanus" },
  { people: 4, budget: 3000, depart: "2026-10-09", returnDate: "2026-10-11" }
);
assert(links.length === 6, "Accommodation source coverage changed.");
assert(links.every(link => /^https:\/\//.test(link.url)), "Accommodation link is not HTTPS.");

console.log("BUILD MY WEEKEND structural smoke test: PASS");
console.log("HTML ids:", ids.length);
console.log("Fishing demo spots:", fishingApi.spots.length);
console.log("Accommodation types:", accommodationApi.TYPES.length);
console.log("Glamping preference ranking: PASS");
console.log("Accommodation sources:", links.length);

vm.runInContext(camping, context);
const campingApi = context.window.BMWCamping;
assert(campingApi, "Camping layer did not expose its API.");
const campingSettings = { campingSetup: "Glamping", campingPower: "Required", campingAblutions: "Full", campingShade: "Shaded", campingTerrain: "Firm level", people: 4, budget: 3000, distance: 200, depart: "2026-10-09", returnDate: "2026-10-11" };
assert(campingApi.preferences(campingSettings).length === 5, "Camping preference coverage changed.");
assert(campingApi.advice(campingSettings).length >= 5, "Camping preferences should produce specific confirmation advice.");
const campsiteLinks = campingApi.sourceLinks({ name: "Hermanus" }, campingSettings);
assert(campsiteLinks.length === 9, "Camping source coverage changed.");
assert(campsiteLinks.some(link => link.name.includes("Booking.com campsites near this destination") && link.url.includes("site%3Abooking.com")),
  "Destination-targeted Booking.com campsite search is missing.");
assert(campsiteLinks.some(link => link.name.includes("SANParks campsites near this destination") && link.url.includes("site%3Asanparks.org")),
  "Destination-targeted SANParks campsite search is missing.");
assert(campsiteLinks.some(link => link.name.includes("CapeNature campsites near this destination") && link.url.includes("site%3Acapenature.co.za")),
  "Destination-targeted CapeNature campsite search is missing.");
assert(campsiteLinks.every(link => /^https:\/\//.test(link.url)), "Camping source link is not HTTPS.");
assert(campsiteLinks.some(link => link.url.includes(encodeURIComponent("R3000"))), "Campsite search does not include the current group budget.");
assert(campsiteLinks.some(link => link.url.includes(encodeURIComponent("200 km"))), "Campsite search does not include the current distance limit.");
assert(campsiteLinks.some(link => link.url.includes(encodeURIComponent("2026-10-09 to 2026-10-11"))), "Campsite search does not include the selected dates.");
assert(campsiteLinks.some(link => link.url.includes(encodeURIComponent("4 guests"))), "Campsite search does not include the group size.");
const glampingLinks = campingApi.glampingLinks({ name: "Hermanus" }, campingSettings);
assert(glampingLinks.length === 10, "Glamping source coverage changed.");
assert(glampingLinks.some(link => link.name.includes("Booking.com glamping near this destination") && link.url.includes("site%3Abooking.com")),
  "Destination-targeted Booking.com glamping search is missing.");
assert(glampingLinks.some(link => link.name.includes("Glamping Hub near this destination") && link.url.includes("site%3Aglampinghub.com")),
  "Destination-targeted Glamping Hub search is missing.");
assert(glampingLinks.every(link => /^https:\/\//.test(link.url)), "Glamping source link is not HTTPS.");
assert(glampingLinks.some(link => link.url.includes(encodeURIComponent("R3000"))), "Glamping search does not include the current budget.");
assert(glampingLinks.some(link => link.url.includes(encodeURIComponent("200 km"))), "Glamping search does not include the current distance limit.");
assert(campingApi.glampingProfiles({ name: "Hermanus" }).some(profile => profile.name === "AfriCamps at Stanford Hills"), "Hermanus glamping profile missing.");
assert(campingApi.glampingProfiles({ name: "No mapped destination" }).length === 0, "Glamping profiles should not be invented for unmapped destinations.");
const detail = campingApi.detailSummary({ name: "Hermanus" }, campingSettings);
assert(detail.includes("Glamping") && detail.includes("not a booking API") === false, "Camping detail summary missing selected setup guidance.");
console.log("Camping preferences:", campingApi.preferences(campingSettings).length);
console.log("Camping sources:", campsiteLinks.length);
console.log("Glamping sources:", glampingLinks.length);
console.log("Glamping profiles for Hermanus:", campingApi.glampingProfiles({ name: "Hermanus" }).length);

const appLogic = app.slice(0, app.indexOf('const form = document.querySelector("#trip-form");'));
assert(appLogic.length > 0, "Could not isolate planner logic for test execution.");
vm.runInContext(appLogic, context);
assert(context.window.testHermanusCalculation(), "Hermanus budget and fuel calculation failed.");
assert(context.window.testDateRangeValidation() === 6, "Trip date validation regression checks failed.");
assert(context.window.testSavedSettingsCoverage() === 22, "Saved preference coverage regression checks failed.");
assert(context.window.testSavedSettingsApplication() === 22, "Saved preference application regression checks failed.");
const restoreControlIds = [
  "fishing-style", "target-species", "spot-preference", "fishing-priority",
  "hiking-difficulty", "hiking-setting", "climbing-type", "climbing-level",
  "camping-setup", "camping-power", "camping-ablutions", "camping-shade",
  "camping-terrain"
];
for (const id of restoreControlIds) {
  assert(ids.includes(id), "Saved preference restore target is missing from HTML: " + id);
}
for (const name of ["budget", "people", "experience", "depart", "consumption", "fuelPrice", "fuelExisting", "return", "distance"]) {
  assert(html.includes('name="' + name + '"'), "Saved preference form field is missing from HTML: " + name);
}
assert(html.includes('name="distance"') && html.includes('value="200"'),
  "Saved preference distance restore option 200 km is missing.");

assert(context.window.testActivityPanelState() === 12, "Activity panel switching regression checks failed.");
const plannerScenarios = context.window.testWeekendScenarios();
assert(plannerScenarios.length >= 8, "Planner scenario coverage is unexpectedly small.");
assert(plannerScenarios.some(scenario => scenario.scenario.startsWith("Camping")), "Camping Away scenario is missing.");
const fishingPriorities = context.window.testFishingPriorities();
assert(fishingPriorities.length === 4, "Fishing priority coverage changed.");
console.log("Planner calculation tests: PASS");
console.log("Trip date validation cases: 6 PASS");
console.log("Saved preference save and restore mapping: 22 PASS");
console.log("Activity panel switching cases: 12 PASS");
console.log("Planner scenarios:", plannerScenarios.length);
console.log("Fishing priorities:", fishingPriorities.length);

