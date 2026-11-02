# PRD: Venue art pitch (3D, to scale)

| Field | Value |
|-------|-------|
| Status | `draft` |
| Owner | Alex |
| Last updated | 2026-11-02 |
| Related | [CONCEPT.md](./CONCEPT.md) · [PERSONAS.md](./PERSONAS.md) · [FLOWS.md](./FLOWS.md) · [FEATURES.md](./FEATURES.md) · [docs/VENUE-CAPTURE.md](./docs/VENUE-CAPTURE.md) |

## 1. Summary

A web app that shows an artist's work hanging on a specific venue's walls, at true scale, in a simple 3D view. The artist (P1) measures and photographs the room, adds artwork photos with sizes, and arranges them. The venue stakeholder (P2) opens a link and taps between a few views of their own space, tapping a piece to see its title, medium, and size.

First real use: Alex pitching two local restaurants.

## 2. Goals

| # | Goal | Measure (v1) |
|---|------|--------------|
| G1 | The owner sees the art in their space with no learning | From the link to seeing art on their wall in ≤ 1 tap after load; no instructions beyond one hint |
| G2 | Sizes are trustworthy | Artwork appears within ±1 in of true size relative to the measured walls |
| G3 | The artist can prepare a venue without code | After capture, a venue pitch is set up in ≤ 1 hour using the capture checklist + arrange mode |
| G4 | It opens fast on a phone | Interactive ≤ 5 s on a mid-range phone over 4G (measured room) |
| G5 | `main` is always a working live app | Deploy from `main` only; PR checks green before merge |
| G6 (outcome) | More yeses | At least one of the two restaurants agrees to a conversation or trial hang after seeing the pitch |

## 3. Users

[PERSONAS.md](./PERSONAS.md): **P1 Alex** (artist, sets up), **P2 Dana** (venue owner/manager, views).

## 4. Scope

### In (v1)

- One pitch per venue, each at its own link (e.g. `/v/corner-bistro`).
- **Measured room:** walls built from tape measurements, with the artist's wall photos as surfaces. Doors/windows marked so art isn't placed over them.
- **Artwork to scale:** a photo of each piece plus width × height (and optional frame) → hung at exact size.
- **Viewpoints:** a few named views per venue ("Bar wall", "Booths") the owner taps between; drag to look around a little.
- **Info card:** tap a piece for title, medium, and size.
- **List view:** all pieces in this pitch; also the fallback when 3D can't run.
- **Arrange mode (artist only):** pick a wall, tap to place, drag to adjust, save; save viewpoints from the current camera.
- **Scanned room (later in v1):** a realistic phone scan of the room, processed in the cloud, aligned and scaled to the measurements.

### Out (v1)

