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
