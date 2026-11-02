# UX principles — 3D Gallery

Guardrails for product UI, prototyping, and agent-assisted changes. Pair with [UI patterns](./ui-patterns.md).

## References

- [Shneiderman’s eight golden rules](https://www.cs.umd.edu/users/ben/goldenrules.html)
- [Nielsen Norman Group — ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)

## Core guardrails

| Theme | What we enforce |
| --- | --- |
| Status & feedback | Loading and error states for 3D assets; don’t leave a blank canvas without explanation. |
| User control | Obvious exit/back; pause or reduce motion; user-initiated navigation over forced autopilot. |
| Consistency | One pattern for primary actions, overlays, and gallery chrome across views. |
| Errors | Plain language; recovery paths (retry load, return to grid/list). |
| Recognition | Thumbnails, titles, and labels visible before heavy 3D interaction where possible. |
| Minimalism | One primary action per step; avoid control clutter over the canvas. |

## Accessibility (WCAG 2.2 AA target)

- **Contrast:** Explicit text colors on light control surfaces.
- **Touch:** Interactive targets ≥ 44×44 CSS px where practical.
- **Semantics:** Landmarks for shell vs gallery; button/link names for icon controls.
- **Motion:** Honor `prefers-reduced-motion` for camera moves, transitions, and autoplay.
- **Focus:** Visible focus on all interactive UI; logical tab order (chrome → gallery controls → overlays).
- **3D:** Provide a usable path without precise pointer-only gestures when feasible (keyboard, list/grid fallback, or simplified view).

For copy, use the **ux-writing** skill. For reviews, use **accessibility-audit** or **design-critique**.

## When to update this doc

- New primary flow (browse, enter piece, share, etc.).
- New motion or 3D interaction pattern.
- Repeated mistakes in agent or human passes — add a row or short note here.
