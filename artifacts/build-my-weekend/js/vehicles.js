(() => {
  "use strict";

  // Starter estimates for common South African-market vehicles. These are planning
  // baselines, not verified figures for every model year, engine or transmission.
  const VEHICLES = [
    { id: "manual", label: "Choose vehicle / enter consumption manually", consumption: null },
    { id: "toyota-starlet", label: "Toyota Starlet (petrol) — estimate 5.5 L/100 km", consumption: 5.5 },
    { id: "suzuki-swift", label: "Suzuki Swift (petrol) — estimate 5.0 L/100 km", consumption: 5.0 },
    { id: "vw-polo", label: "Volkswagen Polo (petrol) — estimate 6.0 L/100 km", consumption: 6.0 },
    { id: "toyota-corolla", label: "Toyota Corolla (petrol) — estimate 6.5 L/100 km", consumption: 6.5 },
    { id: "toyota-corolla-cross", label: "Toyota Corolla Cross (petrol) — estimate 7.0 L/100 km", consumption: 7.0 },
    { id: "toyota-avanza", label: "Toyota Avanza (petrol) — estimate 7.5 L/100 km", consumption: 7.5 },
    { id: "toyota-hilux-diesel", label: "Toyota Hilux (diesel) — estimate 9.0 L/100 km", consumption: 9.0 },
    { id: "ford-ranger-diesel", label: "Ford Ranger (diesel) — estimate 9.5 L/100 km", consumption: 9.5 },
    { id: "isuzu-dmax-diesel", label: "Isuzu D-Max (diesel) — estimate 8.5 L/100 km", consumption: 8.5 },
    { id: "suzuki-ertiga", label: "Suzuki Ertiga (petrol) — estimate 6.5 L/100 km", consumption: 6.5 },
    { id: "hyundai-grand-i10", label: "Hyundai Grand i10 (petrol) — estimate 5.8 L/100 km", consumption: 5.8 },
    { id: "kia-picanto", label: "Kia Picanto (petrol) — estimate 5.2 L/100 km", consumption: 5.2 },
    { id: "renault-kwid", label: "Renault Kwid (petrol) — estimate 4.8 L/100 km", consumption: 4.8 }
  ];

  const SELECT_KEY = "buildMyWeekendVehicleProfile";
  const select = document.querySelector("#vehicle-profile");
  const consumption = document.querySelector("#consumption");
  if (!select || !consumption) return;

  for (const vehicle of VEHICLES) {
    const option = document.createElement("option");
    option.value = vehicle.id;
    option.textContent = vehicle.label;
    select.append(option);
  }

  const byId = new Map(VEHICLES.map(vehicle => [vehicle.id, vehicle]));
  let applyingVehicle = false;

  function saveSelection(id) {
    try { localStorage.setItem(SELECT_KEY, id); } catch {}
  }

  function applySelection(id, persist = true) {
    const vehicle = byId.get(id) || VEHICLES[0];
    select.value = vehicle.id;
    if (persist) saveSelection(vehicle.id);
    if (vehicle.consumption == null) return;
    applyingVehicle = true;
    consumption.value = String(vehicle.consumption);
    consumption.dispatchEvent(new Event("input", { bubbles: true }));
    consumption.dispatchEvent(new Event("change", { bubbles: true }));
    applyingVehicle = false;
  }

  let savedId = "manual";
  try {
    const saved = localStorage.getItem(SELECT_KEY);
    if (byId.has(saved)) savedId = saved;
  } catch {}
  select.value = savedId;

  select.addEventListener("change", () => applySelection(select.value));
  consumption.addEventListener("input", () => {
    if (applyingVehicle) return;
    if (select.value !== "manual") {
      select.value = "manual";
      saveSelection("manual");
    }
  });

  // app.js restores the saved fuel-consumption value during module startup.
  // Apply the remembered vehicle only after all modules have initialized.
  window.addEventListener("load", () => {
    if (savedId !== "manual") applySelection(savedId, false);
  }, { once: true });

  window.BMWVehicleProfiles = Object.freeze({
    count: VEHICLES.length - 1,
    list: () => VEHICLES.map(vehicle => ({ ...vehicle }))
  });
})();