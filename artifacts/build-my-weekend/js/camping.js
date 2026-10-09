/* BUILD MY WEEKEND — Camping Away preference-led research.
   External links support discovery; they do not represent a booking API or verified availability. */
(function () {
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function preferences(settings) {
    return [
      ["Camping setup", settings.campingSetup || "Any"],
      ["Electricity", settings.campingPower || "Any"],
      ["Ablutions", settings.campingAblutions || "Any"],
      ["Shade", settings.campingShade || "Any"],
      ["Ground", settings.campingTerrain || "Any"]
    ];
  }

  function advice(settings) {
    const items = [];
    const setupNotes = {
      "Glamping": "Compare the accommodation structure, private bathroom or shared ablutions, heating/cooling, bedding, kitchen access, child/pet rules and what is included in the nightly rate. Confirm exact location, total price and availability with the operator.",
      "Tent": "Confirm tent-friendly stands, ground suitable for pegs and wind exposure.",
      "Caravan": "Confirm caravan access, turning space, pitch dimensions and towing-friendly roads.",
      "Motorhome": "Confirm vehicle access, pitch size and whether the site can accommodate your vehicle.",
      "Rooftop tent": "Confirm suitable parking/pitch arrangements and level parking.",
      "Off-grid": "Prioritise sites whose rules and facilities suit self-sufficient camping; confirm water, waste and fire restrictions."
    };
    if (setupNotes[settings.campingSetup]) items.push(setupNotes[settings.campingSetup]);
    if (settings.campingPower === "Required") items.push("Treat electricity as essential: confirm that your specific stand is powered, the connection type and any amperage or extra charge.");
    else if (settings.campingPower === "Preferred") items.push("Compare powered and unpowered stands, including any price difference.");
    else if (settings.campingPower === "Unpowered") items.push("Unpowered stands are acceptable; check charging and lighting needs before choosing a remote site.");
    if (settings.campingAblutions === "Full") items.push("Confirm toilets and showers are operating, whether hot water is available, and how far facilities are from the stand.");
    else if (settings.campingAblutions === "Basic") items.push("Check exactly which toilets, showers and water facilities are provided.");
    else if (settings.campingAblutions === "Minimal") items.push("Confirm what facilities are absent and the site's rules for water, waste and sanitation.");
    if (settings.campingShade === "Shaded") items.push("Ask about shade at the actual pitch, not just whether the campsite has trees; shade changes by stand and time of day.");
    else if (settings.campingShade === "Partial") items.push("Ask for a pitch-specific photo or description to establish how much shade is available.");
    else if (settings.campingShade === "Open") items.push("Open pitches are acceptable; still check heat, wind exposure and shade in shared areas.");
    if (settings.campingTerrain === "Grass") items.push("Confirm the pitch is grassy and usable for your dates; wet weather can affect grass and vehicle access.");
    else if (settings.campingTerrain === "Firm level") items.push("Ask the campsite to confirm a firm, reasonably level pitch for your equipment.");
    else if (settings.campingTerrain === "Sand") items.push("Confirm sandy ground, vehicle access and whether higher clearance or recovery equipment may be needed.");
    else if (settings.campingTerrain === "Gravel") items.push("Confirm the pitch is gravel or hardstand and suitable for your tent, caravan or vehicle.");
    if (!items.length) items.push("Compare site type, pitch-level electricity, ablutions, ground surface and shade before booking.");
    items.push("Ask the campsite to confirm the specific stand, total price for your dates, availability, access requirements and current restrictions before paying.");
    return items;
  }

  function glampingLinks(destination, settings = {}) {
    const name = String(destination?.name || "");
    const guests = Number(settings.people) || 0;
    const budget = Number(settings.budget) || 0;
    const distance = settings.distance && settings.distance !== "any" ? Number(settings.distance) : null;
    const dates = settings.depart && settings.returnDate ? settings.depart + " to " + settings.returnDate : "";
    const terms = [
      name + " South Africa glamping",
      guests ? guests + " guests" : "",
      budget ? "total weekend group budget R" + Math.round(budget) : "",
      distance ? "within " + distance + " km one way of " + name : "",
      dates
    ].filter(Boolean).join(" ");
    const term = encodeURIComponent(terms);
    const siteSearch = (label, domain) => ({
      name: label,
      url: "https://www.google.com/search?q=" + encodeURIComponent("site:" + domain + " " + terms)
    });
    return [
      { name: "AfriCamps", url: "https://africamps.com/" },
      siteSearch("Search AfriCamps near this destination", "africamps.com"),
      { name: "Booking.com · South Africa glamping", url: "https://www.booking.com/glamping/country/za.html" },
      siteSearch("Search Booking.com glamping near this destination", "booking.com"),
      { name: "Glamping Hub", url: "https://glampinghub.com/" },
      siteSearch("Search Glamping Hub near this destination", "glampinghub.com"),
      siteSearch("Glamping South Africa directory", "glampingsouthafrica.co.za"),
      siteSearch("LekkeSlaap glamping search", "lekkeslaap.co.za"),
      siteSearch("SafariNow glamping search", "safarinow.com"),
      { name: "Search wider web", url: "https://www.google.com/search?q=" + term }
    ];
  }

  function glampingSummary(destination, settings = {}) {
    const links = glampingLinks(destination, settings).map(link =>
      '<a href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.name) + ' ↗</a>'
    ).join("");
    const guests = Number(settings.people) || 0;
    const budget = Number(settings.budget) || 0;
    const distance = settings.distance && settings.distance !== "any" ? Number(settings.distance) : null;
    const context = [
      guests ? guests + " guest(s)" : "",
      budget ? "group budget R" + Math.round(budget) : "",
      distance ? "destination limit " + distance + " km one way" : "no destination distance limit"
    ].filter(Boolean).join(" · ");
    return '<section class="camping-result-box" aria-label="Glamping discovery">' +
      '<strong>GLAMPING · BOUTIQUE OUTDOOR STAYS</strong>' +
      '<p>Search luxury safari tents, furnished bell tents, domes, cabins, pods and treehouses around ' + esc(destination.name) + '. Current trip settings: ' + esc(context) + (settings.depart && settings.returnDate ? ' · dates ' + esc(settings.depart) + ' to ' + esc(settings.returnDate) : '') + '.</p>' +
      '<p><b>Budget and distance:</b> the planner filters destinations using the demonstration trip estimate and distance limit, but the property-specific glamping stay price is excluded. The displayed remainder is not confirmed money left after accommodation. Provider links do not enforce the distance or budget filters; check the exact route and full stay total before deciding whether the trip is affordable. Search results may fall outside the selected radius.</p>' +
      '<p><b>Compare before choosing:</b> private versus shared bathroom, real beds and linen, heating or cooling, kitchen access, electricity, child/pet rules, accessibility, cancellation terms and the full price for your dates.</p>' +
      renderGlampingProfiles(destination, settings) +
      '<div class="camping-source-links">' + links + '</div>' +
      '<p class="camping-source-note">No API connection or live price/availability verification is claimed. Confirm the exact property location, dates, total charges and included facilities on the provider booking page.</p>' +
      '</section>';
  }

  const GLAMPING_PROFILES = [
    {
      destinations: ["Hermanus"],
      name: "AfriCamps at Stanford Hills",
      area: "Stanford Hills Wine Estate, near Stanford; check the exact drive from Hermanus",
      source: "AfriCamps official property page",
      url: "https://africamps.com/farm/stanford-africamps-stanford-hills/",
      details: "Furnished glamping tents for up to five guests, an en-suite bathroom, fully equipped kitchen, private wood-fired hot tub and built-in braai. One dog is allowed only by prior arrangement."
    },
    {
      destinations: ["De Pakhuys"],
      name: "AfriCamps at de Pakhuys",
      area: "Agter-Pakhuis Valley, Cederberg; official page places it 26 km from Clanwilliam",
      source: "AfriCamps official property page",
      url: "https://africamps.com/farm/africamps-at-de-pakhuys-cederberg/",
      details: "Furnished glamping tents sleep up to five, with a fully equipped kitchen, en-suite bathroom, indoor wood-burning fireplace and private outdoor wood-fired hot tub. Dog-friendly rules and the selected tent type should be confirmed on the property page."
    },
    {
      destinations: ["Oudtshoorn"],
      name: "AfriCamps Klein Karoo",
      area: "About 10 minutes from central Oudtshoorn, according to AfriCamps",
      source: "AfriCamps official property page",
      url: "https://africamps.com/farm/oudtshoorn-klein-karoo/",
      details: "Classic furnished tents sleep up to five; premium tents are designed for couples. En-suite facilities and self-catering equipment are listed. One dog is allowed in classic tents only by prior arrangement; premium tents are excluded."
    },
    {
      destinations: ["Wilderness"],
      name: "AfriCamps at Oakhurst",
      area: "Oakhurst working dairy farm in the Wilderness / Garden Route area",
      source: "AfriCamps official property page",
      url: "https://africamps.com/farm/wilderness-africamps-oakhurst/",
      details: "Furnished tents sleep up to five, with an en-suite bathroom, equipped kitchen, indoor fireplace, air-conditioning and private outdoor wood-fired hot tub. A cot and high chair can be requested in advance."
    }
  ];

  function glampingProfiles(destination) {
    const name = String(destination?.name || "").toLowerCase();
    return GLAMPING_PROFILES.filter(profile =>
      profile.destinations.some(alias => alias.toLowerCase() === name)
    );
  }

  function renderGlampingProfiles(destination, settings = {}) {
    const profiles = glampingProfiles(destination);
    const guests = Number(settings.people) || 0;
    if (!profiles.length) {
      return '<p>No individually curated glamping property is currently mapped to this destination. Use the targeted searches below and verify the actual drive.</p>';
    }
    return '<strong>CURATED GLAMPING OPTIONS · OFFICIAL PROPERTY INFORMATION</strong>' +
      '<div class="camping-site-profiles">' + profiles.map(profile =>
        '<article class="camping-site-profile">' +
          '<div class="camping-site-top"><strong>' + esc(profile.name) + '</strong><span>' + (guests > 5 ? 'GROUP SIZE EXCEEDS LISTED TENT CAPACITY' : 'CHECK PRICE & ROUTE') + '</span></div>' +
          '<p class="camping-site-area">' + esc(profile.area) + '</p>' +
          (guests > 5 ? '<p class="camping-profile-warning"><b>Capacity warning:</b> the published tent descriptions indicate a maximum of five guests per tent. This group size may require multiple tents or a different property; the extra cost is not included in the planner estimate.</p>' : '') +
          '<p>' + esc(profile.details) + '</p>' +
          '<p><a href="' + esc(profile.url) + '" target="_blank" rel="noopener noreferrer">Check official property details and dates ↗</a></p>' +
          '<p class="camping-source-note">Source: ' + esc(profile.source) + '. Price, availability, and fit to the selected distance limit are not verified by the app.</p>' +
        '</article>'
      ).join("") + '</div>';
  }

  function sourceLinks(destination, settings = {}) {
    const guests = Number(settings.people) || 0;
    const budget = Number(settings.budget) || 0;
    const distance = settings.distance && settings.distance !== "any" ? Number(settings.distance) : null;
    const dates = settings.depart && settings.returnDate ? settings.depart + " to " + settings.returnDate : "";
    const terms = [
      destination.name,
      settings.campingSetup && settings.campingSetup !== "Any" ? settings.campingSetup : "camping caravan tent",
      settings.campingPower && settings.campingPower !== "Any" ? settings.campingPower + " electricity" : "",
      settings.campingAblutions && settings.campingAblutions !== "Any" ? settings.campingAblutions + " ablutions" : "",
      settings.campingShade && settings.campingShade !== "Any" ? settings.campingShade + " shade" : "",
      settings.campingTerrain && settings.campingTerrain !== "Any" ? settings.campingTerrain + " pitch" : "",
      guests ? guests + " guests" : "",
      budget ? "total weekend group budget R" + Math.round(budget) : "",
      distance ? "within " + distance + " km one way of " + destination.name : "",
      dates,
      "South Africa campsite"
    ].filter(Boolean).join(" ");
    const q = encodeURIComponent(terms);
    const siteSearch = (name, domain) => ({
      name,
      url: "https://www.google.com/search?q=" + encodeURIComponent("site:" + domain + " " + terms)
    });
    return [
      siteSearch("Camp SA Directory", "campsa.co.za"),
      siteSearch("Caravan & Outdoor Life", "caravanoutdoor.co.za"),
      siteSearch("LekkeSlaap", "lekkeslaap.co.za"),
      siteSearch("Search Booking.com campsites near this destination", "booking.com"),
      siteSearch("Search SANParks campsites near this destination", "sanparks.org"),
      siteSearch("Search CapeNature campsites near this destination", "capenature.co.za"),
      { name: "CapeNature official site", url: "https://www.capenature.co.za/" },
      { name: "SANParks official site", url: "https://www.sanparks.org/" },
      { name: "Search wider web", url: "https://www.google.com/search?q=" + q }
    ];
  }

  // Curated profiles are based on published official campsite pages/info sheets.
  // Location aliases are deliberately narrow; broader-area options are labelled as such.
  const SITE_PROFILES = [
    {
      id: "algeria",
      names: ["Algeria"],
      name: "Algeria Campsite",
      area: "At the selected destination",
      source: "CapeNature",
      url: "https://www.capenature.co.za/reserves/cederberg-wilderness-area/?accommodations=algeria",
      evidence: "Published campsite information",
      setup: ["Tent", "Caravan"],
      power: "Published site info sheet lists power points; confirm connection and current operation with the reserve.",
      ablutions: "Communal ablutions with toilets and hot showers; bring toilet paper and refuse bags.",
      shade: "Some sites have more shade than others.",
      ground: "Grassy riverside campsite; grass and shade vary by stand.",
      details: "48 sites, maximum 6 people and 2 cars per site; each site has a water point and braai place. The Rondegat River has natural pools.",
      bestFor: "Tent or caravan campers wanting a river setting and shared facilities.",
      caution: "Do not assume every pitch has the same shade or grass cover; request a specific stand."
    },
    {
      id: "kliphuis",
      names: ["De Pakhuys"],
      name: "Kliphuis Campsite",
      area: "Nearby Cederberg / Pakhuis Pass option — confirm drive distance",
      source: "CapeNature",
      url: "https://www.capenature.co.za/accommodation/kliphuis-camping",
      evidence: "Published campsite page",
      setup: [],
      setupLabel: "Campsite; confirm tent/caravan suitability",
      power: "No electricity or power points.",
      ablutions: "Hot-water showers heated by gas.",
      shade: "Shady campsite.",
      ground: "Riverside setting; exact pitch surface and levelness are not specified.",
      details: "14 sites, maximum 6 people and 2 cars per site; braai facilities and firewood for sale; no on-site shop.",
      bestFor: "Campers comfortable without mains electricity who value shade, river scenery and access to the Cederberg/Rocklands area.",
      caution: "Pets are not allowed. Confirm vehicle access, river conditions and the specific pitch before travelling."
    },
    {
      id: "anysberg",
      names: ["Montagu"],
      name: "Anysberg Nature Reserve Campsites",
      area: "Broader Klein Karoo regional option — check route and driving time",
      source: "CapeNature",
      url: "https://www.capenature.co.za/accommodation/anysberg-campsites",
      evidence: "Published campsite page",
      setup: ["Tent"],
      power: "No power points.",
      ablutions: "Communal ablutions with showers using gas/solar hot water; bring toilet paper.",
      shade: "Pitch-specific shade is not confirmed on the campsite page.",
      ground: "Pitch surface not specified; ask the reserve about the stand you would be allocated.",
      details: "Five sites, maximum 6 people each; communal kitchen with gas stove, fridge and freezer; wheelchair-friendly campsite listing.",
      bestFor: "Self-sufficient campers who do not need mains electricity and want a more remote nature-reserve setting.",
      caution: "This is a regional alternative, not a claim that the reserve is in Montagu. Confirm the route, access and accessibility details directly."
    },
    {
      id: "wilderness-ebb-flow",
      names: ["Wilderness"],
      name: "Wilderness Ebb-and-Flow Rest Camp",
      area: "At the selected destination",
      source: "SANParks",
      url: "https://www.sanparks.org/parks/garden-route/accommodation",
      evidence: "Published SANParks accommodation page",
      setup: [],
      setupLabel: "Camping; confirm the exact stand type with SANParks",
      power: "Power availability for the specific camping stand is not confirmed here; check the selected unit in SANParks booking details.",
      ablutions: "Confirm the current ablution block and facilities for the selected camping area.",
      shade: "Forest, river and lakeside setting; shade at the individual pitch is not confirmed.",
      ground: "Campsite beside the river; pitch surface and levelness are not specified on the overview page.",
      details: "SANParks describes camping beside the river, with forest paths, bird hides and canoeing available in the area.",
      bestFor: "Campers looking for a river-and-forest setting with nature activities.",
      caution: "Use SANParks to check the exact camp section, unit type, current availability and facilities before booking."
    },
    {
      id: "tweede-tol",
      names: ["Paarl"],
      name: "Tweede Tol Campsite",
      area: "Bainskloof Pass regional option — confirm route and driving time",
      source: "CapeNature",
      url: "https://www.capenature.co.za/accommodation/tweede-tol-2",
      evidence: "Published campsite page",
      setup: ["Tent", "Caravan"],
      power: "No power points; private sites have solar-powered USB charging.",
      ablutions: "Ablution block with hot-water showers.",
      shade: "Some sites have shade; some have grass.",
      ground: "Grass and shade vary by site; exact pitch levelness is not specified.",
      details: "Standard and private sites, braai area at each site, river swimming holes, maximum 6 people per site. No on-site shop and no pets.",
      bestFor: "Tent and caravan campers happy without mains electricity who want river swimming and braai facilities.",
      caution: "Bookings are required in advance; conservation fees may be additional. Confirm the private-stand rules and current price."
    },
    {
      id: "greyton-twin-rivers",
      names: ["Greyton"],
      name: "Greyton Twin Rivers Campsites",
      area: "Within approximately 3 km of Greyton",
      source: "Greyton Twin Rivers",
      url: "https://greytontwinriverscampsite.co.za/",
      evidence: "Published campsite website",
      setup: [],
      setupLabel: "Off-grid camping; confirm the pitch and equipment suitability with the operator",
      power: "Described as off-the-grid; do not assume mains electricity or powered stands.",
      ablutions: "Ablution details are not confirmed in the published information reviewed; ask the operator.",
      shade: "The site describes large trees and shaded or secluded spots; confirm shade at the specific pitch.",
      ground: "Riverside and nearby pitches; exact ground surface and levelness are not specified.",
      details: "Pet-friendly campsite beside two rivers, with deeper swimming areas on the Riviersonderend and generally shallower water on the Gobos.",
      bestFor: "Campers seeking a nature-focused, pet-friendly stay near Greyton who can confirm facilities before arrival.",
      caution: "River depth and flow can change; supervise children and pets around water. Confirm electricity, ablutions, access and current rules directly."
    },
    {
      id: "arniston-camping",
      names: ["Arniston"],
      name: "Arniston Camping",
      area: "At the selected destination",
      source: "Cape Agulhas Municipality Bookings",
      url: "https://bookings.capeagulhas.gov.za/accommodation/",
      evidence: "Municipal booking listing",
      setup: [],
      setupLabel: "Camping with electricity listed; confirm tent/caravan pitch type",
      power: "Municipal listing identifies an electricity-equipped camping option; confirm connection type and whether it is available for your selected unit.",
      ablutions: "Ablution facilities are not detailed in the listing reviewed; confirm before booking.",
      shade: "Pitch-level shade is not confirmed.",
      ground: "Pitch surface and levelness are not confirmed.",
      details: "Municipal booking portal lists Arniston Camping with electricity and capacity for up to 6 guests.",
      bestFor: "Campers who want an Arniston stay and need an official municipal booking route.",
      caution: "Do not assume every pitch has power, shade or a particular surface. Confirm current tariffs, dates, facilities and setup suitability with the municipality."
    },
    {
      id: "struisbaai-camping",
      names: ["Struisbaai"],
      name: "Struisbaai Camping",
      area: "At the selected destination",
      source: "Cape Agulhas Municipality Bookings",
      url: "https://bookings.capeagulhas.gov.za/accommodation/",
      evidence: "Municipal booking listing",
      setup: [],
      setupLabel: "Camping plots; confirm exact plot and tent/caravan suitability",
      power: "The municipal portal lists both electricity-equipped and no-electricity camping options across its Struisbaai listings; select and verify the exact plot.",
      ablutions: "Ablution facilities are not detailed in the listing reviewed; confirm before booking.",
      shade: "Pitch-level shade is not confirmed.",
      ground: "Pitch surface and levelness are not confirmed.",
      details: "Official municipal listings include Struisbaai Camping, Struisbaai North Camping and individual camp plots, with capacity commonly listed up to 6 guests.",
      bestFor: "Campers who want to compare powered and unpowered municipal camping options in Struisbaai.",
      caution: "Electricity, plot dimensions and facilities vary by listing. Confirm the exact plot, current price and setup suitability before paying."
    },
    {
      id: "die-eike-river",
      names: ["Tulbagh"],
      name: "Die Eike — River Camp",
      area: "At the Tulbagh destination",
      source: "Die Eike Tulbagh",
      url: "https://www.eikecamping.co.za/",
      evidence: "Published campsite website",
      setup: ["Tent", "Caravan"],
      power: "Three electricity points are listed, but the operator says they are not suitable for high-draw appliances such as kettles, hair dryers or caravan air-conditioning.",
      ablutions: "One shower, one toilet and a scullery; hot water uses a wood-fired system.",
      shade: "Oak trees are present; exact shade at the allocated pitch is not specified.",
      ground: "Campground with vehicle access for normal cars and road caravans; exact pitch levelness is not specified.",
      details: "The river camp accommodates groups; the operator notes that river water may be low or absent in summer and fires are restricted to the designated fire pit.",
      bestFor: "Groups wanting a shared river-and-orchard setting who can work within limited electrical capacity.",
      caution: "Confirm group capacity, price, river conditions and electrical limits. This is a working farm; follow the operator's fire rules."
    },
    {
      id: "die-eike-fynbos",
      names: ["Tulbagh"],
      name: "Die Eike — Fynbos Kamp",
      area: "At the Tulbagh destination",
      source: "Die Eike Tulbagh",
      url: "https://www.eikecamping.co.za/",
      evidence: "Published campsite website",
      setup: ["Tent"],
      power: "No electricity at the campsite.",
      ablutions: "Toilet, gas-heated hot shower and nearby water tap.",
      shade: "Shade is not confirmed; the campsite is in a fynbos area.",
      ground: "Fynbos campsite; exact pitch surface and levelness are not specified.",
      details: "Maximum 6 people and 2 vehicles per booking; a braai area is available. The operator warns that camping in flammable fynbos carries fire risk.",
      bestFor: "Small groups who prefer a simpler unpowered campsite and do not require mains electricity.",
      caution: "Confirm current fire restrictions and access rules. Bring only the equipment permitted by the operator."
    },
    {
      id: "petervale-ceres",
      names: ["Ceres"],
      name: "Petervale Guest Farm Campsites",
      area: "Approximately 10 km outside Ceres",
      source: "Ceres Tourism Bureau",
      url: "https://www.ceres.org.za/places/petervale-guest-farm/",
      evidence: "Published tourism listing",
      setup: [],
      setupLabel: "Farm campsites; confirm tent/caravan suitability",
      power: "Electricity availability is not stated in the listing; confirm before booking.",
      ablutions: "Toilets and hot-water showers are listed; fresh spring water is available.",
      shade: "Shade at the allocated pitch is not confirmed.",
      ground: "Campsites are described as nestled in forest overlooking a dam; pitch surface and levelness are not specified.",
      details: "Farm setting with braai facilities and a dam; the tourism listing also identifies the property as child-friendly.",
      bestFor: "Campers wanting a farm setting near Ceres with listed toilets and hot showers.",
      caution: "Confirm power, water arrangements, swimming access, current facilities, rates and the exact pitch directly with the farm."
    }
  ];

  function relevantSiteProfiles(destination) {
    const name = String(destination?.name || "").toLowerCase();
    return SITE_PROFILES.filter(profile => profile.names.some(alias => alias.toLowerCase() === name));
  }

  function profileFit(profile, settings) {
    const issues = [];
    if (settings.campingSetup && settings.campingSetup !== "Any" && !profile.setup.includes(settings.campingSetup)) {
      issues.push("Your selected setup is not explicitly confirmed for this site.");
    }
    if (settings.campingPower === "Required" && /no power points|no electricity/i.test(profile.power)) {
      issues.push("Does not meet the mains-electricity requirement.");
    }
    if (settings.campingPower === "Required" && /not confirmed|confirm/i.test(profile.power)) {
      issues.push("Mains electricity is not confirmed; do not treat this as a match until checked.");
    }
    if (settings.campingAblutions === "Full" && /confirm the current|not confirmed/i.test(profile.ablutions)) {
      issues.push("Full ablutions are not sufficiently confirmed in the source.");
    }
    if (settings.campingShade === "Shaded" && /not confirmed/i.test(profile.shade)) {
      issues.push("Pitch-level shade is not confirmed.");
    }
    if (settings.campingTerrain && settings.campingTerrain !== "Any") {
      const terrain = profile.ground.toLowerCase();
      const matches = (settings.campingTerrain === "Grass" && /grass|grassy/i.test(terrain)) ||
        (settings.campingTerrain === "Sand" && /sand/i.test(terrain)) ||
        (settings.campingTerrain === "Gravel" && /gravel|hardstand/i.test(terrain)) ||
        (settings.campingTerrain === "Firm level" && /firm and level|level pitch/i.test(terrain));
      if (!matches) issues.push("The preferred ground type is not confirmed for the individual pitch.");
    }
    return issues;
  }

  function publishedSiteOptions(destination, settings) {
    if (settings.campingSetup === "Glamping") {
      return '<p>Glamping is a furnished outdoor-stay category rather than a standard tent pitch. Use the glamping-specific discovery links below instead of treating ordinary campsites as confirmed matches.</p>';
    }
    const profiles = relevantSiteProfiles(destination);
    if (!profiles.length) {
      return '<p>No destination-specific campsite profile is available in the current curated set yet. Use the targeted directory and official-source searches below; unconfirmed details should stay unconfirmed rather than be guessed.</p>';
    }
    return profiles.map(profile => {
      const issues = profileFit(profile, settings);
      const status = issues.length ? "CHECK BEFORE CHOOSING" : "POTENTIAL OPTION — VERIFY PITCH";
      const setup = profile.setup.join(" / ");
      return '<article class="camping-site-profile">' +
        '<div class="camping-site-top"><strong>' + esc(profile.name) + '</strong><span>' + esc(status) + '</span></div>' +
        '<p class="camping-site-area">' + esc(profile.area) + '</p>' +
        '<p><b>Published setup:</b> ' + esc(profile.setupLabel || setup) + '</p>' +
        '<ul><li><b>Electricity:</b> ' + esc(profile.power) + '</li>' +
        '<li><b>Ablutions:</b> ' + esc(profile.ablutions) + '</li>' +
        '<li><b>Shade:</b> ' + esc(profile.shade) + '</li>' +
        '<li><b>Ground:</b> ' + esc(profile.ground) + '</li></ul>' +
        '<p>' + esc(profile.details) + '</p>' +
        '<p><b>Best suited to:</b> ' + esc(profile.bestFor) + '</p>' +
        (issues.length ? '<p class="camping-profile-warning"><b>Preference check:</b> ' + esc(issues.join(" ")) + '</p>' : '') +
        '<p class="camping-profile-warning">' + esc(profile.caution) + '</p>' +
        '<p><a href="' + esc(profile.url) + '" target="_blank" rel="noopener noreferrer">Check official ' + esc(profile.source) + ' details ↗</a></p>' +
        '<p class="camping-source-note">Evidence: ' + esc(profile.evidence) + '. Current availability and the exact pitch are not verified by this app.</p>' +
      '</article>';
    }).join("");
  }

  function cardSummary(destination, settings) {
    const selected = preferences(settings).filter(([, value]) => value !== "Any");
    const summary = selected.length
      ? selected.map(([label, value]) => label + ": " + value).join(" · ")
      : "Open to different camping setups and facilities.";
    return '<div class="camping-result-box"><strong>CAMPING AWAY · YOUR SITE PREFERENCES</strong><p>' +
      esc(summary) + '</p><p><b>BUDGET STATUS:</b> The trip card uses a generic demonstration accommodation allowance, not a verified campsite tariff. The actual pitch/site fee is not mapped or included as a confirmed price, so the displayed remainder is only the amount left before the campsite fee. Open VIEW WEEKEND to research sites, then confirm the full group price for your dates.</p><p>Availability and pitch-level details are not live-verified.</p></div>';
  }

  function detailSummary(destination, settings) {
    const rows = preferences(settings).map(([label, value]) =>
      '<li><strong>' + esc(label) + ':</strong> ' + esc(value === "Any" ? "No preference" : value) + '</li>'
    ).join("");
    const links = sourceLinks(destination, settings).map(link =>
      '<a href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.name) + ' ↗</a>'
    ).join("");
    return '<section class="camping-result-box" aria-label="Camping site matching guidance">' +
      '<strong>CAMPING AWAY · SITE-FIT CHECK</strong>' +
      '<p><b>ESTIMATED AFFORDABILITY ONLY:</b> The trip estimate uses a generic accommodation allowance, not a verified campsite tariff. The actual pitch/site fee is not mapped or included as a confirmed price; treat any budget remainder as money left before that fee.</p>' +
      '<p>These preferences refine what to look for around ' + esc(destination.name) + '. They are not proof that a matching pitch is available.</p>' +
      '<ul>' + rows + '</ul>' +
      (settings.campingSetup === "Glamping" ? glampingSummary(destination, settings) :
        '<strong>PUBLISHED CAMPSITE OPTIONS</strong>' +
        '<div class="camping-site-profiles">' + publishedSiteOptions(destination, settings) + '</div>') +
      '<strong>WHAT TO CONFIRM</strong><ul>' + advice(settings).map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>' +
      '<strong>MORE CAMPSITE RESEARCH SOURCES</strong>' +
      '<div class="camping-source-links">' + links + '</div>' +
      '<p class="camping-source-note">Profiles summarize published official information, not a live campsite database. Confirm current tariffs, dates, access and stand-level facilities with the operator. Third-party directory links help broaden discovery but are not booking integrations.</p>' +
      '</section>';
  }

  function setupCampingControls() {
    const experience = document.querySelector("#experience");
    const panel = document.querySelector("#camping-controls");
    if (!experience || !panel) return;
    const sync = () => { panel.hidden = experience.value !== "Camping Away"; };
    experience.addEventListener("change", sync);
    sync();
  }

  window.BMWCamping = { preferences, advice, sourceLinks, glampingLinks, glampingSummary, glampingProfiles, cardSummary, detailSummary, setupCampingControls, relevantSiteProfiles, profileFit };
})();
