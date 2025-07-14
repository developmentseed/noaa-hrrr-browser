/**
 * Utility functions for the HRRR Browser application
 */

// Constants for application
const CONSTANTS = {
  // Bounding box for the map coverage
  BBOX: {
    min_lon: -135,
    min_lat: 21,
    max_lon: -61,
    max_lat: 55,
  },

  TITILER_BASE_URL:
    window.CONFIG.TITILER_BASE_URL || "https://raster.eoapi.dev",

  // TiTiler parameters
  TITILER_PARAMS: {
    bidx: 1,
  },

  // Reflectivity colormap defined in a readable structure
  // Format: [value_range, [r, g, b, alpha]]
  REFLECTIVITY_COLORMAP: [
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
  const [year, month, day] = dateStr.split('-');
  const localDate = new Date(year, month - 1, day, localHour);
  
  const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
  
  const utcYear = utcDate.getFullYear();
  const utcMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
  const utcDay = String(utcDate.getDate()).padStart(2, "0");
  const utcHour = utcDate.getHours();
  
  return {
    utcDate: `${utcYear}${utcMonth}${utcDay}`,
    utcHour: utcHour
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
  
  const utcDate = new Date(`${year}-${month}-${day}T${String(utcHour).padStart(2, '0')}:00:00Z`);
  
  const localYear = utcDate.getFullYear();
  const localMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
  const localDay = String(utcDate.getDate()).padStart(2, "0");
  const localHour = utcDate.getHours();
  
  return {
    localDate: `${localYear}-${localMonth}-${localDay}`,
    localHour: localHour
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
    const shortName = date.toLocaleString('en-US', {
      timeZone: timeZone,
      timeZoneName: 'short'
    }).split(' ').pop();
    return shortName;
  } catch (e) {
    // Fallback to offset
    const offset = -date.getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '-';
    return `UTC${sign}${Math.abs(offset)}`;
  }
}

/**
 * Encodes the reflectivity colormap for use in a URL
 * @returns {string} URL-encoded colormap parameter
 */
function encodeColormapForUrl() {
  // Convert the colormap to the format expected by TiTiler
  const colormapJson = JSON.stringify(CONSTANTS.REFLECTIVITY_COLORMAP);

  // First encode as URI component
  const encodedColormap = encodeURIComponent(colormapJson);

  // Return as a URL parameter
  return `colormap=${encodedColormap}`;
}

/**
 * Builds the TiTiler URL parameters as a query string
 * @returns {string} Query string for TiTiler parameters
 */
function buildTiTilerParams() {
  // Start with basic parameters
  const params = new URLSearchParams();

  // Add bidx and any other parameters
  for (const [key, value] of Object.entries(CONSTANTS.TITILER_PARAMS)) {
    params.append(key, value);
  }

  return params.toString();
}

/**
 * Builds the TiTiler URL to fetch a PNG cropped to a specific bounding box
 * @param {string} dateStrYYYYMMDD - Date in YYYYMMDD format
 * @param {string} hourStrTXXz - Hour in tXXz format
 * @returns {string|null} Complete URL for the TiTiler request or null if invalid inputs
 */
function buildImageUrl(dateStrYYYYMMDD, hourStrTXXz) {
  if (!dateStrYYYYMMDD || !hourStrTXXz) {
    console.warn("Date or Hour is missing, cannot build URL.");
    return null;
  }

  // Create the correct S3 URL with proper encoding for the VRT parameter
  const gribUrl = `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.${dateStrYYYYMMDD}/conus/hrrr.${hourStrTXXz}.wrfsfcf00.grib2`;
  const encodedVrtUrl = encodeURIComponent(`vrt://${gribUrl}?bands=1`);

  // Build parameters
  const titilerParams = buildTiTilerParams();
  const colormapParam = encodeColormapForUrl();

  // Build the final TiTiler URL
  return `${CONSTANTS.TITILER_BASE_URL}/external/bbox/${CONSTANTS.TARGET_BBOX}.png?url=${encodedVrtUrl}&${titilerParams}&${colormapParam}`;
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
