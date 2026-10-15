import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from import_osm_campsites import normalize, read_records, validate_source_metadata


class OSMCampsiteImportTests(unittest.TestCase):
    def setUp(self):
        self.meta = {
            "source_id": "hdx-hotosm-zaf-poi",
            "source_url": "https://data.humdata.org/dataset/hotosm_zaf_points_of_interest",
            "licence_id": "reviewed-test-fixture",
            "attribution_text": "© OpenStreetMap contributors",
            "source_updated_at": "2026-10-01",
            "imported_at": "2026-10-12",
        }

    def test_rejects_blank_required_provenance(self):
        with self.assertRaisesRegex(ValueError, "source URL"):
            validate_source_metadata(
                source_id="source", source_url="", licence_id="reviewed",
                attribution_text="Attribution",
            )
        with self.assertRaisesRegex(ValueError, "attribution text"):
            validate_source_metadata(
                source_id="source", source_url=self.meta["source_url"],
                licence_id="reviewed", attribution_text="  ",
            )

    def test_rejects_non_http_source_url(self):
        with self.assertRaisesRegex(ValueError, "HTTP\(S\)"):
            validate_source_metadata(
                source_id="source", source_url="file:///tmp/dataset.csv",
                licence_id="reviewed", attribution_text="Attribution",
            )

    def test_rejects_source_url_with_embedded_credentials(self):
        with self.assertRaisesRegex(ValueError, "without embedded credentials"):
            validate_source_metadata(
                source_id="source",
                source_url="https://user:secret@example.org/dataset",
                licence_id="reviewed",
                attribution_text="Attribution",
            )

    def test_accepts_complete_source_provenance(self):
        validate_source_metadata(
            source_id=self.meta["source_id"], source_url=self.meta["source_url"],
            licence_id=self.meta["licence_id"], attribution_text=self.meta["attribution_text"],
        )

    def test_normalizes_campsite_with_provenance(self):
        record = {
            "osm_id": "node/123", "name": "Test Camp", "tourism": "camp_site",
            "lat": "-33.9", "lon": "18.4", "toilets": "yes",
        }
        result = normalize(record, **self.meta)
        self.assertIsNotNone(result)
        self.assertEqual(result["category"], "camping")
        self.assertEqual(result["source_record_id"], "node/123")
        self.assertEqual(result["source_url"], self.meta["source_url"])
        self.assertEqual(result["confidence"], "unverified_source_record")
        self.assertEqual(json.loads(result["tags_json"])["toilets"], "yes")
        self.assertEqual(result["verified_at"], "")

    def test_skips_non_campsite(self):
        record = {"osm_id": "node/1", "tourism": "viewpoint", "lat": "-33.9", "lon": "18.4"}
        self.assertIsNone(normalize(record, **self.meta))

    def test_skips_invalid_or_out_of_bounds_coordinates(self):
        missing = {"osm_id": "node/2", "tourism": "camp_site", "lat": "bad", "lon": "18.4"}
        overseas = {"osm_id": "node/3", "tourism": "camp_site", "lat": "40.0", "lon": "-74.0"}
        self.assertIsNone(normalize(missing, **self.meta))
        self.assertIsNone(normalize(overseas, **self.meta))

    def test_skips_record_without_stable_source_id(self):
        record = {"tourism": "camp_site", "lat": "-33.9", "lon": "18.4"}
        self.assertIsNone(normalize(record, **self.meta))

    def test_rejects_geojson_with_non_object_root(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "invalid-root.geojson"
            path.write_text("[]", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "FeatureCollection object"):
                list(read_records(path))

    def test_reads_geojson_point_features(self):
        feature_collection = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature", "id": "node/77",
                "geometry": {"type": "Point", "coordinates": [18.4, -33.9]},
                "properties": {"name": "Geo Camp", "tourism": "camp_site", "toilets": "yes"},
            }],
        }
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "sample.geojson"
            path.write_text(json.dumps(feature_collection), encoding="utf-8")
            records = list(read_records(path))
        result = normalize(records[0], **self.meta)
        self.assertIsNotNone(result)
        self.assertEqual(result["name"], "Geo Camp")
        self.assertEqual(result["latitude"], "-33.900000")
        self.assertEqual(result["longitude"], "18.400000")

    def test_reads_csv(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "sample.csv"
            path.write_text("osm_id,name,tourism,lat,lon\nnode/8,CSV Camp,camp_site,-33.9,18.4\n", encoding="utf-8")
            records = list(read_records(path))
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["name"], "CSV Camp")

    def test_cli_deduplicates_repeated_source_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "duplicate-campsites.csv"
            output = root / "normalized.csv"
            source.write_text(
                "osm_id,name,tourism,lat,lon\n"
                "node/42,Repeat Camp,camp_site,-33.9,18.4\n"
                "node/42,Repeat Camp,camp_site,-33.9,18.4\n",
                encoding="utf-8",
            )
            script = Path(__file__).with_name("import_osm_campsites.py")
            result = subprocess.run(
                [
                    sys.executable, str(script), str(source), str(output),
                    "--source-id", self.meta["source_id"],
                    "--source-url", self.meta["source_url"],
                    "--licence-id", self.meta["licence_id"],
                    "--attribution", self.meta["attribution_text"],
                    "--source-updated-at", self.meta["source_updated_at"],
                    "--imported-at", self.meta["imported_at"],
                ],
                check=True, capture_output=True, text=True,
            )
            with output.open("r", encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["source_record_id"], "node/42")
            self.assertIn("1 duplicate IDs skipped", result.stdout)



if __name__ == "__main__":
    unittest.main()
