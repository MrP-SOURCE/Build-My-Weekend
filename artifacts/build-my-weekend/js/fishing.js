/* BUILD MY WEEKEND — Fishing Away specialist layer
   Static demonstration data only. Not live conditions, catches, reviews or access status.
*/
(function () {
  const spots = [
    { destinationId:"hermanus", name:"Gearing's Point", area:"Hermanus", spotType:"Point / harbour", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Wind and swell can materially change exposed shoreline conditions.", accessNote:"Check current public access, parking and safety before fishing.", community:"Angler/community information commonly discusses the Hermanus shoreline and points as condition-dependent spots.", confidence:"DEMO" },
    { destinationId:"hermanus", name:"Die Neus", area:"Hermanus", spotType:"Rocky point", styles:["Rock","Shore"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Important", conditions:"Exposed rock fishing should be assessed against swell and wind.", accessNote:"Use extreme caution on exposed rocks and verify current access.", community:"Fishing-community discussions identify rocky Hermanus coastline as requiring careful swell and tide judgement.", confidence:"DEMO" },
    { destinationId:"hermanus", name:"Langbaai", area:"Hermanus", spotType:"Bay / beach", styles:["Shore"], species:["Galjoen"], access:["Shore"], tide:"Useful to check", conditions:"Beach and shoreline conditions vary with swell, wind and tide.", accessNote:"Verify access and current beach conditions.", community:"Local angler information commonly treats sheltered bays differently from exposed rock points.", confidence:"DEMO" },
    { destinationId:"hermanus", name:"Voelklip", area:"Hermanus", spotType:"Beach / shoreline", styles:["Shore"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Open coastline; check swell and wind before fishing.", accessNote:"Check current access, parking and safety.", community:"Angler reports often discuss the Voelklip coastline as a shore-fishing area whose conditions matter.", confidence:"DEMO" },
    { destinationId:"hermanus", name:"Kwaaiwater", area:"Hermanus", spotType:"Rock / shoreline", styles:["Rock","Shore"], species:["Galjoen"], access:["Shore"], tide:"Important", conditions:"Exposed shoreline; swell and wind are key practical checks.", accessNote:"Do not fish exposed rocks in unsafe swell.", community:"Fishing-community information discusses this type of exposed Hermanus coastline as condition-dependent.", confidence:"DEMO" },

    { destinationId:"gordons-bay", name:"Gordon's Bay shoreline", area:"Gordon's Bay", spotType:"Bay / shoreline", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Sheltered and exposed sections can behave differently.", accessNote:"Verify current public access and local rules.", community:"Angler information commonly distinguishes the bay from the more exposed rocky sections.", confidence:"DEMO" },
    { destinationId:"kleinmond", name:"Kleinmond Lagoon / river-mouth area", area:"Kleinmond", spotType:"Lagoon / estuary", styles:["Shore","Estuary"], species:["Steenbras"], access:["Shore"], tide:"Important", conditions:"Estuary conditions can change with tide, mouth state and rainfall.", accessNote:"Check current access and estuary regulations.", community:"Fishing-community information commonly treats the Kleinmond water system as tide- and mouth-dependent.", confidence:"DEMO" },
    { destinationId:"bettys-bay", name:"Betty's Bay shoreline", area:"Betty's Bay", spotType:"Beach / rocks", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Exposed coastline; wind and swell should be checked.", accessNote:"Verify access and avoid unsafe exposed rocks.", community:"Angler discussions commonly focus on the rocky and beach shoreline around the Betty's Bay coast.", confidence:"DEMO" },
    { destinationId:"yzerfontein", name:"Yzerfontein shoreline", area:"Yzerfontein", spotType:"Beach / rocks", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Important", conditions:"West Coast wind and swell can materially change fishing conditions.", accessNote:"Check current beach and shoreline access.", community:"Fishing-community information commonly discusses the rocky West Coast shoreline and changing swell conditions.", confidence:"DEMO" },
    { destinationId:"paternoster", name:"Paternoster rocky shoreline", area:"Paternoster", spotType:"Rocks / point", styles:["Rock","Shore"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Important", conditions:"Exposed shoreline; check swell, wind and tide.", accessNote:"Stay away from dangerous surge zones.", community:"Angler information commonly focuses on rocky shoreline and condition selection around the village.", confidence:"DEMO" },
    { destinationId:"langebaan", name:"Langebaan Lagoon shoreline", area:"Langebaan", spotType:"Lagoon", styles:["Shore","Estuary"], species:["Steenbras"], access:["Shore"], tide:"Important", conditions:"Lagoon fishing is strongly affected by tide and wind.", accessNote:"Check current park/access rules and fishing regulations.", community:"Fishing-community information commonly treats lagoon fishing as tide and wind dependent.", confidence:"DEMO" },
    { destinationId:"st-helena-bay", name:"St Helena Bay shoreline", area:"St Helena Bay", spotType:"Bay / beach", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Bay and exposed shoreline conditions vary with wind and swell.", accessNote:"Verify public access and local regulations.", community:"Angler information commonly discusses the bay and surrounding shoreline as varied fishing terrain.", confidence:"DEMO" },
    { destinationId:"witsand", name:"Breede River Mouth", area:"Witsand", spotType:"River mouth / estuary", styles:["Estuary","Shore"], species:["Steenbras"], access:["Shore"], tide:"Very important", conditions:"River-mouth fishing is highly tide, mouth-state and weather dependent.", accessNote:"Check current mouth conditions, access and fishing rules.", community:"Fishing-community information commonly treats the Breede mouth as a dynamic estuary environment.", confidence:"DEMO" },
    { destinationId:"arniston", name:"Arniston shoreline", area:"Arniston", spotType:"Beach / rocks", styles:["Shore","Rock"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Important", conditions:"Southern Cape swell and wind can change exposed shoreline conditions.", accessNote:"Check access and rock-safety conditions.", community:"Angler information commonly discusses the rocky and beach coastline around Arniston.", confidence:"DEMO" },
    { destinationId:"struisbaai", name:"Struisbaai beach and harbour area", area:"Struisbaai", spotType:"Beach / harbour", styles:["Shore"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Useful to check", conditions:"Different shoreline sections can suit different conditions.", accessNote:"Verify current public access and local regulations.", community:"Fishing-community information commonly discusses the long beach and harbour-side coastline.", confidence:"DEMO" },
    { destinationId:"mossel-bay", name:"Mossel Bay rocky shoreline", area:"Mossel Bay", spotType:"Rocks / point", styles:["Rock","Shore"], species:["Galjoen","Steenbras"], access:["Shore"], tide:"Important", conditions:"Rock fishing requires careful swell and wind assessment.", accessNote:"Avoid exposed rocks in unsafe swell.", community:"Angler information commonly discusses rocky shoreline fishing around Mossel Bay.", confidence:"DEMO" },
    { destinationId:"wilderness", name:"Wilderness lagoon / river mouth", area:"Wilderness", spotType:"Lagoon / river mouth", styles:["Estuary","Shore"], species:["Steenbras"], access:["Shore"], tide:"Very important", conditions:"Lagoon and mouth conditions change with tide, rainfall and mouth state.", accessNote:"Check current access and regulations.", community:"Fishing-community information commonly treats the Wilderness water system as dynamic and condition dependent.", confidence:"DEMO" },
    { destinationId:"breede-river", name:"Breede River estuary", area:"Breede River", spotType:"Estuary", styles:["Estuary","Shore"], species:["Steenbras"], access:["Shore"], tide:"Very important", conditions:"Tide, river flow and mouth state should be checked.", accessNote:"Verify current access and fishing rules.", community:"Angler information commonly treats the Breede system as an estuary environment where conditions matter.", confidence:"DEMO" }
  ];

  const byDestination = spots.reduce((map, spot) => {
    (map[spot.destinationId] ||= []).push(spot);
    return map;
  }, {});

  function getSpots(destinationId) {
    return byDestination[destinationId] || [];
  }

  function matchSpot(spot, settings) {
    let score = 0;
    if (settings.fishingStyle === "Any" || spot.styles.includes(settings.fishingStyle)) score += 3;
    if (settings.targetSpecies === "Any" || spot.species.includes(settings.targetSpecies)) score += 3;
    if (settings.spotPreference === "Let the app choose" || spot.spotType.toLowerCase().includes(settings.spotPreference.toLowerCase())) score += 2;
    if (settings.fishingStyle === "Boat" && !spot.styles.includes("Boat")) score -= 10;
    return score;
  }

  function bestSpot(destinationId, settings) {
    return getSpots(destinationId)
      .map(spot => ({ spot, score: matchSpot(spot, settings) }))
      .sort((a,b) => b.score - a.score)[0] || null;
  }

  function destinationMatch(destinationId, settings) {
    const matches = getSpots(destinationId).map(spot => ({spot, score: matchSpot(spot, settings)}));
    return matches.length ? Math.max(...matches.map(x => x.score)) : 0;
  }

  window.BMWFishing = {
    spots,
    getSpots,
    bestSpot,
    destinationMatch,
    matchSpot,
    styles: ["Any","Shore","Rock","Estuary","Freshwater","Boat"],
    species: ["Any","Galjoen","Steenbras","Other"],
    spotPreferences: ["Let the app choose","Bay","Beach","Rocks","Point","Reef","Estuary","Lagoon","Harbour","River Mouth","Local / Informal Spot"]
  };
})();
