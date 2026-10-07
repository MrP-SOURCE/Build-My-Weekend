const palettes = [
  ["#d6dfcf", "#879a79", "#54715e"], ["#ded8b7", "#9a9a6d", "#64785b"],
  ["#dbd9bd", "#a8a88d", "#677e78"], ["#d8d9bd", "#9c9b70", "#58746b"],
  ["#d3d9bf", "#879c84", "#506e60"], ["#e4d7ad", "#a6a06b", "#788866"]
];

function makeDestination(data, index) {
  const [accommodationLow, accommodationTypical, accommodationHigh] = data.accommodation;
  const [foodLow, foodTypical, foodHigh] = data.food;
  const [activitiesLow, activitiesTypical, activitiesHigh] = data.activities;
  const peopleLabels = {
    Beach: "beach lovers", Fishing: "anglers", Hiking: "walkers",
    Nature: "nature lovers", Camping: "campers", Outdoors: "outdoor enthusiasts",
    Family: "families", Couples: "couples", Wildlife: "wildlife watchers",
    "Road Trip": "self-drive travellers"
  };
  const remoteNotes = data.remote
    ? {
        hospitalAccess: "Emergency care may require travel to a larger town. Facilities, availability and travel times are not verified; check official sources before leaving.",
        pharmacyAccess: "Pharmacy options may be limited. Locations and opening hours are not verified; check locally and bring prescribed medication.",
        fuelAccess: "Fuel stops may be widely spaced. Station locations and hours are not verified; refuel in a larger town before heading into remote areas."
      }
    : {
        hospitalAccess: "Medical facilities may be available in the surrounding town. Names, availability and travel times are not verified; check official sources.",
        pharmacyAccess: "Pharmacy availability and opening hours are not verified; confirm locally before relying on access.",
        fuelAccess: "Fuel may be available in the surrounding town. Station locations and opening hours are not verified; confirm before travel."
      };

  return {
    id: slug(data.name),
    name: data.name,
    province: "Western Cape",
    region: data.region,
    categories: data.categories,
    distance: data.distance,
    driveTime: data.driveTime,
    accommodationLow,
    accommodationTypical,
    accommodationHigh,
    foodLow,
    foodTypical,
    foodHigh,
    activitiesLow,
    activitiesTypical,
    activitiesHigh,
    description: data.description,
    suitableFor: [...new Set(data.categories.map(category => peopleLabels[category]).filter(Boolean))],
    practicalInfo: data.practicalInfo,
    ...remoteNotes,
    activityIdeas: data.activityIdeas,
    weekendIdea: data.weekendIdea,
    colors: palettes[index % palettes.length],
    itinerary: [
      ["FRI 15:00", `Illustrative departure from Cape Town toward ${data.name}; allow time for stops.`],
      ["SAT 09:00", `A relaxed day for ${data.weekendIdea}.`],
      ["SUN 10:00", "Enjoy a final local stop, then allow time for the return drive."]
    ]
  };
}

