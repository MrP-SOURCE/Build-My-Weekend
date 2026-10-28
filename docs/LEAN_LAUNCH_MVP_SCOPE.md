# Build My Weekend — lean launch scope

## Product promise

Help a South African user quickly estimate and compare the cost of a getaway or other away excursion before committing money. The product is a decision calculator, not a travel directory or booking platform.

## Must work for launch

1. **Simple trip inputs:** departure area, dates, party size, total budget, excursion type and maximum one-way distance.
2. **Reusable vehicle assumptions:** fuel price per litre and vehicle consumption persist until the user changes them. Trip criteria and results reset between sessions.
3. **Useful comparisons:** shortlist relevant destinations and make the assumptions behind each estimate clear.
4. **Complete budget arithmetic:** return-trip fuel, accommodation, food and activities; total new spend; budget remaining; and cost per person.
5. **Origin consistency:** the selected departure area must drive route distance, drive time, fuel estimate, distance filtering, destination detail, share summary and Maps hand-off.
6. **Honest route fallback:** if live routing fails, identify the result as an unverified idea, disclose that the distance limit was not route-checked, and direct the user to confirm the route in Maps.
7. **Low-friction hand-offs:** provide useful destination, accommodation and navigation links without pretending a search link is a booking or confirmed price.
8. **Mobile usability and resilience:** no horizontal scrolling, clear validation, readable totals, and no stale results replacing a newer submission or reset.
9. **Fishing Away remains integrated:** use the same shared trip budget and cost calculations. Fishing-specific conditions are optional context and must not be presented as verified when they are not.

## Acceptance calculation

Use this stable regression scenario:

- Total budget: R3,000
- Travellers: 4
- Fuel consumption: 8.0 L/100 km
- Fuel price: R24.50/L
- Fuel already in tank: R650
- One-way distance: 120 km
- Accommodation: R1,050
- Food: R650
- Activities: R300

Expected estimated trip spend: R2,000. Expected budget remaining: R1,000. Expected cost per person: R500. The R650 already in the tank is excluded from new spend; only the additional fuel required for the return journey is counted.

## Park until after launch unless required to make the core journey reliable

- Accounts, profiles, social features, wishlists and trip collaboration.
- Payments, subscriptions, premium tiers and monetisation infrastructure.
- Scraping, custom databases and paid live-data integrations that are not essential to a truthful core estimate.
- Advanced destination discovery, elaborate itineraries and specialist explorers that do not improve the basic cost decision.
- Automated claims about fishing catches, baitfish abundance, site security, access permission or safety without a suitable current source.

Keep existing working functionality where it is low-cost and does not make the core journey harder. Parking a feature means no new expansion work for now, not deleting a stable feature without evidence it should be removed.

## Release blockers and evidence rules

- Never describe demo destination costs as quotes or verified prices.
- Never describe catalogue distances as route-verified when routing failed.
- Weather and marine data licensing must be resolved before commercial use. Keep this external licensing decision separate from ordinary development and do not add a paid provider dependency until required.
- Forecasts are planning context, not safety advice or fishing/catch predictions.
- Launch pricing target is free or very low-cost initially. Do not build premium gating into the MVP.

## Development decision rule

For each proposed change, ask: **Does it materially improve the speed, accuracy, clarity or reliability of calculating an excursion?** If not, park it. Prefer a small regression test or targeted fix over adding another subsystem.
