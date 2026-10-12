# BUILD MY WEEKEND — Public Data Source Catalog

Status: candidate sources only. A URL in this file does **not** mean the app currently integrates the source or that its data is suitable for commercial use.

## Mapping, geocoding and place queries

- OpenStreetMap: https://www.openstreetmap.org/
- Overpass API: https://overpass-api.de/api/interpreter
- Overpass alternate endpoint: https://overpass.kumi.systems/api/interpreter
- Nominatim documentation/service: https://nominatim.openstreetmap.org/
- Wikidata SPARQL query endpoint: https://query.wikidata.org/sparql
- Wikidata API: https://www.wikidata.org/w/api.php
- TomTom Developer Portal: https://developer.tomtom.com/
- Google Developers: https://developers.google.com/

## South African public-sector and conservation sources

- South African government open-data portal: https://data.gov.za/
- Department of Water and Sanitation: https://www.dws.gov.za/
- SANParks: https://www.sanparks.org/
- Code for South Africa: https://code4sa.org/

## Bulk downloadable South African geographic datasets

These are candidate bulk-ingestion sources to evaluate for the weekend planner. They are not yet integrated. A downloadable CSV, spreadsheet, Shapefile, or GeoJSON file is not automatically uncopyrighted or cleared for commercial reuse; check each dataset's exact licence, attribution, redistribution, privacy, update cadence, and source terms before ingesting or republishing it.

- **HDX / HOTOSM South Africa Points of Interest:** https://data.humdata.org/dataset/hotosm_zaf_points_of_interest
  - Evaluate available CSV, Shapefile, and GeoJSON resources for OSM-derived place and facility points. Filter candidate features by verified tags such as `amenity`, `tourism`, `leisure`, and `camp_site` / `caravan_site` where present. Validate the actual resource columns and coverage before writing an importer.
  - Preserve OpenStreetMap attribution and applicable ODbL obligations; do not describe the export as licence-free.
- **Inside Airbnb / Cape Town-area snapshots:** https://github.com/forbesg-repo/airbnb-ct and https://github.com/feeblefruits/airbnb_ct
  - Candidate historical listings exports for regional accommodation discovery. Inspect repository activity, source lineage, snapshot date, schema, privacy implications, and licence/terms. Do not treat historical listings, prices, or review scores as live availability or current prices, and do not assume a GitHub-hosted file is cleared for commercial reuse.
- **South Africa GeoPortal / conservation layers:** https://za.africageoportal.com/datasets and SANBI https://www.sanbi.org/
  - Identify the exact authoritative protected-area, biodiversity, forest, catchment, inland-water, or marine-reserve layers relevant to the intended feature. Verify dataset owner, geometry, coordinate reference system, date, access restrictions, licence, and whether the layer supports the proposed claim. Do not infer public access, fishing permission, safety, or trail availability from proximity alone.
- **Western Cape Government Open Data Portal:** https://wcg-opendataportal-westerncapegov.hub.arcgis.com/
  - Search for tourism, facilities, dams, resorts, campsites, and water-storage datasets. Record the exact item URL, publisher, update cadence, schema, licence, and whether it is a dataset download or a service endpoint. Dam-storage figures are not a substitute for current local access, water-safety, or fishing-condition information.

### Suggested normalized places schema

Use a source-aware canonical model so duplicate records can be reconciled and every claim can be traced back to its dataset. The following is a target design, not a claim about the current production database:

- `id`: stable internal ID (UUID where supported; otherwise a stable text ID)
- `name`: display name
- `category`: controlled category such as `camping`, `hiking`, `guesthouse`, `fishing`, `protected_area`, or `tourism_facility`
- `latitude`, `longitude`: validated WGS84 coordinates
- `tags_json`: structured tags (for example, power, ablutions, shade, pet policy) only when directly supported by source evidence; distinguish unknown from false
- `region_id`: foreign key to a versioned regional-boundary table
- `source_id`, `source_record_id`, `source_url`: provenance and deduplication fields
- `source_updated_at`, `imported_at`, `verified_at`: freshness and verification timestamps
- `licence_id`, `attribution_text`, `confidence`: reuse and evidence controls

For the current lightweight app, `tags_json` is more portable than PostgreSQL-only `JSONB`; the actual storage implementation must match the chosen database. Ingestion should validate coordinates, normalize categories, deduplicate by source IDs and proximity/name, preserve raw source records for audit, and label stale or unverified records. Never manufacture amenities or infer that a fishing spot is legal, safe, accessible, or productive from a POI alone.

### Initial bulk-ingestion sequence

1. Inspect HDX metadata and resource links; download a small sample first, confirm licence/attribution, then build a repeatable CSV/GeoJSON importer and tests.
2. Add official protected-area and regional-facility layers only after their individual dataset metadata and usage rights are checked.
3. Evaluate accommodation snapshots as historical discovery evidence only; do not present them as live bookings or scrape proprietary booking platforms.
4. Add source-specific freshness, provenance, duplicate handling, coordinate validation, and import-report counts before any dataset can influence user-facing recommendations.

## Biodiversity and marine observation data

- GBIF portal: https://www.gbif.org/
- GBIF API root: https://api.gbif.org/v1/
- GBIF occurrence search: https://api.gbif.org/v1/occurrence/search
- Ocean Biodiversity Information System: https://obis.org/
- OBIS API root: https://api.obis.org/v3/
- OBIS occurrence endpoint: https://api.obis.org/v3/occurrence

## Outdoor activity and accommodation discovery references

These are discovery/reference websites, not assumed public APIs. Use their own permitted search or booking links unless an authorized API is documented.

- FishingBooker: https://www.fishingbooker.com/
- Fish the Fly SA: https://www.fish-the-fly.co.za/
- Hikers Network: https://www.hikersnetwork.co.za/
- The Crag: https://www.thecrag.com/
- Camps SA: https://www.campsa.co.za/
- AfriCamps: https://www.africamps.com/
- Glamping Hub: https://glampinghub.com/
- LekkeSlaap: https://www.lekkeslaap.co.za/
- CapeNature: https://www.capenature.co.za/
- Caravan & Outdoor Life: https://www.caravanandoutdoorlife.co.za/

## Integration gates

Before an adapter is implemented, record the exact endpoint, response schema, geographic coverage, update cadence, attribution requirement, rate limit, key requirements, and licence/commercial-use terms. Add caching and sensible request limits where permitted. Never place private API keys in client-side code.

- Treat public website URLs as links, not API endpoints.
- OpenStreetMap/Nominatim and Overpass have separate usage policies and capacity limits; do not assume unrestricted bulk or high-volume use.
- A public endpoint does not automatically grant commercial reuse.
- Keep demo records visibly marked as demonstration data until independently verified.
- Do not present species observations as proof that fishing is legal or currently productive.
- Biodiversity records do not establish safe access, current conditions, permits, catch limits, or marine forecasts.
- Do not use a general weather forecast as a marine swell/wave forecast.
- Keep the current Cape Town origin limitation visible until distance and fuel estimates support a selected origin.
- Open-Meteo commercial-use terms must be resolved before commercial launch; see https://open-meteo.com/en/terms.

## Suggested first integration order

1. Evaluate OpenStreetMap/Overpass for place and facility discovery, subject to their usage policy.
2. Evaluate SANParks, CapeNature and official government sources for protected-area facts and rules.
3. Evaluate DWS for relevant water-resource datasets, verifying whether a usable public endpoint exists.
4. Evaluate GBIF and OBIS for supplementary biodiversity context, with attribution and clear limits.
5. Choose and authorize a geocoding/routing provider before implementing nationwide origin-aware distance and fuel calculations.
