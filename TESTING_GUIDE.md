# BUILD MY WEEKEND — Tester Checklist

Live test site: https://mrp-source.github.io/Build-My-Weekend/

## Before testing

- This is a test MVP. Destination prices, drive distances/times, activity matches and itineraries are demonstration estimates, not quotes or verified routes.
- Accommodation links open external search pages. They do not confirm live availability or final prices.
- General weather is requested from Open-Meteo for configured destination coordinates and supported forecast dates. Fishing Away has a separate modelled marine wave/swell panel for configured coastal destinations only. Neither forecast is a catch prediction, official warning or travel-safety assessment; offshore grid data is not substituted for inland rivers or estuaries.
- Do not use the app as an emergency, medical, access-permission or outdoor-safety service. Verify details with the relevant provider or official authority.

## Core planner checks

- [ ] Page loads on desktop and phone without horizontal scrolling.
- [ ] Change the group budget and number of travellers; results and per-person figures update.
- [ ] Change the maximum distance between 100 km, 200 km, 300 km and Anywhere.
- [ ] Change departure and return dates. Try a past departure date and a return date before departure; invalid inputs should be rejected.
- [ ] Set budget to R0 and travellers to 11; the planner should show validation errors rather than produce a plan.
- [ ] Change fuel consumption and fuel price. Confirm fuel is calculated for the return journey, not multiplied by the number of travellers.
- [ ] Change “Fuel already in the tank”. Confirm only the estimated amount of fuel still to buy is counted as new spend.
- [ ] Compare the lowest-spend and farther-away options. Read the estimated cost range and budget caveats.
- [ ] **Clean start and reset:** open a fresh page and confirm no trip results are prefilled; submit a plan, change fuel price/consumption, then reload and confirm only those fuel assumptions persist; use Reset and confirm defaults return and result cards remain empty until a new submission.
- [ ] **Route request race:** submit a plan, quickly change to a different set of criteria and submit again; confirm the older, slower route response never replaces the newer plan or repopulates results after Reset.
- [ ] **Routing outage fallback:** when route lookup is unavailable, confirm results are explicitly labelled as unverified trip ideas, the distance limit is disclosed as not route-checked, and the app instructs users to confirm routes in Maps. Never label catalogue distances as live-verified during an outage.

## Activity-specific checks

- [ ] **Fishing Away:** select shore/rock/estuary style, target species and preferred area. Confirm fishing controls appear only for Fishing Away. Read the demo-data warning and independently verify permits, tide, wind, swell, access and current conditions.
- [ ] **Marine forecast:** for a coastal Fishing Away destination, confirm the selected-date panel shows modelled wave height, swell height, period and direction with Open-Meteo attribution. For inland/estuary destinations, confirm it does not substitute an offshore grid forecast for local conditions. Block the marine API and confirm a clear fallback; do not treat the forecast as a catch prediction or safety warning.
- [ ] **Marine missing-data handling:** simulate a successful API response with one or more null wave/swell measurements. Confirm the UI shows `n/a` for missing measurements rather than displaying `0.0 m` or `0 s`.
- [ ] **Lunar context:** confirm the selected departure date shows lunar phase, illumination and lunar age when the date is valid; invalid/missing age must not be presented as a measured value. Treat moon data as planning context only, never as a reliable catch prediction.
- [ ] **Wind and net-casting context:** confirm sustained wind and gusts are shown separately when available. Missing gust data must display `n/a`; the net-casting note is a planning heuristic, not official safety guidance or a guarantee that casting a net is safe or permitted.
- [ ] **Saved fishing observations:** save an observation and confirm its observed time is distinct from save time, freshness/history status is visible, and records remain labelled `USER_RECORDED_UNVERIFIED`. Confirm edit/export/delete actions work and deleting one record does not remove other records.
- [ ] **Camping Away:** try tent, caravan, off-grid and glamping settings. Review electricity, ablutions, shade and ground notes. Confirm the app clearly states that the actual campsite or glamping fee may be excluded from the estimate.
- [ ] **Hiking Away / Climbing Away:** change difficulty, scenery, discipline and experience. Treat the map pin as a general-area preview, not a verified trail or climbing route.
- [ ] Try Family Away, Couples Away, Beach Away, Wildlife Away, Cycling Away and Road Trip Away. Check that the shortlist and suitability notes change with the selected activity.

## Destination details and hand-offs

- [ ] Open **VIEW WEEKEND**. Check the cost breakdown, estimate range, illustrative itinerary and demonstration-data notices.
- [ ] Check weather. If unavailable or the dates are outside the forecast window, the app should say so rather than imply a forecast exists.
- [ ] Open accommodation search links and confirm they retain relevant destination, dates and guest count where supported. Remember: search results are not a booking confirmation.
- [ ] Try **NAVIGATE** and confirm it opens a Google Maps route search from Cape Town. Verify the actual route before travelling.
- [ ] Try **SHARE TRIP** and confirm the summary includes the group budget, estimated cost range, fuel calculation and important caveats.
- [ ] Use the hospital, pharmacy and fuel-station map searches as search starting points only; verify the actual service and opening hours independently.

## Release-readiness gates — before public or commercial launch

- [ ] **Weather API licence:** the current forecast calls use Open-Meteo. Its free API is limited to non-commercial use; an app integrated into a commercial product or promotional activity needs an appropriate paid API plan or a different provider. Do not launch commercially on the free endpoint without resolving this. Review the [Open-Meteo terms](https://open-meteo.com/en/terms).
- [ ] **Marine forecast licence and attribution:** the marine forecast also calls Open-Meteo. Resolve commercial-use permission before a commercial launch and verify the required attribution for the selected wave model and its underlying data sources; see the [Marine API documentation](https://open-meteo.com/en/docs/marine-weather-api).
- [ ] **Data attribution:** retain the provider attribution required by the chosen weather data licence. If marine forecasts are added, review the marine API's separate data-source attribution requirements first.
- [ ] **Real-world validation:** verify route distances and times, accommodation prices and availability, campsite facilities, fishing access and regulations, and nearby health services with authoritative sources before presenting them as verified.
- [ ] **Fishing forecast boundary:** coastal Fishing Away destinations may show modelled marine wave/swell data for configured locations and dates. This is not a local catch forecast, a guarantee of conditions at the exact fishing spot, or an official safety warning. Do not substitute offshore model data for rivers or estuaries. If the marine API is unavailable or measurements are missing, the UI must clearly show the fallback or `n/a` rather than imply certainty.
- [ ] **Commercial data review:** confirm the licence, attribution, refresh rate and permitted use of each external source before integrating it into a commercial product.

## Report a problem

When reporting a problem, include:
1. Phone or desktop, and browser name.
2. The activity selected, group size, budget, distance and dates.
3. The exact steps that led to the problem.
4. What you expected and what actually happened.
5. A screenshot if it helps explain the issue.

Do not include passwords, payment details or other private information in a bug report.
