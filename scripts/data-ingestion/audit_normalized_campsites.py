#!/usr/bin/env python3
"""Audit normalized campsite CSV integrity without approving or publishing records.

The report is a quality-control aid only. It cannot verify legal access, safety,
live availability, licence compatibility, or the truth of amenity tags.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from urllib.parse import urlparse

SA_BOUNDS = {"min_lat": -35.2, "max_lat": -22.0, "min_lon": 16.0, "max_lon": 33.5}

REQUIRED_FIELDS = {
    "id", "name", "category", "latitude", "longitude", "tags_json",
    "source_id", "source_record_id", "source_url", "licence_id",
    "attribution_text", "confidence",
}


def audit(path: Path) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    if not path.is_file():
        return {
            "status": "REVIEW_REQUIRED_NOT_PUBLISHED",
            "rows": 0,
            "errors": [f"Input file does not exist: {path}"],
            "warnings": [],
        }

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        missing_fields = sorted(REQUIRED_FIELDS - fields)
        if missing_fields:
            errors.append("Missing required column(s): " + ", ".join(missing_fields))
        rows = list(reader)

    seen: set[str] = set()
    valid_rows = 0
    for line_number, row in enumerate(rows, start=2):
        row_errors: list[str] = []
        record_id = (row.get("id") or "").strip()
        if not record_id:
            row_errors.append("blank id")
        elif record_id in seen:
            row_errors.append(f"duplicate id {record_id}")
        else:
            seen.add(record_id)

        for field in ("name", "source_id", "source_record_id", "source_url", "licence_id", "attribution_text"):
            if not (row.get(field) or "").strip():
                row_errors.append(f"blank {field}")

        if (row.get("category") or "").strip() != "camping":
            row_errors.append("category must be camping")
        source_url = (row.get("source_url") or "").strip()
        parsed_url = urlparse(source_url)
        if source_url and (parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc):
            row_errors.append("source_url must be an absolute HTTP(S) URL")

        try:
            latitude = float(row.get("latitude", ""))
            longitude = float(row.get("longitude", ""))
            if not (math.isfinite(latitude) and -90 <= latitude <= 90):
                row_errors.append("invalid latitude")
            if not (math.isfinite(longitude) and -180 <= longitude <= 180):
                row_errors.append("invalid longitude")
            if math.isfinite(latitude) and not (SA_BOUNDS["min_lat"] <= latitude <= SA_BOUNDS["max_lat"]):
                row_errors.append("latitude outside South Africa sanity bounds")
            if math.isfinite(longitude) and not (SA_BOUNDS["min_lon"] <= longitude <= SA_BOUNDS["max_lon"]):
                row_errors.append("longitude outside South Africa sanity bounds")
        except (TypeError, ValueError):
            row_errors.append("non-numeric coordinates")

        try:
            tags = json.loads(row.get("tags_json") or "")
            if not isinstance(tags, dict):
                row_errors.append("tags_json must contain a JSON object")
        except (json.JSONDecodeError, TypeError):
            row_errors.append("invalid tags_json")

        if (row.get("confidence") or "").strip() != "unverified_source_record":
            warnings.append(f"Row {line_number}: confidence label differs from expected unverified_source_record.")
        if (row.get("verified_at") or "").strip():
            warnings.append(f"Row {line_number}: verified_at is populated; independently confirm the verification process.")
        if row_errors:
            errors.append(f"Row {line_number}: " + "; ".join(row_errors))
        else:
            valid_rows += 1

    return {
        "status": "REVIEW_REQUIRED_NOT_PUBLISHED",
        "rows": len(rows),
        "rows_without_integrity_errors": valid_rows,
        "errors": errors,
        "warnings": warnings,
        "publication_approved": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Normalized campsite CSV to audit")
    parser.add_argument("--report", type=Path, help="Optional JSON report output path")
    args = parser.parse_args()
    try:
        report = audit(args.input)
        rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(rendered, encoding="utf-8")
        print(rendered, end="")
        return 1 if report["errors"] else 0
    except OSError as exc:
        print(f"Audit failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