// All cost ranges are demonstration estimates per person for a weekend stay.
// Distances and drive times are illustrative one-way estimates from Cape Town.
const destinations = [
  makeDestination({
    name: "Hermanus", region: "Overberg", distance: 120, driveTime: 108,
    categories: ["Beach", "Fishing", "Nature", "Couples", "Family"],
    accommodation: [220, 262.5, 520], food: [120, 162.5, 300], activities: [20, 75, 200],
    description: "A coastal weekend with cliff paths, a working harbour and easy sea views.",
    practicalInfo: "Coastal weather can change quickly. Bring a warm layer and check conditions before cliff walks.",
    activityIdeas: ["Clifftop coastal path", "Old Harbour visit", "Harbour-side picnic"],
    weekendIdea: "a coastal walk, the Old Harbour and an unhurried seaside picnic"
  }, 0),
  makeDestination({
    name: "Gordon's Bay", region: "Cape Helderberg", distance: 60, driveTime: 54,
    categories: ["Beach", "Fishing", "Family", "Couples", "Road Trip"],
    accommodation: [230, 320, 600], food: [130, 200, 350], activities: [30, 80, 220],
    description: "A close coastal escape with a waterfront, mountain backdrop and beach time.",
    practicalInfo: "Weekend traffic can affect the coastal drive. Confirm local conditions and opening times.",
    activityIdeas: ["Beach time", "Harbour stroll", "Coastal viewpoint"],
    weekendIdea: "the beachfront, harbour and nearby coastal viewpoints"
  }, 1),
  makeDestination({
    name: "Betty's Bay", region: "Overberg coast", distance: 95, driveTime: 75,
    categories: ["Beach", "Nature", "Hiking", "Family", "Couples"],
    accommodation: [260, 350, 650], food: [140, 230, 380], activities: [30, 90, 240],
    description: "A quiet coastal base for sea air, fynbos scenery and short nature walks.",
    practicalInfo: "Some coastal areas are exposed to wind. Check local access rules before visiting nature sites.",
    activityIdeas: ["Coastal walk", "Fynbos viewpoints", "Rock-pool exploring"],
    weekendIdea: "a quiet beach walk, fynbos viewpoints and a slow picnic"
  }, 2),
  makeDestination({
    name: "Kleinmond", region: "Overberg coast", distance: 90, driveTime: 74,
    categories: ["Beach", "Nature", "Hiking", "Family", "Couples"],
    accommodation: [230, 300, 590], food: [130, 210, 350], activities: [30, 90, 240],
    description: "A laid-back seaside town with a lagoon, coastal paths and mountain scenery.",
    practicalInfo: "Check lagoon and beach conditions before swimming. Access and facilities are not verified.",
    activityIdeas: ["Lagoon-side stroll", "Beach walk", "Mountain-view picnic"],
    weekendIdea: "the lagoon, a coastal walk and a mountain-view picnic"
  }, 3),
  makeDestination({
    name: "Strand", region: "Cape Helderberg", distance: 50, driveTime: 45,
    categories: ["Beach", "Family", "Couples", "Fishing", "Road Trip"],
    accommodation: [160, 230, 500], food: [120, 180, 320], activities: [25, 70, 180],
    description: "A simple, close-to-home beach break with a long sandy shoreline.",
    practicalInfo: "Beach conditions, swimming safety and parking can vary. Check current local guidance.",
    activityIdeas: ["Long beach walk", "Seafront picnic", "Local café stop"],
    weekendIdea: "a long beach walk, a picnic and a relaxed seafront stop"
  }, 4),
  makeDestination({
    name: "Yzerfontein", region: "West Coast", distance: 115, driveTime: 90,
    categories: ["Beach", "Fishing", "Nature", "Couples", "Road Trip"],
    accommodation: [360, 470, 800], food: [170, 260, 450], activities: [40, 120, 300],
    description: "A West Coast village known for open beaches, salt air and slower days.",
    practicalInfo: "The coast can be windy and exposed. Confirm beach access and local conditions.",
    activityIdeas: ["Beach walk", "Village wander", "Sunset viewpoint"],
    weekendIdea: "a beach walk, a village wander and a quiet sunset stop"
  }, 5),
  makeDestination({
    name: "Paternoster", region: "West Coast", distance: 155, driveTime: 126,
    categories: ["Beach", "Fishing", "Family", "Couples", "Road Trip"],
    accommodation: [360, 520, 920], food: [190, 300, 520], activities: [40, 110, 320],
    description: "A small fishing village with white-sand beaches and a distinctive West Coast feel.",
    practicalInfo: "Coastal winds can be strong. Check tide and access conditions before beach walks.",
    activityIdeas: ["Village and harbour walk", "Beach time", "Cape Columbine viewpoint"],
    weekendIdea: "a village wander, the beach and a viewpoint along the coast"
  }, 0),
  makeDestination({
    name: "Langebaan", region: "West Coast", distance: 130, driveTime: 105,
    categories: ["Beach", "Fishing", "Family", "Nature", "Couples", "Road Trip"],
    accommodation: [360, 500, 880], food: [180, 280, 500], activities: [40, 120, 350],
    description: "A lagoon-side break with waterside walks, birdlife and open-sky scenery.",
    practicalInfo: "Water and park access can be seasonal. Confirm current conditions and entry details.",
    activityIdeas: ["Lagoon viewpoint", "Bird spotting", "Waterfront picnic"],
    weekendIdea: "lagoon viewpoints, bird spotting and an easy waterfront picnic"
  }, 1),
  makeDestination({
    name: "St Helena Bay", region: "West Coast", distance: 170, driveTime: 138,
    categories: ["Beach", "Fishing", "Family", "Couples", "Road Trip"],
    accommodation: [340, 460, 820], food: [170, 270, 460], activities: [30, 100, 300],
    description: "A relaxed bay-side destination for fishing-village scenery and quiet coast time.",
    practicalInfo: "Local services may be spread out. Confirm facility hours and fuel availability before travel.",
    activityIdeas: ["Harbour-side stroll", "Coastal lookout", "Beach picnic"],
    weekendIdea: "a harbour-side stroll, a coastal lookout and a beach picnic"
  }, 2),
  makeDestination({
    name: "Greyton", region: "Overberg", distance: 140, driveTime: 120,
    categories: ["Nature", "Hiking", "Camping", "Couples", "Family"],
    accommodation: [260, 340, 620], food: [130, 220, 370], activities: [30, 90, 250],
    description: "A village escape with mountain views, shady lanes and nearby walking routes.",
    practicalInfo: "Trail conditions can change. Check locally before setting out and carry water.",
    activityIdeas: ["Riverside walk", "Village lanes", "Oak-shaded picnic"],
    weekendIdea: "a riverside walk, a village wander and an oak-shaded picnic"
  }, 3),
  makeDestination({
    name: "Franschhoek", region: "Cape Winelands", distance: 75, driveTime: 68,
    categories: ["Nature", "Hiking", "Couples", "Family", "Road Trip"],
    accommodation: [420, 560, 980], food: [220, 340, 580], activities: [60, 160, 420],
    description: "A mountain-framed valley for scenic walks, village exploring and a slower weekend.",
    practicalInfo: "Popular weekends can be busy. Check trail access and book any paid activities directly.",
    activityIdeas: ["Village walk", "Mountain viewpoint", "Valley picnic"],
    weekendIdea: "a village walk, mountain scenery and a relaxed valley picnic"
  }, 4),
  makeDestination({
    name: "Stellenbosch", region: "Cape Winelands", distance: 52, driveTime: 48,
    categories: ["Nature", "Hiking", "Family", "Couples", "Road Trip"],
    accommodation: [350, 450, 780], food: [190, 300, 500], activities: [50, 150, 420],
    description: "A nearby Winelands base for oak-lined streets, gardens and mountain scenery.",
    practicalInfo: "Weekend traffic and venue hours vary. Verify opening times and any activity fees.",
    activityIdeas: ["Historic town walk", "Garden visit", "Mountain-view picnic"],
    weekendIdea: "a historic town walk, a garden visit and time outdoors"
  }, 5),
  makeDestination({
    name: "Ceres", region: "Cape Winelands", distance: 150, driveTime: 120,
    categories: ["Nature", "Hiking", "Family", "Camping", "Road Trip"],
    accommodation: [240, 320, 600], food: [130, 220, 370], activities: [25, 90, 260],
    description: "A mountain-ringed town with orchard-country scenery and outdoor options.",
    practicalInfo: "Mountain weather can shift quickly. Check road and trail conditions before departure.",
    activityIdeas: ["Town stroll", "Mountain viewpoint", "Orchard-country drive"],
    weekendIdea: "a town stroll, mountain views and a gentle country drive"
  }, 0),
  makeDestination({
    name: "Tulbagh", region: "Cape Winelands", distance: 125, driveTime: 105,
    categories: ["Nature", "Hiking", "Couples", "Family", "Road Trip"],
    accommodation: [260, 340, 620], food: [130, 220, 370], activities: [30, 90, 240],
    description: "A historic valley town surrounded by mountains and quiet country roads.",
    practicalInfo: "Confirm venue hours and mountain-route conditions locally. Costs shown are not quotes.",
    activityIdeas: ["Historic street walk", "Valley viewpoint", "Country picnic"],
    weekendIdea: "a historic street walk, valley scenery and a country picnic"
  }, 1),
  makeDestination({
    name: "Montagu", region: "Route 62", distance: 185, driveTime: 150,
    categories: ["Nature", "Hiking", "Couples", "Camping", "Road Trip"],
    accommodation: [320, 410, 750], food: [150, 250, 420], activities: [40, 120, 320],
    description: "A Route 62 stop with mountain backdrops, historic streets and outdoor time.",
    practicalInfo: "Hot days and changing trail conditions are possible. Carry water and check access locally.",
    activityIdeas: ["Historic town walk", "Mountain viewpoint", "Picnic in the valley"],
    weekendIdea: "a historic town walk, a mountain viewpoint and time outdoors"
  }, 2),
  makeDestination({
    name: "Grabouw", region: "Elgin Valley", distance: 70, driveTime: 62,
    categories: ["Nature", "Hiking", "Family", "Camping", "Road Trip"],
    accommodation: [230, 300, 560], food: [130, 220, 370], activities: [30, 90, 250],
    description: "A close valley getaway with forested slopes, farm scenery and outdoor stops.",
    practicalInfo: "Outdoor access and farm opening times vary. Verify details before setting out.",
    activityIdeas: ["Valley viewpoint", "Forest-edge walk", "Farm-country drive"],
    weekendIdea: "a valley viewpoint, an easy walk and a scenic country drive"
  }, 3),
  makeDestination({
    name: "Worcester", region: "Breede Valley", distance: 115, driveTime: 95,
    categories: ["Nature", "Family", "Fishing", "Road Trip", "Hiking"],
    accommodation: [210, 280, 540], food: [120, 210, 360], activities: [25, 80, 230],
    description: "A Breede Valley base for mountain views, local history and a low-key break.",
    practicalInfo: "Summer temperatures can be high. Check local conditions and carry water outdoors.",
    activityIdeas: ["Town heritage walk", "Valley viewpoint", "Riverside stop"],
    weekendIdea: "a heritage walk, valley views and a relaxed riverside stop"
  }, 4),
  makeDestination({
    name: "Beaverlac", region: "Cederberg", distance: 180, driveTime: 165,
    categories: ["Camping", "Outdoors", "Nature", "Hiking", "Couples"],
    accommodation: [160, 220, 450], food: [130, 180, 300], activities: [20, 70, 200],
    description: "A remote outdoors-focused escape with mountain scenery and swimming-hole appeal.",
    practicalInfo: "Remote access and facility rules are not verified. Confirm current conditions and pack essentials.",
    activityIdeas: ["Rock-pool time", "Mountain walk", "Camp-side picnic"],
    weekendIdea: "a mountain walk, time outdoors and a quiet camp-side evening",
    remote: true
  }, 5),
  makeDestination({
    name: "Algeria", region: "Cederberg", distance: 260, driveTime: 210,
    categories: ["Camping", "Outdoors", "Nature", "Hiking", "Road Trip"],
    accommodation: [160, 210, 440], food: [120, 190, 330], activities: [25, 70, 200],
    description: "A Cederberg base for rugged mountain landscapes and a slower camping weekend.",
    practicalInfo: "The area is remote. Verify access, weather, road conditions and required permits before leaving.",
    activityIdeas: ["Mountain scenery", "Short nature walk", "Camp-site stargazing"],
    weekendIdea: "mountain scenery, a short walk and an evening under the stars",
    remote: true
  }, 0),
  makeDestination({
    name: "Kogel Bay", region: "Cape Helderberg", distance: 70, driveTime: 62,
    categories: ["Camping", "Outdoors", "Beach", "Family", "Fishing"],
    accommodation: [150, 200, 430], food: [120, 180, 320], activities: [20, 70, 200],
    description: "A close-to-Cape-Town coastal camping idea with sea views and outdoor time.",
    practicalInfo: "Camping access, sea conditions and safety are not verified. Check official local guidance.",
    activityIdeas: ["Beach walk", "Coastal picnic", "Outdoor evening"],
    weekendIdea: "a beach walk, a picnic and a simple outdoors-focused weekend"
  }, 1),
  makeDestination({
    name: "Matjiesrivier", region: "Cederberg", distance: 250, driveTime: 210,
    categories: ["Camping", "Outdoors", "Nature", "Hiking", "Road Trip"],
    accommodation: [160, 220, 460], food: [130, 200, 340], activities: [25, 80, 220],
    description: "A remote Cederberg setting for open landscapes, quiet trails and camping.",
    practicalInfo: "Remote roads and access rules are not verified. Check conditions, supplies and permits in advance.",
    activityIdeas: ["Cederberg viewpoint", "Nature walk", "Quiet camp evening"],
    weekendIdea: "a Cederberg viewpoint, a gentle nature walk and a quiet camp evening",
    remote: true
  }, 2),
  makeDestination({
    name: "De Pakhuys", region: "Cederberg", distance: 250, driveTime: 210,
    categories: ["Camping", "Outdoors", "Nature", "Hiking", "Couples"],
    accommodation: [200, 260, 520], food: [140, 220, 380], activities: [30, 100, 280],
    description: "A Cederberg outdoors base for striking rock formations and hiking scenery.",
    practicalInfo: "Routes and access requirements are not verified. Confirm current conditions before travelling.",
    activityIdeas: ["Rock-form viewpoint", "Hiking route", "Camp-side rest"],
    weekendIdea: "a rock-form viewpoint, a walk and a relaxed camp-side afternoon",
    remote: true
  }, 3),
  makeDestination({
    name: "Witsand", region: "Breede River coast", distance: 290, driveTime: 235,
    categories: ["Camping", "Outdoors", "Beach", "Fishing", "Family", "Road Trip"],
    accommodation: [200, 260, 520], food: [140, 220, 380], activities: [30, 90, 250],
    description: "A quiet river-mouth and coast setting for fishing, beach time and outdoor breaks.",
    practicalInfo: "River, sea and fishing conditions are not verified. Check local safety guidance and access rules.",
    activityIdeas: ["River-mouth viewpoint", "Beach walk", "Fishing from permitted areas"],
    weekendIdea: "a river-mouth viewpoint, beach time and a relaxed fishing stop"
  }, 4),
  makeDestination({
    name: "Arniston", region: "Overberg coast", distance: 220, driveTime: 185,
    categories: ["Beach", "Fishing", "Family", "Couples", "Nature"],
    accommodation: [320, 420, 760], food: [160, 280, 470], activities: [30, 100, 280],
    description: "A small coastal village with white-sand scenery, fishing heritage and sea air.",
    practicalInfo: "Coastal weather and access can change. Keep to marked areas and check local guidance.",
    activityIdeas: ["Harbour-side walk", "Coastal viewpoint", "Beach picnic"],
    weekendIdea: "a harbour-side walk, a coastal viewpoint and a quiet beach picnic"
  }, 5),
  makeDestination({
    name: "Struisbaai", region: "Overberg coast", distance: 230, driveTime: 190,
    categories: ["Beach", "Fishing", "Family", "Couples", "Road Trip"],
    accommodation: [300, 400, 740], food: [160, 270, 460], activities: [40, 120, 300],
    description: "A southern coast break for long beaches, harbour scenes and fishing-village character.",
    practicalInfo: "Sea conditions are not verified. Confirm local guidance before swimming or fishing.",
    activityIdeas: ["Long beach walk", "Harbour visit", "Coastal picnic"],
    weekendIdea: "a long beach walk, a harbour visit and a coastal picnic"
  }, 0),
  makeDestination({
    name: "Breede River", region: "Overberg", distance: 240, driveTime: 195,
    categories: ["Fishing", "Camping", "Outdoors", "Family", "Nature"],
    accommodation: [220, 300, 580], food: [140, 220, 380], activities: [30, 100, 260],
    description: "A river-focused getaway for fishing, open-air meals and unhurried scenery.",
    practicalInfo: "River access, water conditions and fishing rules are not verified. Check current local guidance.",
    activityIdeas: ["Riverside picnic", "Fishing where permitted", "Easy nature walk"],
    weekendIdea: "a riverside picnic, fishing where permitted and a gentle walk"
  }, 1),
  makeDestination({
    name: "Paarl", region: "Cape Winelands", distance: 60, driveTime: 55,
    categories: ["Family", "Nature", "Hiking", "Couples", "Road Trip"],
    accommodation: [280, 360, 660], food: [160, 250, 420], activities: [40, 110, 320],
    description: "A nearby Winelands town with mountain views, heritage streets and outdoor stops.",
    practicalInfo: "Trail and venue access can vary. Check opening times and any fees in advance.",
    activityIdeas: ["Historic town walk", "Mountain viewpoint", "Park or garden stop"],
    weekendIdea: "a heritage walk, a mountain viewpoint and a relaxed garden stop"
  }, 2),
  makeDestination({
    name: "Oudtshoorn", region: "Klein Karoo", distance: 420, driveTime: 300,
    categories: ["Family", "Nature", "Wildlife", "Road Trip", "Couples"],
    accommodation: [350, 460, 820], food: [190, 320, 540], activities: [60, 190, 480],
    description: "A Klein Karoo road-trip stop with wide-open scenery and family-friendly outing ideas.",
    practicalInfo: "Long-distance driving needs rest stops. Confirm attraction hours, access and fees before leaving.",
    activityIdeas: ["Klein Karoo viewpoint", "Town heritage walk", "Local nature stop"],
    weekendIdea: "a Klein Karoo viewpoint, a heritage walk and a local nature stop",
    remote: true
  }, 3),
  makeDestination({
    name: "Mossel Bay", region: "Garden Route", distance: 390, driveTime: 270,
    categories: ["Family", "Beach", "Fishing", "Road Trip", "Nature"],
    accommodation: [330, 430, 780], food: [180, 300, 520], activities: [50, 160, 430],
    description: "A Garden Route coastal town with a harbour, beaches and history-focused outings.",
    practicalInfo: "This is a longer drive. Plan rest stops and check local beach and attraction information.",
    activityIdeas: ["Harbour promenade", "Coastal viewpoint", "Local history stop"],
    weekendIdea: "the harbour, a coastal viewpoint and a relaxed local-history stop"
  }, 4),
  makeDestination({
    name: "Wilderness", region: "Garden Route", distance: 445, driveTime: 315,
    categories: ["Family", "Beach", "Camping", "Hiking", "Nature", "Wildlife", "Couples"],
    accommodation: [320, 430, 780], food: [180, 300, 520], activities: [50, 160, 430],
    description: "A Garden Route base for beaches, forest scenery, lagoons and outdoor time.",
    practicalInfo: "Long-distance driving needs breaks. Trail, beach and lagoon conditions are not verified.",
    activityIdeas: ["Beach and boardwalk", "Forest-edge walk", "Lagoon viewpoint"],
    weekendIdea: "a beach walk, a forest-edge stroll and a lagoon viewpoint"
  }, 5)
];

