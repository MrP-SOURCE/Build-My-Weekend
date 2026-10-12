# Shoreline Topography API

## Endpoint

`GET https://go.build-my-weekend.workers.dev/api/shoreline-topography`

Example:

```text
/api/shoreline-topography?destination=False%20Bay&shoreline_length_km=100
/api/shoreline-topography?destination=Bay&shoreline_length_km=100&max_shoreline_length_km=150&lat=-34.1&lon=18.7
```

## Query parameters

- `destination` — required region name or substring. Seed regions are False Bay, Algoa Bay and Wild Coast.
- `shoreline_length_km` — optional minimum approximate shoreline length in kilometres. Alias: `min_shoreline_length_km`.
- `max_shoreline_length_km` — optional maximum approximate shoreline length in kilometres.
- `lat` and `lon` — optional pair. If both are supplied, the point must fall inside a region's approximate JSON bounding box.

## Response structure

Each item in `regions` includes:

- `destination`, `province`, `shoreline_length_km`
- `bounding_box` with `min_lat`, `max_lat`, `min_lon`, `max_lon`
- `topography_description`
- `hotspot_features` with names, broad feature type and verification status
- `map_reading_instruction`
- `accumulating_fish` with species, broad habitat and evidence status
- `data_status`

## Important data limitations

Current records are `DEMO_REGIONAL_REFERENCE`. Bounding boxes and shoreline lengths are approximate planning metadata, not surveyed GIS measurements. Fish references are not live aggregations, verified catch reports or forecasts. The feature list does not contain exact hotspot GPS coordinates, and the API does not provide navigable routes, live marine weather, swell/tide, legal access, current restrictions or official nautical-chart layers.

The frontend may display a regional bounding-box map and regional reference cards, but must not turn feature names into precise map pins or describe these data as live/verified. Check current official nautical charts, local access, weather, swell, permits and species-specific regulations before travel or fishing.
