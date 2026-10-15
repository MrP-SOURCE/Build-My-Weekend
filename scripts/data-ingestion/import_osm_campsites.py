#!/usr/bin/env python3
"""Normalize South African OSM campsite POIs from CSV or GeoJSON into a provenance-aware CSV.

This utility does not download data, certify a dataset's licence, or publish records.
Check the exact source dataset terms and attribution before running or redistributing output.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Iterable, Iterator
from urllib.parse import urlparse

OUTPUT_FIELDS = [
    "id", "name", "category", "latitude", "longitude", "tags_json",
    "region_id", "source_id", "source_record_id", "source_url",
    "source_updated_at", "imported_at", "verified_at", "licence_id",
    "attribution_text", "confidence",
]
# Broad bounding box for South Africa; used as a sanity check, not an authoritative border.
SA_BOUNDS = {"min_lat": -35.2, "max_lat": -22.0, "min_lon": 16.0, "max_lon": 33.5}


def _text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _first(record: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = record.get(key)
        if value is not None and _text(value):
            return _text(value)
    return ""


def _coordinates(record: dict[str, Any]) -> tuple[float, float] | None:
    geometry = record.get("_geometry")
    if isinstance(geometry, dict) and geometry.get("type") == "Point":
        coords = geometry.get("coordinates")
        if isinstance(coords, list) and len(coords) >= 2:
            try:
                return float(coords[1]), float(coords[0])
            except (TypeError, ValueError):
                return None
    lat = _first(record, "latitude", "lat", "y")
    lon = _first(record, "longitude", "lon", "lng", "long", "x")
    try:
        return float(lat), float(lon)
    except (TypeError, ValueError):
        return None


def _in_south_africa(lat: float, lon: float) -> bool:
    return (
        math.isfinite(lat) and math.isfinite(lon)
        and SA_BOUNDS["min_lat"] <= lat <= SA_BOUNDS["max_lat"]
        and SA_BOUNDS["min_lon"] <= lon <= SA_BOUNDS["max_lon"]
    )


def _tags(record: dict[str, Any]) -> dict[str, str]:
    # GeoJSON exports may place OSM tags in a nested object; CSV exports usually use columns.
    nested = record.get("tags")
    source = nested if isinstance(nested, dict) else record
    keys = (
        "tourism", "amenity", "leisure", "name", "name:en", "operator",
        "access", "fee", "caravans", "tents", "power", "drinking_water",
        "toilets", "shower", "website",
    )
    return {key: _text(source.get(key)) for key in keys if _text(source.get(key))}


def _is_campsite(tags: dict[str, str]) -> bool:
    return tags.get("tourism", "").lower() in {"camp_site", "caravan_site"}


def _read_csv(path: Path) -> Iterator[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def _read_geojson(path: Path) -> Iterator[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("GeoJSON input must be a FeatureCollection object with a features list.")
    for feature in data["features"]:
        if not isinstance(feature, dict):
            continue
        properties = feature.get("properties") or {}
        if not isinstance(properties, dict):
            continue
        record = dict(properties)
        record["_geometry"] = feature.get("geometry")
        if feature.get("id") is not None:
            record.setdefault("osm_id", feature["id"])
        yield record


def read_records(path: Path) -> Iterable[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return _read_csv(path)
    if suffix in {".geojson", ".json"}:
        return _read_geojson(path)
    raise ValueError("Input must be a .csv, .geojson, or GeoJSON .json file.")


def validate_source_metadata(*, source_id: str, source_url: str, licence_id: str, attribution_text: str) -> None:
    """Reject blank provenance and non-absolute/non-HTTP source URLs."""
    required = {
        "source ID": source_id,
        "source URL": source_url,
        "licence ID/review status": licence_id,
        "attribution text": attribution_text,
    }
    missing = [label for label, value in required.items() if not _text(value)]
    if missing:
        raise ValueError("Required provenance field(s) are blank: " + ", ".join(missing) + ".")
    parsed = urlparse(_text(source_url))
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise ValueError("Source URL must be an absolute HTTP(S) URL without embedded credentials.")


def normalize(
    record: dict[str, Any], *, source_id: str, source_url: str,
    licence_id: str, attribution_text: str, source_updated_at: str,
    imported_at: str,
) -> dict[str, str] | None:
    tags = _tags(record)
    if not _is_campsite(tags):
        return None
    coordinates = _coordinates(record)
    if coordinates is None:
        return None
    lat, lon = coordinates
    if not _in_south_africa(lat, lon):
        return None

    raw_id = _first(record, "osm_id", "@id", "id", "source_record_id")
    if not raw_id:
        return None
    name = _first(record, "name", "name:en") or "Unnamed campsite"
    # Keep only observed tags. Missing amenity fields remain unknown, not false.
    evidence_tags = {key: value for key, value in tags.items() if key not in {"name", "name:en"}}
    return {
        "id": f"osm:{raw_id}",
        "name": name,
        "category": "camping",
        "latitude": f"{lat:.6f}",
        "longitude": f"{lon:.6f}",
        "tags_json": json.dumps(evidence_tags, ensure_ascii=False, sort_keys=True),
        "region_id": "",
        "source_id": source_id,
        "source_record_id": raw_id,
        "source_url": source_url,
        "source_updated_at": source_updated_at,
        "imported_at": imported_at,
        "verified_at": "",
        "licence_id": licence_id,
        "attribution_text": attribution_text,
        "confidence": "unverified_source_record",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Downloaded CSV or GeoJSON file")
    parser.add_argument("output", type=Path, help="Normalized output CSV path")
    parser.add_argument("--source-id", required=True, help="Stable identifier for the source dataset")
    parser.add_argument("--source-url", required=True, help="Exact dataset/resource URL")
    parser.add_argument("--licence-id", required=True, help="Verified licence identifier or review status")
    parser.add_argument("--attribution", required=True, help="Required attribution text for the source")
    parser.add_argument("--source-updated-at", default="", help="Dataset snapshot/update date, if known")
    parser.add_argument("--imported-at", default="", help="Import timestamp/date supplied by operator")
    args = parser.parse_args()

    if not args.input.is_file():
        parser.error(f"Input file does not exist: {args.input}")
    if args.input.resolve() == args.output.resolve():
        parser.error("Input and output paths must be different.")

    temporary_output: Path | None = None
    try:
        validate_source_metadata(
            source_id=args.source_id, source_url=args.source_url,
            licence_id=args.licence_id, attribution_text=args.attribution,
        )
        accepted = 0
        rejected = 0
        duplicates = 0
        seen_ids: set[str] = set()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Write beside the destination, then atomically replace it only after a complete import.
        # Invalid input or an interrupted write must not destroy a previously usable dataset.
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="", dir=args.output.parent,
            prefix=f".{args.output.name}.", suffix=".tmp", delete=False,
        ) as handle:
            temporary_output = Path(handle.name)
            writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
            writer.writeheader()
            for record in read_records(args.input):
                normalized = normalize(
                    record, source_id=args.source_id, source_url=args.source_url,
                    licence_id=args.licence_id, attribution_text=args.attribution,
                    source_updated_at=args.source_updated_at, imported_at=args.imported_at,
                )
                if normalized is None:
                    rejected += 1
                    continue
                # Bulk POI exports can contain repeated OSM IDs; emit each source record once.
                if normalized["id"] in seen_ids:
                    duplicates += 1
                    continue
                seen_ids.add(normalized["id"])
                writer.writerow(normalized)
                accepted += 1
        os.replace(temporary_output, args.output)
        temporary_output = None
        print(
            f"Import complete: {accepted} unique campsite records accepted; "
            f"{rejected} records skipped; {duplicates} duplicate IDs skipped."
        )
        print("Output is not live availability or proof of legal access, safety, amenities, or fishing permission.")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        if temporary_output is not None:
            try:
                temporary_output.unlink(missing_ok=True)
            except OSError:
                pass
        print(f"Import failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
