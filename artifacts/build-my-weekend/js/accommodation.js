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

  function links(destination, settings) {
    const area = destination.name;
    const query = q(area + " accommodation South Africa");
    const dates = settings?.depart && settings?.returnDate
      ? `&checkin=${q(settings.depart)}&checkout=${q(settings.returnDate)}`
      : "";

    return [
      { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${query}${dates}` },
      { name: "Airbnb", url: `https://www.airbnb.com/s/${q(area + " South Africa")}/homes` },
      { name: "LekkeSlaap", url: `https://www.lekkeslaap.co.za/search?search=${query}` },
      { name: "SafariNow", url: `https://www.safarinow.com/destinations/search.aspx?search=${query}` },
      { name: "SA-Venues", url: `https://www.sa-venues.com/search.php?search=${query}` },
      { name: "Google Maps", url: `https://www.google.com/maps/search/${q(area + " accommodation")}` }
    ];
  }

  function rank(destination, settings) {
    const preferred = settings?.experience === "Fishing Away"
      ? ["Self-Catering", "Holiday House / Holiday Home", "B&B / Guesthouse", "Lodge / Guest Farm", "Camping / Caravan", "Resort", "Hotel", "Other accommodation"]
      : ["Self-Catering", "B&B / Guesthouse", "Holiday House / Holiday Home", "Guesthouse", "Hotel", "Lodge / Guest Farm", "Resort", "Camping / Caravan", "Other accommodation"];

    return {
      types: TYPES,
      preferred,
      note: settings?.experience === "Fishing Away"
        ? "For Fishing Away, accommodation is ranked for practical fishing use as well as budget fit. Confirm parking, equipment storage, self-catering, access and current distance with the property."
        : "Accommodation is discovered from current-area search sources rather than a small fixed property list. Availability, prices and suitability must be confirmed with the accommodation provider."
    };
  }

  window.BMWAccommodation = { TYPES, SOURCES, links, rank };
})();
