import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

from detect_bathymetry_holes import detect_candidates, load_geotiff_bathymetry, run


class BathymetryStructureZoneTests(unittest.TestCase):
    def test_geotiff_loader_normalizes_negative_depth_and_masks_land_nodata(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "loader-fixture.tif"
            matrix = np.array([[-10, -20, 5], [-30, -9999, -40]], dtype=np.float32)
            with rasterio.open(
                source, "w", driver="GTiff", height=2, width=3, count=1,
                dtype="float32", crs="EPSG:4326",
                transform=from_origin(18.0, -33.0, 0.01, 0.01), nodata=-9999,
            ) as dataset:
                dataset.write(matrix, 1)
            depths, crs, transform, shape = load_geotiff_bathymetry(source)
        self.assertEqual(str(crs), "EPSG:4326")
        self.assertEqual(shape, (2, 3))
        self.assertAlmostEqual(float(depths[0, 0]), 10.0)
        self.assertTrue(np.isnan(depths[0, 2]))
        self.assertTrue(np.isnan(depths[1, 1]))
        self.assertEqual(transform.c, 18.0)

    def test_geotiff_loader_accepts_positive_down_depths(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "positive-depth.tif"
            matrix = np.array([[10, 20], [0, -9999]], dtype=np.float32)
            with rasterio.open(
                source, "w", driver="GTiff", height=2, width=2, count=1,
                dtype="float32", crs="EPSG:4326",
                transform=from_origin(18.0, -33.0, 0.01, 0.01), nodata=-9999,
            ) as dataset:
                dataset.write(matrix, 1)
            depths, _, _, _ = load_geotiff_bathymetry(source, depth_sign="positive")
        self.assertEqual(float(depths[0, 0]), 10.0)
        self.assertTrue(np.isnan(depths[1, 0]))
        self.assertTrue(np.isnan(depths[1, 1]))

    def test_detects_relative_depression_and_ignores_nodata(self):
        depth = np.array([
            [12, 12, 13, 14, 13],
            [13, 11, 12, 13, 14],
            [12, 13, 24, 12, 13],
            [14, 12, 13, 11, 12],
            [13, 14, 13, 12, 13],
        ], dtype=float)
        depth[0, 0] = np.nan
        prominence, candidates = detect_candidates(depth, 6)
        self.assertTrue(candidates[2, 2])
        self.assertGreaterEqual(prominence[2, 2], 6)
        self.assertFalse(candidates[0, 0])

    def test_exports_area_polygon_not_single_pin_and_discloses_uncertainty(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "fixture.tif"
            output = Path(tmp) / "zones.geojson"
            matrix = np.array([
                [-12, -12, -13, -14, -13],
                [-13, -11, -12, -13, -14],
                [-12, -13, -24, -12, -13],
                [-14, -12, -13, -11, -12],
                [-13, -14, -13, -12, -13],
            ], dtype=np.float32)
            with rasterio.open(
                source, "w", driver="GTiff", height=5, width=5, count=1,
                dtype="float32", crs="EPSG:4326",
                transform=from_origin(18.0, -33.0, 0.01, 0.01), nodata=-9999,
            ) as dataset:
                dataset.write(matrix, 1)

            count = run(source, output, 6, "negative", 1, 1, 100)
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(count, 1)
            self.assertEqual(payload["type"], "FeatureCollection")
            feature = payload["features"][0]
            self.assertEqual(feature["geometry"]["type"], "Polygon")
            self.assertEqual(feature["properties"]["feature_type"],
                             "potential_coastal_seabed_structure_zone")
            self.assertEqual(feature["properties"]["deepest_candidate_depth_m"], 24.0)
            self.assertEqual(feature["properties"]["core_candidate_cells"], 1)
            self.assertEqual(feature["properties"]["display_footprint_cells"], 9)
            self.assertEqual(feature["properties"]["verification_status"],
                             "bathymetry_derived_candidate_not_field_verified")
            self.assertIn("recreational_fishing_decision_support_candidates", payload["metadata"]["status"])
            ring = feature["geometry"]["coordinates"][0]
            longitudes = [point[0] for point in ring]
            latitudes = [point[1] for point in ring]
            self.assertAlmostEqual(min(longitudes), 18.01, places=6)
            self.assertAlmostEqual(max(longitudes), 18.04, places=6)
            self.assertAlmostEqual(min(latitudes), -33.04, places=6)
            self.assertAlmostEqual(max(latitudes), -33.01, places=6)

    def test_rejects_unknown_crs_and_invalid_threshold(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "no_crs.tif"
            with rasterio.open(
                source, "w", driver="GTiff", height=3, width=3, count=1,
                dtype="float32", transform=from_origin(0, 3, 1, 1),
            ) as dataset:
                dataset.write(np.ones((3, 3), dtype=np.float32), 1)
            with self.assertRaisesRegex(ValueError, "threshold"):
                run(source, Path(tmp) / "out.geojson", 0, "negative", 1, 1, 100)
            with self.assertRaisesRegex(ValueError, "no CRS"):
                run(source, Path(tmp) / "out.geojson", 5, "negative", 1, 1, 100)


if __name__ == "__main__":
    unittest.main()
