# Distance Converter

A small web app that converts between **kilometers** and **miles** in both directions.

Live demo (GitHub Pages): [https://reymundobermejo-glitch.github.io/Distance-Converter/](https://reymundobermejo-glitch.github.io/Distance-Converter/)

## How to run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Features

- Live conversion as you type
- Swap direction (button or **Ctrl/Cmd+S**)
- Decimal precision (0–6)
- Dark mode
- Copy result
- Conversion history
- Quick presets (5K, marathon, road-trip distances)
- Remembers direction, precision, theme, and history in `localStorage`

## Formulas

- km → mi: `× 0.621371192`
- mi → km: `× 1.609344`
