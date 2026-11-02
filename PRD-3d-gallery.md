# PRD — Interactive 3D Spatial Art Gallery (prototype)

| Field | Value |
|-------|-------|
| Status | `draft` |
| Owner | Alex |
| Last updated | 2026-11-02 |
| Related | [CONCEPT.md](./CONCEPT.md) · [PERSONAS.md](./PERSONAS.md) · [FLOWS.md](./FLOWS.md) · [FEATURES.md](./FEATURES.md) |

## 1. Summary

An immersive, browser-based 3D gallery of Alex's portfolio. Visitors walk the space on desktop (keyboard + mouse) or mobile (touch), discover pieces through light and sound cues, and open a detail view for each artwork. Assets are captured on a phone and reconstructed in the cloud; the app streams hosted files. Built with Three.js; assembled with Cursor.

## 2. Goals

| # | Goal | Measure (prototype) |
|---|------|---------------------|
| G1 | Visitors can walk the gallery comfortably on desktop and mobile | Click-through passes on Chrome desktop, iOS Safari, Android Chrome |
| G2 | Every artwork's story is reachable in ≤ 2 actions from arrival | Via 3D (approach + select) **or** list view |
| G3 | Fast, honest loading | First interactive frame ≤ 5 s on mid-range phone over 4G; progress shown throughout |
| G4 | `main` is always a working public demo | Deployed from `main` only; PR checks green before merge |

## 3. Users

See [PERSONAS.md](./PERSONAS.md): **P1 Riley** (desktop hiring reviewer), **P2 Mia** (mobile visitor).

## 4. Scope

### In (v1)

- Single gallery space (one or more "wings") with 3–5 artworks to start.
- Desktop: WASD / arrows + mouse-look (pointer lock).
- Mobile: virtual joystick and/or tap-to-teleport.
- Collision so the camera can't pass through walls.
- Proximity highlight → select → camera frames artwork → HTML detail card (title, medium, year, narrative, zoom, external link).
- Accessible list view of all artworks (also the fallback when 3D fails).
- Ambient wayfinding: lighting, floor cues, optional ambient audio (off by default or user-started).
- Static hosting with deploy from `main`.

### Out (v1)

