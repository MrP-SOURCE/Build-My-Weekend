#!/usr/bin/env python3
"""Download a bounded, attributed GeoJSON subset of DFFE/OCIMS bathymetry contours.

This is an acquisition/staging utility. It does not publish data to the app, assert
navigation suitability, or treat contours as confirmed fishing locations.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

LAYER_URL = "https://paca.environment.gov.za/par/rest/services/OC/NDIR_Nat_Env/MapServer/1"
REGIONS = {
    "false-bay": {"min_lon": 18.35, "min_lat": -34.35, "max_lon": 19.15, "max_lat": -33.95},
    "algoa-bay": {"min_lon": 25.45, "min_lat": -34.15, "max_lon": 26.75, "max_lat": -33.65},
    "wild-coast": {"min_lon": 28.45, "min_lat": -32.95, "max_lon": 29.95, "max_lat": -31.05},
}
OUT_FIELDS = "OBJECTID,Depth,valdco,verdat,scamin,scamax,inform,ninfom,txtdsc,ntxtds,recdat,recind,sordat,sorind,Shape_Length"
PAGE_SIZE = 2000
SOUTH_AFRICA = {"min_lon": 15.0, "max_lon": 35.0, "min_lat": -36.0, "max_lat": -21.0}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", choices=sorted(REGIONS), required=True)
    parser.add_argument("--output", type=Path, required=True, help="Staging GeoJSON output path")
    parser.add_argument("--max-records", type=int, default=10000, help="Hard request limit (1-50000; default 10000)")
    parser.add_argument("--timeout", type=float, default=30, help="Per-request timeout in seconds")
    return parser.parse_args()


def _query_page(region: dict[str, float], offset: int, timeout: float, record_count: int = PAGE_SIZE) -> dict:
    params = {
        "f": "geojson",
        "where": "1=1",
        "outFields": OUT_FIELDS,
        "returnGeometry": "true",
        "outSR": "4326",
        "geometry": json.dumps({
            "xmin": region["min_lon"], "ymin": region["min_lat"],
            "xmax": region["max_lon"], "ymax": region["max_lat"],
            "spatialReference": {"wkid": 4326},
        }, separators=(",", ":")),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "resultRecordCount": str(record_count),
        "resultOffset": str(offset),
        "orderByFields": "OBJECTID ASC",
    }
    request = Request(
        LAYER_URL + "/query?" + urlencode(params),
        headers={"Accept": "application/geo+json, application/json", "User-Agent": "BuildMyWeekend-DataStaging/1.0"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"DFFE contour query failed at record offset {offset}: {exc}") from exc
    if not isinstance(payload, dict) or payload.get("type") != "FeatureCollection" or not isinstance(payload.get("features"), list):
        raise RuntimeError(f"DFFE returned an unexpected GeoJSON response at offset {offset}")
    return payload


def _valid_south_african_geometry(geometry: object) -> bool:
    if not isinstance(geometry, dict) or geometry.get("type") not in {"LineString", "MultiLineString"}:
        return False
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or not coordinates:
        return False

    def walk(value: object) -> list[object]:
        if not isinstance(value, list):
            return [value]
        result: list[object] = []
        for item in value:
            result.extend(walk(item))
        return result

    # Flatten into coordinate pairs by geometry nesting depth.
    lines = [coordinates] if geometry["type"] == "LineString" else coordinates
    found = False
    for line in lines:
        if not isinstance(line, list):
            return False
        for point in line:
            if not isinstance(point, list) or len(point) < 2:
                return False
            try:
                lon, lat = float(point[0]), float(point[1])
            except (TypeError, ValueError):
                return False
            if not (SOUTH_AFRICA["min_lon"] <= lon <= SOUTH_AFRICA["max_lon"] and
                    SOUTH_AFRICA["min_lat"] <= lat <= SOUTH_AFRICA["max_lat"]):
                return False
            found = True
    return found


def fetch_region(region_name: str, max_records: int = 10000, timeout: float = 30) -> dict:
    if region_name not in REGIONS:
        raise ValueError("Unknown region preset")
    if not 1 <= max_records <= 50000:
        raise ValueError("--max-records must be between 1 and 50000")
    if timeout <= 0:
        raise ValueError("--timeout must be greater than zero")

    region = REGIONS[region_name]
    features: list[dict] = []
    offset = 0
    while offset < max_records:
        page = _query_page(region, offset, timeout, min(PAGE_SIZE, max_records - len(features)))
        page_features = page["features"]
        for feature in page_features:
            if not isinstance(feature, dict) or not _valid_south_african_geometry(feature.get("geometry")):
                raise RuntimeError("DFFE response contained a non-line or out-of-bounds geometry; staging aborted")
            properties = feature.get("properties")
            if not isinstance(properties, dict) or not isinstance(properties.get("Depth"), (int, float)):
                raise RuntimeError("DFFE response is missing numeric Depth metadata; staging aborted")
            feature.setdefault("properties", {})["source_layer"] = LAYER_URL
            feature["properties"]["source_status"] = "official_source_contour_not_navigation_verified"
            features.append(feature)
            if len(features) >= max_records:
                break
        if len(features) >= max_records:
            # Probe one extra record so an exact-size result is not falsely reported as truncated.
            probe = _query_page(region, max_records, timeout, 1)
            if probe["features"]:
                raise RuntimeError(f"Record safety limit reached ({max_records}); raise --max-records deliberately or narrow the region")
            break
        if not page_features:
            break
        offset += len(page_features)
        if not page.get("exceededTransferLimit") and len(page_features) < PAGE_SIZE:
            break

    if not features:
        raise RuntimeError("No bathymetry contours returned for this region; do not interpret this as an absence of seabed features")
    return {
        "type": "FeatureCollection",
        "name": f"dffe_ocims_bathymetry_contours_{region_name}",
        "metadata": {
            "source": LAYER_URL,
            "source_owner": "Department of Forestry, Fisheries and the Environment / OCIMS",
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "region_preset": region_name,
            "query_bounds_wgs84": region,
            "output_crs": "EPSG:4326",
            "depth_field": "Depth",
            "source_fields_preserved": OUT_FIELDS.split(","),
            "feature_count": len(features),
            "status": "STAGED_FOR_REVIEW_NOT_PUBLISHED",
            "warning": "Contours are not navigation charts, verified fishing marks, fish forecasts, or proof of safe/legal access. Check source datum, metadata, currency, licensing and local regulations before use.",
        },
        "features": features,
    }


def main() -> int:
    args = parse_args()
    try:
        payload = fetch_region(args.region, args.max_records, args.timeout)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Staged {payload['metadata']['feature_count']} DFFE contour features for {args.region}.")
    print(f"Output: {args.output}")
    print("NOT PUBLISHED: review source metadata, datum, geometry, terms and coverage before app integration.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
