# Vehicle data strategy for Build My Weekend

## Objective

Make vehicle-aware trip costing easy without adding a paid dependency or forcing users to enter technical specifications repeatedly.

## Recommended first release

1. Offer a searchable vehicle picker by make, model, year and engine/fuel variant where known.
2. Populate fuel type and published consumption only when the source provides a suitable matching variant.
3. Display the figure's source and status: manufacturer-published, third-party catalogue, or user-entered.
4. Always let the user correct the consumption value and retain their vehicle/consumption locally for future visits.
5. Keep the existing manual-consumption path available if a vehicle cannot be matched.
6. Use the user's current fuel price as a separate editable assumption. Do not silently treat a catalogue's fuel price as current.
7. Clearly state that published consumption is a planning baseline; actual consumption varies with traffic, terrain, load, driving style and vehicle condition.

## Candidate data sources to evaluate

These are research candidates, not yet approved runtime dependencies:

- **VehiclesDB open catalogue:** https://vehiclesdb.com/getting-started — advertises an open dataset under CC BY 4.0 and asks for attribution. Verify South African-market coverage, field completeness, source-level licences and whether the actual dataset includes reliable consumption figures before importing.
- **cardata.wiki:** https://cardata.wiki/about — advertises a free vehicle-specification dataset under CC BY 4.0. Verify model/variant coverage for South Africa, consumption field availability and data provenance before importing.
- **Car Specs SA:** https://www.car-specs.za.net/data-sources/ — appears relevant to South African variants and published consumption. Do not scrape, bulk-copy or integrate the data unless its operator explicitly confirms that the proposed use and redistribution are permitted.
- **DiskDrive:** https://diskdrive.co.za/ — potentially relevant South African vehicle-specification provider. Treat as a commercial lead, not a free data source; request licence and pricing only if open data proves insufficient.

## Import and quality controls

- Prefer a versioned, downloadable open dataset over a live third-party API where practical; it avoids API keys, rate limits, uptime dependency and per-request costs.
- Retain source, licence, attribution, source variant/market, data version and import date with each imported record.
- Do not assume a global-market variant matches a South African model just because the badge and engine size look similar.
- Do not invent missing consumption values. A missing/ambiguous match must fall back to manual entry.
- Check plausible units and ranges before publishing. Store consumption in L/100 km internally and convert only at the display boundary if needed.
- Do not copy copyrighted images or bulk data from commercial sites without permission.
- Keep attribution visible in the vehicle selector/about-data area, in accordance with the selected dataset's licence.

## Decision gate

Before choosing a dataset, compare a small sample of common South African vehicles across makes, models, model years, engine/fuel variants and consumption figures. Confirm licence, attribution requirements, source provenance and field coverage. If open datasets do not meet the quality threshold, launch the manual fallback plus a small curated set of verified variants; do not make the whole calculator depend on a paid API.

## Core calculator behaviour

Vehicle data must improve the estimate, not make the app harder to use. The user should be able to plan a trip without selecting a vehicle. When a vehicle is selected, its saved consumption becomes the default assumption and can be overridden. Show both fuel consumed by the journey and estimated additional fuel to buy if fuel already in the tank is captured; do not conflate these amounts.

## Launch and privacy

Vehicle selection can be stored locally on the user's device for the MVP. Do not require an account solely to remember a vehicle. Do not collect a vehicle registration number or VIN unless a later, clearly justified feature needs it.
