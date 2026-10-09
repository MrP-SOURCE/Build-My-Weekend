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
  'form.elements.experience.dispatchEvent(new Event("change"'
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
assert(accommodationApi && accommodationApi.TYPES.length === 8, "Accommodation type coverage changed.");
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
console.log("Accommodation sources:", links.length);

vm.runInContext(camping, context);
const campingApi = context.window.BMWCamping;
assert(campingApi, "Camping layer did not expose its API.");
const campingSettings = { campingSetup: "Glamping", campingPower: "Required", campingAblutions: "Full", campingShade: "Shaded", campingTerrain: "Firm level", people: 4, budget: 3000, distance: 200, depart: "2026-10-09", returnDate: "2026-10-11" };
assert(campingApi.preferences(campingSettings).length === 5, "Camping preference coverage changed.");
assert(campingApi.advice(campingSettings).length >= 5, "Camping preferences should produce specific confirmation advice.");
const campsiteLinks = campingApi.sourceLinks({ name: "Hermanus" }, campingSettings);
assert(campsiteLinks.length === 6, "Camping source coverage changed.");
assert(campsiteLinks.every(link => /^https:\/\//.test(link.url)), "Camping source link is not HTTPS.");
const glampingLinks = campingApi.glampingLinks({ name: "Hermanus" }, campingSettings);
assert(glampingLinks.length === 8, "Glamping source coverage changed.");
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
