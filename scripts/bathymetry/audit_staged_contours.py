#!/usr/bin/env python3
"""Audit a staged DFFE/OCIMS contour GeoJSON without publishing it."""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path
from statistics import median


REQUIRED_METADATA = ("source", "source_owner", "status", "region_preset", "feature_count", "warning")
PROVENANCE_FIELDS = ("verdat", "inform", "recdat", "sordat", "sorind")


def audit(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("type") != "FeatureCollection" or not isinstance(payload.get("features"), list):
        raise ValueError("Input must be a GeoJSON FeatureCollection")
    features = payload["features"]
    metadata = payload.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("Staged collection is missing metadata")
    missing_metadata = [key for key in REQUIRED_METADATA if not metadata.get(key)]
    if missing_metadata:
        raise ValueError("Missing collection metadata: " + ", ".join(missing_metadata))
    if metadata.get("status") != "STAGED_FOR_REVIEW_NOT_PUBLISHED":
        raise ValueError("Input is not marked as review-only staging data")
    if not features:
        raise ValueError("No features available to audit")

    depths: list[float] = []
    missing_provenance = Counter()
    geometry_types = Counter()
    coordinates_seen: list[tuple[float, float]] = []
    object_ids: list[str] = []
    feature_geometry_bounds: list[tuple[float, float, float, float]] = []
    query_bounds = metadata.get("query_bounds_wgs84")
    if not isinstance(query_bounds, dict) or not all(
        isinstance(query_bounds.get(key), (int, float))
        for key in ("min_lon", "min_lat", "max_lon", "max_lat")
    ):
        raise ValueError("Missing or invalid WGS84 query bounds in staging metadata")
    if not (
        -180 <= query_bounds["min_lon"] < query_bounds["max_lon"] <= 180
        and -90 <= query_bounds["min_lat"] < query_bounds["max_lat"] <= 90
    ):
        raise ValueError("Invalid WGS84 query bounds in staging metadata")
    outside_region_count = 0
    for index, feature in enumerate(features):
        props = feature.get("properties") or {}
        depth = props.get("Depth")
        if isinstance(depth, bool) or not isinstance(depth, (int, float)) or not math.isfinite(depth):
            raise ValueError(f"Feature {index} has invalid numeric Depth")
        depths.append(float(depth))
        object_id = props.get("OBJECTID", feature.get("id"))
        if object_id is not None:
            object_ids.append(str(object_id))
        for key in PROVENANCE_FIELDS:
            if props.get(key) in (None, ""):
                missing_provenance[key] += 1
        geometry = feature.get("geometry") or {}
        kind = geometry.get("type", "missing")
        geometry_types[kind] += 1
        if kind not in ("LineString", "MultiLineString"):
            raise ValueError(f"Feature {index} has unsupported geometry type: {kind}")
        lines = [geometry.get("coordinates", [])] if kind == "LineString" else geometry.get("coordinates", [])
        for line in lines:
            for point in line:
                if not isinstance(point, list) or len(point) < 2:
                    raise ValueError(f"Feature {index} contains malformed coordinates")
                lon, lat = float(point[0]), float(point[1])
                if not math.isfinite(lon) or not math.isfinite(lat) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    raise ValueError(f"Feature {index} contains invalid WGS84 coordinates")
                coordinates_seen.append((lon, lat))
    if not coordinates_seen:
        raise ValueError("No coordinates found")

    min_lon = min(point[0] for point in coordinates_seen)
    min_lat = min(point[1] for point in coordinates_seen)
    max_lon = max(point[0] for point in coordinates_seen)
    max_lat = max(point[1] for point in coordinates_seen)
    # Source contour lines may extend beyond the query envelope; flag only features
    # whose complete geometry bounding box does not intersect the requested region.
    for feature in features:
        coords = []
        geometry = feature.get("geometry") or {}
        lines = [geometry.get("coordinates", [])] if geometry.get("type") == "LineString" else geometry.get("coordinates", [])
        for line in lines:
            for point in line:
                coords.append((float(point[0]), float(point[1])))
        if coords and (
            max(p[0] for p in coords) < query_bounds["min_lon"]
            or min(p[0] for p in coords) > query_bounds["max_lon"]
            or max(p[1] for p in coords) < query_bounds["min_lat"]
            or min(p[1] for p in coords) > query_bounds["max_lat"]
        ):
            outside_region_count += 1

    warnings = [
        "Depth units/sign and vertical datum must be confirmed from authoritative metadata.",
        "Feature geometry and source coverage require spatial review.",
        "Not a navigation product, verified fishing mark, or confirmation of safe/legal access.",
        "Do not publish or integrate until licensing, attribution, provenance and coverage are reviewed."
    ]
    if metadata.get("feature_count") != len(features):
        warnings.append("Collection feature_count metadata does not match the actual number of features.")
    if outside_region_count:
        warnings.append("Some full source geometries have bounding boxes outside the requested region; review spatial coverage.")
    if len(set(object_ids)) != len(object_ids):
        warnings.append("Duplicate source OBJECTID/feature identifiers detected.")

    return {
        "audit_status": "REVIEW_REQUIRED_NOT_PUBLICATION_APPROVAL",
        "input_file": path.name,
        "region": metadata.get("region_preset"),
        "source": metadata.get("source"),
        "source_status": metadata.get("status"),
        "feature_count": len(features),
        "metadata_feature_count_matches": metadata.get("feature_count") == len(features),
        "duplicate_feature_id_count": len(object_ids) - len(set(object_ids)),
        "features_outside_query_bounds_count": outside_region_count,
        "geometry_types": dict(sorted(geometry_types.items())),
        "depth_field": "Depth",
        "depth_value_count": len(depths),
        "depth_min": min(depths),
        "depth_median": median(depths),
        "depth_max": max(depths),
        "depth_units_confirmed": False,
        "vertical_datum_confirmed": False,
        "provenance_missing_counts": {key: missing_provenance.get(key, 0) for key in PROVENANCE_FIELDS},
        "wgs84_bounds": {
            "min_lon": min_lon,
            "min_lat": min_lat,
            "max_lon": max_lon,
            "max_lat": max_lat,
        },
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
