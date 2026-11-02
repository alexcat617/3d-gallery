# Concept — Interactive 3D Spatial Art Gallery

## Problem

A flat portfolio grid shows *what* the work is, not *how it feels to stand in front of it*. Scale, placement, light, and the act of walking up to a piece are lost.

## Idea

A web-based 3D gallery you can walk through in the browser. Artwork is captured with a phone, reconstructed in the cloud (Gaussian splats / GLB), and placed in a navigable space. Approaching a piece lights it up; selecting it frames it head-on and opens a clean card with title, medium, and story.

No installs, no heavy local compute: capture and reconstruction happen in the cloud; the app streams hosted assets.

## Principles

1. **Comfort first** — user controls the camera; no forced motion; reduced-motion respected.
2. **Discover, don't instruct** — light, floor, and sound guide the visitor instead of map overlays.
3. **Content survives without 3D** — every artwork is reachable from an accessible list view, including when WebGL fails.
4. **Always deployable** — `main` is the live demo; features land via PRs.

## Non-goals (v1)

- Multiplayer / shared presence.
- VR/WebXR headset mode (possible later — Spark supports it).
- E-commerce, accounts, CMS. Artwork data lives in a code file.
- Local 3D reconstruction or custom graphics engineering.

## Links

- Product requirements: [PRD-3d-gallery.md](./PRD-3d-gallery.md)
- Who it's for: [PERSONAS.md](./PERSONAS.md)
- Build packages: [FEATURES.md](./FEATURES.md)
