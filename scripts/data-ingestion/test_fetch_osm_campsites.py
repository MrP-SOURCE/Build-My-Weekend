import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from fetch_osm_campsites import fetch_snapshot

from fetch_osm_campsites import (
    overpass_query,
    overpass_to_geojson,
    validate_bbox,
)


class OSMCampsiteFetcherTests(unittest.TestCase):
    def test_rejects_broad_or_out_of_country_bounds(self):
        with self.assertRaisesRegex(ValueError, "too broad"):
            validate_bbox(-34.0, 17.0, -32.0, 19.0)
        with self.assertRaisesRegex(ValueError, "South Africa"):
            validate_bbox(-10.0, 17.0, -9.5, 17.5)

    def test_query_is_bounded_and_only_requests_campsites(self):
        query = overpass_query(-34.0, 18.0, -33.8, 18.3, 20)
        self.assertIn('node["tourism"~"^(camp_site|caravan_site)$"]', query)
        self.assertIn('way["tourism"~"^(camp_site|caravan_site)$"]', query)
        self.assertIn('relation["tourism"~"^(camp_site|caravan_site)$"]', query)
        self.assertIn("timeout:20", query)
        self.assertNotIn("out geom", query)

    def test_converts_nodes_and_way_centres_with_provenance(self):
        payload = {"elements": [
            {"type": "node", "id": 12, "lat": -33.9, "lon": 18.4,
             "tags": {"tourism": "camp_site", "name": "Node Camp", "toilets": "yes"}},
            {"type": "way", "id": 34, "center": {"lat": -33.8, "lon": 18.3},
             "tags": {"tourism": "caravan_site", "name": "Way Camp"}},
            {"type": "node", "id": 99, "lat": -33.7, "lon": 18.2,
             "tags": {"tourism": "viewpoint"}},
            {"type": "node", "id": 88, "lat": 200, "lon": 18.2,
             "tags": {"tourism": "camp_site"}},
        ]}
        result = overpass_to_geojson(
            payload, snapshot_at="2026-10-14T08:00:00+00:00",
            endpoint="https://overpass-api.de/api/interpreter",
        )
        self.assertEqual(result["metadata"]["status"], "REVIEW_REQUIRED_NOT_PUBLISHED")
        self.assertEqual(result["metadata"]["accepted_features"], 2)
        self.assertEqual(result["metadata"]["skipped_elements"], 2)
        self.assertEqual(result["features"][0]["id"], "node/12")
        self.assertEqual(result["features"][0]["geometry"]["coordinates"], [18.4, -33.9])
        self.assertEqual(result["features"][0]["properties"]["toilets"], "yes")
        self.assertIn("ODbL", result["metadata"]["licence"])
        self.assertIn("centre", result["features"][1]["properties"]["location_precision"])

    def test_fetch_snapshot_posts_bounded_query_and_returns_review_file_data(self):
        response = {"elements": [
            {"type": "node", "id": 7, "lat": -33.9, "lon": 18.4,
             "tags": {"tourism": "camp_site", "name": "Fixture Camp"}}
        ]}
        endpoint = "https://overpass.example.test/api/interpreter"
        with patch("fetch_osm_campsites.urlopen") as mocked:
            mocked.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()
            result = fetch_snapshot(
                -34.0, 18.0, -33.8, 18.3, endpoint=endpoint, timeout_s=10
            )
        request = mocked.call_args.args[0]
        self.assertEqual(request.full_url, endpoint)
        self.assertIn("node", request.data.decode())
        self.assertIn("camp_site", request.data.decode())
        self.assertEqual(mocked.call_args.kwargs["timeout"], 10)
        self.assertEqual(result["metadata"]["status"], "REVIEW_REQUIRED_NOT_PUBLISHED")
        self.assertEqual(result["metadata"]["accepted_features"], 1)

    def test_fetch_snapshot_rejects_insecure_or_credentialed_endpoint(self):
        for endpoint in (
            "http://overpass.example.test/api/interpreter",
            "https://user:password@overpass.example.test/api/interpreter",
            "not-a-url",
        ):
            with self.subTest(endpoint=endpoint):
                with patch("fetch_osm_campsites.urlopen") as mocked:
                    with self.assertRaisesRegex(ValueError, "HTTPS URL"):
                        fetch_snapshot(
                            -34.0, 18.0, -33.8, 18.3, endpoint=endpoint
                        )
                mocked.assert_not_called()

    def test_fetch_snapshot_rejects_invalid_timeout_without_network_call(self):
        with patch("fetch_osm_campsites.urlopen") as mocked:
            with self.assertRaisesRegex(ValueError, "between 5 and 60"):
                fetch_snapshot(
                    -34.0, 18.0, -33.8, 18.3, timeout_s=120
                )
        mocked.assert_not_called()

    def test_fetch_snapshot_surfaces_overpass_network_errors(self):
        with patch("fetch_osm_campsites.urlopen", side_effect=URLError("offline")):
            with self.assertRaisesRegex(ValueError, "Could not reach Overpass"):
                fetch_snapshot(-34.0, 18.0, -33.8, 18.3)

    def test_rejects_missing_elements_list(self):
        with self.assertRaisesRegex(ValueError, "elements list"):
            overpass_to_geojson({}, snapshot_at="test", endpoint="https://example.com")


if __name__ == "__main__":
    unittest.main()
