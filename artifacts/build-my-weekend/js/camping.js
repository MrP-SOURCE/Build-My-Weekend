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

  function sourceLinks(destination, settings) {
    const terms = [
      destination.name,
      settings.campingSetup && settings.campingSetup !== "Any" ? settings.campingSetup : "camping caravan tent",
      settings.campingPower && settings.campingPower !== "Any" ? settings.campingPower + " electricity" : "",
      settings.campingAblutions && settings.campingAblutions !== "Any" ? settings.campingAblutions + " ablutions" : "",
      settings.campingShade && settings.campingShade !== "Any" ? settings.campingShade + " shade" : "",
      settings.campingTerrain && settings.campingTerrain !== "Any" ? settings.campingTerrain + " pitch" : "",
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
      { name: "CapeNature", url: "https://www.capenature.co.za/" },
      { name: "SANParks", url: "https://www.sanparks.org/" },
      { name: "Search wider web", url: "https://www.google.com/search?q=" + q }
    ];
  }

  function cardSummary(destination, settings) {
    const selected = preferences(settings).filter(([, value]) => value !== "Any");
    const summary = selected.length
      ? selected.map(([label, value]) => label + ": " + value).join(" · ")
      : "Open to different camping setups and facilities.";
    return '<div class="camping-result-box"><strong>CAMPING AWAY · YOUR SITE PREFERENCES</strong><p>' +
      esc(summary) + '</p><p>Open VIEW WEEKEND for tailored campsite research. Availability and pitch-level details are not live-verified.</p></div>';
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
      '<p>These preferences refine what to look for around ' + esc(destination.name) + '. They are not proof that a matching pitch is available.</p>' +
      '<ul>' + rows + '</ul>' +
      '<strong>WHAT TO CONFIRM</strong><ul>' + advice(settings).map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>' +
      '<strong>CAMPSITE RESEARCH SOURCES</strong>' +
      '<div class="camping-source-links">' + links + '</div>' +
      '<p class="camping-source-note">These links are research starting points, not a connected booking API. Terrain, electricity, shade and ablutions can vary by individual pitch. Verify directly with the campsite before booking.</p>' +
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

  window.BMWCamping = { preferences, advice, sourceLinks, cardSummary, detailSummary, setupCampingControls };
})();
