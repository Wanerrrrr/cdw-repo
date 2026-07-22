# Assignment 6 — Geospatial Structures
## Heat Vulnerability Across New York City

This folder contains one Mapbox GL JS canvas developed from the external GeoJSON workflow in `mapBox_Sketch_03.js`.

### What the map does

- Loads NYC 2020 ZIP Code Tabulation Area boundaries as an external GeoJSON file.
- Loads the supplied Heat Vulnerability Index CSV.
- Joins the two datasets in JavaScript by ZCTA / ZIP Code.
- Colors each polygon from HVI 1 (lowest relative risk) to HVI 5 (highest relative risk).
- Adds hover highlighting, clickable popups, a high-risk filter, responsive layout, and a screenshot-export button.

### Required one-line setup

1. Open `config.js`.
2. Replace `PASTE_YOUR_MAPBOX_PUBLIC_TOKEN_HERE` with your Mapbox public access token.

Do not place a secret token in the file. A normal public Mapbox token begins with `pk.` and is intended for browser use.

### Run locally

From this folder, run one of the following commands:

```bash
python3 -m http.server 8000
```

or, on Windows:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

The page must be opened through a local server or GitHub Pages. Opening `index.html` directly may prevent the CSV from loading.

### Add it to the course website

Copy the complete `geospatial-structures` folder into your GitHub Pages repository. Keep the file paths unchanged. Commit and push it, then add the link shown in `HOMEPAGE_LINK_SNIPPET.html` to your main course website.

### Screenshot

After the map has loaded, click **Save map PNG** in the upper-left panel. The generated PNG can be uploaded with the assignment submission.

### Submission text

A geospatial structure can help me examine how environmental risk is unevenly distributed across New York City. Mapping the Heat Vulnerability Index transforms a numerical ranking into a situated view of particular neighborhoods and communities. The interactive structure also makes it possible to compare areas, identify clusters of high vulnerability, and connect this risk layer to other spatial datasets. In future work, I could combine HVI with cooling centers, public open space, street trees, spray showers, or housing conditions to investigate whether the neighborhoods facing the greatest heat risk also have sufficient access to cooling resources.

### Data sources

- Heat Vulnerability Index Rankings, NYC Department of Health and Mental Hygiene: https://data.cityofnewyork.us/d/4mhf-duep
- ZIP Code Tabulation Areas, NYC Open Data / U.S. Census Bureau: https://data.cityofnewyork.us/d/35j5-n34v
- Mapbox GL JS tutorial source: https://github.com/isohale/cdw-public-2026/tree/main/Geospatial%20Structures


## Added interaction features

- At city-scale zoom levels, Mapbox neighborhood labels appear above the HVI polygons.
- At closer zoom levels, neighborhood names fade out and ZIP Code labels fade in.
- The ZIP Code search field locates a matching HVI polygon, fits the map to it, highlights its boundary, and opens its HVI popup.
