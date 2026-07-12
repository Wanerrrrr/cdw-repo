# Pixar in Motion — Orbit Bubble Version

This version restyles each movie as a monochrome orbital bubble inspired by the supplied reference image.

## Visual encoding

- X axis: release year
- Y axis: worldwide box office, USD millions
- Outer ring size: runtime
- Single ring: original story
- Double ring: sequel or spinoff
- Dashed halo: limited or interrupted theatrical release
- Curved text: every movie title
- Elbow callouts: the highest-grossing films in the current filter

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