See [CONCEPT.md § Non-goals](./CONCEPT.md#non-goals-v1).

## 5. Functional requirements

| ID | Requirement | FEAT |
|----|-------------|------|
| FR-1 | Full-screen 3D scene with loading progress and error state | FEAT-00 |
| FR-2 | Renderer capability check with fallback to list view if 3D unavailable | FEAT-00 |
| FR-3 | Desktop movement: WASD/arrows, mouse-look via pointer lock, Esc releases | FEAT-01 |
| FR-4 | Collision with walls and dividers | FEAT-01 |
| FR-5 | Touch movement: joystick and/or tap-to-teleport; drag to look | FEAT-02 |
| FR-6 | Proximity trigger highlights the nearest artwork | FEAT-03 |
| FR-7 | Select artwork → camera transitions to head-on frame → detail card | FEAT-03 |
| FR-8 | Detail card: title, medium, year, narrative, zoom, external link; Esc/close returns to free movement | FEAT-03 |
| FR-9 | Keyboard path: next/previous artwork without pointer precision | FEAT-03 |
| FR-10 | Stream Gaussian-splat environments and artwork assets (`.spz` / `.ply` / `.glb`) with LoD | FEAT-04 |
| FR-11 | Wayfinding cues (light, floor, audio) between wings | FEAT-05 |
| FR-12 | Per-device asset budgets, texture limits, cache headers | FEAT-06 |

## 6. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA for all HTML UI; see [docs/ux-principles.md](./docs/ux-principles.md). `prefers-reduced-motion` replaces camera flights with cuts/fades.
- **Performance:** target 60 fps desktop, ≥ 30 fps mid-range phone. Budgets defined in FEAT-06.
- **Browsers:** latest Chrome, Edge, Safari (macOS + iOS), Firefox; Android Chrome.
- **Responsive:** 320 / 390 / 1280 px checks for HTML chrome.

### 6.1 Hardware constraints (cloud-first)

The dev machine is a laptop with integrated graphics (Intel Iris Plus), so heavy work stays off it:

| Work | Where it runs |
|------|---------------|
| 3D reconstruction / splat training | Cloud (World Labs / Luma / Polycam) — never local |
| Asset hosting + streaming | Static host / CDN |
| Rendering the scene | The viewer's browser — **including the dev laptop when testing** |

Because rendering always happens on the viewing device:

- Local development defaults to a **low-quality mode** (fewer splats, capped resolution) — FEAT-00 REQ-00-11.
- Device quality tiers ship **with** the first splats (FEAT-04), not at the end.
- Test on a real phone and the deployed site, not only the laptop. The laptop is a good stand-in for a typical visitor's device.
- No desktop 3D software (Blender, Unity, etc.) is required.

## 7. Technical approach

| Layer | Choice | Notes |
|-------|--------|-------|
| Build | Vite + TypeScript | `app/` folder |
| Scene graph | Three.js | |
| Renderer | **WebGL2 (`THREE.WebGLRenderer`)** — recommended for v1 | See decision D-01 |
| Splats | World Labs **Spark** (`@sparkjsdev/spark`) | LoD streaming, `.spz`/`.ply`, WebGL2 |
| Physics | Simple box/plane colliders first; Rapier.js only if needed | Decision D-04 |
| UI | Plain HTML/CSS overlay above the canvas | Focus-trapped dialog |
| Hosting | GitHub Pages from `main` | Vercel/Netlify later if headers/caching need it |

### Renderer constraint (important)

The brief calls for WebGPU with a WebGL2 fallback **and** Spark. As of Spark 2.3.x (Oct 2026), Spark requires `THREE.WebGLRenderer` and does **not** work with Three.js `WebGPURenderer` — even with `forceWebGL: true` ([sparkjs issue #394](https://github.com/sparkjsdev/spark/issues/394)). Options:

1. **WebGL2 + Spark (recommended).** One renderer, widest device support (incl. iOS), Spark's LoD streaming. Revisit WebGPU when Spark ships it.
2. **WebGPU + Three.js native Gaussian splats** (or Spark's experimental `Radix`). Newer, less proven LoD streaming; still needs WebGL2 path for older devices.

## 8. Asset pipeline

See [docs/ASSET-PIPELINE.md](./docs/ASSET-PIPELINE.md). Capture on phone → reconstruct in cloud (World Labs / Luma / Polycam) → export `.spz` (preferred) / `.ply` / `.glb` → host → reference URL in `app/src/data/artworks.ts`.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Splat files too heavy for phones | `.spz` compression, LoD, mobile budget (FEAT-06), placeholder frames until assets are ready |
| Motion sickness | No forced camera moves; reduced-motion cuts; moderate move speed; no head-bob |
| Pointer lock unsupported / confusing | Esc hint, click-to-look fallback; touch path on mobile |
| Cloud tool exports change format | Pin formats in ASSET-PIPELINE; keep originals |
| WebGPU expectation vs Spark reality | D-01 |

## 10. Open questions → see [FEATURES.md § Decisions](./FEATURES.md#decisions-blocking-ready)

## 11. Phases (from brief) → waves

| Brief phase | Wave | FEATs |
|-------------|------|-------|
| 1 Environment & blockout | A | FEAT-00, 01, 02 |
| 3 Interactivity (on placeholders) | B | FEAT-03 |
| 2 Asset sourcing + 3 splat integration | C | FEAT-04 |
| 4 Optimization + wayfinding polish | D | FEAT-05, 06 |

Interactivity is built on **placeholder frames** before real assets, so asset work never blocks UX work.
