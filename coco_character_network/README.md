# Coco Character Network — D3.js CSV Integration

An interactive force-directed relationship graph built with D3.js. The project loads character nodes and relationships from two external CSV files.

## Files

- `index.html` — page structure and SVG gradients
- `style.css` — visual system inspired by the film's glowing marigolds, papel picado, jewel-tone night scenes, and alebrije colors
- `script.js` — D3 force simulation, drag, zoom, search, filtering, hover highlighting, and tooltips
- `nodes.csv` — character attributes
- `edges.csv` — character relationships

## Run locally

Opening `index.html` directly may block CSV loading. Start a local server inside this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Data schema

### nodes.csv

- `id`: unique key used by D3
- `label`: display name
- `realm`: Living, Dead, or Spirit
- `group`: Rivera Family, Music World, or Animal Guides
- `role`: short character role
- `description`: tooltip text

### edges.csv

- `source`, `target`: node IDs
- `relationship`: family, friendship, companion, music, music-conflict, memory, or spirit
- `weight`: relationship strength used by the visual encoding
- `note`: plain-language description

## Data note

This is a small, hand-curated educational dataset based on relationships established in *Coco*. It is not an official Disney or Pixar dataset.
