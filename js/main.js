/**
 * Main application entry point for NOAA HRRR Browser
 */

// DOM Elements
const datePicker = document.getElementById("date-picker");
const hourSlider = document.getElementById("hour-slider");

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

  // Set up modal functionality
  initializeModal();

  // Initialize event listeners
  setupEventListeners();

  // Load initial data
  loadInitialData();
}

/**
 * Set up event listeners for user interactions
 */
function setupEventListeners() {
  // Date picker change event
  datePicker.addEventListener("change", async (e) => {
    const newDate = formatDate(e.target.value);
    const currentHour = parseInt(hourSlider.value, 10);

    if (newDate) {
      // Reset the layer when changing dates
      resetLayer();

      // Start pre-caching for the new date
      await preCacheImagesForDate(newDate);

      // Display the current hour for the new date
      displayImageForHour(newDate, currentHour);
    }
  });

  // Hour slider change event
  hourSlider.addEventListener("input", (e) => {
    const currentDate = formatDate(datePicker.value);
    const newHour = parseInt(e.target.value, 10);

    // Update the hour display immediately for better UX
    document.getElementById("hour-value-display").textContent =
      formatHour(newHour);

    if (currentDate) {
      displayImageForHour(currentDate, newHour);
    }
  });
}

/**
 * Load initial data when the application starts
 */
function loadInitialData() {
  const initialDate = formatDate(datePicker.value);
  const initialHour = parseInt(hourSlider.value, 10);

  if (initialDate) {
    // Start pre-caching for all hours (don't wait for completion)
    preCacheImagesForDate(initialDate);

    // Display the initial hour
    displayImageForHour(initialDate, initialHour);
  } else {
    console.warn("Initial date not set, layer not loaded.");
  }
}
