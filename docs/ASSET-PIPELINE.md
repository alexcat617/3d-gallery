# Asset pipeline — cloud-first

All heavy compute (reconstruction/training) happens in the cloud. The repo only references hosted, optimized files.

## Steps

| # | Step | Tool | Output | Time |
|---|------|------|--------|------|
| 1 | **Capture** artwork and/or space | Phone camera: photos for flat work; slow multi-angle video sweep for 3D/rooms | Raw photos / video (keep originals **outside** the repo) | 15–30 min |
| 2 | **Reconstruct** | World Labs (Marble), Luma AI, or Polycam (D-07) | Trained splat / mesh | 30–60 min (cloud) |
| 3 | **Clean** | Cloud tool's crop/mask editor | Background noise and floaters removed | 10–20 min |
| 4 | **Export** | Same tool | `.spz` (preferred, compressed) · `.ply` · `.glb` for meshes · WebP for flat images | — |
| 5 | **Host** | Small files: `app/public/assets/`; large splats: cloud bucket / CDN | Stable URL | — |
| 6 | **Reference** | `app/src/data/artworks.ts` | Entry with URL, title, medium, year, narrative, position | — |

## Capture tips

- Even, diffuse light; avoid direct sun and reflections on glass.
- Video sweeps: slow, overlapping arcs at 2–3 heights; lock exposure if possible.
- Flat 2D art usually looks best as a high-res **image on a plane** in a splat room, not as a splat itself.

## File rules

- Prefer `.spz` for splats (much smaller than `.ply`).
- Files > 50 MB: host outside git (bucket/CDN), not in `app/public/`.
- Name files `kebab-case` with a version: `north-wing-v2.spz`. Change the version when replacing a file (cache busting — FEAT-06).
- Keep a row per asset below.

## Asset register

| ID | Artwork / space | Source tool | Format | Size | URL | Status |
|----|-----------------|-------------|--------|------|-----|--------|
| — | — | — | — | — | — | — |
