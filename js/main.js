const datePicker = document.getElementById("date-picker");
const hourSlider = document.getElementById("hour-slider");
const layerSelector = document.getElementById("layer-selector");
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the map
  map = initializeMap();

  // Wait for map to load before setting up the app
  map.on("load", initializeApp);
});

function initializeApp() {
  setDefaultDate(datePicker);
  initializeTimezoneDisplay();
  initializeModal();
  setupEventListeners();
  loadInitialData();
}

function initializeTimezoneDisplay() {
  const timezoneDisplay = document.getElementById("timezone-display");
  timezoneDisplay.textContent = getTimezoneAbbreviation();
}

function setupEventListeners() {
  layerSelector.addEventListener("change", async (e) => {
    const selectedLayer = e.target.value;
    CONSTANTS.currentLayer = selectedLayer;
    updateLayerDescription(selectedLayer);
    resetLayer();

    const currentLocalDate = datePicker.value;
    const currentLocalHour = parseInt(hourSlider.value, 10);

    if (currentLocalDate) {
      await preCacheImagesForLocalDate(currentLocalDate);
      const utcInfo = convertLocalToUTC(currentLocalDate, currentLocalHour);
      const mostRecentHour = getMostRecentCachedHour();
      const hourToUse =
        mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;
      displayImageForHour(utcInfo.utcDate, hourToUse);
    }
  });

  datePicker.addEventListener("change", async (e) => {
    const selectedLocalDate = e.target.value;
    const currentLocalHour = parseInt(hourSlider.value, 10);

    if (selectedLocalDate) {
      resetLayer();
      await preCacheImagesForLocalDate(selectedLocalDate);
      const utcInfo = convertLocalToUTC(selectedLocalDate, currentLocalHour);
      const mostRecentHour = getMostRecentCachedHour();
      const hourToUse =
        mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;

      if (mostRecentHour !== null) {
        const localInfo = convertUTCToLocal(utcInfo.utcDate, mostRecentHour);
        hourSlider.value = localInfo.localHour;
        document.getElementById("hour-value-display").textContent =
          formatLocalHour(localInfo.localHour);
      }

      displayImageForHour(utcInfo.utcDate, hourToUse);
    }
  });

  hourSlider.addEventListener("input", (e) => {
    const currentLocalDate = datePicker.value;
    const requestedLocalHour = parseInt(e.target.value, 10);
    const utcInfo = convertLocalToUTC(currentLocalDate, requestedLocalHour);
    const nearestCachedHour = getNearestCachedHour(utcInfo.utcHour);

    if (nearestCachedHour !== null) {
      const localInfo = convertUTCToLocal(utcInfo.utcDate, nearestCachedHour);
      const localHourToUse = localInfo.localHour;

      if (localHourToUse !== requestedLocalHour) {
        hourSlider.value = localHourToUse;
      }

      document.getElementById("hour-value-display").textContent =
        formatLocalHour(localHourToUse);

      if (currentLocalDate) {
        displayImageForHour(utcInfo.utcDate, nearestCachedHour);
      }
    } else {
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(requestedLocalHour);
    }
  });
}

async function loadInitialData() {
  const initialLocalDate = datePicker.value;
  const initialLocalHour = parseInt(hourSlider.value, 10);

  if (initialLocalDate) {
    await preCacheImagesForLocalDate(initialLocalDate);
    const utcInfo = convertLocalToUTC(initialLocalDate, initialLocalHour);
    const mostRecentHour = getMostRecentCachedHour();
    const hourToUse =
      mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;

    if (mostRecentHour !== null) {
      const localInfo = convertUTCToLocal(utcInfo.utcDate, mostRecentHour);
      hourSlider.value = localInfo.localHour;
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(localInfo.localHour);
    } else {
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(initialLocalHour);
    }

    displayImageForHour(utcInfo.utcDate, hourToUse);
  }
}

function updateLayerDescription(layerKey) {
  const descriptionElement = document.querySelector(".description");
  const layer = CONSTANTS.LAYERS[layerKey];

  if (layer) {
    switch (layerKey) {
      case "REFLECTIVITY":
        descriptionElement.textContent =
          "Real-time composite reflectivity (FH0)";
        break;
      case "MASSDEN":
        descriptionElement.textContent = "Real-time smoke mass density (FH0)";
        break;
      default:
        descriptionElement.textContent = `Real-time ${layer.name} (FH0)`;
    }
  }
}
