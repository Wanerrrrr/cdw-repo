# Not the Shortest Path · Mini Prototype

This browser prototype turns three sound-volume captures into an RGB color, then uses that color to retrieve an unranked set of color-related demo locations.

## Interaction

1. Enable the microphone, or use the demo slider.
2. Capture three values: R, G, and B.
3. Reveal locations whose stored facade colors are nearest to the generated RGB color.
4. Select locations that catch your attention.
5. Reorder them and construct a route.

The location set is intentionally unranked: the interface does not display a best match or a matching percentage.

## About the location data

The current version uses a synthetic color library and demo location profiles so the color-matching interaction can be tested before a real storefront/facade dataset exists. Each demo record has a fixed stored color; the site does not recolor places to fit the user's result.

## Run locally

Microphone access normally requires HTTPS or localhost.

```bash
cd sound-color-location-demo
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Audio is analyzed live in the browser and is not recorded, saved, or uploaded.