const experienceProfiles = {
  "Any": [],
  "Surprise Me": [],
  "Fishing Away": ["Fishing"],
  "Hiking Away": ["Hiking", "Nature"],
  "Nature": ["Nature", "Hiking"],
  "Camping Away": ["Camping", "Outdoors"],
  "Family Away": ["Family"],
  "Couples Away": ["Couples", "Beach", "Nature"],
  "Beach Away": ["Beach"],
  "Wildlife Away": ["Wildlife", "Nature", "Family"],
  "Road Trip Away": ["Road Trip", "Outdoors", "Nature"]
};

const money = value => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 2
}).format(value);
const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
const esc = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function calc(destination, settings) {
  const returnDistance = destination.distance * 2;
  const litres = returnDistance * settings.consumption / 100;
  const consumed = round2(litres * settings.fuelPrice);
  const additional = round2(Math.max(0, consumed - settings.fuelExisting));
  const accommodation = round2(destination.accommodationTypical * settings.people);
  const food = round2(destination.foodTypical * settings.people);
  const activities = round2(destination.activitiesTypical * settings.people);
  const lowSpend = round2(
    additional +
    destination.accommodationLow * settings.people +
    destination.foodLow * settings.people +
    destination.activitiesLow * settings.people
  );
  const spend = round2(additional + accommodation + food + activities);
  const highSpend = round2(
    additional +
    destination.accommodationHigh * settings.people +
    destination.foodHigh * settings.people +
    destination.activitiesHigh * settings.people
  );
  return {
    returnDistance,
    litres: round2(litres),
    consumed,
    additional,
    accommodation,
    food,
    activities,
    lowSpend,
    spend,
    highSpend,
    remaining: round2(settings.budget - spend),
    perPerson: round2(spend / settings.people)
  };
}

