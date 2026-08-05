# Not the Shortest Path — NYC Sound Map Demo

This version uses a real interactive New York City basemap and your own audio files.

## Run the website

Because the browser loads local audio files with `fetch()`, run the folder through a local server:

```bash
cd sensory-sound-map-demo-nyc
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The map tiles also require an internet connection.

## Add your audio

Put your audio files inside the `audio` folder using these exact file names:

- `wind.mp3`
- `water.mp3`
- `birds.mp3`
- `door.mp3`
- `restaurant.mp3`
- `market.mp3`
- `concrete-footsteps.mp3`
- `grass-footsteps.mp3`
- `mud-footsteps.mp3`
- `traffic-light.mp3`
- `crosswalk.mp3`
- `cars.mp3`

You can use other file names or formats by editing the `soundDefinitions` object at the top of `script.js`.

## Location logic

The demo does not claim that these sounds were recorded at the displayed locations. Each sound category has a small pool of plausible New York locations:

- water → waterfronts and river parks
- birds → parks and wildlife areas
- grass / mud footsteps → lawns and trails
- restaurants / markets → food districts and markets
- traffic / crosswalk / cars → busy streets and intersections

When a card is dropped, the code randomly selects one candidate from the relevant pool. Edit `candidateLocations` in `script.js` to change or add places.

## Map

The demo uses Leaflet with OpenStreetMap raster tiles. Keep the map attribution visible when publishing the project.
