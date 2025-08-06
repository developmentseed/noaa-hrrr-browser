const CONSTANTS = {
  BBOX: {
    min_lon: -134.12,
    min_lat: 21.12,
    max_lon: -60.9,
    max_lat: 52.62,
  },

  TITILER_BASE_URL:
    window.CONFIG.TITILER_BASE_URL || "https://raster.eoapi.dev",

  LAYERS: {
    REFLECTIVITY: {
      name: "Composite Reflectivity",
      band: 1,
      colormap: [
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
        [
          [35, 40],
          [255, 255, 0, 255],
        ],
        [
          [40, 45],
          [231, 192, 0, 255],
        ],
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
      name: "surface (8m) smoke mass density",
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

  currentLayer: "REFLECTIVITY",

  get TARGET_BBOX() {
    return `${this.BBOX.min_lon},${this.BBOX.min_lat},${this.BBOX.max_lon},${this.BBOX.max_lat}`;
  },

  get MAP_IMAGE_COORDINATES() {
    return [
      [this.BBOX.min_lon, this.BBOX.max_lat],
      [this.BBOX.max_lon, this.BBOX.max_lat],
      [this.BBOX.max_lon, this.BBOX.min_lat],
      [this.BBOX.min_lon, this.BBOX.min_lat],
    ];
  },
};

const formatDate = (dateString) => dateString?.replace(/-/g, "") || "";

function setDefaultDate(datePicker) {
  const today = new Date();
  datePicker.value = today.toISOString().split("T")[0];
}

const formatHour = (hourNumber) => `t${String(hourNumber).padStart(2, "0")}z`;

function convertLocalToUTC(dateStr, localHour) {
  const [year, month, day] = dateStr.split("-");
  const localDate = new Date(year, month - 1, day, localHour);

  const utcYear = localDate.getUTCFullYear();
  const utcMonth = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(localDate.getUTCDate()).padStart(2, "0");
  const utcHour = localDate.getUTCHours();

  return {
    utcDate: `${utcYear}${utcMonth}${utcDay}`,
    utcHour: utcHour,
  };
}

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

const formatLocalHour = (hourNumber) =>
  `${String(hourNumber).padStart(2, "0")}:00`;

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
    const offset = -date.getTimezoneOffset() / 60;
    const sign = offset >= 0 ? "+" : "-";
    return `UTC${sign}${Math.abs(offset)}`;
  }
}

function encodeColormapForUrl(layerKey = CONSTANTS.currentLayer) {
  const layer = CONSTANTS.LAYERS[layerKey] || CONSTANTS.LAYERS.REFLECTIVITY;
  return `colormap=${encodeURIComponent(JSON.stringify(layer.colormap))}`;
}

function buildImageUrl(
  dateStrYYYYMMDD,
  hourStrTXXz,
  layerKey = CONSTANTS.currentLayer,
) {
  if (!dateStrYYYYMMDD || !hourStrTXXz) {
    console.warn("Date or Hour is missing, cannot build URL.");
    return null;
  }

  const layer = CONSTANTS.LAYERS[layerKey];
  if (!layer) {
    console.warn(`Layer ${layerKey} not found, using default`);
    return buildImageUrl(dateStrYYYYMMDD, hourStrTXXz, "REFLECTIVITY");
  }

  const gribUrl = `https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.${dateStrYYYYMMDD}/conus/hrrr.${hourStrTXXz}.wrfsfcf00.grib2`;
  const encodedVrtUrl = encodeURIComponent(
    `vrt://${gribUrl}?bands=${layer.band}`,
  );
  const colormapParam = encodeColormapForUrl(layerKey);

  return `${CONSTANTS.TITILER_BASE_URL}/external/bbox/${CONSTANTS.TARGET_BBOX}.png?url=${encodedVrtUrl}&${colormapParam}&dst_crs=epsg:3857`;
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    date: params.get("date"),
    hour: params.get("hour"),
    layer: params.get("layer"),
  };
}

function updateUrlParams(date, hour, layer, replace = false) {
  const params = new URLSearchParams();

  if (date) params.set("date", date);
  if (hour !== null && hour !== undefined) params.set("hour", hour.toString());
  if (layer) params.set("layer", layer);

  const method = replace ? "replaceState" : "pushState";
  window.history[method](
    {},
    "",
    `${window.location.pathname}?${params.toString()}`,
  );
}

function getStateFromUrl() {
  const urlParams = getUrlParams();
  const state = {};

  if (urlParams.date && /^\d{4}-\d{2}-\d{2}$/.test(urlParams.date)) {
    state.date = urlParams.date;
  }

  const hour = parseInt(urlParams.hour, 10);
  if (!isNaN(hour) && hour >= 0 && hour <= 23) {
    state.hour = hour;
  }

  if (urlParams.layer && CONSTANTS.LAYERS[urlParams.layer]) {
    state.layer = urlParams.layer;
  }

  return state;
}
