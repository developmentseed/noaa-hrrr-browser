/**
 * Utility functions for the HRRR Browser application
 */

// Constants for application
const CONSTANTS = {
  // Bounding box for the map coverage
  BBOX: {
    min_lon: -134.12,
    min_lat: 21.12,
    max_lon: -60.9,
    max_lat: 52.62,
  },

  TITILER_BASE_URL:
    window.CONFIG.TITILER_BASE_URL || "https://raster.eoapi.dev",

  // Layer configuration
  LAYERS: {
    REFLECTIVITY: {
      name: "Composite Reflectivity",
      band: 1,
      colormap: [
        // Light blue for weak reflectivity
        [
          [5, 10],
          [0, 236, 236, 255],
        ],
        [
          [10, 15],
          [1, 160, 246, 255],
        ],
        [
          [15, 20],
          [0, 0, 246, 255],
        ],

        // Green shades for moderate reflectivity
        [
          [20, 25],
          [0, 255, 0, 255],
        ],
        [
          [25, 30],
          [0, 200, 0, 255],
        ],
        [
          [30, 35],
          [0, 144, 0, 255],
        ],

        // Yellow for increasing reflectivity
        [
          [35, 40],
          [255, 255, 0, 255],
        ],
        [
          [40, 45],
          [231, 192, 0, 255],
        ],

        // Orange to red for high reflectivity
        [
          [45, 50],
          [255, 144, 0, 255],
        ],
        [
          [50, 55],
          [255, 0, 0, 255],
        ],
        [
          [55, 60],
          [214, 0, 0, 255],
        ],
        [
          [60, 65],
          [192, 0, 0, 255],
        ],

        // Purple shades for extreme reflectivity
        [
          [65, 70],
          [255, 0, 255, 255],
        ],
        [
          [70, 75],
          [153, 85, 201, 255],
        ],
      ],
    },
    MASSDEN: {
      name: "Smoke (Mass Density)",
      band: 76,
      colormap: [
        [
          [0, 1e-9],
          [255, 255, 255, 0],
        ],
        [
          [1e-9, 2e-9],
          [177, 211, 225, 255],
        ],
        [
          [2e-9, 4e-9],
          [137, 188, 211, 255],
        ],
        [
          [4e-9, 6e-9],
          [94, 153, 193, 255],
        ],
        [
          [6e-9, 8e-9],
          [66, 131, 165, 255],
        ],
        [
          [8e-9, 12e-9],
          [72, 148, 102, 255],
        ],
        [
          [12e-9, 16e-9],
          [102, 172, 61, 255],
        ],
        [
          [16e-9, 20e-9],
          [183, 195, 79, 255],
        ],
        [
          [20e-9, 25e-9],
          [223, 182, 72, 255],
        ],
        [
          [25e-9, 30e-9],
          [221, 123, 49, 255],
        ],
        [
          [30e-9, 40e-9],
          [213, 74, 40, 255],
        ],
        [
          [40e-9, 60e-9],
          [192, 42, 33, 255],
        ],
        [
          [60e-9, 100e-9],
          [171, 23, 30, 255],
        ],
        [
          [100e-9, 200e-9],
          [140, 19, 24, 255],
        ],
        [
          [200e-9, 1000e-9],
          [127, 31, 172, 255],
        ],
      ],
    },
  },

  // Current layer (default to reflectivity)
  currentLayer: "REFLECTIVITY",

  // Legacy support - keep these for backward compatibility
  get REFLECTIVITY_COLORMAP() {
    return this.LAYERS.REFLECTIVITY.colormap;
  },

  // Map coordinates derived from BBOX
  get TARGET_BBOX() {
    const bbox = this.BBOX;
    return `${bbox.min_lon},${bbox.min_lat},${bbox.max_lon},${bbox.max_lat}`;
  },

  get MAP_IMAGE_COORDINATES() {
    const bbox = this.BBOX;
    return [
      [bbox.min_lon, bbox.max_lat], // Upper Left
      [bbox.max_lon, bbox.max_lat], // Upper Right
      [bbox.max_lon, bbox.min_lat], // Lower Right
      [bbox.min_lon, bbox.min_lat], // Lower Left
    ];
  },
};

/**
 * Formats a date string by removing hyphens
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in YYYYMMDD format or empty string if invalid
 */
function formatDate(dateString) {
  if (!dateString) return "";
  return dateString.replace(/-/g, "");
}

/**
 * Sets default date to today
 * @param {HTMLInputElement} datePicker - Date input element
 */
