# Features: build packages

Delivery layer between [FLOWS.md](./FLOWS.md) (behavior) and code in [`app/`](./app/). One file per feature in [`features/`](./features/).

| Layer | Doc |
|-------|-----|
| Why | [CONCEPT.md](./CONCEPT.md) |
| Who | [PERSONAS.md](./PERSONAS.md) (P1 Alex artist / P2 Dana venue owner) |
| Product | [PRD-3d-gallery.md](./PRD-3d-gallery.md) |
| Paths | [FLOWS.md](./FLOWS.md) |
| **Build** | **This file + `features/FEAT-XX.md`** |
| UX guardrails | [docs/ux-principles.md](./docs/ux-principles.md) · [docs/ui-patterns.md](./docs/ui-patterns.md) |
| Venue capture | [docs/VENUE-CAPTURE.md](./docs/VENUE-CAPTURE.md) |
| Assets | [docs/ASSET-PIPELINE.md](./docs/ASSET-PIPELINE.md) |
| Git | [docs/GIT-WORKFLOW.md](./docs/GIT-WORKFLOW.md) |
| Prompts | [docs/BUILD-PROMPTS.md](./docs/BUILD-PROMPTS.md) |

Work item shape: Persona lens → User stories → Requirements → Acceptance criteria → Flow map → Build.

---

## Status

| ID | Feature | Wave | Status | Flows | Branch |
|----|---------|------|--------|-------|--------|
| [FEAT-00](./features/FEAT-00-foundation.md) | Foundation: app, venue links, loading, deploy | A | `building` | FLOW-00, 03 | `feat/feat-00-foundation` |
| [FEAT-01](./features/FEAT-01-measured-room.md) | Measured venue room | A | `building` | FLOW-04 | `feat/feat-01-measured-room` |
| [FEAT-02](./features/FEAT-02-artwork-to-scale.md) | Artwork to scale | A | `building` | FLOW-04 | `feat/feat-02-artwork-to-scale` |
| [FEAT-03](./features/FEAT-03-viewpoints.md) | Viewpoints (owner navigation) | B | `building` | FLOW-00, 01 | `feat/feat-03-viewpoints` |
| [FEAT-04](./features/FEAT-04-artwork-card.md) | Artwork info card + list view | B | `building` | FLOW-02, 03 | `feat/feat-04-artwork-card` |
| [FEAT-05](./features/FEAT-05-arrange-mode.md) | Arrange mode (artist) | C | `building` | FLOW-05 | `feat/feat-05-arrange-mode` |
| [FEAT-06](./features/FEAT-06-scanned-room.md) | Scanned room (realism) | D | `draft` (needs D-07) | FLOW-00, 04 | `feat/feat-06-scanned-room` |
| [FEAT-07](./features/FEAT-07-share-performance.md) | Share links + performance | D | `building` | FLOW-00 | `feat/feat-07-share-performance` |

**Status values:** `draft` → `ready` (decisions resolved) → `building` → `done` (merged to `main`)

---

## Build waves

| Wave | Features | Demo outcome |
|------|----------|--------------|
| **A: One wall, to scale** | FEAT-00 → 01 → 02 | Open a link and see your art on a measured restaurant wall at the right size |
| **B: Owner-ready** | FEAT-03 + 04 | Send restaurant #1 a link they can tap through; tap a piece for title, medium, size |
| **C: Artist workflow** | FEAT-05 | Set up restaurant #2 by tapping and dragging, without editing files |
| **D: Realism + polish** | FEAT-06 + 07 | Realistic scan of the room; nice link previews; fast on phones |

Wave A placements and viewpoints are typed into the venue file (the agent helps). Arrange mode (Wave C) replaces that.

---

## Decisions (blocking `ready`)

