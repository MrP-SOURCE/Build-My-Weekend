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

assert(app.includes("No destination matches all your current filters (weekend type, distance and budget)."), "No-results guidance must describe the combined filters accurately.");
assert(app.includes("choosing a broader weekend type"), "No-results guidance must suggest practical ways to recover.");
assert(app.includes("estimated new spend ${money(cost.spend)}"), "Shared trip summary must label the budget figure as estimated new spend.");
assert(app.includes("This subtracts fuel already in the vehicle from the amount still to buy"), "Shared trip summary must explain how existing fuel affects the estimate.");
assert((app.match(/budgetRangeWarning\(cost, settings, campingSelected, glampingSelected\)/g) || []).length >= 2, "Upper-range budget warnings must appear on recommendation cards and trip details.");
assert(app.includes("ESTIMATED NEW SPEND · ${settings.people}"), "Recommendation cards must label the budget figure as estimated new spend.");
assert(app.includes("Fuel already in the vehicle is treated as already paid"), "Trip details must explain how existing fuel affects the cash budget estimate.");
assert(app.includes('data-action="availability" data-testid="availability-button">FIND STAY OPTIONS</button>') && app.includes("staySearches.scrollIntoView") && app.includes("firstSearch.focus"), "Find Stay Options must focus accommodation search links rather than imply live availability.");
assert(app.includes("UPPER DEMONSTRATION ESTIMATE") && app.includes("UPPER BASE ESTIMATE") && app.includes("shareText(destination, settings)"), "Shared trip summaries must disclose upper-range budget overruns.");
assert(app.includes("TYPICAL LEFT IN BUDGET") && app.includes("typical amount left in the group budget"), "Budget remainder labels must identify typical estimates rather than guaranteed leftovers.");
assert(app.includes('${money(cost.perPerson)} per person'), "Recommendation cards must show the typical cost per person before opening trip details.");
assert(app.includes("two-night weekend per person"), "Cost estimates must disclose their two-night baseline and scale with the selected duration.");
assert(app.includes("day trip") && app.includes("accommodationMultiplier = nights / 2"), "Same-day trips must be identified as day trips and exclude overnight accommodation cost.");
assert(app.includes("GLAMPING STAY PRICE NOT INCLUDED"), "Glamping recommendation cards and shared trip summaries must disclose that the property stay price is excluded.");
assert(app.includes("LEFT BEFORE GLAMPING STAY"), "Glamping recommendation cards must not present the pre-accommodation remainder as confirmed money left in budget.");
assert(app.includes("LEFT BEFORE CAMPSITE FEE"), "Ordinary camping cards must label the remaining budget as before the campsite fee.");
assert(app.includes('const nearRole = stayFeeExcluded ? "CLOSEST BASE-ESTIMATE FIT" : "CLOSEST AFFORDABLE"'), "Camping recommendations must not imply confirmed affordability when site fees are excluded.");
assert(app.includes('const farRole = stayFeeExcluded ? "FURTHEST BASE-ESTIMATE FIT" : "FURTHEST AFFORDABLE"'), "Camping distance-role labels must disclose they are based on estimates before site fees.");
assert(app.includes("buildShortlist(candidates, settings)"), "Shortlist ranking must receive the selected experience to apply camping-specific affordability labels.");
assert(app.includes("Typical budget remaining before campsite/site fee"), "Camping detail breakdown must label budget remaining before campsite fees.");
assert(app.includes("Typical budget remaining before glamping stay price"), "Glamping detail breakdown must label budget remaining before the stay price.");
assert(app.includes("CAMPSITE/SITE FEE NOT VERIFIED OR INCLUDED"), "Shared camping trip must disclose unverified campsite/site fees.");
assert(app.includes("Generic accommodation allowance · campsite fee not verified"), "Camping detail cost rows must not imply the accommodation amount is a verified campsite tariff.");
assert(app.includes("CAMPSITE FEE NOT VERIFIED"), "Ordinary camping spend must disclose that the campsite fee is not verified.");
assert(camping.includes("generic demonstration accommodation allowance, not a verified campsite tariff"), "Camping summary must disclose the generic accommodation estimate and unverified campsite tariff.");
assert(camping.includes("displayed remainder is only the amount left before the campsite fee"), "Camping summary must not imply confirmed affordability before the campsite fee.");
assert(camping.includes("displayed remainder is not confirmed money left after accommodation"), "Glamping detail guidance must explicitly distinguish the base estimate from verified affordability.");
assert(app.includes("Glamping budget warning: the property-specific stay price is not included"), "Glamping trip details must disclose that the property stay price is excluded from the demo total.");

