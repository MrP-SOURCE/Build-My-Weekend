# Campsite data importer: safe operating guide

This utility converts a **locally downloaded** CSV or GeoJSON snapshot into a normalized campsite CSV with source provenance. It does not fetch data, publish it to the app, verify individual campsites, or provide live booking availability.

## Before using a dataset

1. Open the exact dataset/resource page and read its current licence and terms.
2. Confirm commercial use and redistribution are permitted for the intended use. Check attribution, share-alike, database rights, privacy, and any provider-specific restrictions.
3. Record the exact resource URL, source identifier, required attribution, snapshot date, and licence identifier.
4. If terms are unclear, stop at private evaluation. Do not import the output into the public app or redistribute it until reviewed.
5. Keep the original download and its metadata alongside the generated output so the import can be traced and repeated.

A public download is not automatically cleared for commercial use. OpenStreetMap-derived data can carry attribution and share-alike obligations; verify the specific source and export conditions rather than assuming the source is unrestricted.

## Optional: fetch a small OSM campsite snapshot

The fetcher is an explicit, user-run network request. It requires a small bounding box inside South Africa and rejects boxes wider than 1 degree per side or larger than 0.5 square degrees. Do not use it for national-scale harvesting or rapid repeated polling; Overpass is a shared community service and may throttle or reject requests.

Example for a small Cape Town-area rectangle (adjust bounds to the area you actually need):

```bash
python scripts/data-ingestion/fetch_osm_campsites.py data/staging/osm-campsites.geojson \
  --south -34.05 --west 18.30 --north -33.75 --east 18.60
```

This writes a dated, review-only GeoJSON snapshot with OSM element IDs, source links, attribution, licence notes, snapshot time, and a warning that mapped points are not proof of operation, access, safety, or amenities. Ways and relations use their Overpass centre as an approximate point, not a verified entrance. No request runs automatically in CI and nothing is published to the website. Before redistribution, review OpenStreetMap's attribution and ODbL obligations and the current Overpass usage policy.

## Normalize a downloaded CSV or GeoJSON

From the repository root, after downloading or fetching a supported CSV or GeoJSON file to your own machine:

```bash
python scripts/data-ingestion/import_osm_campsites.py INPUT_FILE OUTPUT_FILE \
  --source-id "YOUR-STABLE-SOURCE-ID" \
  --source-url "EXACT-DATASET-RESOURCE-URL" \
  --licence-id "VERIFIED-LICENCE-IDENTIFIER" \
  --attribution "EXACT-REQUIRED-ATTRIBUTION" \
  --source-updated-at "YYYY-MM-DD" \
  --imported-at "YYYY-MM-DD"
```

Replace every uppercase placeholder with verified metadata and real file paths. Do not copy placeholder values into a production import. Dates are operator-supplied provenance fields; the script does not independently validate their accuracy.

Supported inputs:
- CSV with fields that identify `tourism`, latitude/longitude, and a stable source record ID.
- GeoJSON `FeatureCollection` with Point geometries and properties containing campsite tags. Feature IDs can be used as source record IDs.

The importer retains records tagged `tourism=camp_site` or `tourism=caravan_site`, checks coordinates against a broad South Africa sanity box, and skips records that fail its checks. The bounding box is not an authoritative national boundary and is not suitable for proving legal location.

## Output and limitations

The output includes coordinates, observed tags, source record ID, source URL, licence label, attribution, snapshot/import dates, and a confidence value of `unverified_source_record`. Review the output before any downstream use.

- Missing amenity tags mean **unknown**, not that an amenity is absent or present.
- A mapped point does not prove the campsite is operating, bookable, publicly accessible, safe, or currently maintained.
- It does not prove camping is legal at the location or that fishing is permitted.
- This importer does not estimate prices, check accommodation availability, validate weather, or update the live app dataset.
- Re-importing a later snapshot requires reviewing changes and preserving provenance; do not silently treat old records as current.
- Before public use, add an explicit reviewed/approved data pipeline and record-level verification process. Do not treat the CLI's required licence string as legal validation.

## Test the importer

```bash
python -m unittest discover -s scripts/data-ingestion -p 'test_*.py' -v
```

CI also runs the importer tests alongside the existing app validation checks.
