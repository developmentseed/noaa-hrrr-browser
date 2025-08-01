const datePicker = document.getElementById("date-picker");
const hourSlider = document.getElementById("hour-slider");
const layerSelector = document.getElementById("layer-selector");
const refreshButton = document.getElementById("refresh-button");
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the map
  map = initializeMap();

  // Wait for map to load before setting up the app
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
    document.getElementById("hour-value-display").textContent = formatLocalHour(urlState.hour);
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
  
  if (urlState.hour !== undefined && urlState.hour !== parseInt(hourSlider.value, 10)) {
    hourSlider.value = urlState.hour;
    document.getElementById("hour-value-display").textContent = formatLocalHour(urlState.hour);
    shouldReload = true;
  }
  
  if (shouldReload) {
    const currentLocalDate = datePicker.value;
    const currentLocalHour = parseInt(hourSlider.value, 10);
    
    if (currentLocalDate) {
      await preCacheImagesForLocalDate(currentLocalDate);
      const utcInfo = convertLocalToUTC(currentLocalDate, currentLocalHour);
      const mostRecentHour = getMostRecentCachedHour();
      const hourToUse = mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;
      displayImageForHour(utcInfo.utcDate, hourToUse);
    }
  }
}

function initializeTimezoneDisplay() {
  const timezoneDisplay = document.getElementById("timezone-display");
  timezoneDisplay.textContent = getTimezoneAbbreviation();
}

function setupEventListeners() {
  window.addEventListener('popstate', handlePopState);
  
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
  // Set to current date using existing function
  setDefaultDate(datePicker);
  
  const currentLocalDate = datePicker.value;
  
  // Pre-cache images first to determine what data is actually available
  resetLayer();
  await preCacheImagesForLocalDate(currentLocalDate);
  
  // Find the actual latest available hour based on current time
  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  
  // Get all cached hours and find the most recent one that's <= current UTC hour
  const allCachedHours = Array.from(cachedHours).sort((a, b) => b - a); // Sort descending
  let latestAvailableUtcHour = null;
  
  // Look for the most recent hour that's available and <= current UTC hour
  for (const utcHour of allCachedHours) {
    if (utcHour <= currentUtcHour) {
      latestAvailableUtcHour = utcHour;
      break;
    }
  }
  
  // If no hour found <= current time, take the most recent available from yesterday
  if (latestAvailableUtcHour === null && allCachedHours.length > 0) {
    latestAvailableUtcHour = allCachedHours[0]; // Most recent hour available
  }
  
  console.log("Current UTC hour:", currentUtcHour);
  console.log("Latest available UTC hour:", latestAvailableUtcHour);
  
  if (latestAvailableUtcHour !== null) {
    // Find the correct UTC date and local hour for this UTC hour
    let correctUtcDate = null;
    let correctLocalHour = null;
    
    for (let localHour = 0; localHour < 24; localHour++) {
      const utcInfo = convertLocalToUTC(currentLocalDate, localHour);
      if (utcInfo.utcHour === latestAvailableUtcHour) {
        correctUtcDate = utcInfo.utcDate;
        correctLocalHour = localHour;
        console.log(`Found match: Local ${localHour}:00 on ${currentLocalDate} = UTC ${latestAvailableUtcHour}:00 on ${correctUtcDate}`);
        break;
      }
    }
    
    if (correctUtcDate && correctLocalHour !== null) {
      // Update the UI with the actual latest available time
      hourSlider.value = correctLocalHour;
      document.getElementById("hour-value-display").textContent = formatLocalHour(correctLocalHour);
      
      syncUrlWithCurrentState();
      
      // Display the image for this hour
      displayImageForHour(correctUtcDate, latestAvailableUtcHour);
    } else {
      console.log("No matching local hour found for UTC hour", latestAvailableUtcHour);
      // Fallback: use current local time properly
      const currentLocalHour = now.getHours();
      hourSlider.value = currentLocalHour;
      document.getElementById("hour-value-display").textContent = formatLocalHour(currentLocalHour);
      syncUrlWithCurrentState();
      await loadInitialData();
    }
  } else {
    console.log("No cached hours found");
    // Fallback to current time if no data is cached
    const currentLocalHour = now.getHours();
    hourSlider.value = currentLocalHour;
    document.getElementById("hour-value-display").textContent = formatLocalHour(currentLocalHour);
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
        descriptionElement.textContent = "Real-time smoke mass density (FH0)";
        break;
      default:
        descriptionElement.textContent = `Real-time ${layer.name} (FH0)`;
    }
  }
}