const ids = idsFromHtml(html);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(!duplicates.length, "Duplicate HTML ids: " + [...new Set(duplicates)].join(", "));

const formControls = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)];
for (const match of formControls) {
  const tag = match[1].toLowerCase();
  const attrs = match[2];
  const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
  if (type === "hidden") continue;
  if (type === "radio") {
    const before = html.slice(Math.max(0, match.index - 100), match.index);
    const after = html.slice(match.index, match.index + match[0].length + 180);
    assert(before.lastIndexOf("<label") > before.lastIndexOf("</label>") && after.includes("</label>"), "Radio option must be wrapped by an accessible label.");
    continue;
  }
  const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
  assert(id, tag + " control must have an id.");
  const hasLabel = html.includes('for="' + id + '"') || html.includes("for='" + id + "'");
  const hasAriaLabel = /\baria-label=["'][^"']+["']/i.test(attrs);
  assert(hasLabel || hasAriaLabel, "Form control needs a programmatic label: " + id);
}
assert(/role=["']radiogroup["'][^>]*aria-label=["'][^"']+["']/.test(html), "Distance radio group must have an accessible group label.");

const linkSource = (html + "\n" + app + "\n" + accommodation + "\n" + camping).replace(/\\(["'])/g, "$1");
const anchors = [...linkSource.matchAll(/<a\b[^>]*>/gi)].map(match => match[0]);
assert(!anchors.some(anchor => /href=["']\s*javascript:/i.test(anchor)), "Anchor markup must not use javascript: URLs.");
for (const anchor of anchors) {
  if (/target=["']_blank["']/i.test(anchor)) {
    const rel = anchor.match(/\brel=["']([^"']+)["']/i)?.[1] || "";
    assert(/\bnoopener\b/i.test(rel) && /\bnoreferrer\b/i.test(rel), "New-tab external links must include rel=noopener noreferrer: " + anchor);
  }
}

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
  "no matching destination returned for this regression scenario",
  'scenario.experience === "Hiking Away" && candidates.some(item => !item.categories.includes("Hiking"))',
  'scenario.experience === "Cycling Away" && candidates.some(item => !item.categories.includes("Cycling"))',
  'scenario.experience === "Climbing Away" && candidates.some(item => !item.categories.includes("Climbing"))',
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
  "not live forecasts, verified reports or confirmation of current rules",
  "CONFIRM BEFORE DEPARTURE",
  "Confirm public access, parking, opening hours and whether fishing is permitted",
  "species-specific size, bag and seasonal limits",
  "not a live safety assessment or legal confirmation"
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
assert(links.every(link => decodeURIComponent(link.url).includes("Hermanus")), "Accommodation links must retain the selected destination.");
const bookingLink = links.find(link => link.name === "Booking.com").url;
assert(bookingLink.includes("checkin=2026-10-09") && bookingLink.includes("checkout=2026-10-11"), "Booking.com search must retain selected dates.");
assert(bookingLink.includes("group_adults=4"), "Booking.com search must retain group size.");
const airbnbLink = links.find(link => link.name === "Airbnb").url;
assert(airbnbLink.includes("adults=4") && airbnbLink.includes("checkin=2026-10-09") && airbnbLink.includes("checkout=2026-10-11"), "Airbnb search must retain group size and selected dates.");

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
const smallGroupGlamping = campingApi.glampingSummary({ name: "Hermanus" }, { ...campingSettings, people: 4 });
assert(smallGroupGlamping.includes("CHECK PRICE & ROUTE"), "Glamping profiles should show route and price verification for a group within the listed tent capacity.");
const largeGroupGlamping = campingApi.glampingSummary({ name: "Hermanus" }, { ...campingSettings, people: 6 });
assert(largeGroupGlamping.includes("GROUP SIZE EXCEEDS LISTED TENT CAPACITY"), "Glamping profile must warn when group size exceeds the listed five-person tent capacity.");
assert(largeGroupGlamping.includes("maximum of five guests per tent"), "Glamping capacity warning must explain the published limit.");
assert(largeGroupGlamping.includes("extra cost is not included"), "Glamping capacity warning must disclose that additional accommodation cost is not included.");
const unmappedGlamping = campingApi.glampingSummary({ name: "No mapped destination" }, campingSettings);
assert(unmappedGlamping.includes("No individually curated glamping property is currently mapped"), "Unmapped destinations must not imply a curated property match.");
const glampingSearchText = campingApi.glampingLinks({ name: "Hermanus" }, campingSettings).map(link => link.url).join(" ");
assert(glampingSearchText.includes(encodeURIComponent("4 guests")), "Glamping searches must include selected group size.");
assert(glampingSearchText.includes(encodeURIComponent("2026-10-09 to 2026-10-11")), "Glamping searches must include selected dates.");
assert(glampingSearchText.includes(encodeURIComponent("total weekend group budget R3000")), "Glamping searches must include total group budget.");
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
assert(context.window.testTripDurationCostScaling(), "Trip duration cost scaling regression checks failed.");
assert(context.window.testFuelAndGroupScaling(), "Fuel and group-size cost regression checks failed.");
assert(context.window.testCostEstimateIntegrity() > 0, "Cost estimate integrity checks failed.");
assert(context.window.testDestinationDataIntegrity() > 0, "Destination data integrity checks failed.");
assert(context.window.testDestinationSafetyNoteCoverage() > 0, "Destination safety note coverage checks failed.");
assert(context.window.testLocalSafetySearchLinks(), "Local safety map-search link checks failed.");
assert(context.window.testDirectionsUrl(), "Google Maps driving directions regression checks failed.");
assert(context.window.testShareSummaryIncludesStayLinks(), "Shared stay-search link regression checks failed.");
console.log("Destination safety note coverage:", context.window.testDestinationSafetyNoteCoverage());
console.log("Destination data integrity records:", context.window.testDestinationDataIntegrity());
console.log("Cost estimate integrity scenarios:", context.window.testCostEstimateIntegrity());
assert(context.window.testBudgetRangeDisclosure(), "Budget range disclosure regression checks failed.");
console.log("Budget range disclosure regression checks: PASS");
console.log("Fuel and group-size scaling regression checks: PASS");
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

assert(context.window.testActivityPanelState() === 13, "Activity panel switching regression checks failed.");
const plannerScenarios = context.window.testWeekendScenarios();
assert(plannerScenarios.length >= 8, "Planner scenario coverage is unexpectedly small.");
assert(plannerScenarios.some(scenario => scenario.scenario.startsWith("Camping")), "Camping Away scenario is missing.");
assert(plannerScenarios.some(scenario => scenario.scenario.startsWith("Cycling")), "Cycling Away scenario is missing.");
for (const prefix of ["Wildlife", "Couples", "Road trip"]) assert(plannerScenarios.some(scenario => scenario.scenario.startsWith(prefix)), prefix + " scenario is missing.");
assert(plannerScenarios.length >= 11, "Activity-category regression coverage is unexpectedly small.");
const fishingPriorities = context.window.testFishingPriorities();
assert(fishingPriorities.length === 4, "Fishing priority coverage changed.");
console.log("Planner calculation tests: PASS");
console.log("Trip date validation cases: 6 PASS");
console.log("Saved preference save and restore mapping: 22 PASS");
console.log("Activity panel switching cases: 12 PASS");
console.log("Planner scenarios:", plannerScenarios.length);
console.log("Fishing priorities:", fishingPriorities.length);


assert(html.includes('data-testid="evidence-legend"'), "Results must show the evidence-status legend.");
for (const marker of ["ESTIMATE", "LIVE FORECAST", "VERIFY BEFORE BOOKING", "not a marine forecast or safety warning", "must be confirmed with the relevant provider or authority"]) {
  assert(html.includes(marker), "Evidence-status legend is missing: " + marker);
}

const destinationIds = new Set(vm.runInContext("destinations.map(destination => destination.id)", context));
const unmatchedFishingDestinations = fishingApi.spots
  .filter(spot => !destinationIds.has(spot.destinationId))
  .map(spot => spot.destinationId);
assert(unmatchedFishingDestinations.length === 0,
  "Fishing spots refer to missing destination IDs: " + [...new Set(unmatchedFishingDestinations)].join(", "));
assert(fishingApi.bestSpot("gordon-s-bay", { fishingStyle: "Shore", targetSpecies: "Galjoen", spotPreference: "Let the app choose" }),
  "Gordon's Bay fishing match failed.");
assert(fishingApi.bestSpot("betty-s-bay", { fishingStyle: "Shore", targetSpecies: "Galjoen", spotPreference: "Let the app choose" }),
  "Betty's Bay fishing match failed.");
console.log("Fishing destination ID integrity: PASS");
