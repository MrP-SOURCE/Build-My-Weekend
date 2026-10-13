# Coastal seabed structure-zone detection

This utility is a **Fishing Away / Shoreline Explorer decision-support feature**. It scans a bathymetry GeoTIFF for cells that are relatively deeper than their immediate 8-cell neighborhood, groups nearby candidate cells, and exports **area polygons** in WGS84 GeoJSON. The intention is to help recreational anglers identify coastal areas with depressions or depth changes worth investigating—not to drop a pin on an exact fishing hole.

## Install

From the repository root:

\`\`\`bash
python -m venv .venv
# Windows:
.venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
python -m pip install -r scripts/bathymetry/requirements.txt
\`\`\`

## Run

\`\`\`bash
python scripts/bathymetry/detect_bathymetry_holes.py input_bathymetry.tif output/candidate-structure-zones.geojson --threshold-m 5 --depth-sign negative --cluster-buffer-cells 1
\`\`\`

- \`--threshold-m\`: minimum local depth prominence in metres (default 5).
- \`--depth-sign negative\`: for rasters where seabed elevation is negative; use \`positive\` when values already represent positive-down depth.
- \`--band\`: one-based raster band (default 1).
- \`--cluster-buffer-cells\`: expands each candidate core by this many pixels and merges nearby candidates into display zones (default 1). Pixels are not a fixed distance; the real-world footprint depends on raster resolution and CRS.
- \`--max-zones\`: safety limit for the number of output zones.

The input must have a valid CRS. GeoJSON uses WGS84 longitude/latitude polygons, suitable for a Leaflet GeoJSON layer. Properties include deepest and mean candidate depth, local depth difference, number of core cells, display footprint size, source raster, and verification status. Nodata cells are ignored.

## South African data workflow

The script does not automatically fetch data. Obtain bathymetry from a source with suitable coverage and permitted reuse, and preserve source attribution, licence, survey date, vertical datum, horizontal CRS, resolution, and coverage. The Willem de Wet continental-shelf resource at https://www.johnscompton.com/maps/ is a research lead, but may provide XYZ or NetCDF rather than GeoTIFF. The Council for Geoscience Marine Mapping Project at https://www.geoscience.org.za/project/marine-mapping-project/ is another source to investigate for access and terms. This commit does not claim that either source has been downloaded or validated.

## How anglers should interpret the map

Use friendly wording such as **“Potential seabed structure area”** or **“Deeper-water feature to investigate.”** These areas can help a recreational fisherman understand where depth changes may influence fish movement or feeding. They are not precise science and do not predict fish presence or species. Later enrichment could combine verified local catch reports, species seasons, tides, swell, wind, and access information, with each source and its freshness clearly labelled.

Do not use these polygons as navigation charts or safety aids. Check authoritative nautical charts, weather and sea conditions, local rules, and access. Results are sensitive to raster resolution, interpolation, survey noise, datum, and threshold. They should be field-tested and reviewed before appearing as real-world recommendations.

## Practical baseline source: GEBCO

A practical first test source is the current **GEBCO_2026 Grid**. GEBCO provides a user-defined-area download in GeoTIFF, Esri ASCII raster, or NetCDF format. Its public-domain terms permit reuse with source attribution, but the grid is a global compilation and may be too coarse or interpolated to resolve nearshore features reliably. Treat it as a workflow test and broad regional context, not as a verified local fishing-structure dataset.

- Data description and terms: https://www.gebco.net/data-products/gridded-bathymetry-data
- User-defined area download tool: https://betadownload.gebco.net/
- Attribution requested by GEBCO for the 2026 grid: GEBCO Bathymetric Compilation Group (2026), *The GEBCO_2026 Grid*, DOI: https://doi.org/10.5285/4f68d5c7-45eb-f999-e063-7086abc036fa
- Regional South African marine mapping context: https://www.geoscience.org.za/project/marine-mapping-project/

Before accepting a subset, record its exact download date, selected bounds, grid version, cell spacing, and any available Type Identifier (TID) information. The TID layer can help distinguish areas based on different source-data types; do not treat all cells as equally measured or equally reliable. GEBCO explicitly warns that its grid is not for navigation or other safety-at-sea purposes. For detailed nearshore work, seek higher-resolution local survey data and permission from the relevant data custodian.

## Stage official DFFE/OCIMS contour data for review

A separate bounded acquisition utility can request a small subset of the official DFFE/OCIMS bathymetry contour service and save attributed GeoJSON for inspection:

```bash
python scripts/bathymetry/fetch_dffe_contours.py --region false-bay --output data/staging/dffe-false-bay-contours.geojson
```

Supported region presets are `false-bay`, `algoa-bay`, and `wild-coast`. The default maximum is 10,000 features; the tool paginates, probes the limit to detect truncation, validates that returned geometries are line features with South African WGS84 coordinates and numeric `Depth`, and preserves source metadata fields. Use `--max-records` only when you deliberately need a larger bounded subset.

**Staging is not publication.** Review the output geometry, depth sign/units, vertical datum, source survey information, data currency, attribution/reuse terms, and coverage before using it in Shoreline Explorer. The official contour layer is a candidate source for contour context; it is not a bathymetry raster and does not by itself produce the polygon structure zones generated by `detect_bathymetry_holes.py`. Do not present either output as navigation-safe, verified fishing marks, or live fish intelligence. A zero-feature result means the query returned nothing, not that no seabed features exist.


Run the review-only quality audit against a staged file:

```bash
python scripts/bathymetry/audit_staged_contours.py data/staging/dffe-false-bay-contours.geojson --output data/staging/dffe-false-bay-audit.json
```

The audit reports feature count, geometry types, depth range, coordinate bounds, and missing source-provenance fields. It deliberately leaves depth units and vertical datum unconfirmed and labels the output `REVIEW_REQUIRED_NOT_PUBLICATION_APPROVAL`. A successful audit is a screening result only, not permission to publish. The manual GitHub Actions workflow runs the fetch, tests, audit, and artifact upload without committing acquired data into the repository.
