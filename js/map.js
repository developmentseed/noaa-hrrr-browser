const HRRR_SOURCE_ID = "hrrr-image-source";
const HRRR_LAYER_ID = "hrrr-image-layer";

let map;
let isLayerInitialized = false;
let cachedHours = new Set();
let cachedHoursOrder = [];
let currentAbortController = null;

function initializeMap() {
  const mapInstance = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/backdrop/style.json?key=${window.CONFIG.MAPTILER_API_KEY}`,
    center: [-97.5, 40.0],
    zoom: 3.8,
  });

  mapInstance.on("error", handleMapError);
  return mapInstance;
}

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

    const loadingIndicator = document.getElementById("loading-indicator");
    const loadingText = loadingIndicator.querySelector(".loading-text");
    const loadingProgress = loadingIndicator.querySelector(".loading-progress");

    loadingText.textContent =
      "Error loading weather data. Please try a different date or hour.";
    loadingProgress.textContent = "";
    loadingIndicator.classList.add("active");
    isLayerInitialized = false;
  }
}

async function preCacheImagesForLocalDate(localDateStr) {
  if (!localDateStr) {
    console.warn("No local date provided for pre-caching");
    return;
  }

  const loadingIndicator = document.getElementById("loading-indicator");
  const loadingText = loadingIndicator.querySelector(".loading-text");
  const loadingProgress = loadingIndicator.querySelector(".loading-progress");

  loadingText.textContent = "Loading...";
  loadingProgress.textContent = "";
  loadingIndicator.classList.add("active");

  cachedHours.clear();
  cachedHoursOrder = [];

  const cachePromises = [];
  const utcDateHours = new Map();
  let completedRequests = 0;
  let totalRequests = 0;

  for (let localHour = 0; localHour < 24; localHour++) {
    const utcInfo = convertLocalToUTC(localDateStr, localHour);

    if (!utcDateHours.has(utcInfo.utcDate)) {
      utcDateHours.set(utcInfo.utcDate, []);
    }
    utcDateHours.get(utcInfo.utcDate).push(utcInfo.utcHour);
  }

  for (const [utcDate, hours] of utcDateHours) {
    for (const hour of hours) {
      const hourStrTXXz = formatHour(hour);
      const imageUrl = buildImageUrl(
        utcDate,
        hourStrTXXz,
        CONSTANTS.currentLayer,
      );

      if (imageUrl) {
        totalRequests++;
        const cachePromise = fetch(imageUrl, {
          method: "GET",
          mode: "cors",
          cache: "default",
        })
          .then((response) => {
            completedRequests++;
            loadingProgress.textContent = `Loading... ${completedRequests}/${totalRequests} images cached`;

            if (response.ok) {
              cachedHours.add(hour);
              cachedHoursOrder.push(hour);
            }
            return response;
          })
          .catch((error) => {
            completedRequests++;
            loadingProgress.textContent = `Loading... ${completedRequests}/${totalRequests} images cached`;
            console.warn(
              `Error pre-caching hour ${hour} for layer ${CONSTANTS.currentLayer}:`,
              error,
            );
          });

        cachePromises.push(cachePromise);
      }
    }
  }

  try {
    await Promise.race([
      Promise.all(cachePromises.slice(0, 5)),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  } catch (error) {
    console.warn("Error during pre-caching:", error);
  }

  loadingIndicator.classList.remove("active");
}

function getMostRecentCachedHour() {
  if (cachedHoursOrder.length === 0) {
    return null;
  }
  return Math.max(...cachedHoursOrder);
}

function getNearestCachedHour(targetHour) {
  if (cachedHours.size === 0) {
    return null;
  }

  const cachedArray = Array.from(cachedHours).sort((a, b) => a - b);
  let closest = cachedArray[0];
  let minDiff = Math.abs(targetHour - closest);

  for (const hour of cachedArray) {
    const diff = Math.abs(targetHour - hour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = hour;
    }
  }

  return closest;
}

function displayImageForHour(dateStrYYYYMMDD, hourValue) {
  const hourStrTXXz = formatHour(hourValue);
  const loadingIndicator = document.getElementById("loading-indicator");
  const loadingText = loadingIndicator.querySelector(".loading-text");
  const loadingProgress = loadingIndicator.querySelector(".loading-progress");

  const imageUrl = buildImageUrl(
    dateStrYYYYMMDD,
    hourStrTXXz,
    CONSTANTS.currentLayer,
  );

  if (!imageUrl) {
    console.error("Could not generate image URL");
    loadingIndicator.classList.remove("active");
    return;
  }

  const isCached = cachedHours.has(hourValue);

  if (!isCached) {
    loadingText.textContent = "Loading hour data...";
    loadingProgress.textContent = `Fetching data for hour ${hourValue}`;
    loadingIndicator.classList.add("active");
    cachedHours.add(hourValue);
  }

  if (currentAbortController) {
    currentAbortController.abort();
  }

  currentAbortController = new AbortController();

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
      const objectUrl = URL.createObjectURL(blob);
      const hrrrSource = map.getSource(HRRR_SOURCE_ID);

      if (hrrrSource && isLayerInitialized) {
        hrrrSource.updateImage({
          url: objectUrl,
          coordinates: CONSTANTS.MAP_IMAGE_COORDINATES,
        });
      } else {
        if (map.getLayer(HRRR_LAYER_ID)) map.removeLayer(HRRR_LAYER_ID);
        if (map.getSource(HRRR_SOURCE_ID)) map.removeSource(HRRR_SOURCE_ID);

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

      loadingIndicator.classList.remove("active");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Error loading image:", error);
        loadingText.textContent = "Error loading data. Please try again.";
        loadingProgress.textContent = "";
      } else {
        loadingIndicator.classList.remove("active");
      }
    });
}

function resetLayer() {
  if (map.getLayer(HRRR_LAYER_ID)) {
    map.removeLayer(HRRR_LAYER_ID);
  }
  if (map.getSource(HRRR_SOURCE_ID)) {
    map.removeSource(HRRR_SOURCE_ID);
    isLayerInitialized = false;
  }
}
