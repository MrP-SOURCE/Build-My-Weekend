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