function experienceRelevance(destination, experience) {
  const preferred = experienceProfiles[experience] || [];
  if (!preferred.length) return 0;
  let score = 0;
  preferred.forEach((category, index) => {
    if (destination.categories.includes(category)) score = Math.max(score, 3 - index);
  });
  return score;
}

function valueScore(destination, settings) {
  const budgetShareLeft = Math.max(0, destination.cost.remaining / settings.budget);
  const experienceFit = destination.experienceScore / 3;
  const distanceFit = 1 - Math.min(destination.distance, 500) / 500;
  return budgetShareLeft * 0.42 + experienceFit * 0.38 + distanceFit * 0.20;
}

function findCandidates(settings) {
  const distanceLimit = settings.distance === "any" ? Infinity : Number(settings.distance);
  return destinations
    .map(destination => {
      const cost = calc(destination, settings);
      const experienceScore = experienceRelevance(destination, settings.experience);
      const fishingScore = settings.experience === "Fishing Away" && window.BMWFishing
        ? window.BMWFishing.destinationMatch(destination.id, settings)
        : 0;
      const candidate = { ...destination, cost, experienceScore, fishingScore, fishingPriority: settings.fishingPriority };
      candidate.valueScore = valueScore(candidate, settings) + (settings.experience === "Fishing Away" ? fishingScore * 0.08 : 0);
      return candidate;
    })
    .filter(destination =>
      destination.cost.remaining >= 0 &&
      destination.distance <= distanceLimit &&
      (settings.experience !== "Fishing Away" || destination.fishingScore > 0)
    );
}

function sortBy(candidates, compare) {
  return [...candidates].sort(compare);
}

