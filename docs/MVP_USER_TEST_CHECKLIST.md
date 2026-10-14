# BUILD MY WEEKEND — controlled MVP test checklist

## Test target and boundaries

Use the published GitHub Pages app: https://mrp-source.github.io/Build-My-Weekend/

This is a **controlled Western Cape / Cape Town pilot**, not a nationwide routing engine. The planner currently uses demonstration destination and cost data. Treat accommodation links as search hand-offs, not confirmed availability. Weather is a forecast from an external provider when available; fishing suitability is a demonstration-level match, not a guaranteed catch forecast.

Do not use the pilot to make safety-critical decisions. Confirm access rules, opening times, weather, fishing regulations, accommodation availability, fuel stops, and emergency services with authoritative sources.

## Before testing

- Test in a current desktop browser and a mobile browser.
- Keep the test origin within the disclosed Cape Town pilot assumptions.
- Use test values only; do not enter sensitive medical or identity details.
- Note the device/browser, date, trip inputs, expected result, actual result, and any screenshot if a problem occurs.

## Test scenarios

| Test | Steps | Expected result |
|---|---|---|
| First load | Open the app in a fresh browser session | Planner loads; demonstration-data and Cape Town-origin limitations are visible before planning |
| Budget floor | Set total budget to R0 and submit | Clear validation; no misleading trip results |
| Group size | Set people to 11 and submit | Clear validation; accepted range is 1–10 |
| Fuel inputs | Set fuel consumption to 0 and submit | Clear validation; no invalid fuel calculation |
| Date order | Set departure in the past, then return before departure | Each invalid date is rejected; correcting the date clears the error |
| Weekend types | Try Beach, Fishing, Camping, Hiking, Cycling, Family, Couples, Wildlife and Road Trip | Results match the selected activity/category or explain when no match exists |
| Budget fit | Try a very low budget, then a higher one | Unaffordable options are not presented as fitting the budget |
| Existing fuel | Compare the same trip with a full/partly filled tank and an empty-tank estimate | Additional fuel to buy responds to the existing-fuel input; do not confuse fuel consumed with fuel that must be purchased |
| Fishing filters | Select fishing style, target species and preferred spot; then try an incompatible combination | Results respect the selected constraints or clearly show no matching destination; no false fallback |
| Weather fallback | Open destination details with network available, then with forecast access blocked | Forecast is labelled clearly when available; failure does not break the planner or imply verified conditions |
| Destination details | Open a result card | Estimated cost, fuel breakdown, origin basis and demonstration-data warning are visible |
| Local services | Open hospital, pharmacy and fuel search links | Links search near the selected destination and do not claim that a particular facility is verified |
| Share / navigation | Use share and navigation actions | Shared text and map hand-off state the Cape Town origin; no other origin is implied |
| Clean start and saved fuel assumptions | Change trip criteria, set custom fuel price/consumption, then reload; separately use Reset | Each new page visit starts with clean trip criteria; user-edited fuel price and consumption persist across reloads; Reset restores all defaults and leaves results empty until the user submits new criteria |
| Mobile layout | Repeat a basic plan on a narrow screen | Controls, result cards and destination details remain usable without clipped essential information |

## Record a problem

Use this template in a GitHub issue or project note:

- **Device/browser:**
- **Date/time tested:**
- **Inputs:** budget, people, dates, weekend type, distance, fuel settings, activity filters
- **Expected:**
- **Actual:**
- **Repeatable?** yes/no
- **Screenshot or console error:** omit private information

## Release blockers beyond this pilot

Do not describe the app as nationwide until departure-area selection, origin-aware routing and distance calculations, fuel estimates, map/share hand-offs, fallbacks, and browser tests all use the same supported origin. Review data licensing and provider terms before commercial-scale ingestion or launch. Imported points and demo records must not be represented as verified live availability.