| ID | Topic | Owner FEAT | Recommendation | State |
|----|-------|------------|----------------|-------|
| D-01 | Renderer | FEAT-00 | **WebGL2 (`WebGLRenderer`)** (chosen): works everywhere; required by Spark for FEAT-06 | Resolved |
| D-02 | Vanilla Three.js vs React Three Fiber | FEAT-00 | **Plain Three.js + TypeScript** (chosen): fewer layers to learn | Resolved |
| D-03 | **Privacy + hosting** | FEAT-00 | **GitHub (public repo) + GitHub Pages** (chosen). Venue photos are public to anyone with the link or browsing the repo: tell venues, commit cropped wall photos only, `noindex`, no venue index page. Deleting files later hides them from the site but they stay in git history | Resolved |
| D-04 | Units | FEAT-01 | **Enter inches; show "24 × 36 in" and "14 ft 6 in"** (chosen) | Resolved |
| D-05 | Room shape | FEAT-01 | **Floor outline as corner points** (rectangle = 4, L-shape = 6) (chosen) | Resolved |
| D-06 | Arrange mode saving | FEAT-05 | **Dev-only** (chosen): Save writes the venue JSON through the local dev server; production is view-only | Resolved |
| D-07 | Scan source | FEAT-06 | **Polycam** if your phone has LiDAR (iPhone Pro), otherwise **Luma** or **World Labs**; pick the one that exports `.spz` / `.ply` | TBD (not needed until Wave D) |
| D-08 | Product name | — | Working title "3D Gallery" for now (chosen) | Deferred |
| D-09 | Default hang height | FEAT-02 | **Per-wall keep-clear zone** (wainscoting, booth backs, seat backs) + 10 in clearance; never below 57 in center. See [PRD § Hang height](./PRD-3d-gallery.md#hang-height-restaurant-rule). Adjustable per piece | Resolved |
| D-10 | Info card content | FEAT-04 | **Title, medium, size** (chosen). Story, price, contact, swap → later | Resolved |
| D-11 | Owner navigation | FEAT-03 | **Saved viewpoints + drag to look** (chosen). No free walking | Resolved |
| D-12 | Room approach | FEAT-01, 06 | **Measured room first, scan added later** (chosen) | Resolved |
| D-13 | Artist name shown to owners | FEAT-03, 07 | **"Alex Farrell"** (chosen), stored once in `app/src/data/site.json` | Resolved |

---

## Build handoff contract

When you say **"build FEAT-XX"**:

1. **Branch.** Create `feat/feat-XX-<name>` from up-to-date `main`. Never build on `main`.
2. **Read** `features/FEAT-XX-*.md` (incl. its flow map). Prefer status `ready`; override only if you say so.
3. **Read** the linked FLOW steps + [FLOWS.md shared rules](./FLOWS.md#shared-rules-apply-to-every-flow), and the persona lens + acceptance criteria.
4. **Read** [docs/ux-principles.md](./docs/ux-principles.md) + [docs/ui-patterns.md](./docs/ui-patterns.md) before any UI.
5. **Implement** from the flow map nodes and REQs. Include empty, loading, error, and reduced-motion states, not just the happy path.
6. **Verify locally** in `app/`: `npm run lint`, `npm run typecheck`, `npm run build` pass; click through every map node at 320 / 390 / 1280 px; check with reduced motion on. Develop in `low` quality (default). For anything the owner (P2) sees, also test on a real phone via the dev server's network URL ([PRD §6.1](./PRD-3d-gallery.md#61-hardware-constraints-cloud-first)).
7. **End with** a short click-through checklist mapped to the acceptance criteria.
8. **Update docs:** set FEAT status `building` → `done` (on merge); add a Changelog line below; update `docs/ui-patterns.md` if a new pattern was introduced.
9. **Open a PR** into `main`. Merge only when the PR check is green and the [merge checklist](./docs/GIT-WORKFLOW.md#merge-checklist-per-feat) passes.

Don't commit or push unless asked.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-11-09 | **FEAT-07 (WIP):** Open Graph / Twitter meta on built `v/<id>/index.html`; `pagesOrigin` in `site.json`; optional `shareImage`; tab-hidden render pause; `?debug` frame timing overlay |
| 2026-11-06 | **FEAT-01 measured room (WIP):** `createMeasuredRoom` — textured walls, openings, soffits, fixtures, sloped wall tops, `?debug` labels + keep-clear + validation UI; `?orbit=1` dev camera; `venues/_template.json`; sample venue exercises aspect + opening checks |
| 2026-11-09 | **FEAT-05 (WIP):** Dev `?arrange` side panel — wall pick, tap-to-place at recommended height, drag/nudge, snap center, validation + keep-clear override, save viewpoints, Save → venue JSON API, preview as owner |
| 2026-11-09 | **FEAT-04 (WIP):** Tap/click art → orange outline + dialog card (title, medium, size); hidden focus targets for keyboard; list “Show on wall” jumps viewpoint + outline; explore mode tap pick |
| 2026-11-09 | **FEAT-03 (WIP):** Intro + Start; viewpoint bar (prev/next, named list); glide navigation, drag-to-look limits, swipe; auto viewpoints per art wall; `?orbit=1` dev-only |
| 2026-11-06 | **FEAT-02 (WIP):** Artwork boxes at true scale from `artworks.json` + `placements[]`; shared `hang-height` helper; dev validation (overlap window/other art, keep-clear, top margin, aspect, resolution); sample pieces in `public/art/` |
| 2026-11-06 | Venues **Stalk** and **Topolino**: `stalk` / `topolino` venue JSON stubs, `docs/venues/README.md` index; Stalk reference images in `captures/stalk/` (private) |
| 2026-11-06 | **Stalk:** `ceilingIn` 144 (~12 ft); wall labels in `stalk.json` for art plan (1 on short/slanted wall, up to 2 on ~40′ bench wall); details in [docs/venues/README.md](./docs/venues/README.md) |
| 2026-11-06 | Stalk: two exterior reference photos of slanted wall added to private `captures/stalk/`; filenames listed in `docs/venues/README.md` |
| 2026-11-02 | Project docs scaffolded from discovery brief: CONCEPT, PERSONAS, PRD, FLOWS, FEATURES, FEAT-00…06, build contract |
| 2026-11-02 | Cloud-first hardware constraints: PRD §6.1, low-quality dev default, real-phone testing in contract |
| 2026-11-02 | **Pivot to venue pitch tool:** artist shows work in a restaurant's own space at true scale. New personas (artist / venue owner), flows, FEAT-00…07, venue capture guide; free-walk and wayfinding features removed |
| 2026-11-02 | D-03 resolved: GitHub Pages (public). D-09 resolved: restaurant hang height from per-wall keep-clear zone (wainscoting, booths, tables); seated viewpoints |
| 2026-11-02 | Capture workflow: rough sketch + photos with reference objects → agent builds venue file → iterate. Private `captures/` folder (git-ignored); `estimated[]` + `fixtures[]` in data model |
| 2026-11-02 | Resolved D-01, 02, 04, 05, 06, 13 (artist name "Alex Farrell"); D-08 deferred. FEAT-00…05 + 07 → `ready`; FEAT-06 waits on D-07 |
| 2026-11-02 | Variable heights: per-venue `ceilingIn` plus per-wall `heightIn`, slopes, and `soffits[]`; hang checks use the actual top of wall; capture guide measures height at each art wall |
| 2026-11-02 | **FEAT-00 built:** Vite + TS + Three.js app in `app/`; `/v/<id>` routing with per-venue pages; loading/error/unsupported/not-found/list screens; quality setting; PR check + GitHub Pages deploy workflows |
