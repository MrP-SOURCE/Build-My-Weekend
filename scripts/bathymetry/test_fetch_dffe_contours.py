import unittest
from unittest.mock import patch

from fetch_dffe_contours import REGIONS, fetch_region


def feature(object_id=1, depth=-100):
    return {
        "type": "Feature",
        "id": object_id,
        "geometry": {
            "type": "LineString",
            "coordinates": [[18.5, -34.1], [18.6, -34.0]],
        },
        "properties": {"OBJECTID": object_id, "Depth": depth, "verdat": "fixture datum"},
    }


class DffeContourFetchTests(unittest.TestCase):
    def test_fetch_returns_attributed_staging_collection(self):
        with patch("fetch_dffe_contours._query_page", side_effect=[
            {"type": "FeatureCollection", "features": [feature()]},
            {"type": "FeatureCollection", "features": []},
        ]) as query:
            result = fetch_region("false-bay", max_records=10)

        self.assertEqual(result["type"], "FeatureCollection")
        self.assertEqual(result["metadata"]["status"], "STAGED_FOR_REVIEW_NOT_PUBLISHED")
        self.assertEqual(result["metadata"]["feature_count"], 1)
        self.assertEqual(result["metadata"]["output_crs"], "EPSG:4326")
        self.assertIn("not navigation charts", result["metadata"]["warning"])
        self.assertEqual(result["features"][0]["properties"]["Depth"], -100)
        self.assertEqual(result["features"][0]["properties"]["source_status"],
                         "official_source_contour_not_navigation_verified")
        self.assertEqual(query.call_args_list[0].args[0], REGIONS["false-bay"])
        self.assertEqual(query.call_args_list[0].args[1], 0)

    def test_empty_region_is_not_misreported_as_no_seabed_features(self):
        with patch("fetch_dffe_contours._query_page", return_value={
            "type": "FeatureCollection", "features": []
        }):
            with self.assertRaisesRegex(RuntimeError, "not interpret this as an absence"):
                fetch_region("algoa-bay")

    def test_rejects_out_of_region_country_geometry(self):
        bad = feature()
        bad["geometry"]["coordinates"][0][0] = [2.0, 48.0]
        with patch("fetch_dffe_contours._query_page", return_value={
            "type": "FeatureCollection", "features": [bad]
        }):
            with self.assertRaisesRegex(RuntimeError, "out-of-bounds"):
                fetch_region("false-bay")

    def test_record_limit_probes_for_truncation(self):
        with patch("fetch_dffe_contours._query_page", side_effect=[
            {"type": "FeatureCollection", "features": [feature()]},
            {"type": "FeatureCollection", "features": [feature(2)]},
        ]):
            with self.assertRaisesRegex(RuntimeError, "Record safety limit reached"):
                fetch_region("false-bay", max_records=1)

    def test_rejects_invalid_record_limit(self):
        with self.assertRaisesRegex(ValueError, "between 1 and 50000"):
            fetch_region("false-bay", max_records=0)


if __name__ == "__main__":
    unittest.main()
