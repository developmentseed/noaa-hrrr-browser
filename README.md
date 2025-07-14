# NOAA HRRR Browser

A web-based application for browsing real-time composite reflectivity data from the NOAA High-Resolution Rapid Refresh (HRRR) weather model.

![NOAA HRRR Browser Screenshot](https://via.placeholder.com/800x400?text=NOAA+HRRR+Browser)

## Features

- **Real-time Weather Data**: Browse composite reflectivity from NOAA's HRRR model
- **Interactive Map**: Pan and zoom to explore weather patterns across the CONUS
- **Time Navigation**: Use date picker and hour slider to view historical data
- **Automatic Data Detection**: Automatically finds the most recent available data
- **Pre-caching**: Smart image pre-loading for smooth time-based navigation
- **Responsive Design**: Works on desktop and mobile devices

## About the Data

The HRRR (High-Resolution Rapid Refresh) is a real-time 3km resolution atmospheric model operated by NOAA that is updated hourly. This browser displays the "FH0" data, which represents the analysis time (current conditions, not a forecast).

Reflectivity values are displayed with colors ranging from:

- Light blue: Weak precipitation
- Green: Moderate precipitation  
- Yellow/Orange: Heavy precipitation
- Red/Purple: Extreme precipitation

Data is sourced from [NOAA's public S3 bucket](https://noaa-hrrr-bdp-pds.s3.amazonaws.com/) and rendered using [TiTiler](https://github.com/developmentseed/titiler).

## Quick Start

### Running Locally

1. **Clone the repository**:

   ```bash
   git clone https://github.com/developmentseed/noaa-hrrr-browser.git
   cd noaa-hrrr-browser
   ```

2. **Set up configuration**:

   ```bash
   cp config.template.js config.js
   ```

   Edit `config.js` and replace the placeholder values:

   ```javascript
   window.CONFIG = {
     MAPTILER_API_KEY: "your_maptiler_api_key_here",
     TITILER_BASE_URL: "https://raster.eoapi.dev"
   };
   ```

3. **Start a local web server**:

   Using Python:

   ```bash
   python -m http.server 8000
   ```

   Using Node.js:

   ```bash
   npx serve .
   ```

   Using PHP:

   ```bash
   php -S localhost:8000
   ```

4. **Open in browser**:
   Navigate to `http://localhost:8000`

### Getting API Keys

- **MapTiler API Key**: Sign up at [MapTiler](https://www.maptiler.com/) for a free API key to use their basemap tiles

## Configuration

### Environment Variables

The application uses a `config.js` file for configuration:

- `MAPTILER_API_KEY`: Your MapTiler API key for basemap tiles
- `TITILER_BASE_URL`: TiTiler endpoint (default: `https://raster.eoapi.dev`)

### Custom TiTiler Instance

To use your own TiTiler instance, update the `TITILER_BASE_URL` in `config.js`:

```javascript
window.CONFIG = {
  MAPTILER_API_KEY: "your_api_key",
  TITILER_BASE_URL: "https://your-titiler-instance.com"
};
```

