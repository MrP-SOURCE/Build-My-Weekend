#!/usr/bin/env python3
"""Fetch a small, explicitly bounded OSM campsite snapshot from Overpass.

This creates a local review file only. It does not publish records or establish
current operation, booking availability, legal access, safety, or amenities.
Respect Overpass capacity and OpenStreetMap attribution/licensing requirements.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter"
MAX_SPAN_DEGREES = 1.0
MAX_AREA_SQUARE_DEGREES = 0.5
USER_AGENT = "BuildMyWeekend-ResearchImporter/1.0 (bounded, user-triggered data snapshot)"


def validate_bbox(south: float, west: float, north: float, east: float) -> None:
    values = (south, west, north, east)
    if not all(math.isfinite(v) for v in values):
        raise ValueError("Bounding-box coordinates must be finite numbers.")
    if not (-35.2 <= south < north <= -22.0 and 16.0 <= west < east <= 33.5):
        raise ValueError("Bounding box must be ordered and inside the broad South Africa sanity bounds.")
    if north - south > MAX_SPAN_DEGREES or east - west > MAX_SPAN_DEGREES:
        raise ValueError("Bounding box is too broad; use a smaller local area (maximum 1 degree per side).")
    if (north - south) * (east - west) > MAX_AREA_SQUARE_DEGREES:
        raise ValueError("Bounding box area is too broad; split it into smaller local requests.")


def overpass_query(south: float, west: float, north: float, east: float, timeout_s: int) -> str:
    validate_bbox(south, west, north, east)
    bbox = f"{south:.6f},{west:.6f},{north:.6f},{east:.6f}"
    return (
        f"[out:json][timeout:{timeout_s}];("
        f'node["tourism"~"^(camp_site|caravan_site)$"]({bbox});'
        f'way["tourism"~"^(camp_site|caravan_site)$"]({bbox});'
        f'relation["tourism"~"^(camp_site|caravan_site)$"]({bbox});'
        ");out center tags;"
    )


def overpass_to_geojson(payload: dict, *, snapshot_at: str, endpoint: str) -> dict:
    elements = payload.get("elements")
    if not isinstance(elements, list):
        raise ValueError("Overpass response has no elements list.")
    features = []
    skipped = 0
    for element in elements:
        if not isinstance(element, dict):
            skipped += 1
            continue
        tags = element.get("tags")
        if not isinstance(tags, dict) or tags.get("tourism") not in {"camp_site", "caravan_site"}:
            skipped += 1
            continue
        kind, osm_id = element.get("type"), element.get("id")
        if kind not in {"node", "way", "relation"} or not isinstance(osm_id, int):
            skipped += 1
            continue
        lat = element.get("lat")
        lon = element.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            center = element.get("center")
            if not isinstance(center, dict):
                skipped += 1
                continue
            lat, lon = center.get("lat"), center.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            skipped += 1
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            skipped += 1
            continue
        features.append({
            "type": "Feature",
            "id": f"{kind}/{osm_id}",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                **tags,
                "osm_id": f"{kind}/{osm_id}",
                "osm_element_type": kind,
                "source_url": f"https://www.openstreetmap.org/{kind}/{osm_id}",
                "snapshot_at": snapshot_at,
                "location_precision": "OSM node coordinate" if kind == "node" else "Overpass element centre; not surveyed entrance",
            },
        })
    return {
        "type": "FeatureCollection",
        "name": "review_only_osm_campsite_snapshot",
        "metadata": {
            "source": "OpenStreetMap via Overpass API",
            "endpoint": endpoint,
            "snapshot_at": snapshot_at,
            "attribution": "© OpenStreetMap contributors",
            "licence": "ODbL 1.0; verify obligations before redistribution",
            "status": "REVIEW_REQUIRED_NOT_PUBLISHED",
            "returned_elements": len(elements),
            "accepted_features": len(features),
            "skipped_elements": skipped,
            "warning": "Mapped points do not prove operating status, availability, legal access, safety, or amenity accuracy.",
        },
        "features": features,
    }


def fetch_snapshot(south: float, west: float, north: float, east: float, *,
                   endpoint: str = DEFAULT_ENDPOINT, timeout_s: int = 30) -> dict:
    if not 5 <= timeout_s <= 60:
        raise ValueError("Network timeout must be between 5 and 60 seconds.")
    query = overpass_query(south, west, north, east, min(timeout_s, 25))
    request = Request(
        endpoint,
        data=query.encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                 "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout_s) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise ValueError(f"Overpass returned HTTP {exc.code}; wait and retry later.") from exc
    except URLError as exc:
        raise ValueError(f"Could not reach Overpass: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError("Overpass returned invalid JSON.") from exc
    snapshot_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return overpass_to_geojson(payload, snapshot_at=snapshot_at, endpoint=endpoint)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="Output review-only GeoJSON file")
    parser.add_argument("--south", type=float, required=True)
    parser.add_argument("--west", type=float, required=True)
    parser.add_argument("--north", type=float, required=True)
    parser.add_argument("--east", type=float, required=True)
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Overpass endpoint")
    parser.add_argument("--timeout", type=int, default=30, help="Network timeout seconds (5-60)")
    args = parser.parse_args()
    try:
        data = fetch_snapshot(args.south, args.west, args.north, args.east,
                              endpoint=args.endpoint, timeout_s=args.timeout)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Snapshot complete: {data['metadata']['accepted_features']} campsite features.")
        print(f"Review file: {args.output}")
        print("Status: REVIEW_REQUIRED_NOT_PUBLISHED; confirm licence, attribution, access and record freshness.")
        return 0
    except (OSError, ValueError) as exc:
        print(f"Snapshot failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
