#!/usr/bin/env python3
"""Detect candidate seabed depressions in a bathymetry GeoTIFF and export GeoJSON.

This is a screening tool, not a fish finder, navigation chart, or safety product.
Depth values are normalized to positive-down metres before local prominence is tested.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform as transform_coordinates
from scipy.ndimage import generic_filter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_tif", type=Path, help="Input bathymetry GeoTIFF")
    parser.add_argument("output_geojson", type=Path, help="Output GeoJSON FeatureCollection")
    parser.add_argument(
        "--threshold-m", type=float, default=5.0,
        help="Minimum depth below the surrounding 8-cell mean, in metres (default: 5)",
    )
    parser.add_argument(
        "--depth-sign", choices=("negative", "positive"), default="negative",
        help="Raster convention: negative elevation values for seabed (default), "
             "or positive-down depth values",
    )
    parser.add_argument(
        "--band", type=int, default=1, help="One-based raster band to read (default: 1)"
    )
    parser.add_argument(
        "--max-points", type=int, default=50000,
        help="Safety limit for exported candidate pins (default: 50000)",
    )
    return parser.parse_args()


def local_neighbor_mean(window: np.ndarray) -> float:
    """Mean of finite neighbors in a 3x3 window, excluding its center."""
    center_index = window.size // 2
    neighbors = np.delete(window, center_index)
    neighbors = neighbors[np.isfinite(neighbors)]
    if neighbors.size == 0:
        return np.nan
    return float(np.mean(neighbors))


def detect_candidates(depth_m: np.ndarray, threshold_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Return per-cell prominence and a candidate mask, respecting nodata and edges."""
    values = np.asarray(depth_m, dtype=np.float64).copy()
    values[~np.isfinite(values)] = np.nan
    neighbor_mean = generic_filter(
        values, local_neighbor_mean, size=(3, 3), mode="constant", cval=np.nan
    )
    prominence = values - neighbor_mean
    candidates = np.isfinite(values) & np.isfinite(neighbor_mean) & (prominence >= threshold_m)
    return prominence, candidates


def run(input_path: Path, output_path: Path, threshold_m: float, depth_sign: str,
        band: int, max_points: int) -> int:
    if threshold_m <= 0:
        raise ValueError("--threshold-m must be greater than zero")
    if max_points < 1:
        raise ValueError("--max-points must be at least 1")

    with rasterio.open(input_path) as dataset:
        if dataset.crs is None:
            raise ValueError("Input raster has no CRS; assign its real CRS before processing")
        if band < 1 or band > dataset.count:
            raise ValueError("Requested band is outside the raster's available band range")
        raw = dataset.read(band, masked=True).astype(np.float64).filled(np.nan)
        nodata_mask = ~np.isfinite(raw)
        depth_m = -raw if depth_sign == "negative" else raw
        depth_m[nodata_mask | (depth_m < 0)] = np.nan
        source_crs = dataset.crs
        source_name = input_path.name
        transform = dataset.transform

    prominence, candidates = detect_candidates(depth_m, threshold_m)
    rows, cols = np.where(candidates)
    if len(rows) > max_points:
        raise ValueError(
            str(len(rows)) + " candidate cells exceed --max-points=" + str(max_points)
            + "; increase the threshold or explicitly raise the safety limit"
        )

    x_coords: list[float] = []
    y_coords: list[float] = []
    properties: list[dict[str, object]] = []
    for row, col in zip(rows.tolist(), cols.tolist()):
        x, y = rasterio.transform.xy(transform, row, col, offset="center")
        x_coords.append(float(x))
        y_coords.append(float(y))
        properties.append({
            "feature_type": "candidate_seabed_depression",
            "depth_m": round(float(depth_m[row, col]), 2),
            "neighbor_mean_depth_m": round(float(depth_m[row, col] - prominence[row, col]), 2),
            "prominence_m": round(float(prominence[row, col]), 2),
            "threshold_m": float(threshold_m),
            "raster_row": int(row),
            "raster_col": int(col),
            "source_raster": source_name,
            "source_crs": str(source_crs),
            "verification_status": "algorithmic_candidate_not_field_verified",
            "advisory": "Bathymetry shape only; fish presence, access, regulations, and safety are unverified."
        })

    if x_coords:
        lon, lat = transform_coordinates(
            source_crs, "EPSG:4326", x_coords, y_coords
        )
        features = [{
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(float(lon[i]), 7), round(float(lat[i]), 7)]},
            "properties": properties[i],
        } for i in range(len(properties))]
    else:
        features = []

    output_path.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": "candidate_seabed_depressions",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "metadata": {
            "source_raster": source_name,
            "algorithm": "3x3 local neighbor mean; center excluded",
            "threshold_m": threshold_m,
            "depth_sign": depth_sign,
            "depth_units": "metres",
            "feature_count": len(features),
            "status": "research_candidates_only_not_verified_fishing_spots",
            "warning": "Do not use as a navigation chart, safety aid, or proof of fish presence."
        },
        "features": features,
    }
    output_path.write_text(json.dumps(collection, indent=2) + "\n", encoding="utf-8")
    print("Bathymetry scan complete: " + str(len(features)) + " candidate feature(s)")
    print("GeoJSON: " + str(output_path))
    print("Status: candidate topography only; not verified fishing spots or navigation data.")
    return len(features)


def main() -> int:
    args = parse_args()
    try:
        run(args.input_tif, args.output_geojson, args.threshold_m, args.depth_sign,
            args.band, args.max_points)
    except (OSError, ValueError, rasterio.errors.RasterioError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
