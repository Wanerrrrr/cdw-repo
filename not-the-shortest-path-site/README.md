# Not the Shortest Path — Presentation Website

This folder contains a complete static presentation website for the **Research Foundations + Project Outline** assignment.

## Open locally

Double-click `index.html`, or run a local server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Upload the entire folder contents to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch containing `index.html` and the root folder.

## Main files

- `index.html` — all page content and sections
- `style.css` — colors, layout, responsive design, and woodland dashboard style
- `script.js` — active navigation, scroll reveals, mobile menu, and the small route concept interaction
- `assets/` — editable SVG placeholder images

## Replace placeholder images

The easiest method is to keep the existing filenames and replace the corresponding files inside `assets/`.

### Community of Practice

- `practice-serendipitor.svg`
- `practice-drift.svg`
- `practice-happymaps.svg`
- `practice-sensory.svg`
- `practice-audio.svg`
- `practice-gnd.svg`

### Computational Design Experiments

- `experiment-word.svg`
- `experiment-letter.svg`
- `experiment-number.svg`
- `experiment-sensory.svg`

### Visual Representation

- `visual-map.svg`
- `visual-lines.svg`
- `visual-interface.svg`
- `visual-sensory.svg`
- `visual-material.svg`

### Exhibition Components

- `exhibition-drawing.svg`
- `exhibition-kit.svg`

You can replace an SVG with a JPG or PNG, but then update its filename in `index.html`.
