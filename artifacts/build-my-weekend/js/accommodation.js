/* BUILD MY WEEKEND — Core accommodation discovery layer
   This layer deliberately does not pretend a static list is exhaustive.
   It creates current-area discovery links and ranks accommodation requirements.
*/
(function () {
  const TYPES = [
    "B&B / Guesthouse",
    "Holiday House / Holiday Home",
    "Self-Catering",
    "Hotel",
    "Lodge / Guest Farm",
    "Resort",
    "Glamping / Boutique outdoor stay",
    "Camping / Caravan",
    "Other accommodation"
  ];

  const SOURCES = [
    { name: "Booking.com", host: "booking.com" },
    { name: "Airbnb", host: "airbnb.com" },
    { name: "LekkeSlaap", host: "lekkeslaap.co.za" },
    { name: "SafariNow", host: "safarinow.com" },
    { name: "SA-Venues", host: "sa-venues.com" },
    { name: "Google Maps", host: "google.com" }
  ];

  function q(value) {
    return encodeURIComponent(String(value || "").trim());
  }

  function searchText(destination, settings) {
    const area = destination.name;
    const people = Number(settings?.people) || 0;
    const budget = Number(settings?.budget) || 0;
    const parts = [area + " accommodation South Africa"];
    if (people) parts.push(people + " guests");
    if (budget) parts.push("budget R" + Math.round(budget));
    return parts.join(" ");
  }

  function links(destination, settings) {
    const area = destination.name;
    const query = q(searchText(destination, settings));
    const dates = settings?.depart && settings?.returnDate
      ? `&checkin=${q(settings.depart)}&checkout=${q(settings.returnDate)}`
      : "";
    const people = Math.max(1, Number(settings?.people) || 1);
    const bookingGuests = `&group_adults=${people}&no_rooms=1&group_children=0`;
    const airbnbParams = [
      `adults=${people}`,
      ...(settings?.depart && settings?.returnDate
        ? [`checkin=${q(settings.depart)}`, `checkout=${q(settings.returnDate)}`]
        : [])
    ].join("&");

    return [
      { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${q(area + " South Africa")}${dates}${bookingGuests}` },
      { name: "Airbnb", url: `https://www.airbnb.com/s/${q(area + " South Africa")}/homes?${airbnbParams}` },
      { name: "LekkeSlaap", url: `https://www.lekkeslaap.co.za/search?search=${query}` },
      { name: "SafariNow", url: `https://www.safarinow.com/destinations/search.aspx?search=${query}` },
      { name: "SA-Venues", url: `https://www.sa-venues.com/search.php?search=${query}` },
      { name: "Google Maps", url: `https://www.google.com/maps/search/${q(area + " accommodation")}` }
    ];
  }

  function rank(destination, settings) {
    let preferred;
    if (settings?.experience === "Camping Away" && settings?.campingSetup === "Glamping") {
      preferred = ["Glamping / Boutique outdoor stay", "Camping / Caravan", "Lodge / Guest Farm", "Self-Catering", "Holiday House / Holiday Home", "B&B / Guesthouse", "Resort", "Hotel", "Other accommodation"];
    } else if (settings?.experience === "Fishing Away") {
      preferred = ["Self-Catering", "Holiday House / Holiday Home", "B&B / Guesthouse", "Lodge / Guest Farm", "Camping / Caravan", "Glamping / Boutique outdoor stay", "Resort", "Hotel", "Other accommodation"];
    } else {
      preferred = ["Self-Catering", "B&B / Guesthouse", "Holiday House / Holiday Home", "Hotel", "Lodge / Guest Farm", "Resort", "Glamping / Boutique outdoor stay", "Camping / Caravan", "Other accommodation"];
    }

    return {
      types: TYPES,
      preferred,
      note: settings?.experience === "Camping Away" && settings?.campingSetup === "Glamping"
        ? "Glamping and boutique outdoor stays are prioritised for your selected setup. Confirm exact property, dates, guest capacity, full stay price and distance; discovery links do not verify live availability."
        : settings?.experience === "Fishing Away"
          ? "For Fishing Away, accommodation is ranked for fishing practicality and budget fit. Check parking, equipment storage, self-catering, access, current distance to the fishing area and current price."
          : "The app checks the current suggested area across multiple accommodation sources and categories rather than claiming a small fixed property list is exhaustive. Availability, prices and suitability must be confirmed with the provider."
    };
  }

  window.BMWAccommodation = { TYPES, SOURCES, links, rank };
})();
