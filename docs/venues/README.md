# Venues in this project

Restaurants you are preparing for the pitch each get:

1. **Private raw material** — `captures/<venue-id>/` (git-ignored; sketches, reference photos, visit notes). See [VENUE-CAPTURE.md](../VENUE-CAPTURE.md).
2. **Shipped 3D data** — `app/src/data/venues/<venue-id>.json` (room outline, walls, placements, viewpoints).
3. **Public wall textures (later)** — cropped photos in `app/public/venues/<venue-id>/` per [ASSET-PIPELINE.md](../ASSET-PIPELINE.md).

| Order | Venue id | Display name | Capture folder | App link (dev) |
|-------|----------|--------------|----------------|----------------|
| 1 | `stalk` | Stalk | `captures/stalk/` | `/v/stalk` |
| 2 | `topolino` | Topolino | `captures/topolino/` | `/v/topolino` |

Ids are **kebab-case** and match the filename: `stalk.json`, `topolino.json`.

When a capture folder has a sketch and wall photos, ask: **Build the venue file for &lt;venue-id&gt; from captures/&lt;venue-id&gt;.**

### Stalk (in progress)

| | |
|---|---|
| Ceiling | **~12 ft** (`ceilingIn`: 144 in) — refine if the bar or other zones differ |
| Art intent | **1** piece on the **shorter slanted** wall segment; **up to 2** on the **~40′** wall (bench + small tables) |
| JSON | Wall ids `short-wall-sketch` and `bench-long-wall` in `app/src/data/venues/stalk.json` (placeholder rectangle until the notched outline is built) |
| Placements | Added when pieces exist in `app/src/data/artworks.json` |

Private visit notes and reference images live in **`captures/stalk/`** (folder is git-ignored; images stay local). Filenames include sketch + storefront/bar refs and **slanted wall from outside**: `reference-slanted-wall-exterior-286-window.png`, `reference-slanted-wall-exterior-storefront.png` (see `captures/stalk/notes.md` on your machine).