function buildShortlist(candidates) {
  if (!candidates.length) return [];
  const byValue = (a, b) => {
    if (candidates[0]?.fishingScore) {
      const priority = candidates[0].fishingPriority || "Best Overall Weekend";
      if (priority === "Best Fishing Opportunity" && b.fishingScore !== a.fishingScore) return b.fishingScore - a.fishingScore;
      if (priority === "Lowest Cost" && b.cost.spend !== a.cost.spend) return a.cost.spend - b.cost.spend;
      if (priority === "Shortest Drive" && b.distance !== a.distance) return a.distance - b.distance;
    }
    return b.valueScore - a.valueScore || a.cost.spend - b.cost.spend || a.distance - b.distance;
  };
  const byDistanceNear = (a, b) =>
    a.distance - b.distance || b.valueScore - a.valueScore;
  const byDistanceFar = (a, b) =>
    b.distance - a.distance || b.valueScore - a.valueScore;
  const roles = [
    ["CLOSEST AFFORDABLE", sortBy(candidates, byDistanceNear)[0]],
    ["BEST VALUE", sortBy(candidates, byValue)[0]],
    ["FURTHEST AFFORDABLE", sortBy(candidates, byDistanceFar)[0]],
    ["BEST EXPERIENCE MATCH", sortBy(candidates, (a, b) =>
      b.experienceScore - a.experienceScore || byValue(a, b)
    )[0]],
    ["LOWEST COST", sortBy(candidates, (a, b) =>
      a.cost.spend - b.cost.spend || a.distance - b.distance
    )[0]]
  ];
  const selected = new Map();
  for (const [role, destination] of roles) {
    if (!selected.has(destination.id)) selected.set(destination.id, { destination, badges: [] });
    selected.get(destination.id).badges.push(role);
  }

  // Fishing priority controls the primary shortlist order. Role badges still
  // expose useful alternatives, but they must not override the user's chosen
  // fishing decision criterion.
  const primary = settingsForShortlist(candidates);
  for (const destination of sortBy(candidates, primary)) {
    if (selected.size >= Math.min(5, candidates.length)) break;
    if (!selected.has(destination.id)) {
      selected.set(destination.id, { destination, badges: ["GOOD MATCH"] });
    }
  }
  return [...selected.values()];
}

function settingsForShortlist(candidates) {
  const first = candidates[0];
  if (!first?.fishingScore) {
    return (a, b) => b.valueScore - a.valueScore || a.cost.spend - b.cost.spend || a.distance - b.distance;
  }
  const priority = first.fishingPriority || "Best Overall Weekend";
  if (priority === "Best Fishing Opportunity") {
    return (a, b) => b.fishingScore - a.fishingScore || b.valueScore - a.valueScore || a.distance - b.distance;
  }
  if (priority === "Lowest Cost") {
    return (a, b) => a.cost.spend - b.cost.spend || b.fishingScore - a.fishingScore || a.distance - b.distance;
  }
  if (priority === "Shortest Drive") {
    return (a, b) => a.distance - b.distance || b.fishingScore - a.fishingScore || b.valueScore - a.valueScore;
  }
  return (a, b) => b.valueScore - a.valueScore || b.fishingScore - a.fishingScore || a.cost.spend - b.cost.spend;
}

function weekdayDate(value) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short", day: "numeric", month: "short"
  }).format(new Date(`${value}T12:00:00`));
}
function shortDate(value) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric", month: "short"
  }).format(new Date(`${value}T12:00:00`));
}
function dateSpan(settings) {
  return `${shortDate(settings.depart)}—${shortDate(settings.returnDate)}`;
}
function driveLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours
    ? `${hours} hr${remainingMinutes ? ` ${remainingMinutes} min` : ""}`
    : `${remainingMinutes} min`;
}

function testHermanusCalculation() {
  const hermanus = destinations.find(destination => destination.id === "hermanus");
  const settings = {
    budget: 3000, people: 4, consumption: 8, fuelExisting: 650,
    fuelPrice: 24.5, experience: "Beach Away", distance: "200",
    depart: "2026-10-09", returnDate: "2026-10-11"
  };
  const result = calc(hermanus, settings);
  if (result.returnDistance !== 240) throw new Error("Hermanus return distance should be 240 km.");
  if (result.consumed !== 470.4) throw new Error("Hermanus fuel consumption calculation changed.");
  if (result.additional !== 0) throw new Error("Existing fuel must cover the Hermanus trip estimate.");
  const expected = { spend: 2000, remaining: 1000, perPerson: 500 };
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value) throw new Error(`Hermanus ${key}: expected ${value}, got ${result[key]}.`);
  }
  return true;
}

function testRecommendationScenarios() {
  const scenarios = [
    { name: "Beach · R3,000 · 4 people · under 200 km", budget: 3000, people: 4, experience: "Beach Away", distance: "200" },
    { name: "Fishing · R5,000 · 2 people · anywhere", budget: 5000, people: 2, experience: "Fishing Away", distance: "any" },
    { name: "Fishing · Shore · Galjoen · under 200 km", budget: 5000, people: 2, experience: "Fishing Away", distance: "200", fishingStyle: "Shore", targetSpecies: "Galjoen", spotPreference: "Let the app choose" },
    { name: "Family · R2,000 · 4 people · under 100 km", budget: 2000, people: 4, experience: "Family Away", distance: "100" },
    { name: "Nature · R10,000 · 2 people · anywhere", budget: 10000, people: 2, experience: "Nature", distance: "any" }
  ].map(scenario => {
    const settings = {
      ...scenario,
      consumption: 8,
      fuelExisting: 650,
      fuelPrice: 24.5,
      depart: "2026-10-09",
      returnDate: "2026-10-11"
    };
    const candidates = findCandidates(settings);
    const shortlist = buildShortlist(candidates);
    if (shortlist.length > 5) throw new Error(`${scenario.name}: more than five destinations were selected.`);
    if (new Set(shortlist.map(item => item.destination.id)).size !== shortlist.length) {
      throw new Error(`${scenario.name}: duplicate destinations were selected.`);
    }
    return {
      scenario: scenario.name,
      possible: candidates.length,
      selected: shortlist.map(item => item.destination.name)
    };
  });
  if (destinations.length !== 30) throw new Error(`Expected 30 unique destinations, found ${destinations.length}.`);
  if (new Set(destinations.map(destination => destination.id)).size !== destinations.length) {
    throw new Error("Destination IDs must be unique.");
  }
  return scenarios;
}

if (typeof window !== "undefined") {
  window.testHermanusCalculation = testHermanusCalculation;
  window.testWeekendScenarios = testRecommendationScenarios;
}

const form = document.querySelector("#trip-form");
const results = document.querySelector("#recommendations");
const dialog = document.querySelector("#trip-dialog");
const dialogContent = document.querySelector("#dialog-content");
const toast = document.querySelector("#toast");

