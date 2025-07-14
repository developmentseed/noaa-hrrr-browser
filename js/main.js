/**
 * Main application entry point for NOAA HRRR Browser
 */

// DOM Elements
const datePicker = document.getElementById("date-picker");
const hourSlider = document.getElementById("hour-slider");
const layerSelector = document.getElementById("layer-selector");

/**
 * Initialize the application when document is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize the map
  map = initializeMap();

  // Wait for map to load before setting up the app
  map.on("load", initializeApp);
});

/**
 * Initialize the application once the map is loaded
 */
function initializeApp() {
  console.log("Map loaded, initializing application");

  // Set default date (yesterday)
  setDefaultDate(datePicker);

  // Set up timezone display
  initializeTimezoneDisplay();

  // Set up modal functionality
  initializeModal();

  // Initialize event listeners
  setupEventListeners();

  // Load initial data
  loadInitialData();
}

/**
 * Initialize timezone display in the UI
 */
function initializeTimezoneDisplay() {
  const timezoneDisplay = document.getElementById("timezone-display");
  timezoneDisplay.textContent = getTimezoneAbbreviation();
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
  // Layer selector change event
  layerSelector.addEventListener("change", async (e) => {
    const selectedLayer = e.target.value;
    
    // Update the current layer in constants
    CONSTANTS.currentLayer = selectedLayer;
    
    // Update the description based on the selected layer
    updateLayerDescription(selectedLayer);
    
    // Reset the layer and reload with the new layer
    resetLayer();
    
    // Get current date and hour
    const currentLocalDate = datePicker.value;
    const currentLocalHour = parseInt(hourSlider.value, 10);
    
    if (currentLocalDate) {
      // Convert local date/hour to UTC for data fetching
      const utcInfo = convertLocalToUTC(currentLocalDate, currentLocalHour);
      
      // Start pre-caching for the UTC date with the new layer
      await preCacheImagesForDate(utcInfo.utcDate);
      
      // Check if we have cached hours and use the most recent one
      const mostRecentHour = getMostRecentCachedHour();
      const hourToUse = mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;
      
      // Display the selected hour for the new layer
      displayImageForHour(utcInfo.utcDate, hourToUse);
    }
  });

  // Date picker change event
  datePicker.addEventListener("change", async (e) => {
    const selectedLocalDate = e.target.value;
    const currentLocalHour = parseInt(hourSlider.value, 10);

    if (selectedLocalDate) {
      // Reset the layer when changing dates
      resetLayer();

      // Convert local date/hour to UTC for data fetching
      const utcInfo = convertLocalToUTC(selectedLocalDate, currentLocalHour);
      
      // Start pre-caching for the UTC date
      await preCacheImagesForDate(utcInfo.utcDate);

      // Check if we have cached hours and use the most recent one
      const mostRecentHour = getMostRecentCachedHour();
      const hourToUse = mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;

      // Update the slider to reflect the hour we're actually using (convert back to local)
      if (mostRecentHour !== null) {
        const localInfo = convertUTCToLocal(utcInfo.utcDate, mostRecentHour);
        
        // Handle case where the UTC date might have changed due to timezone conversion
        if (localInfo.localDate !== selectedLocalDate) {
          // If the local date changed, we need to adjust the slider value
          hourSlider.value = localInfo.localHour;
          document.getElementById("hour-value-display").textContent = formatLocalHour(localInfo.localHour);
        } else {
          hourSlider.value = localInfo.localHour;
          document.getElementById("hour-value-display").textContent = formatLocalHour(localInfo.localHour);
        }
      }

      // Display the selected hour for the new date
      displayImageForHour(utcInfo.utcDate, hourToUse);
    }
  });

  // Hour slider change event
  hourSlider.addEventListener("input", (e) => {
    const currentLocalDate = datePicker.value;
    const requestedLocalHour = parseInt(e.target.value, 10);

    // Convert local date/hour to UTC for data fetching
    const utcInfo = convertLocalToUTC(currentLocalDate, requestedLocalHour);

    // Find the nearest cached hour to the requested UTC hour
    const nearestCachedHour = getNearestCachedHour(utcInfo.utcHour);
    
    if (nearestCachedHour !== null) {
      // Snap the slider to the nearest cached hour (convert back to local)
      const localInfo = convertUTCToLocal(utcInfo.utcDate, nearestCachedHour);
      const localHourToUse = localInfo.localHour;
      
      // Update the slider value if it's different from what the user selected
      if (localHourToUse !== requestedLocalHour) {
        hourSlider.value = localHourToUse;
      }
      
      // Update the hour display
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(localHourToUse);

      if (currentLocalDate) {
        displayImageForHour(utcInfo.utcDate, nearestCachedHour);
      }
    } else {
      // No cached hours available, keep display as is
      document.getElementById("hour-value-display").textContent =
        formatLocalHour(requestedLocalHour);
    }
  });
}

/**
 * Load initial data when the application starts
 */
async function loadInitialData() {
  const initialLocalDate = datePicker.value;
  const initialLocalHour = parseInt(hourSlider.value, 10);

  if (initialLocalDate) {
    // Convert local date/hour to UTC for data fetching
    const utcInfo = convertLocalToUTC(initialLocalDate, initialLocalHour);
    
    // Start pre-caching for all hours and wait for some to complete
    await preCacheImagesForDate(utcInfo.utcDate);

    // Check if we have cached hours and use the most recent one
    const mostRecentHour = getMostRecentCachedHour();
    const hourToUse = mostRecentHour !== null ? mostRecentHour : utcInfo.utcHour;

    console.log("Initial load - Most recent cached hour:", mostRecentHour);
    console.log("Initial load - Hour to use:", hourToUse);

    // Update the slider to reflect the hour we're actually using (convert back to local)
    if (mostRecentHour !== null) {
      const localInfo = convertUTCToLocal(utcInfo.utcDate, mostRecentHour);
      hourSlider.value = localInfo.localHour;
      document.getElementById("hour-value-display").textContent = formatLocalHour(localInfo.localHour);
    } else {
      document.getElementById("hour-value-display").textContent = formatLocalHour(initialLocalHour);
    }

    // Display the selected hour
    displayImageForHour(utcInfo.utcDate, hourToUse);
  } else {
    console.warn("Initial date not set, layer not loaded.");
  }
}

/**
 * Update the layer description based on the selected layer
 * @param {string} layerKey - The layer key (e.g., 'REFLECTIVITY', 'MASSDEN')
 */
function updateLayerDescription(layerKey) {
  const descriptionElement = document.querySelector('.description');
  const layer = CONSTANTS.LAYERS[layerKey];
  
  if (layer) {
    switch (layerKey) {
      case 'REFLECTIVITY':
        descriptionElement.textContent = 'Real-time composite reflectivity (FH0)';
        break;
      case 'MASSDEN':
        descriptionElement.textContent = 'Real-time smoke mass density (FH0)';
        break;
      default:
        descriptionElement.textContent = `Real-time ${layer.name} (FH0)`;
    }
  }
}
