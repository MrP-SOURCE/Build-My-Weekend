import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

from detect_bathymetry_holes import detect_candidates, run


class BathymetryHoleDetectionTests(unittest.TestCase):
    def test_detects_prominent_depression_and_ignores_nodata(self):
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

    def test_exports_geojson_with_wgs84_coordinates_and_disclosure(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "fixture.tif"
            output = Path(tmp) / "holes.geojson"
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

            count = run(source, output, 6, "negative", 1, 100)
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(count, 1)
            self.assertEqual(payload["type"], "FeatureCollection")
            feature = payload["features"][0]
            self.assertEqual(feature["geometry"]["type"], "Point")
            self.assertAlmostEqual(feature["geometry"]["coordinates"][0], 18.025, places=6)
            self.assertAlmostEqual(feature["geometry"]["coordinates"][1], -33.025, places=6)
            self.assertEqual(feature["properties"]["depth_m"], 24.0)
            self.assertEqual(feature["properties"]["verification_status"],
                             "algorithmic_candidate_not_field_verified")
            self.assertIn("not_verified_fishing_spots", payload["metadata"]["status"])

    def test_rejects_unknown_crs_and_invalid_threshold(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "no_crs.tif"
            with rasterio.open(
                source, "w", driver="GTiff", height=3, width=3, count=1,
                dtype="float32", transform=from_origin(0, 3, 1, 1),
            ) as dataset:
                dataset.write(np.ones((3, 3), dtype=np.float32), 1)
            with self.assertRaisesRegex(ValueError, "threshold"):
                run(source, Path(tmp) / "out.geojson", 0, "negative", 1, 100)
            with self.assertRaisesRegex(ValueError, "no CRS"):
                run(source, Path(tmp) / "out.geojson", 5, "negative", 1, 100)


if __name__ == "__main__":
    unittest.main()
