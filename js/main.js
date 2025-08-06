const datePicker = document.getElementById("date-picker");
const hourSlider = document.getElementById("hour-slider");
const layerSelector = document.getElementById("layer-selector");
const refreshButton = document.getElementById("refresh-button");
document.addEventListener("DOMContentLoaded", () => {
  map = initializeMap();

  map.on("load", initializeApp);
});

function initializeApp() {
  initializeTimezoneDisplay();
  initializeModal();
  initializeLegend();
  initializeStateFromUrl();
  setupEventListeners();
  loadInitialData();
}

function initializeStateFromUrl() {
  const urlState = getStateFromUrl();

  if (urlState.layer) {
    CONSTANTS.currentLayer = urlState.layer;
    layerSelector.value = urlState.layer;
    updateLayerDescription(urlState.layer);
    updateLegend(urlState.layer);
  }

  if (urlState.date) {
    datePicker.value = urlState.date;
  } else {
    setDefaultDate(datePicker);
  }

  if (urlState.hour !== undefined) {
    hourSlider.value = urlState.hour;
    document.getElementById("hour-value-display").textContent = formatLocalHour(
      urlState.hour,
    );
  }

  syncUrlWithCurrentState(true);
}

function syncUrlWithCurrentState(replace = false) {
  const date = datePicker.value;
  const hour = parseInt(hourSlider.value, 10);
  const layer = CONSTANTS.currentLayer;

  updateUrlParams(date, hour, layer, replace);
}

async function handlePopState(event) {
  const urlState = getStateFromUrl();
  let shouldReload = false;

  if (urlState.layer && urlState.layer !== CONSTANTS.currentLayer) {
    CONSTANTS.currentLayer = urlState.layer;
    layerSelector.value = urlState.layer;
    updateLayerDescription(urlState.layer);
    updateLegend(urlState.layer);
    resetLayer();
    shouldReload = true;
  }

  if (urlState.date && urlState.date !== datePicker.value) {
    datePicker.value = urlState.date;
    shouldReload = true;
  }

  if (
    urlState.hour !== undefined &&
    urlState.hour !== parseInt(hourSlider.value, 10)
  ) {
    hourSlider.value = urlState.hour;
    document.getElementById("hour-value-display").textContent = formatLocalHour(
      urlState.hour,
    );
    shouldReload = true;
  }

  if (shouldReload) {
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
  }
}

function initializeTimezoneDisplay() {
  const timezoneDisplay = document.getElementById("timezone-display");
  timezoneDisplay.textContent = getTimezoneAbbreviation();
}

function setupEventListeners() {
  window.addEventListener("popstate", handlePopState);

  refreshButton.addEventListener("click", async () => {
    await refreshToLatestData();
  });

  layerSelector.addEventListener("change", async (e) => {
    const selectedLayer = e.target.value;
    CONSTANTS.currentLayer = selectedLayer;
    updateLayerDescription(selectedLayer);
    updateLegend(selectedLayer);
    resetLayer();
    syncUrlWithCurrentState();

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
    syncUrlWithCurrentState();

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
        syncUrlWithCurrentState();
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
      syncUrlWithCurrentState();

      if (currentLocalDate) {
        displayImageForHour(utcInfo.utcDate, nearestCachedHour);
      }
    } else {
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(requestedLocalHour);
      syncUrlWithCurrentState();
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

async function refreshToLatestData() {
  setDefaultDate(datePicker);

  const currentLocalDate = datePicker.value;

  resetLayer();
  await preCacheImagesForLocalDate(currentLocalDate);

  const now = new Date();
  const currentUtcHour = now.getUTCHours();

  const allCachedHours = Array.from(cachedHours).sort((a, b) => b - a); // Sort descending
  let latestAvailableUtcHour = null;

  for (const utcHour of allCachedHours) {
    if (utcHour <= currentUtcHour) {
      latestAvailableUtcHour = utcHour;
      break;
    }
  }

  if (latestAvailableUtcHour === null && allCachedHours.length > 0) {
    latestAvailableUtcHour = allCachedHours[0]; // Most recent hour available
  }

  console.log("Current UTC hour:", currentUtcHour);
  console.log("Latest available UTC hour:", latestAvailableUtcHour);

  if (latestAvailableUtcHour !== null) {
    let correctUtcDate = null;
    let correctLocalHour = null;

    for (let localHour = 0; localHour < 24; localHour++) {
      const utcInfo = convertLocalToUTC(currentLocalDate, localHour);
      if (utcInfo.utcHour === latestAvailableUtcHour) {
        correctUtcDate = utcInfo.utcDate;
        correctLocalHour = localHour;
        console.log(
          `Found match: Local ${localHour}:00 on ${currentLocalDate} = UTC ${latestAvailableUtcHour}:00 on ${correctUtcDate}`,
        );
        break;
      }
    }

    if (correctUtcDate && correctLocalHour !== null) {
      hourSlider.value = correctLocalHour;
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(correctLocalHour);

      syncUrlWithCurrentState();

      displayImageForHour(correctUtcDate, latestAvailableUtcHour);
    } else {
      console.log(
        "No matching local hour found for UTC hour",
        latestAvailableUtcHour,
      );
      const currentLocalHour = now.getHours();
      hourSlider.value = currentLocalHour;
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(currentLocalHour);
      syncUrlWithCurrentState();
      await loadInitialData();
    }
  } else {
    console.log("No cached hours found");
    const currentLocalHour = now.getHours();
    hourSlider.value = currentLocalHour;
    document.getElementById("hour-value-display").textContent =
      formatLocalHour(currentLocalHour);
    syncUrlWithCurrentState();
    await loadInitialData();
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
        descriptionElement.textContent =
          "Real-time surface (8m) smoke mass density";
        break;
      default:
        descriptionElement.textContent = `Real-time ${layer.name}`;
    }
  }
}
