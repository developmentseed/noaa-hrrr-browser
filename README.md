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

Data is sourced from [NOAA's public S3 bucket](https://noaa-hrrr-bdp-pds.s3.amazonaws.com/) and rendered using [TiTiler](https://titiler.dev/).

## Quick Start

### Running Locally

**Important**: This application must be served via HTTP (not opened as a local file) to avoid CORS issues when checking data availability.

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

## Deployment

### Static Hosting

The application is a static web app that can be deployed to any static hosting service:

- **GitHub Pages**: Push to a GitHub repository and enable Pages
- **Netlify**: Connect your repository for automatic deployments
- **Vercel**: Import your repository for instant deployment
- **AWS S3**: Upload files to an S3 bucket configured for static hosting

### Docker

Create a `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

Build and run:
```bash
docker build -t noaa-hrrr-browser .
docker run -p 8080:80 noaa-hrrr-browser
```

## Development

### Project Structure

```
noaa-hrrr-browser/
├── index.html              # Main HTML file
├── config.template.js      # Configuration template
├── config.js              # Your configuration (gitignored)
├── css/
│   └── styles.css         # Application styles
└── js/
    ├── main.js            # Application entry point
    ├── map.js             # Map initialization and controls
    ├── modal.js           # Modal dialog functionality
    └── utils.js           # Utility functions and data handling
```

### Key Components

- **Map Rendering**: Uses [MapLibre GL JS](https://maplibre.org/) for interactive mapping
- **Data Processing**: Fetches GRIB2 files from NOAA S3 and renders via TiTiler
- **Caching**: Implements browser caching for improved performance
- **Responsive UI**: CSS Grid and Flexbox for mobile-friendly interface

## Troubleshooting

### CORS Errors

If you see CORS-related errors in the browser console:
- Ensure you're running the app via HTTP server (not file://)
- Check that your TiTiler instance supports CORS
- Verify the TiTiler URL is correct in your config

### No Data Available

If no weather data appears:
- Check browser network tab for failed requests
- Verify your internet connection
- Try selecting a different date (data may not be available for future dates)

### Performance Issues

- Clear browser cache if images seem stuck
- Check network speed (large weather images may load slowly)
- Try reducing the date range being cached

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally using a web server
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **NOAA**: For providing free access to HRRR weather data
- **TiTiler**: For the excellent raster tile serving capabilities
- **MapTiler**: For beautiful basemap tiles
- **Development Seed**: For developing and maintaining this application