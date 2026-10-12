#!/usr/bin/env python3
"""Map broader candidate seabed structure zones from a bathymetry GeoTIFF.

This is recreational fishing decision support, not a fish finder, navigation chart,
or safety product. Depth values are normalized to positive-down metres.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.warp import transform_geom
from scipy.ndimage import binary_dilation, generate_binary_structure, label, generic_filter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_tif", type=Path, help="Input bathymetry GeoTIFF")
    parser.add_argument("output_geojson", type=Path, help="Output GeoJSON structure zones")
    parser.add_argument("--threshold-m", type=float, default=5.0,
                        help="Minimum depth below the local 8-cell mean, in metres (default: 5)")
    parser.add_argument("--depth-sign", choices=("negative", "positive"), default="negative",
                        help="Whether seabed elevations are negative (default) or depth is positive-down")
    parser.add_argument("--band", type=int, default=1, help="One-based raster band (default: 1)")
    parser.add_argument("--cluster-buffer-cells", type=int, default=1,
                        help="Expand candidate cells by this many pixels to show an area, not a pin (default: 1)")
    parser.add_argument("--max-zones", type=int, default=50000,
                        help="Maximum structure zones to export (default: 50000)")
    return parser.parse_args()


def local_neighbor_mean(window: np.ndarray) -> float:
    """Mean of finite neighbors in a 3x3 window, excluding its center."""
    neighbors = np.delete(window, window.size // 2)
    neighbors = neighbors[np.isfinite(neighbors)]
    return float(np.mean(neighbors)) if neighbors.size else np.nan


def detect_candidates(depth_m: np.ndarray, threshold_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Return local depth prominence and the mask of relatively deeper cells."""
    values = np.asarray(depth_m, dtype=np.float64).copy()
    values[~np.isfinite(values)] = np.nan
    neighbor_mean = generic_filter(
        values, local_neighbor_mean, size=(3, 3), mode="constant", cval=np.nan
    )
    prominence = values - neighbor_mean
    candidates = np.isfinite(values) & np.isfinite(neighbor_mean) & (prominence >= threshold_m)
    return prominence, candidates


