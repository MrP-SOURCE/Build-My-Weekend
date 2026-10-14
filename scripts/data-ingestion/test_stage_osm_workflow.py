"""Static safety checks for the manual review-only OSM staging workflow."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

from fetch_osm_campsites import validate_bbox

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "stage-osm-campsites-manual.yml"


class OSMStagingWorkflowSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_workflow_has_read_only_permissions_and_temporary_artifact(self):
        self.assertIn("permissions:\n  contents: read", self.workflow)
        self.assertIn("actions/upload-artifact@v4", self.workflow)
        self.assertIn("retention-days: 7", self.workflow)
        self.assertIn("REVIEW_REQUIRED_NOT_PUBLISHED", self.workflow)
        self.assertNotIn("contents: write", self.workflow)
        self.assertNotIn("actions/deploy-pages", self.workflow)
        self.assertNotIn("git push", self.workflow.lower())

    def test_predefined_areas_are_bounded_and_inside_south_africa(self):
        expected = {
            "cape-town": (-34.05, 18.30, -33.75, 18.60),
            "garden-route": (-34.10, 22.20, -33.80, 22.50),
            "durban-north": (-30.10, 30.80, -29.80, 31.10),
            "johannesburg-north": (-26.10, 27.90, -25.80, 28.20),
        }
        for name, bounds in expected.items():
            with self.subTest(area=name):
                south, west, north, east = bounds
                validate_bbox(south, west, north, east)
                self.assertIn(f"{name})", self.workflow)

    def test_workflow_does_not_run_network_fetch_on_push_or_schedule(self):
        trigger_block = self.workflow.split("permissions:", 1)[0]
        self.assertIn("workflow_dispatch:", trigger_block)
        self.assertNotIn("\n  push:", trigger_block)
        self.assertNotIn("\n  schedule:", trigger_block)

    def test_workflow_checks_snapshot_attribution_and_feature_count(self):
        self.assertIn("OpenStreetMap contributors", self.workflow)
        self.assertIn("accepted_features", self.workflow)
        self.assertIn("len(data['features'])", self.workflow)
        self.assertIn("ODbL", self.workflow)


if __name__ == "__main__":
    unittest.main()
