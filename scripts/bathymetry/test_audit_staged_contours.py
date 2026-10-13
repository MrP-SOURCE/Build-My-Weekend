import json
import tempfile
import unittest
from pathlib import Path

from audit_staged_contours import audit


def staged_payload():
    return {
        "type": "FeatureCollection",
        "metadata": {
            "source": "https://example.gov/layer",
            "source_owner": "DFFE / OCIMS",
            "status": "STAGED_FOR_REVIEW_NOT_PUBLISHED",
            "region_preset": "false-bay",
            "feature_count": 1,
            "warning": "Review only",
            "query_bounds_wgs84": {"min_lon": 18.35, "min_lat": -34.35, "max_lon": 19.15, "max_lat": -33.95},
        },
        "features": [{
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[18.5, -34.1], [18.6, -34.0]]},
            "properties": {"Depth": -25, "verdat": "unknown"},
        }],
    }


class StagedContourAuditTests(unittest.TestCase):
    def test_reports_depth_bounds_and_review_only_status(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "staged.geojson"
            path.write_text(json.dumps(staged_payload()), encoding="utf-8")
            result = audit(path)
        self.assertEqual(result["audit_status"], "REVIEW_REQUIRED_NOT_PUBLICATION_APPROVAL")
        self.assertEqual(result["region"], "false-bay")
        self.assertEqual(result["depth_min"], -25)
        self.assertFalse(result["depth_units_confirmed"])
        self.assertFalse(result["vertical_datum_confirmed"])
        self.assertEqual(result["wgs84_bounds"]["max_lon"], 18.6)
        self.assertEqual(result["provenance_missing_counts"]["verdat"], 0)
        self.assertEqual(result["provenance_missing_counts"]["inform"], 1)


    def test_reports_duplicate_ids_and_geometry_outside_region(self):
        payload = staged_payload()
        payload["metadata"]["feature_count"] = 2
        second = json.loads(json.dumps(payload["features"][0]))
        second["properties"]["OBJECTID"] = payload["features"][0]["properties"].get("OBJECTID", 1)
        second["geometry"]["coordinates"] = [[30.0, -20.0], [30.1, -20.1]]
        payload["features"].append(second)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "staged.geojson"
            path.write_text(json.dumps(payload), encoding="utf-8")
            result = audit(path)
        self.assertEqual(result["duplicate_feature_id_count"], 1)
        self.assertEqual(result["features_outside_query_bounds_count"], 1)
        self.assertTrue(any("Duplicate source" in warning for warning in result["warnings"]))
        self.assertTrue(any("outside the requested region" in warning for warning in result["warnings"]))

    def test_rejects_missing_query_bounds(self):
        payload = staged_payload()
        del payload["metadata"]["query_bounds_wgs84"]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "staged.geojson"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "query bounds"):
                audit(path)

    def test_rejects_data_not_marked_as_staging(self):
        payload = staged_payload()
        payload["metadata"]["status"] = "PUBLISHED"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "staged.geojson"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "review-only staging"):
                audit(path)

    def test_rejects_non_numeric_depth(self):
        payload = staged_payload()
        payload["features"][0]["properties"]["Depth"] = "deep"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "staged.geojson"
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "invalid numeric Depth"):
                audit(path)


if __name__ == "__main__":
    unittest.main()