function fishingSettings() {
  return {
    fishingStyle: document.querySelector("#fishing-style")?.value || "Any",
    targetSpecies: document.querySelector("#target-species")?.value || "Any",
    spotPreference: document.querySelector("#spot-preference")?.value || "Let the app choose",
    fishingPriority: document.querySelector("#fishing-priority")?.value || "Best Overall Weekend"
  };
}

function setupFishingControls() {
  const experience = document.querySelector("#experience");
  const panel = document.querySelector("#fishing-controls");
  if (!experience || !panel) return;
  const sync = () => {
    const active = experience.value === "Fishing Away";
    panel.hidden = !active;
    document.querySelector("#planner-title").textContent = active
      ? "Build your fishing weekend"
      : "What feels like a good getaway?";
  };
  experience.addEventListener("change", sync);
  sync();
}

function fishingSpotSummary(destination, settings) {
  if (settings.experience !== "Fishing Away" || !window.BMWFishing) return "";
  const match = window.BMWFishing.bestSpot(destination.id, settings);
  if (!match) return "";
  const s = match.spot;
  return `<div class="fishing-result-box">
    <strong>BEST MATCHING FISHING AREA</strong>
    <span>${esc(s.name)} · ${esc(s.spotType)}</span>
    <small>Target: ${esc(s.species.join(", "))} · Style: ${esc(s.styles.join(", "))}</small>
    <small>Community note: ${esc(s.community)}</small>
    <small>DEMO ONLY — verify tide, swell, wind, access, permits and current regulations.</small>
  </div>`;
}

function getSettings() {
  const values = new FormData(form);
  return {
    budget: Number(values.get("budget")),
    people: Number(values.get("people")),
    experience: values.get("experience"),
    distance: values.get("distance"),
    depart: values.get("depart"),
    returnDate: values.get("return"),
    consumption: Number(values.get("consumption")),
    fuelExisting: Number(values.get("fuelExisting")),
    fuelPrice: Number(values.get("fuelPrice")),
    ...fishingSettings()
  };
}

function valid(settings) {
  let good = true;
  const checks = [
    ["budget", Number.isFinite(settings.budget) && settings.budget > 0, "Enter a budget greater than R0."],
    ["people", Number.isInteger(settings.people) && settings.people >= 1 && settings.people <= 10, "Choose between 1 and 10 people."],
    ["depart", Boolean(settings.depart), "Choose a departure date."],
    ["return", Boolean(settings.returnDate) && (!settings.depart || settings.returnDate >= settings.depart), "Choose a return date on or after departure."],
    ["consumption", Number.isFinite(settings.consumption) && settings.consumption > 0, "Enter fuel consumption greater than 0."],
    ["fuel-price", Number.isFinite(settings.fuelPrice) && settings.fuelPrice > 0, "Enter a fuel price greater than R0."],
    ["fuel-existing", Number.isFinite(settings.fuelExisting) && settings.fuelExisting >= 0, "Fuel already in the tank cannot be negative."]
  ];
  for (const [id, isValid, message] of checks) {
    const field = document.querySelector(`#${id}`);
    const error = document.querySelector(`#${id}-error`);
    if (!isValid) {
      good = false;
      field.setAttribute("aria-invalid", "true");
      error.textContent = message;
    } else {
      field.removeAttribute("aria-invalid");
      error.textContent = "";
    }
  }
  const experienceOptions = Object.keys(experienceProfiles);
  const distanceOptions = ["100", "200", "300", "any"];
  const experienceValid = experienceOptions.includes(settings.experience);
  const distanceValid = distanceOptions.includes(settings.distance);
  const experienceField = document.querySelector("#experience");
  const distanceGroup = document.querySelector(".distance-options");
  experienceField.toggleAttribute("aria-invalid", !experienceValid);
  distanceGroup.toggleAttribute("aria-invalid", !distanceValid);
  document.querySelector("#experience-error").textContent =
    experienceValid ? "" : "Choose one of the listed weekend experiences.";
  document.querySelector("#distance-error").textContent =
    distanceValid ? "" : "Choose a maximum distance or Anywhere.";
  return good && experienceValid && distanceValid;
}

function accommodationSummary(destination, settings) {
  if (!window.BMWAccommodation) return "";
  const ranked = window.BMWAccommodation.rank(destination, settings);
  return `<div class="accommodation-box">
    <strong>ACCOMMODATION TO CHECK IN ${esc(destination.name.toUpperCase())}</strong>
    <div class="accommodation-types">${ranked.types.map(type => `<span>${esc(type)}</span>`).join("")}</div>
    <small>${esc(ranked.note)}</small>
    <div class="accommodation-links">${window.BMWAccommodation.links(destination, settings).map(link =>
      `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${esc(link.name)} ↗</a>`
    ).join("")}</div>
  </div>`;
}

function card(destination, settings, badges) {
  const element = document.createElement("article");
  const cost = destination.cost;
  element.className = "trip-card";
  element.dataset.testid = `destination-${destination.id}`;
  element.innerHTML = `
    <div class="card-landscape" style="--card-bg:${destination.colors[0]};--card-hill:${destination.colors[1]};--card-hill2:${destination.colors[2]}">
      <span class="landscape-sun"></span><span class="landscape-hill"></span><span class="landscape-hill second"></span>
      <span class="card-tag">${esc(destination.categories.slice(0, 2).join(" · ").toUpperCase())}</span>
      <span class="card-km">${destination.distance} KM ONE WAY</span>
    </div>
    <div class="card-content">
      <div class="card-topline">
        <div><h3>${esc(destination.name)}</h3><div class="destination-region">${esc(destination.region)} · ${esc(destination.province)}</div></div>
        <div class="card-badges" aria-label="Recommendation roles">${badges.map(badge =>
          `<span class="recommendation-label">${esc(badge)}</span>`
        ).join("")}</div>
      </div>
      <div class="trip-facts"><span>${settings.people} ${settings.people === 1 ? "person" : "people"}</span><span>·</span><span>≈ ${driveLabel(destination.driveTime)} drive</span><span>·</span><span>${dateSpan(settings)}</span></div>
      <p class="destination-description">${esc(destination.description)}</p>${fishingSpotSummary(destination, settings)}${accommodationSummary(destination, settings)}
      <div class="card-budget-row">
        <div><div class="spend-number">${money(cost.spend)}</div><div class="spend-caption">TYPICAL TOTAL · ${settings.people} ${settings.people === 1 ? "PERSON" : "PEOPLE"}</div><div class="card-demo-range">${money(cost.lowSpend)}–${money(cost.highSpend)} demonstration range</div></div>
        <div class="leftover"><b>${money(cost.remaining)}</b><span>LEFT IN BUDGET</span></div>
      </div>
      <div class="card-highlights"><strong>THINGS TO DO · DEMONSTRATION IDEAS</strong>${destination.activityIdeas.map(esc).join(" · ")}</div>
    </div>
    <div class="card-actions">
      <button type="button" data-action="view" data-destination="${destination.id}" data-testid="view-${destination.id}">VIEW WEEKEND <span aria-hidden="true">↗</span></button>
      <button type="button" data-action="share" data-destination="${destination.id}" data-testid="share-${destination.id}">SHARE TRIP</button>
    </div>`;
  return element;
}

