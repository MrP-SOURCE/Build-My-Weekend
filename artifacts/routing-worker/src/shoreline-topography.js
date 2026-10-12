// Seed records for the South African shoreline topography endpoint.
// Regional extents and shoreline lengths are approximate planning metadata, not surveyed GIS data.
// Fish arrays are illustrative species/habitat notes, not live reports or catch forecasts.
export const shorelineRegions = [
  {
    id: "false-bay",
    destination: "False Bay",
    province: "Western Cape",
    shoreline_length_km: 120,
    bounding_box: { min_lat: -34.35, max_lat: -33.95, min_lon: 18.35, max_lon: 19.15 },
    topography_description: "Large south-facing bay with sandy beaches, rocky points, kelp-fringed reefs and deeper water toward the bay mouth. Conditions vary strongly by exposure and wind.",
    hotspot_features: [
      { name: "Seal Island Pinnacle", feature: "offshore rocky pinnacle", status: "illustrative hotspot; exact coordinates and access not verified" },
      { name: "Rocky points and kelp edges", feature: "reef and kelp habitat", status: "general habitat description; not a confirmed fishing mark" },
      { name: "Sandy bay sections", feature: "beach and shallow shelf", status: "general habitat description; local restrictions may apply" }
    ],
    map_reading_instruction: "Use the bounding box only to locate the broad False Bay region. Read nautical chart depth contours, chart datum, rocks/reefs, restricted areas, and exposed headlands before planning a route. A regional pin is not a safe navigation route.",
    accumulating_fish: [
      { species: "Yellowtail", habitat: "offshore reefs and bait-rich water", evidence: "regional illustrative species note; no live aggregation data" },
      { species: "Snoek", habitat: "seasonal coastal and offshore water", evidence: "regional illustrative species note; no live catch report" },
      { species: "Cape bream / hottentot", habitat: "rocky reef areas", evidence: "general habitat note; verify local rules and conditions" }
    ],
    data_status: "DEMO_REGIONAL_REFERENCE"
  },
  {
    id: "algoa-bay",
    destination: "Algoa Bay",
    province: "Eastern Cape",
    shoreline_length_km: 100,
    bounding_box: { min_lat: -34.15, max_lat: -33.65, min_lon: 25.45, max_lon: 26.75 },
    topography_description: "Broad bay near Gqeberha with sandy shore sections, rocky points and offshore islands. Exposure, current and depth vary between the inner bay and outer coast.",
    hotspot_features: [
      { name: "Rocky points", feature: "reef-edge habitat", status: "illustrative regional feature; precise marks not supplied" },
      { name: "Offshore island waters", feature: "island and reef habitat", status: "access and marine-protection restrictions must be checked" },
      { name: "Sandy inner-bay coast", feature: "beach and shallow shelf", status: "general habitat description; not a confirmed fishing mark" }
    ],
    map_reading_instruction: "Check a current official nautical chart for depth contours, reefs, shipping lanes, harbour approaches and marine protected areas. Do not treat the bounding box or hotspot names as GPS waypoints.",
    accumulating_fish: [
      { species: "Shad / elf", habitat: "coastal water and seasonal shore runs", evidence: "regional illustrative species note; no live catch report" },
      { species: "Kob", habitat: "surf zones, channels and estuary-adjacent water", evidence: "general habitat note; verify current conditions and regulations" },
      { species: "Yellowtail", habitat: "offshore bait-rich water", evidence: "regional illustrative species note; no live aggregation data" }
    ],
    data_status: "DEMO_REGIONAL_REFERENCE"
  },
  {
    id: "wild-coast",
    destination: "Wild Coast",
    province: "Eastern Cape",
    shoreline_length_km: 250,
    bounding_box: { min_lat: -32.95, max_lat: -31.05, min_lon: 28.45, max_lon: 29.95 },
    topography_description: "Long, rugged coastline with rocky headlands, exposed beaches, river mouths, reefs and steep coastal terrain. Surf, swell, access and river-mouth conditions can change quickly.",
    hotspot_features: [
      { name: "Rocky headlands", feature: "exposed reef and ledge habitat", status: "illustrative regional feature; exact marks not supplied" },
      { name: "River mouths", feature: "dynamic sandbar and channel habitat", status: "positions shift; not a fixed navigation point" },
      { name: "Open beaches", feature: "surf-zone habitat", status: "access and surf safety must be checked locally" }
    ],
    map_reading_instruction: "Use detailed current charts and topographic maps together. Check cliff access, private/community land access, river-mouth changes, swell exposure, reefs and escape routes. Broad regional extents do not establish safe access or navigability.",
    accumulating_fish: [
      { species: "Kob", habitat: "surf zones and river-mouth areas", evidence: "general habitat note; not a live bite prediction" },
      { species: "Shad / elf", habitat: "surf-zone and coastal water", evidence: "regional illustrative species note; seasonal presence varies" },
      { species: "Rockcod / reef fish", habitat: "rocky reef habitat", evidence: "general habitat note; check species-specific legal limits" }
    ],
    data_status: "DEMO_REGIONAL_REFERENCE"
  }
];

export function pointInBoundingBox(lat, lon, box) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= box.min_lat && lat <= box.max_lat &&
    lon >= box.min_lon && lon <= box.max_lon;
}

export function filterShorelineRegions(params) {
  const destination = String(params.destination || "").trim().toLowerCase();
  const lat = params.lat === null || params.lat === undefined || params.lat === "" ? NaN : Number(params.lat);
  const lon = params.lon === null || params.lon === undefined || params.lon === "" ? NaN : Number(params.lon);
  const minLength = params.min_shoreline_length_km === undefined || params.min_shoreline_length_km === "" ? 0 : Number(params.min_shoreline_length_km);
  const maxLength = params.max_shoreline_length_km === undefined || params.max_shoreline_length_km === "" ? Infinity : Number(params.max_shoreline_length_km);
  if (!Number.isFinite(minLength) || minLength < 0 || !(Number.isFinite(maxLength) || maxLength === Infinity) || maxLength < minLength) {
    return { error: "Shoreline length filters must be non-negative numbers, and maximum must be at least minimum." };
  }
  if ((Number.isFinite(lat) && !Number.isFinite(lon)) || (!Number.isFinite(lat) && Number.isFinite(lon))) {
    return { error: "Provide both lat and lon to match a coordinate against regional bounding boxes." };
  }
  if ((Number.isFinite(lat) && (lat < -90 || lat > 90)) || (Number.isFinite(lon) && (lon < -180 || lon > 180))) {
    return { error: "Coordinates are outside valid latitude/longitude ranges." };
  }
  const matched = shorelineRegions.filter(region => {
    const nameMatch = !destination || region.destination.toLowerCase().includes(destination) || region.id === destination.replace(/\\s+/g, "-");
    const coordinateMatch = !Number.isFinite(lat) || pointInBoundingBox(lat, lon, region.bounding_box);
    return nameMatch && coordinateMatch &&
      region.shoreline_length_km >= minLength && region.shoreline_length_km <= maxLength;
  });
  return { regions: matched };
}