def run(input_path: Path, output_path: Path, threshold_m: float, depth_sign: str,
        band: int, cluster_buffer_cells: int, max_zones: int) -> int:
    if threshold_m <= 0:
        raise ValueError("--threshold-m must be greater than zero")
    if cluster_buffer_cells < 0:
        raise ValueError("--cluster-buffer-cells cannot be negative")
    if max_zones < 1:
        raise ValueError("--max-zones must be at least 1")

    with rasterio.open(input_path) as dataset:
        if dataset.crs is None:
            raise ValueError("Input raster has no CRS; assign its real CRS before processing")
        if band < 1 or band > dataset.count:
            raise ValueError("Requested band is outside the raster's available band range")
        raw = dataset.read(band, masked=True).astype(np.float64).filled(np.nan)
        depth_m = -raw if depth_sign == "negative" else raw
        depth_m[~np.isfinite(raw) | (depth_m < 0)] = np.nan
        source_crs = dataset.crs
        source_name = input_path.name
        raster_transform = dataset.transform
        raster_shape = dataset.shape

    prominence, core_mask = detect_candidates(depth_m, threshold_m)
    if not np.any(core_mask):
        labels = np.zeros(raster_shape, dtype=np.int32)
        zone_mask = labels.astype(bool)
    else:
        # A small halo converts anomalous cells into visible areas. Connected candidate
        # cores that are near each other are grouped into one broader fishing-research zone.
        footprint = binary_dilation(core_mask, structure=np.ones((3, 3), dtype=bool), iterations=cluster_buffer_cells) if cluster_buffer_cells else core_mask.copy()
        connectivity = generate_binary_structure(2, 2)  # 8-neighbour connectivity
        labels, zone_count = label(footprint, structure=connectivity)
        zone_mask = labels > 0
        if zone_count > max_zones:
            raise ValueError(
                f"{zone_count} candidate zones exceed --max-zones={max_zones}; "
                "review the threshold or explicitly raise the safety limit"
            )

    features: list[dict[str, object]] = []
    for zone_id in range(1, int(labels.max()) + 1):
        footprint_mask = labels == zone_id
        core_rows, core_cols = np.where(core_mask & footprint_mask)
        if not len(core_rows):
            continue
        core_depths = depth_m[core_rows, core_cols]
        core_prominence = prominence[core_rows, core_cols]
        geometries = [
            geometry for geometry, value in shapes(
                footprint_mask.astype(np.uint8),
                mask=footprint_mask,
                transform=raster_transform,
                connectivity=8,
            ) if value == 1
        ]
        if not geometries:
            continue
        # Each connected label normally yields one polygon; MultiPolygon safely preserves
        # any disconnected raster fragments created by unusual affine transforms.
        geometry: dict[str, object]
        if len(geometries) == 1:
            geometry = geometries[0]
        else:
            geometry = {"type": "MultiPolygon", "coordinates": [
                item["coordinates"] for item in geometries
            ]}
        geometry_wgs84 = transform_geom(source_crs, "EPSG:4326", geometry, precision=7)
        footprint_cells = int(np.count_nonzero(footprint_mask))
        features.append({
            "type": "Feature",
            "geometry": geometry_wgs84,
            "properties": {
                "feature_type": "potential_coastal_seabed_structure_zone",
                "plain_language_summary": "Relatively deeper seabed area worth investigating; not a confirmed fish location.",
                "core_candidate_cells": int(len(core_rows)),
                "display_footprint_cells": footprint_cells,
                "deepest_candidate_depth_m": round(float(np.max(core_depths)), 2),
                "mean_candidate_depth_m": round(float(np.mean(core_depths)), 2),
                "maximum_local_depth_difference_m": round(float(np.max(core_prominence)), 2),
                "mean_local_depth_difference_m": round(float(np.mean(core_prominence)), 2),
                "threshold_m": float(threshold_m),
                "cluster_buffer_cells": int(cluster_buffer_cells),
                "source_raster": source_name,
                "source_crs": str(source_crs),
                "verification_status": "bathymetry_derived_candidate_not_field_verified",
                "fishing_guidance": "Depth changes may influence fish movement or feeding, but fish presence and species are not predicted.",
                "safety_note": "Not a navigation chart. Check authoritative charts, conditions, access and local regulations."
            }
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "name": "potential_coastal_seabed_structure_zones",
        "metadata": {
            "source_raster": source_name,
            "algorithm": "3x3 local neighbor depth prominence; nearby candidate cells grouped into display zones",
            "threshold_m": threshold_m,
            "depth_sign": depth_sign,
            "depth_units": "metres",
            "cluster_buffer_cells": cluster_buffer_cells,
            "zone_count": len(features),
            "status": "recreational_fishing_decision_support_candidates",
            "warning": "Zones indicate bathymetric shape only. They do not prove fish presence, species, legal access, or safe conditions.",
            "resolution_note": "Zone footprint depends on source raster resolution; buffer cells are pixels, not a fixed ground distance."
        },
        "features": features,
    }
    output_path.write_text(json.dumps(collection, indent=2) + "\n", encoding="utf-8")
    print(f"Bathymetry scan complete: {len(features)} candidate structure zone(s)")
    print(f"GeoJSON: {output_path}")
    print("Interpretation: broad areas to investigate, not exact fishing-hole pins or fish predictions.")
    return len(features)


def main() -> int:
    args = parse_args()
    try:
        run(args.input_tif, args.output_geojson, args.threshold_m, args.depth_sign,
            args.band, args.cluster_buffer_cells, args.max_zones)
    except (OSError, ValueError, rasterio.errors.RasterioError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