function noResultsMessage(settings) {
  const distanceLimit = settings.distance === "any" ? Infinity : Number(settings.distance);
  const nearbyCount = destinations.filter(destination => destination.distance <= distanceLimit).length;
  const affordableAnywhere = destinations.some(destination =>
    calc(destination, settings).remaining >= 0
  );
  if (!nearbyCount) {
    return `There are no demonstration destinations within ${settings.distance} km of the Cape Town starting point. Widen the distance setting to see more options.`;
  }
  if (!affordableAnywhere) {
    return `Typical demonstration costs for ${settings.people} ${settings.people === 1 ? "person" : "people"} are above your ${money(settings.budget)} group budget at every listed destination.`;
  }
  return `There are destinations within your distance setting, but their typical group-cost estimates exceed your ${money(settings.budget)} budget.`;
}

function render() {
  const settings = getSettings();
  if (!valid(settings)) return;
  try {
    localStorage.setItem("buildMyWeekendTrip", JSON.stringify({
      budget: settings.budget,
      people: settings.people,
      experience: settings.experience,
      distance: settings.distance,
      depart: settings.depart,
      returnDate: settings.returnDate,
      consumption: settings.consumption,
      fuelExisting: settings.fuelExisting,
      fuelPrice: settings.fuelPrice
    }));
  } catch {}

  const candidates = findCandidates(settings);
  const shortlist = buildShortlist(candidates);
  const noResults = document.querySelector("#no-results");
  document.querySelector("#results-summary").textContent =
    `We found ${candidates.length} possible destination${candidates.length === 1 ? "" : "s"}. Here are the strongest matches for you.`;
  document.querySelector("#result-count").textContent =
    `${shortlist.length} SHORTLISTED · ${candidates.length} POSSIBLE`;
  document.querySelector("#no-results-copy").textContent = noResultsMessage(settings);
  results.replaceChildren();
  noResults.hidden = candidates.length > 0;
  if (!candidates.length) return;
  for (const item of shortlist) results.append(card(item.destination, settings, item.badges));
}

function experienceReason(destination, experience) {
  const preferred = experienceProfiles[experience] || [];
  if (!preferred.length) return `Your preference is ${experience}; results include different kinds of destinations.`;
  const matched = preferred.filter(category => destination.categories.includes(category));
  if (matched.length) {
    return `Matches your ${experience.replace(" Away", "")} preference (${matched.join(", ")}).`;
  }
  return `Also considered from the wider affordable pool; your preference is ${experience.replace(" Away", "")}.`;
}

function whyMatched(destination, settings) {
  const maxDistance = settings.distance === "any" ? "Anywhere" : `under ${settings.distance} km one way`;
  return [
    `Fits your ${money(settings.budget)} group budget at typical demonstration prices.`,
    experienceReason(destination, settings.experience),
    `Within your ${maxDistance} distance setting.`,
    `Leaves approximately ${money(destination.cost.remaining)} from the group budget.`
  ];
}

function costLine(label, value, extraClass = "") {
  return `<div class="cost-line ${extraClass}"><span>${esc(label)}</span><strong>${money(value)}</strong></div>`;
}

function detail(destination, settings) {
  const cost = destination.cost;
  const categories = destination.categories.join(", ");
  const suitability = destination.suitableFor.join(", ");
  const costRows = [
    costLine(`Fuel consumed (${cost.litres} L return)`, cost.consumed),
    costLine("Fuel already in vehicle (already paid)", settings.fuelExisting),
    costLine("Additional fuel to buy", cost.additional),
    costLine(`Accommodation · typical × ${settings.people}`, cost.accommodation),
    costLine(`Food · typical × ${settings.people}`, cost.food),
    costLine(`Activities · typical × ${settings.people}`, cost.activities),
    costLine("Typical total trip spend", cost.spend, "total"),
    costLine("Budget remaining", cost.remaining),
    costLine("Typical cost per person", cost.perPerson)
  ].join("");

  dialogContent.innerHTML = `
    <span class="detail-eyebrow">A WEEKEND IDEA · DEMONSTRATION DATA — NOT LIVE</span>
    <h2 id="detail-title" class="detail-title">${esc(destination.name)}</h2>
    <p class="detail-sub">${esc(destination.region)} · ${esc(destination.province)} · ${esc(categories)}</p>
    <p class="detail-sub">${destination.distance} km one way from Cape Town · ${cost.returnDistance} km return · approximately ${driveLabel(destination.driveTime)} driving</p>
    <p class="detail-sub">${esc(destination.description)} Suitable for: ${esc(suitability)}.</p>
    <div class="detail-callout">
      <div><span>ESTIMATED TYPICAL TOTAL FOR ${settings.people} ${settings.people === 1 ? "PERSON" : "PEOPLE"}</span><br><strong>${money(cost.spend)}</strong></div>
      <strong>${money(cost.perPerson)}<span> / person</span></strong>
      <small>${money(cost.remaining)} left from your ${money(settings.budget)} group budget · Dates: ${dateSpan(settings)}</small>
      <div class="detail-range">Typical-cost demonstration range for the group: ${money(cost.lowSpend)}–${money(cost.highSpend)}. No value is a quote.</div>
    </div>
    <section class="why-matched" aria-labelledby="why-matched-title">
      <h3 id="why-matched-title">WHY THIS MATCHED</h3>
      <ul>${whyMatched(destination, settings).map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>
    </section>
    ${settings.experience === "Fishing Away" && window.BMWFishing && window.BMWFishing.bestSpot(destination.id, settings) ? (() => {
      const m = window.BMWFishing.bestSpot(destination.id, settings).spot;
      return \`<section class="fishing-detail">
        <h3>FISHING AWAY · SPECIALIST MATCH</h3>
        <strong>Best matching area: ${esc(m.name)}</strong>
        <div>${esc(m.area)} · ${esc(m.spotType)} · ${esc(m.styles.join(", "))}</div>
        <div>Target species: ${esc(m.species.join(", "))}</div>
        <div>Tide: ${esc(m.tide)}</div>
        <p>${esc(m.conditions)}</p>
        <p><strong>ANGLER / COMMUNITY INFORMATION:</strong> ${esc(m.community)}</p>
        <p><strong>CHECK BEFORE LEAVING:</strong> ${esc(m.accessNote)} Current weather, swell, tide, access and regulations must be checked separately.</p>
        <p class="detail-demo-note">FISHING DATA IS DEMONSTRATION INFORMATION — NOT A LIVE CATCH REPORT OR SAFETY REPORT.</p>
      </section>\`;
    })() : ""}
    ${accommodationSummary(destination, settings)}
    <div class="detail-columns">
      <section class="detail-section">
        <h3>THE COST BREAKDOWN · TYPICAL DEMO ESTIMATE</h3>
        ${costRows}
        <h3 style="margin-top:20px">THINGS TO DO · DEMONSTRATION IDEAS</h3>
        <div class="cost-line"><span>${destination.activityIdeas.map(esc).join(" · ")}</span></div>
      </section>
      <section class="detail-section">
        <h3>ILLUSTRATIVE ITINERARY · NOT A LIVE ROUTE</h3>
        <ol class="itinerary">${destination.itinerary.map(([time, text]) =>
          `<li><time>${esc(time)}</time><span>${esc(text)}</span></li>`
        ).join("")}</ol>
      </section>
    </div>
    <div class="practical-box"><strong>GOOD TO KNOW · DEMONSTRATION NOTE</strong><br>${esc(destination.practicalInfo)}<br><br>Accommodation, food, activities, routes and drive times are illustrative estimates from Cape Town, not verified information. Fuel already in your tank is not charged to the budget again.</div>
    <div class="access-details" aria-label="Unverified local access notes">
      <div><strong>HOSPITAL ACCESS · UNVERIFIED</strong>${esc(destination.hospitalAccess)}</div>
      <div><strong>PHARMACY ACCESS · UNVERIFIED</strong>${esc(destination.pharmacyAccess)}</div>
      <div><strong>FUEL ACCESS · UNVERIFIED</strong>${esc(destination.fuelAccess)}</div>
    </div>
    <p class="detail-demo-note">DEMONSTRATION DATA — DESTINATION COSTS, FACILITIES, ROUTES AND OTHER INFORMATION ARE NOT LIVE OR VERIFIED. Do not use this information for actual travel, booking or emergency decisions.</p>
    <div class="detail-actions">
      <button class="button button-primary" type="button" data-action="availability" data-testid="availability-button">CHECK AVAILABILITY</button>
      <button class="button demo-button" type="button" data-action="navigate" data-testid="navigate-button">NAVIGATE</button>
      <button class="button demo-button" type="button" data-action="share" data-destination="${destination.id}" data-testid="detail-share-button">SHARE TRIP</button>
    </div>
    <p class="field-hint">Demo only: live availability, maps, facility status and navigation services are not connected.</p>`;
  dialog.showModal();
}

