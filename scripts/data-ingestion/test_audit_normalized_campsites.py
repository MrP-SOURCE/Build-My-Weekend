import csv
import json
import tempfile
import unittest
from pathlib import Path

from audit_normalized_campsites import audit


FIELDS = [
    "id", "name", "category", "latitude", "longitude", "tags_json",
    "source_id", "source_record_id", "source_url", "source_updated_at", "imported_at", "licence_id",
    "attribution_text", "confidence", "verified_at",
]


def sample_row(record_id="osm:node/1"):
    return {
        "id": record_id,
        "name": "Example Camp",
        "category": "camping",
        "latitude": "-33.900000",
        "longitude": "18.400000",
        "tags_json": json.dumps({"toilets": "yes"}),
        "source_id": "osm-test",
        "source_record_id": record_id.removeprefix("osm:"),
        "source_url": "https://example.org/dataset",
        "licence_id": "review-required",
        "attribution_text": "© OpenStreetMap contributors",
        "confidence": "unverified_source_record",
        "verified_at": "",
    }


class CampsiteAuditTests(unittest.TestCase):
    def write_csv(self, root, rows, fields=FIELDS):
        path = root / "campsites.csv"
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows({key: row.get(key, "") for key in fields} for row in rows)
        return path

    def test_valid_record_remains_review_only(self):
        with tempfile.TemporaryDirectory() as temp:
            path = self.write_csv(Path(temp), [sample_row()])
            report = audit(path)
        self.assertEqual(report["rows"], 1)
        self.assertEqual(report["rows_without_integrity_errors"], 1)
        self.assertEqual(report["errors"], [])
        self.assertFalse(report["publication_approved"])
        self.assertEqual(report["status"], "REVIEW_REQUIRED_NOT_PUBLISHED")

    def test_detects_duplicate_ids_and_invalid_coordinates(self):
        first = sample_row()
        second = sample_row()
        second["latitude"] = "nan"
        with tempfile.TemporaryDirectory() as temp:
            path = self.write_csv(Path(temp), [first, second])
            report = audit(path)
        joined = " ".join(report["errors"])
        self.assertIn("duplicate id osm:node/1", joined)
        self.assertIn("invalid latitude", joined)

    def test_detects_duplicate_source_identity_even_when_ids_differ(self):
        first = sample_row("osm:node/1")
        second = sample_row("osm:node/2")
        second["source_record_id"] = first["source_record_id"]
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [first, second]))
        self.assertIn("duplicate source record osm-test/node/1", " ".join(report["errors"]))

    def test_rejects_source_url_with_embedded_credentials(self):
        row = sample_row()
        row["source_url"] = "https://user:secret@example.org/dataset"
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        self.assertIn("without embedded credentials", " ".join(report["errors"]))

    def test_rejects_malformed_url_without_crashing_audit(self):
        row = sample_row()
        row["source_url"] = "https://[malformed.example/dataset"
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        self.assertIn("valid absolute HTTP(S) URL", " ".join(report["errors"]))

    def test_detects_missing_provenance_and_malformed_tags(self):
        row = sample_row()
        row["source_url"] = ""
        row["tags_json"] = "not-json"
        with tempfile.TemporaryDirectory() as temp:
            path = self.write_csv(Path(temp), [row])
            report = audit(path)
        joined = " ".join(report["errors"])
        self.assertIn("blank source_url", joined)
        self.assertIn("invalid tags_json", joined)

    def test_detects_missing_required_columns(self):
        with tempfile.TemporaryDirectory() as temp:
            path = self.write_csv(Path(temp), [sample_row()], fields=["id", "name"])
            report = audit(path)
        self.assertTrue(any("Missing required column" in error for error in report["errors"]))

    def test_rejects_non_camping_category_and_non_http_source_url(self):
        row = sample_row()
        row["category"] = "beach"
        row["source_url"] = "javascript:alert(1)"
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        joined = " ".join(report["errors"])
        self.assertIn("category must be camping", joined)
        self.assertIn("source_url must be an absolute HTTP(S) URL", joined)

    def test_rejects_coordinates_outside_south_africa_sanity_bounds(self):
        row = sample_row()
        row["latitude"] = "40.7128"
        row["longitude"] = "-74.0060"
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        joined = " ".join(report["errors"])
        self.assertIn("latitude outside South Africa sanity bounds", joined)
        self.assertIn("longitude outside South Africa sanity bounds", joined)

    def test_warns_when_source_dates_are_missing_or_stale(self):
        row = sample_row()
        row["source_updated_at"] = "2024-01-01"
        row["imported_at"] = ""
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        joined = " ".join(report["warnings"])
        self.assertIn("source_updated_at is over 365 days old", joined)
        self.assertIn("imported_at is blank", joined)

    def test_warns_on_unparseable_source_timestamps(self):
        row = sample_row()
        row["source_updated_at"] = "sometime recently"
        row["imported_at"] = "not-a-date"
        with tempfile.TemporaryDirectory() as temp:
            report = audit(self.write_csv(Path(temp), [row]))
        joined = " ".join(report["warnings"])
        self.assertIn("source_updated_at is not a recognized ISO date/timestamp", joined)
        self.assertIn("imported_at is not a recognized ISO date/timestamp", joined)

    def test_missing_file_is_an_error(self):
        with tempfile.TemporaryDirectory() as temp:
            report = audit(Path(temp) / "missing.csv")
        self.assertEqual(len(report["errors"]), 1)


if __name__ == "__main__":
    unittest.main()