Accounts, in-app uploads, prices/sales/contact actions, free-walk controls, VR, multiplayer. See [CONCEPT.md](./CONCEPT.md#non-goals-v1).

## 5. Functional requirements

| ID | Requirement | FEAT |
|----|-------------|------|
| FR-1 | Each venue has its own URL; unknown URL shows a friendly "not found" | FEAT-00 |
| FR-2 | Loading progress, error with retry, and list-view fallback if 3D is unavailable | FEAT-00 |
| FR-3 | Room built from a venue file: floor outline (corners), ceiling height, openings, wall photos | FEAT-01 |
| FR-4 | Artwork library: photo, title, medium, width × height (+ optional depth/frame) | FEAT-02 |
| FR-5 | Artwork rendered at exact real size on its wall position | FEAT-02 |
| FR-6 | Named viewpoints; tap or swipe to move between them; drag to look within limits | FEAT-03 |
| FR-7 | Tap artwork → info card (title, medium, size); list of all pieces | FEAT-04 |
| FR-8 | Arrange mode: place, move, remove artwork on walls; save viewpoints; save to venue file | FEAT-05 |
| FR-9 | Optional scanned room (Gaussian splat) aligned + scaled to the measured room | FEAT-06 |
| FR-10 | Link preview (title + image) when shared by text/email; performance budgets | FEAT-07 |

## 6. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA for all HTML UI ([docs/ux-principles.md](./docs/ux-principles.md)). Viewpoint changes respect `prefers-reduced-motion` (cut instead of glide). Every viewpoint and piece is reachable by keyboard.
- **Units:** artist enters inches; UI shows inches with feet where helpful ("24 × 36 in", "Wall: 14 ft 6 in"). Stored in inches, converted to meters inside Three.js.
- **Browsers:** latest Chrome, Edge, Safari (macOS + iOS), Firefox; Android Chrome.
- **Responsive:** 320 / 390 / 1280 px checks for HTML UI. Phone-first for P2.
- **Privacy:** the repo and GitHub Pages site are **public** (D-03). Pitch links are unlisted (no index page, `noindex`), but anyone with the link, or anyone browsing the repo, can see venue photos. Tell venues this when asking permission; commit only cropped wall photos, never people, staff areas, or originals.

### 6.1 Hardware constraints (cloud-first)

The dev machine is a laptop with integrated graphics (Intel Iris Plus), so heavy work stays off it:

| Work | Where it runs |
|------|---------------|
| Room scan reconstruction (FEAT-06) | Cloud (Polycam / Luma / World Labs), never local |
| Measured room + artwork (FEAT-01/02) | Light; runs anywhere |
| Rendering the scene | The viewer's browser, **including the dev laptop when testing** |

Because rendering always happens on the viewing device:

- Local development defaults to a **low-quality mode** (FEAT-00 REQ-00-11).
- Quality tiers ship with the scanned room (FEAT-06), not at the end.
- Test on a real phone and the deployed site, not only the laptop.
- No desktop 3D software (Blender, Unity, etc.) is required.

## 7. Technical approach

| Layer | Choice | Notes |
|-------|--------|-------|
| Build | Vite + TypeScript | `app/` folder |
| Scene | Three.js, `THREE.WebGLRenderer` (WebGL2) | D-01 |
| Rooms | Generated from venue JSON (walls = textured planes) | FEAT-01 |
| Scans | World Labs **Spark** (`@sparkjsdev/spark`), FEAT-06 only | Spark needs `WebGLRenderer`; it does not support `WebGPURenderer` ([sparkjs#394](https://github.com/sparkjsdev/spark/issues/394)) |
| UI | Plain HTML/CSS over the canvas | |
| Content | `app/src/data/artworks.json` + `app/src/data/venues/<id>.json` | Arrange mode writes venue JSON in dev |
| Hosting | **GitHub Pages** from `main` via a GitHub Actions workflow (D-03) | Site at `alexcat617.github.io/3d-gallery/`; Vite `base: '/3d-gallery/'`. Pages has no server rewrites, so the build writes a real `v/<id>/index.html` per venue (deep links work on refresh, and each gets its own link preview) |

### Data model (v1)

```text
Artwork   id, title, medium, widthIn, heightIn, depthIn?, frame?, image
Venue     id, name, ceilingIn (default height for every wall in this venue), corners[] (floor outline, inches, clockwise)
  hang          clearanceIn (default 10), minCenterIn (default 57), topMarginIn (default 6)
  walls[]       id, label, photo?,
                heightIn? (this wall's height if it differs from ceilingIn),
                heightLeftIn? + heightRightIn? (sloped ceiling: height at each end, instead of heightIn),
                soffits[]? (lowered section along the top: fromLeftIn, widthIn, dropIn, e.g. a bulkhead over the bar or a beam),
                wainscotIn? (top of wainscoting / chair rail),
                furnitureTopIn? (highest booth back, banquette, or seat back against this wall),
                openings[] (door/window/vent/switch: fromLeftIn, fromFloorIn, widthIn, heightIn),
                estimated?[] (names of fields estimated from sketch/photos, e.g. ["widthIn", "openings"])
  fixtures[]?   id, label, wallId, fromLeftIn, widthIn, heightIn, depthIn (e.g. the bar; simple boxes)
  placements[]  artworkId, wallId, centerFromLeftIn, centerFromFloorIn? (omit = recommended)
  viewpoints[]  id, label, position, lookAt, eyeHeightIn? (standing 63 / seated 48)
```

Walls are derived from consecutive corners, so a rectangle is 4 corners and an L-shaped room is 6.

**Heights vary by venue and within a room.** Every venue sets its own `ceilingIn`. Inside a room, a wall can override it (`heightIn`), slope (`heightLeftIn` / `heightRightIn`), or have lowered sections (`soffits[]`). The "top of wall" used for hang-height checks is the actual top at that spot, including soffits.

### Hang height (restaurant rule)

Gallery walls center art at ~57 in, but restaurant walls have booths, tables, and wainscoting, so art usually hangs higher. Each wall gets a **keep-clear zone** from the floor up to its highest obstruction, and the recommended center is calculated from it:

```text
clearTop          = max(wainscotIn, furnitureTopIn)            (0 if neither)
recommendedCenter = max(minCenterIn, clearTop + clearanceIn + artHeight / 2)
```

Example: booth backs at 44 in, a 24 × 36 in piece → max(57, 44 + 10 + 18) = **72 in** center (bottom edge at 54 in, 10 in above the booths).

- A placement without `centerFromFloorIn` uses the recommended center.
- Warn if the bottom of a piece dips into the keep-clear zone + clearance, or the top comes within `topMarginIn` of the top of the wall at that spot (ceiling, slope, or soffit).
- On short walls or under soffits the recommended center may not fit; then center the piece in the space between the clearance line and the top margin, and warn if it still doesn't fit.
- The artist can always override per piece (e.g. for a wall above a bar counter).

## 8. Content pipeline

- **Venue:** [docs/VENUE-CAPTURE.md](./docs/VENUE-CAPTURE.md): permission, measurements, wall photos, optional scan video.
- **Artwork + scans:** [docs/ASSET-PIPELINE.md](./docs/ASSET-PIPELINE.md).

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Measurements wrong → art looks wrong size | Capture checklist; measure each wall twice; arrange mode shows wall dimensions so mismatches are visible |
| Wall photos distorted (angle, wide lens) | Shoot straight-on from the middle; crop/straighten guidance; plain color fallback per wall |
| Owner finds 3D confusing | Viewpoints only, one hint, big tap targets, list view |
| Venue photos are public (public repo + GitHub Pages) | D-03: tell venues up front; commit only cropped wall photos; unlisted links + `noindex`; remove a venue's files when a pitch ends |
| Art hung too low for booths/tables | Keep-clear zone + recommended center (§7 Hang height); seated viewpoints show the diner's view |
| Scan doesn't line up with measurements | Scan is optional (FEAT-06); measured room always works |
| First build of this kind | Small waves; each wave is usable on its own |

## 10. Phases → waves

| Wave | FEATs | You can… |
|------|-------|----------|
| A: One wall, to scale | FEAT-00, 01, 02 | Open a link and see your art on a measured restaurant wall at the right size |
| B: Owner-ready | FEAT-03, 04 | Send restaurant #1 a link they can tap through |
| C: Artist workflow | FEAT-05 | Set up restaurant #2 without editing files |
| D: Realism + polish | FEAT-06, 07 | Swap in a realistic scan; nice link previews; fast on phones |