function shareText(destination, settings) {
  const cost = calc(destination, settings);
  return `Weekend idea: ${destination.name} · ${dateSpan(settings)} · ${settings.people} ${settings.people === 1 ? "person" : "people"}\n` +
    `Demonstration estimates only — typical total ${money(cost.spend)} (${money(cost.perPerson)} per person), low-to-high group range ${money(cost.lowSpend)}–${money(cost.highSpend)}.\n` +
    `Fuel consumed ${money(cost.consumed)}; additional fuel to buy ${money(cost.additional)}. Accommodation ${money(cost.accommodation)}, food ${money(cost.food)}, activities ${money(cost.activities)}.\n` +
    `${money(cost.remaining)} left in the group budget. Distances, costs, routes and facilities are not live or verified.`;
}

function toastMessage(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("visible"), 4500);
}

async function share(destination, settings) {
  const text = shareText(destination, settings);
  if (navigator.share) {
    try {
      await navigator.share({ title: `Weekend in ${destination.name}`, text });
    } catch (error) {
      if (error.name !== "AbortError") {
        toastMessage(`Sharing is not available here. Copy this trip summary: ${text}`);
      }
    }
  } else if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      toastMessage("Trip summary copied. Share it with your crew.");
    } catch {
      toastMessage(`Could not copy automatically. Trip summary: ${text}`);
    }
  } else {
    toastMessage(`Copy is not available here. Trip summary: ${text}`);
  }
}

function findDestination(id) {
  return destinations.find(destination => destination.id === id);
}

function settingsFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem("buildMyWeekendTrip") || "null");
    if (!saved) return;
    for (const key of ["budget", "people", "experience", "depart", "consumption", "fuelPrice", "fuelExisting"]) {
      if (saved[key] !== undefined && form.elements[key]) form.elements[key].value = saved[key];
    }
    if (saved.returnDate) form.elements.return.value = saved.returnDate;
    if (saved.distance) {
      const radio = form.querySelector(`input[name="distance"][value="${saved.distance}"]`);
      if (radio) radio.checked = true;
    }
  } catch {}
}

function localDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function initDates() {
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  form.elements.depart.value = localDate(friday);
  form.elements.return.value = localDate(sunday);
  form.elements.depart.min = localDate(today);
  form.elements.return.min = localDate(friday);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!valid(getSettings())) return;
  render();
  document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "start" });
});

form.addEventListener("input", event => {
  if (event.target.getAttribute("aria-invalid") === "true" ||
      form.querySelector('[aria-invalid="true"]')) valid(getSettings());
});

form.addEventListener("change", event => {
  if (event.target.name === "depart" && form.elements.return.value < form.elements.depart.value) {
    form.elements.return.value = form.elements.depart.value;
  }
  if (form.querySelector('[aria-invalid="true"]')) valid(getSettings());
});

results.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const destination = findDestination(button.dataset.destination);
  if (!destination) return;
  const settings = getSettings();
  const candidate = findCandidates(settings).find(item => item.id === destination.id);
  if (button.dataset.action === "view" && candidate) detail(candidate, settings);
  if (button.dataset.action === "share") share(destination, settings);
});

dialog.addEventListener("click", event => {
  if (event.target === dialog || event.target.closest(".dialog-close")) dialog.close();
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "availability") {
    toastMessage("Demo only — live accommodation availability is not connected.");
  }
  if (button.dataset.action === "navigate") {
    toastMessage("Demo only — live maps and turn-by-turn navigation are not connected.");
  }
  if (button.dataset.action === "share") {
    const destination = findDestination(button.dataset.destination);
    if (destination) share(destination, getSettings());
  }
});

document.querySelector("#reset-filters").addEventListener("click", () => {
  form.elements.experience.value = "Any";
  form.querySelector('input[name="distance"][value="any"]').checked = true;
  render();
});

initDates();
settingsFromStorage();
if (form.elements.return.value < form.elements.depart.value) {
  form.elements.return.value = form.elements.depart.value;
}
render();