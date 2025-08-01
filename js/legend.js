function createLegendGradient(colormap) {
  const gradientStops = colormap.map((entry, index) => {
    const [range, color] = entry;
    const [r, g, b, a] = color;
    const percentage = (index / (colormap.length - 1)) * 100;
    return `rgba(${r}, ${g}, ${b}, ${a / 255}) ${percentage}%`;
  });
  
  return `linear-gradient(to right, ${gradientStops.join(', ')})`;
}

function formatLegendValue(value, layerKey) {
  if (layerKey === 'MASSDEN') {
    if (value >= 1e-6) {
      return (value * 1e9).toFixed(0);
    } else {
      return (value * 1e9).toFixed(1);
    }
  } else {
    return value.toString();
  }
}

function getLegendConfig(layerKey) {
  const layer = CONSTANTS.LAYERS[layerKey];
  if (!layer) {
    console.warn(`Layer ${layerKey} not found`);
    return null;
  }

  const colormap = layer.colormap;
  const minValue = colormap[0][0][0];
  const maxValue = colormap[colormap.length - 1][0][1];

  let title, units;
  if (layerKey === 'REFLECTIVITY') {
    title = 'Composite Reflectivity';
    units = '(dBZ)';
  } else if (layerKey === 'MASSDEN') {
    title = 'Smoke Mass Density';
    units = '(μg/m³)';
  } else {
    title = layer.name || 'Unknown';
    units = '';
  }

  return {
    title,
    units,
    minValue: formatLegendValue(minValue, layerKey),
    maxValue: formatLegendValue(maxValue, layerKey),
    gradient: createLegendGradient(colormap)
  };
}

function updateLegend(layerKey = CONSTANTS.currentLayer) {
  const legendConfig = getLegendConfig(layerKey);
  if (!legendConfig) return;

  const titleElement = document.getElementById('legend-title');
  const unitsElement = document.getElementById('legend-units');
  const minElement = document.getElementById('legend-min');
  const maxElement = document.getElementById('legend-max');
  const gradientElement = document.getElementById('legend-gradient');

  titleElement.textContent = legendConfig.title;
  unitsElement.textContent = legendConfig.units;
  minElement.textContent = legendConfig.minValue;
  maxElement.textContent = legendConfig.maxValue;
  gradientElement.style.background = legendConfig.gradient;
}

function initializeLegend() {
  updateLegend();
}