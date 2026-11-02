# Asset pipeline

Two kinds of assets: **artwork photos** (needed from Wave A) and **room scans** (optional, FEAT-06). Venue measurements and wall photos are covered in [VENUE-CAPTURE.md](./VENUE-CAPTURE.md).

All heavy processing happens in the cloud; the repo only references optimized files ([PRD §6.1](../PRD-3d-gallery.md#61-hardware-constraints-cloud-first)).

## Artwork photos

| # | Step | Notes |
|---|------|-------|
| 1 | **Measure** each piece: width × height (and depth) in inches; note frame size if framed | Measure the outer edge of what hangs on the wall |
| 2 | **Photograph** straight-on, even daylight or diffuse light, no glare; fill the frame | Lay flat or hang level; phone parallel to the piece |
| 3 | **Crop** exactly to the edges; straighten/perspective-correct | The cropped photo's proportions must match width × height (the app warns if off > 3 %) |
| 4 | **Export** JPG or WebP, long edge ~2048 px | Name `kebab-case`: `harbor-dusk.webp` |
| 5 | **Add** to `app/public/art/` and an entry in `app/src/data/artworks.json` | title, medium, widthIn, heightIn, frame |

If you already have good portfolio photos, reuse them; only the crop and dimensions matter.

## Room scans (FEAT-06, optional)

| # | Step | Tool | Output |
|---|------|------|--------|
| 1 | Capture video sweep of the room | Phone, in the capture app | Raw video (keep outside the repo) |
| 2 | Reconstruct | Polycam, Luma AI, or World Labs (D-07) | Trained splat |
| 3 | Clean | Cloud tool's crop editor: remove outside/floaters | Clean splat |
| 4 | Export | `.spz` (preferred, compressed) or `.ply` | One file per venue |
| 5 | Host | Files > 50 MB go to a cloud bucket/CDN, not git | Stable URL |
| 6 | Reference | `scan` field in the venue JSON | Aligned in arrange mode |

## File rules

- Version file names when replacing: `corner-bistro-scan-v2.spz` (cache busting).
- Never commit raw videos or original full-resolution photos.
- Privacy: the repo and site are public (D-03). Commit only cropped wall photos, never people or originals. Removing a file later hides it from the site, but it stays in git history.

## Asset register

| ID | What | Venue | Format | Size | Location | Status |
|----|------|-------|--------|------|----------|--------|
| — | — | — | — | — | — | — |
