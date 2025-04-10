/**
 * Map management and image handling for HRRR Browser
 */

// Layer and source identifiers
const HRRR_SOURCE_ID = "hrrr-image-source";
const HRRR_LAYER_ID = "hrrr-image-layer";

// State variables
let map;
let isLayerInitialized = false;
let cachedHours = new Set(); // Track which hours have been cached
let currentAbortController = null; // Track the current fetch request

/**
 * Initialize the map with MapLibre GL
 * @returns {Object} The initialized map object
 */
function initializeMap() {
  const mapInstance = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/backdrop/style.json?key=${window.CONFIG.MAPTILER_API_KEY}`,
    center: [-97.5, 40.0],
    zoom: 3.8,
  });

  // Set up error handling
  mapInstance.on("error", handleMapError);

  return mapInstance;
}

/**
 * Handle map errors gracefully
 * @param {Error} e - Error object from map
 */
function handleMapError(e) {
  console.error("MapLibre Error:", e);

  if (
    e.sourceId === HRRR_SOURCE_ID ||
    (e.source && e.source.id === HRRR_SOURCE_ID)
  ) {
    console.error(
      `Error related to source ${HRRR_SOURCE_ID}. Check TiTiler endpoint, S3 URL validity, and network.`,
      e.error || "",
    );

    // Show user-friendly error message
    const loadingIndicator = document.getElementById("loading-indicator");
    loadingIndicator.textContent =
      "Error loading weather data. Please try a different date or hour.";
    loadingIndicator.style.display = "block";

    // Reset initialization flag to try again on next interaction
    isLayerInitialized = false;
  }
}

/**
 * Initiates browser caching for an image URL without waiting for completion
 * @param {string} imageUrl - URL of the image to cache
 */
function cacheImage(imageUrl) {
  fetch(imageUrl, {
    method: "GET",
    mode: "cors", // Explicitly request CORS mode
    cache: "default", // Allow browser to use its default caching behavior
  })
    .then((response) => {
      if (!response.ok) {
        console.warn(
          `Failed to cache image: ${response.status} ${response.statusText}`,
        );
      } else {
        console.log(`Successfully cached image: ${imageUrl}`);
      }
    })
    .catch((error) => {
      // Ignore aborted requests as these are expected during fast scrolling
      if (error.name !== "AbortError") {
        console.warn(`Error caching image: ${imageUrl}`, error);
      }
    });
}

/**
 * Asynchronously pre-caches images for all hours of the selected date
 * @param {string} dateStrYYYYMMDD - Date in YYYYMMDD format
 * @returns {Promise<void>} Promise that resolves when initial caching is complete
 */
async function preCacheImagesForDate(dateStrYYYYMMDD) {
  if (!dateStrYYYYMMDD) {
    console.warn("No date provided for pre-caching");
    return;
  }

  const loadingIndicator = document.getElementById("loading-indicator");

  console.log(`Starting pre-cache for date: ${dateStrYYYYMMDD}`);
  // Show loading indicator during pre-caching
  loadingIndicator.style.display = "block";
  loadingIndicator.textContent = "Pre-fetching images...";

  // Reset cached hours for new date
  cachedHours.clear();

  // Generate all hour strings and start caching in parallel
  const cachePromises = [];
  for (let hour = 0; hour <= 23; hour++) {
    const hourStrTXXz = formatHour(hour);
    const imageUrl = buildImageUrl(dateStrYYYYMMDD, hourStrTXXz);

    if (imageUrl) {
      // Use a more controlled caching approach that returns a promise
      const cachePromise = fetch(imageUrl, {
        method: "GET",
        mode: "cors",
        cache: "default",
      })
        .then((response) => {
          if (response.ok) {
            cachedHours.add(hour);
            console.log(`Cached hour ${hour}`);
          }
          return response;
        })
        .catch((error) => {
          console.warn(`Error pre-caching hour ${hour}:`, error);
        });

      cachePromises.push(cachePromise);
    }
  }

  // Wait for the first few images to cache before hiding the indicator
  // This ensures the indicator stays visible during initial caching
  try {
    await Promise.race([
      // Wait for the first few hours to cache
      Promise.all(cachePromises.slice(0, 3)),
      // Or a timeout of 3 seconds, whichever comes first
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch (error) {
    console.warn("Error during pre-caching:", error);
  }

  // Hide the loading indicator after initial caching
  loadingIndicator.style.display = "none";
  console.log("Initial pre-caching completed");
}

/**
 * Updates the map layer to display the image for the specified hour
 * @param {string} dateStrYYYYMMDD - Date in YYYYMMDD format
 * @param {number} hourValue - Hour value (0-23)
 */
function displayImageForHour(dateStrYYYYMMDD, hourValue) {
  const hourStrTXXz = formatHour(hourValue);
  const hourValueDisplay = document.getElementById("hour-value-display");
  const loadingIndicator = document.getElementById("loading-indicator");

  hourValueDisplay.textContent = hourStrTXXz;

  // Build the image URL
  const imageUrl = buildImageUrl(dateStrYYYYMMDD, hourStrTXXz);

  if (!imageUrl) {
    console.error("Could not generate image URL");
    loadingIndicator.style.display = "none";
    return;
  }

  // Check if this hour is in our tracked cache
  const isCached = cachedHours.has(hourValue);

  if (!isCached) {
    // Show loading indicator for non-cached images
    loadingIndicator.style.display = "block";
    loadingIndicator.textContent = "Loading...";

    // Add to our cache tracking
    cachedHours.add(hourValue);
  }

  // Cancel any in-flight requests
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Create a new abort controller for this request
  currentAbortController = new AbortController();

  // Fetch the image with the ability to cancel
  fetch(imageUrl, {
    signal: currentAbortController.signal,
    cache: "default",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
      // Create an object URL from the blob
      const objectUrl = URL.createObjectURL(blob);

      // Update or add the image to the map
      const hrrrSource = map.getSource(HRRR_SOURCE_ID);

      if (hrrrSource && isLayerInitialized) {
        // Update existing source
        hrrrSource.updateImage({
          url: objectUrl,
          coordinates: CONSTANTS.MAP_IMAGE_COORDINATES,
        });
        console.log(`Updated image for hour ${hourValue}`);
      } else {
        // Initialize source and layer for the first time
        console.log(
          `Initializing image source and layer for hour ${hourValue}`,
        );

        // Remove any stale layer/source
        if (map.getLayer(HRRR_LAYER_ID)) map.removeLayer(HRRR_LAYER_ID);
        if (map.getSource(HRRR_SOURCE_ID)) map.removeSource(HRRR_SOURCE_ID);

        // Add new source and layer
        map.addSource(HRRR_SOURCE_ID, {
          type: "image",
          url: objectUrl,
          coordinates: CONSTANTS.MAP_IMAGE_COORDINATES,
        });

        map.addLayer({
          id: HRRR_LAYER_ID,
          type: "raster",
          source: HRRR_SOURCE_ID,
          paint: {
            "raster-opacity": 0.75,
            "raster-fade-duration": 0,
          },
        });

        isLayerInitialized = true;
      }

      // Hide loading indicator once the image is loaded
      loadingIndicator.style.display = "none";

      // Clean up the object URL after a delay (to ensure it's been used by MapLibre)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    })
    .catch((error) => {
      // Only log errors that aren't from aborted requests
      if (error.name !== "AbortError") {
        console.error("Error loading image:", error);
        loadingIndicator.textContent = "Error loading data. Please try again.";
      } else {
        // For aborted requests, we just reset the loading indicator
        loadingIndicator.style.display = "none";
      }
    });
}

/**
 * Reset layer and prepare for a date change
 */
function resetLayer() {
  if (map.getLayer(HRRR_LAYER_ID)) {
    map.removeLayer(HRRR_LAYER_ID);
  }
  if (map.getSource(HRRR_SOURCE_ID)) {
    map.removeSource(HRRR_SOURCE_ID);
    isLayerInitialized = false; // Reset initialization flag
  }
}