function setDefaultDate(datePicker) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  datePicker.value = `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats an hour number as a string in the format "tXXz"
 * @param {number} hourNumber - Hour (0-23)
 * @returns {string} Formatted hour string (e.g., "t05z")
 */
function formatHour(hourNumber) {
  const hourString = String(hourNumber).padStart(2, "0");
  return `t${hourString}z`;
}

/**
 * Converts a local date and hour to UTC
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} localHour - Hour in local timezone (0-23)
 * @returns {Object} Object with utcDate (YYYYMMDD) and utcHour (0-23)
 */
function convertLocalToUTC(dateStr, localHour) {
  const [year, month, day] = dateStr.split("-");
  const localDate = new Date(year, month - 1, day, localHour);

  const utcDate = new Date(
    localDate.getTime() + localDate.getTimezoneOffset() * 60000,
  );

  const utcYear = utcDate.getFullYear();
  const utcMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
  const utcDay = String(utcDate.getDate()).padStart(2, "0");
  const utcHour = utcDate.getHours();

  return {
    utcDate: `${utcYear}${utcMonth}${utcDay}`,
    utcHour: utcHour,
  };
}

/**
 * Converts UTC date and hour to local timezone
 * @param {string} utcDateStr - Date in YYYYMMDD format
 * @param {number} utcHour - Hour in UTC (0-23)
 * @returns {Object} Object with localDate (YYYY-MM-DD) and localHour (0-23)
 */
function convertUTCToLocal(utcDateStr, utcHour) {
  const year = utcDateStr.substring(0, 4);
  const month = utcDateStr.substring(4, 6);
  const day = utcDateStr.substring(6, 8);

  const utcDate = new Date(
    `${year}-${month}-${day}T${String(utcHour).padStart(2, "0")}:00:00Z`,
  );

  const localYear = utcDate.getFullYear();
  const localMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
  const localDay = String(utcDate.getDate()).padStart(2, "0");
  const localHour = utcDate.getHours();

  return {
    localDate: `${localYear}-${localMonth}-${localDay}`,
    localHour: localHour,
  };
}

/**
 * Formats an hour number for display in local timezone
 * @param {number} hourNumber - Hour (0-23)
 * @returns {string} Formatted hour string in 24-hour format
 */
function formatLocalHour(hourNumber) {
  const hourString = String(hourNumber).padStart(2, "0");
  return `${hourString}:00`;
}

/**
 * Gets the user's timezone abbreviation
 * @returns {string} Timezone abbreviation (e.g., "PST", "EST")
 */
function getTimezoneAbbreviation() {
  const date = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const shortName = date
      .toLocaleString("en-US", {
        timeZone: timeZone,
        timeZoneName: "short",
      })
      .split(" ")
      .pop();
    return shortName;
  } catch (e) {
    // Fallback to offset
    const offset = -date.getTimezoneOffset() / 60;
    const sign = offset >= 0 ? "+" : "-";
    return `UTC${sign}${Math.abs(offset)}`;
  }
}

/**
 * Encodes the colormap for the current layer for use in a URL
 * @param {string} layerKey - The layer key (e.g., 'REFLECTIVITY', 'MASSDEN')
 * @returns {string} URL-encoded colormap parameter
 */
function encodeColormapForUrl(layerKey = CONSTANTS.currentLayer) {
  // Get the colormap for the specified layer
  const layer = CONSTANTS.LAYERS[layerKey];
  if (!layer || !layer.colormap) {
    console.warn(`Layer ${layerKey} not found, using default`);
    return encodeColormapForUrl("REFLECTIVITY");
  }

  // Convert the colormap to the format expected by TiTiler
  const colormapJson = JSON.stringify(layer.colormap);

  // First encode as URI component
  const encodedColormap = encodeURIComponent(colormapJson);

  // Return as a URL parameter
  return `colormap=${encodedColormap}`;
}

/**
 * Builds the TiTiler URL to fetch a PNG cropped to a specific bounding box
 * @param {string} dateStrYYYYMMDD - Date in YYYYMMDD format
 * @param {string} hourStrTXXz - Hour in tXXz format
 * @param {string} layerKey - The layer key (e.g., 'REFLECTIVITY', 'MASSDEN')
 * @returns {string|null} Complete URL for the TiTiler request or null if invalid inputs
 */
function buildImageUrl(
  dateStrYYYYMMDD,
  hourStrTXXz,
  layerKey = CONSTANTS.currentLayer,
) {
  if (!dateStrYYYYMMDD || !hourStrTXXz) {
    console.warn("Date or Hour is missing, cannot build URL.");
    return null;
  }

  // Get the layer configuration
  const layer = CONSTANTS.LAYERS[layerKey];
  if (!layer) {
    console.warn(`Layer ${layerKey} not found, using default`);
    return buildImageUrl(dateStrYYYYMMDD, hourStrTXXz, "REFLECTIVITY");
  }

  // Create the correct S3 URL with proper encoding for the VRT parameter
  const gribUrl = `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.${dateStrYYYYMMDD}/conus/hrrr.${hourStrTXXz}.wrfsfcf00.grib2`;
  const encodedVrtUrl = encodeURIComponent(
    `vrt://${gribUrl}?bands=${layer.band}`,
  );

  // Build parameters
  const colormapParam = encodeColormapForUrl(layerKey);

  // Build the final TiTiler URL
  return `${CONSTANTS.TITILER_BASE_URL}/external/bbox/${CONSTANTS.TARGET_BBOX}.png?url=${encodedVrtUrl}&${colormapParam}&dst_crs=epsg:3857`;
}

/**
 * Checks if the browser is likely to have cached an image
 * @param {string} url - URL of the image to check
 * @returns {Promise<boolean>} Promise resolving to true if image is likely cached
 */
async function isImageCached(url) {
  try {
    const cache = await caches.open("hrrr-cache");
    const cachedResponse = await cache.match(url);
    return !!cachedResponse;
  } catch (e) {
    console.warn("Cache API access failed, using tracked cache state");
    return false;
  }
}
