Application code lives here. Scaffolded in [FEAT-00](../features/FEAT-00-foundation.md) (Vite + TypeScript + Three.js).

Content: `src/data/artworks.json` and `src/data/venues/<venue-id>.json` (see [PRD §7](../PRD-3d-gallery.md#data-model-v1) and [venue capture guide](../docs/VENUE-CAPTURE.md)).

See repo [README](../README.md) and [FEATURES.md](../FEATURES.md).

## Dev: measured room (FEAT-01)

- **Sample venue:** open [`/v/sample-room`](http://localhost:5173/3d-gallery/v/sample-room) (adjust host/port to your dev server).
- **`?debug`** — wall dimension labels (sprites), keep-clear zone tint, dev validation list, console warnings for photo aspect / openings.
- **`?orbit=1`** — drag to orbit the camera (dev inspection). Combine with **`?debug`** as needed.

Wall photos live under `public/` (e.g. `public/venues/<venue-id>/...`) and are referenced from venue JSON as `venues/...`.

## Dev: artwork to scale (FEAT-02)

- **Library:** `src/data/artworks.json` — `image` paths are under `public/` (e.g. `art/harbor-dusk.svg`).
- **Placements:** `placements[]` in each venue JSON (`artworkId`, `wallId`, `centerFromLeftIn`, optional `centerFromFloorIn`).
- **`?debug`** — validation list includes artwork warnings (overlap, keep-clear, bad aspect, oversized texture for quality tier).
