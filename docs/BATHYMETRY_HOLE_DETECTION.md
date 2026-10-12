# Bathymetry candidate-hole detection

This offline research utility scans a bathymetry GeoTIFF for cells at least a configurable depth threshold below the mean of their valid 8-cell neighborhood, then writes candidate locations as GeoJSON points in WGS84 longitude/latitude for a Leaflet layer.

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
python scripts/bathymetry/detect_bathymetry_holes.py input_bathymetry.tif output/candidate-holes.geojson --threshold-m 5 --depth-sign negative
\`\`\`

- \`--threshold-m\`: minimum prominence in metres (default 5).
- \`--depth-sign negative\`: use for common elevation rasters where the seabed is negative; values are inverted to positive-down depth. Use \`--depth-sign positive\` for rasters that already store depth as positive values.
- \`--band\`: one-based band number (default 1).
- \`--max-points\`: maximum exported points, to avoid accidentally generating an enormous pin layer.

The input must have a valid coordinate reference system. GeoJSON output is transformed to WGS84 and stores depth, local neighbor mean, prominence, source raster, threshold, row/column, and verification status. Nodata cells are ignored; edge windows use only in-bounds valid neighbors. Cells with negative normalized depth are excluded.

## Tests

\`\`\`bash
python -m unittest discover -s scripts/bathymetry -p 'test_*.py' -v
\`\`\`

## South African source workflow

The script intentionally does not download a dataset automatically. Obtain a bathymetry raster from a source whose access terms and metadata have been checked, then preserve its attribution, licence, survey date, vertical datum, horizontal CRS, resolution, and coverage with the output. The Willem de Wet continental-shelf resource page at https://www.johnscompton.com/maps/ is a research lead, but may offer XYZ or NetCDF rather than GeoTIFF; convert carefully to a georeferenced raster first. The Council for Geoscience Marine Mapping Project at https://www.geoscience.org.za/project/marine-mapping-project/ is another source to investigate for data access and permitted use. Neither source is automatically connected by this script, and this commit does not assert that a suitable real South African GeoTIFF has been downloaded or validated.

## Interpretation and safety

Outputs are **candidate seabed depressions**, not confirmed fishing holes. The filter is sensitive to grid resolution, interpolation artefacts, survey noise, vertical datum, and the selected threshold. A GeoTIFF's pixel size is not necessarily uniform in metres, especially in geographic CRS. Review results against source metadata and authoritative nautical charts before considering map display. Do not infer fish presence, target species, navigable depth, legal access, or safe conditions from these pins. Leaflet should label the layer as algorithmic research candidates and show the source and uncertainty.
