/*
 * ASSIGNMENT 06 — GEOSPATIAL STRUCTURES
 * Heat Vulnerability Across New York City
 *
 * Based on the external-GeoJSON workflow in mapBox_Sketch_03.js.
 * This script loads NYC ZCTA polygons, loads the HVI CSV, joins the two
 * datasets by ZIP Code, and applies data-driven Mapbox styling.
 */

(() => {
  'use strict';

  const MAP_CONTAINER = 'mapbox-container-6';
  const HVI_CSV_URL = 'data/heat_vulnerability_index.csv';
  const ZCTA_GEOJSON_URL =
    'https://data.cityofnewyork.us/api/v3/views/35j5-n34v/query.geojson?accessType=DOWNLOAD';

  const NYC_BOUNDS = [
    [-74.285, 40.475],
    [-73.675, 40.94]
  ];

  const HVI_COLORS = {
    1: '#f7e8c6',
    2: '#f5bb7b',
    3: '#ef795f',
    4: '#bd416d',
    5: '#611b60'
  };

  const HVI_LABELS = {
    1: 'Lowest relative risk',
    2: 'Low relative risk',
    3: 'Moderate relative risk',
    4: 'High relative risk',
    5: 'Highest relative risk'
  };

  const statusElement = document.getElementById('map-status');
  const tokenMessage = document.getElementById('token-message');
  const resetButton = document.getElementById('reset-map');
  const highRiskButton = document.getElementById('toggle-high-risk');
  const screenshotButton = document.getElementById('save-screenshot');
  const searchForm = document.getElementById('zip-search');
  const searchInput = document.getElementById('zip-search-input');
  const searchFeedback = document.getElementById('zip-search-feedback');

  function setStatus(message) {
    if (statusElement) statusElement.textContent = message;
  }

  function tokenIsConfigured() {
    return (
      typeof MAPBOX_TOKEN === 'string' &&
      MAPBOX_TOKEN.startsWith('pk.') &&
      !MAPBOX_TOKEN.includes('PASTE_YOUR')
    );
  }

  if (!tokenIsConfigured()) {
    tokenMessage.hidden = false;
    setStatus('Mapbox token required before the map can load.');
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: MAP_CONTAINER,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-73.97, 40.71],
    zoom: 9.5,
    pitch: 0,
    bearing: 0,
    minZoom: 8.7,
    maxZoom: 15,
    preserveDrawingBuffer: true,
    attributionControl: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 90, unit: 'imperial' }), 'bottom-right');

  let hoveredFeatureId = null;
  let highRiskOnly = false;
  let selectedZcta = null;
  let featureByZcta = new Map();
  let searchPopup = null;

  map.on('load', async () => {
    try {
      softenBasemap(map);
      setStatus('Loading ZIP Code boundaries and HVI rankings…');

      const [zctaGeojson, hviText] = await Promise.all([
        fetchJson(ZCTA_GEOJSON_URL),
        fetchText(HVI_CSV_URL)
      ]);

      const hviLookup = buildHviLookup(hviText);
      const joinedGeojson = joinHviToZctas(zctaGeojson, hviLookup);
      featureByZcta = new Map(
        joinedGeojson.features.map((feature) => [feature.properties.zcta, feature])
      );

      if (!joinedGeojson.features.length) {
        throw new Error('The datasets loaded, but no matching ZCTA records were found.');
      }

      map.addSource('nyc-hvi', {
        type: 'geojson',
        data: joinedGeojson,
        promoteId: 'zcta'
      });

      map.addLayer({
        id: 'hvi-fill',
        type: 'fill',
        source: 'nyc-hvi',
        paint: {
          'fill-color': [
            'match',
            ['get', 'hvi'],
            1, HVI_COLORS[1],
            2, HVI_COLORS[2],
            3, HVI_COLORS[3],
            4, HVI_COLORS[4],
            5, HVI_COLORS[5],
            '#4a414b'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.95,
            0.79
          ]
        }
      });

      map.addLayer({
        id: 'hvi-outline',
        type: 'line',
        source: 'nyc-hvi',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#fff9ef',
            'rgba(255,249,239,0.52)'
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.3,
            ['interpolate', ['linear'], ['zoom'], 9, 0.45, 13, 1.15]
          ],
          'line-opacity': 0.9
        }
      });

      // Keep Mapbox's own neighborhood labels visible above the HVI polygons
      // while zoomed out. They fade away as ZIP Code labels appear.
      elevateNeighborhoodLabels(map);

      map.addLayer({
        id: 'search-highlight',
        type: 'line',
        source: 'nyc-hvi',
        filter: ['==', ['get', 'zcta'], ''],
        paint: {
          'line-color': '#fff9ef',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 13, 4.5],
          'line-opacity': 0.98,
          'line-blur': 0.15
        }
      });

      map.addLayer({
        id: 'zcta-labels',
        type: 'symbol',
        source: 'nyc-hvi',
        minzoom: 11.35,
        layout: {
          'text-field': ['get', 'zcta'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11.35, 9, 13, 12],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-allow-overlap': false,
          'text-padding': 3
        },
        paint: {
          'text-color': '#fff9ef',
          'text-halo-color': 'rgba(26,14,30,0.92)',
          'text-halo-width': 1.2,
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            11.35, 0,
            11.8, 0.82
          ]
        }
      });

      addMapInteractions(map);
      setSearchFeedback('Enter a five-digit NYC ZIP Code.');

      map.fitBounds(NYC_BOUNDS, {
        padding: getResponsivePadding(),
        duration: 1200
      });

      const unmatched = zctaGeojson.features.length - joinedGeojson.features.length;
      setStatus(
        `${joinedGeojson.features.length} ZIP Code areas mapped · ` +
        `${unmatched > 0 ? `${unmatched} boundary records had no HVI value` : 'all available HVI records matched'}`
      );
    } catch (error) {
      console.error(error);
      setStatus(`Unable to load map data: ${error.message}`);
    }
  });

  map.on('error', (event) => {
    if (event && event.error) console.error('Mapbox error:', event.error);
  });

  resetButton.addEventListener('click', () => {
    clearSearchSelection();
    map.fitBounds(NYC_BOUNDS, { padding: getResponsivePadding(), duration: 900 });
  });

  highRiskButton.addEventListener('click', () => {
    setHighRiskMode(!highRiskOnly);
  });

  searchInput.addEventListener('input', () => {
    searchInput.value = searchInput.value.replace(/\D/g, '').slice(0, 5);
    if (searchFeedback.dataset.state === 'error') {
      setSearchFeedback('Enter a five-digit NYC ZIP Code.');
    }
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    locateZipCode(searchInput.value);
  });

  screenshotButton.addEventListener('click', () => saveMapScreenshot(map));

  window.addEventListener('resize', () => map.resize());

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GeoJSON request failed (${response.status})`);
    return response.json();
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CSV request failed (${response.status})`);
    return response.text();
  }

  function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  function buildHviLookup(csvText) {
    const lines = csvText.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('HVI CSV is empty.');

    const headers = parseCsvLine(lines[0]);
    const zipIndex = headers.findIndex((header) => /zcta|zip/i.test(header));
    const hviIndex = headers.findIndex((header) => /heat vulnerability|\bhvi\b/i.test(header));

    if (zipIndex === -1 || hviIndex === -1) {
      throw new Error('Could not identify ZIP Code and HVI columns in the CSV.');
    }

    const lookup = new Map();

    lines.slice(1).forEach((line) => {
      if (!line.trim()) return;
      const row = parseCsvLine(line);
      const zcta = normalizeZcta(row[zipIndex]);
      const hvi = Number(row[hviIndex]);
      if (zcta && Number.isInteger(hvi) && hvi >= 1 && hvi <= 5) {
        lookup.set(zcta, hvi);
      }
    });

    return lookup;
  }

  function normalizeZcta(value) {
    const digits = String(value ?? '').match(/\d{5}/);
    return digits ? digits[0] : null;
  }

  function findZctaInProperties(properties = {}) {
    const preferredKeys = [
      'zcta2020', 'ZCTA2020', 'zcta5ce20', 'ZCTA5CE20',
      'geoid20', 'GEOID20', 'geoid', 'GEOID',
      'zipcode', 'ZIPCODE', 'zip_code', 'ZIP_CODE', 'postalcode'
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        const zcta = normalizeZcta(properties[key]);
        if (zcta) return zcta;
      }
    }

    for (const [key, value] of Object.entries(properties)) {
      if (/zcta|zip|geoid/i.test(key)) {
        const zcta = normalizeZcta(value);
        if (zcta) return zcta;
      }
    }

    return null;
  }

  function joinHviToZctas(geojson, hviLookup) {
    if (!geojson || !Array.isArray(geojson.features)) {
      throw new Error('The ZCTA source is not a valid GeoJSON FeatureCollection.');
    }

    const features = geojson.features
      .map((feature) => {
        const zcta = findZctaInProperties(feature.properties);
        const hvi = zcta ? hviLookup.get(zcta) : undefined;
        if (!zcta || hvi === undefined) return null;

        return {
          ...feature,
          id: zcta,
          properties: {
            ...feature.properties,
            zcta,
            hvi,
            hvi_label: HVI_LABELS[hvi]
          }
        };
      })
      .filter(Boolean);

    return { type: 'FeatureCollection', features };
  }

  function addMapInteractions(activeMap) {
    activeMap.on('mousemove', 'hvi-fill', (event) => {
      if (!event.features || !event.features.length) return;

      activeMap.getCanvas().style.cursor = 'pointer';
      const feature = event.features[0];

      if (hoveredFeatureId !== null && hoveredFeatureId !== feature.id) {
        activeMap.setFeatureState(
          { source: 'nyc-hvi', id: hoveredFeatureId },
          { hover: false }
        );
      }

      hoveredFeatureId = feature.id;
      activeMap.setFeatureState(
        { source: 'nyc-hvi', id: hoveredFeatureId },
        { hover: true }
      );
    });

    activeMap.on('mouseleave', 'hvi-fill', () => {
      activeMap.getCanvas().style.cursor = '';
      if (hoveredFeatureId !== null) {
        activeMap.setFeatureState(
          { source: 'nyc-hvi', id: hoveredFeatureId },
          { hover: false }
        );
      }
      hoveredFeatureId = null;
    });

    activeMap.on('click', 'hvi-fill', (event) => {
      if (!event.features || !event.features.length) return;
      showFeaturePopup(event.features[0].properties, event.lngLat);
    });
  }

  function elevateNeighborhoodLabels(activeMap) {
    const style = activeMap.getStyle();
    if (!style || !style.layers) return;

    const exactNeighborhoodLayers = style.layers.filter((layer) =>
      layer.type === 'symbol' && /neighborhood|subdivision/i.test(layer.id)
    );

    // Dark-v11 normally contains settlement-subdivision-label. The fallback
    // keeps the behavior working if Mapbox changes that layer name later.
    const candidates = exactNeighborhoodLayers.length
      ? exactNeighborhoodLayers
      : style.layers.filter((layer) =>
          layer.type === 'symbol' && /settlement-minor-label/i.test(layer.id)
        );

    candidates.forEach((layer) => {
      try {
        activeMap.moveLayer(layer.id);
        activeMap.setLayerZoomRange(layer.id, 8.7, 11.6);
        activeMap.setPaintProperty(layer.id, 'text-color', '#fff9ef');
        activeMap.setPaintProperty(layer.id, 'text-halo-color', 'rgba(25, 13, 29, 0.96)');
        activeMap.setPaintProperty(layer.id, 'text-halo-width', 1.35);
        activeMap.setPaintProperty(layer.id, 'text-opacity', [
          'interpolate', ['linear'], ['zoom'],
          8.7, 0.72,
          10.8, 0.92,
          11.55, 0
        ]);
      } catch (error) {
        console.warn(`Could not restyle neighborhood label layer ${layer.id}:`, error);
      }
    });
  }

  function setHighRiskMode(enabled) {
    highRiskOnly = enabled;
    highRiskButton.setAttribute('aria-pressed', String(highRiskOnly));
    highRiskButton.textContent = highRiskOnly ? 'Show all rankings' : 'Show HVI 4–5';

    if (!map.getLayer('hvi-fill')) return;

    const filter = highRiskOnly ? ['>=', ['get', 'hvi'], 4] : null;
    map.setFilter('hvi-fill', filter);
    map.setFilter('hvi-outline', filter);
    map.setFilter('zcta-labels', filter);

    if (highRiskOnly && selectedZcta) {
      const selectedFeature = featureByZcta.get(selectedZcta);
      if (selectedFeature && Number(selectedFeature.properties.hvi) < 4) {
        clearSearchSelection(false);
        setSearchFeedback('The selected ZIP Code was hidden by the HVI 4–5 filter.');
      }
    }
  }

  function setSearchFeedback(message, state = '') {
    if (!searchFeedback) return;
    searchFeedback.textContent = message;
    searchFeedback.dataset.state = state;
  }

  function locateZipCode(rawValue) {
    const zcta = normalizeZcta(rawValue);

    if (!zcta || String(rawValue).replace(/\D/g, '').length !== 5) {
      setSearchFeedback('Enter exactly five digits, for example 10027.', 'error');
      searchInput.focus();
      return;
    }

    if (!featureByZcta.size || !map.getSource('nyc-hvi')) {
      setSearchFeedback('The map data is still loading. Try again in a moment.', 'error');
      return;
    }

    const feature = featureByZcta.get(zcta);
    if (!feature) {
      clearSearchSelection(false);
      setSearchFeedback(`ZIP Code ${zcta} is not included in this HVI dataset.`, 'error');
      searchInput.select();
      return;
    }

    if (highRiskOnly && Number(feature.properties.hvi) < 4) {
      setHighRiskMode(false);
    }

    selectedZcta = zcta;
    map.setFilter('search-highlight', ['==', ['get', 'zcta'], zcta]);

    const bounds = getFeatureBounds(feature);
    const center = bounds.getCenter();
    map.fitBounds(bounds, {
      padding: getSearchPadding(),
      maxZoom: 12.8,
      duration: 1100
    });

    setSearchFeedback(
      `Located ZIP Code ${zcta} · HVI ${feature.properties.hvi}`,
      'success'
    );

    map.once('moveend', () => {
      showFeaturePopup(feature.properties, center);
    });
  }

  function clearSearchSelection(resetMessage = true) {
    selectedZcta = null;
    if (map.getLayer('search-highlight')) {
      map.setFilter('search-highlight', ['==', ['get', 'zcta'], '']);
    }
    if (searchPopup) {
      searchPopup.remove();
      searchPopup = null;
    }
    if (resetMessage) {
      searchInput.value = '';
      setSearchFeedback('Enter a five-digit NYC ZIP Code.');
    }
  }

  function getFeatureBounds(feature) {
    const bounds = new mapboxgl.LngLatBounds();

    function extendCoordinates(coordinates) {
      if (
        Array.isArray(coordinates) &&
        coordinates.length >= 2 &&
        typeof coordinates[0] === 'number' &&
        typeof coordinates[1] === 'number'
      ) {
        bounds.extend([coordinates[0], coordinates[1]]);
        return;
      }

      if (Array.isArray(coordinates)) {
        coordinates.forEach(extendCoordinates);
      }
    }

    extendCoordinates(feature.geometry.coordinates);
    return bounds;
  }

  function showFeaturePopup(properties, lngLat) {
    const hvi = Number(properties.hvi);
    const color = HVI_COLORS[hvi] || '#611b60';
    const popupHtml = `
      <p class="popup-kicker">ZIP CODE TABULATION AREA</p>
      <h2 class="popup-title">${escapeHtml(properties.zcta)}</h2>
      <p class="popup-rank" style="--rank-color:${color}">
        HVI ${hvi} · ${escapeHtml(HVI_LABELS[hvi])}
      </p>
      <p class="popup-note">Ranked from 1 (lowest relative risk) to 5 (highest relative risk).</p>
    `;

    if (searchPopup) searchPopup.remove();
    searchPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 9 })
      .setLngLat(lngLat)
      .setHTML(popupHtml)
      .addTo(map);
  }

  function softenBasemap(activeMap) {
    const style = activeMap.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach((layer) => {
      try {
        if (layer.type === 'symbol') {
          activeMap.setPaintProperty(layer.id, 'text-opacity', 0.3);
          activeMap.setPaintProperty(layer.id, 'icon-opacity', 0.18);
        }

        if (layer.type === 'line' && /road|street|bridge|tunnel/i.test(layer.id)) {
          activeMap.setPaintProperty(layer.id, 'line-opacity', 0.2);
        }
      } catch (error) {
        // Some basemap layers do not expose every paint property; skipping them is safe.
      }
    });
  }

  function getResponsivePadding() {
    return window.innerWidth <= 760
      ? { top: 350, right: 35, bottom: 150, left: 35 }
      : { top: 70, right: 95, bottom: 70, left: 475 };
  }

  function getSearchPadding() {
    return window.innerWidth <= 760
      ? { top: 380, right: 45, bottom: 120, left: 45 }
      : { top: 90, right: 110, bottom: 90, left: 500 };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function saveMapScreenshot(activeMap) {
    try {
      const mapCanvas = activeMap.getCanvas();
      const width = mapCanvas.width;
      const height = mapCanvas.height;
      const output = document.createElement('canvas');
      output.width = width;
      output.height = height;
      const context = output.getContext('2d');

      context.drawImage(mapCanvas, 0, 0, width, height);

      const scale = Math.max(1, width / 1440);
      const margin = 32 * scale;
      const panelWidth = Math.min(410 * scale, width - margin * 2);
      const panelHeight = 174 * scale;

      context.fillStyle = 'rgba(21, 13, 28, 0.88)';
      roundedRect(context, margin, margin, panelWidth, panelHeight, 18 * scale);
      context.fill();
      context.strokeStyle = 'rgba(255, 236, 215, 0.28)';
      context.lineWidth = Math.max(1, scale);
      context.stroke();

      context.fillStyle = '#f5bb7b';
      context.font = `${10 * scale}px monospace`;
      context.fillText('GEOSPATIAL STRUCTURES · ASSIGNMENT 06', margin + 20 * scale, margin + 28 * scale);

      context.fillStyle = '#fff9ef';
      context.font = `600 ${30 * scale}px sans-serif`;
      context.fillText('Heat Vulnerability', margin + 20 * scale, margin + 69 * scale);
      context.fillText('Across New York City', margin + 20 * scale, margin + 105 * scale);

      context.fillStyle = 'rgba(255,249,239,0.68)';
      context.font = `${12 * scale}px sans-serif`;
      context.fillText('HVI ranking by 2020 ZIP Code Tabulation Area', margin + 20 * scale, margin + 134 * scale);

      const legendY = margin + 151 * scale;
      const legendStartX = margin + 20 * scale;
      Object.entries(HVI_COLORS).forEach(([rank, color], index) => {
        context.fillStyle = color;
        context.beginPath();
        context.arc(legendStartX + index * 55 * scale, legendY, 6 * scale, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff9ef';
        context.font = `${10 * scale}px monospace`;
        context.fillText(rank, legendStartX + 10 * scale + index * 55 * scale, legendY + 4 * scale);
      });

      output.toBlob((blob) => {
        if (!blob) throw new Error('Could not create PNG.');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'heat-vulnerability-across-nyc.png';
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    } catch (error) {
      console.error(error);
      setStatus('Screenshot export failed. Use your browser screenshot tool instead.');
    }
  }
})();
