# Features — build packages

Delivery layer between [FLOWS.md](./FLOWS.md) (behavior) and code in [`app/`](./app/). One file per feature in [`features/`](./features/).

| Layer | Doc |
|-------|-----|
| Why | [CONCEPT.md](./CONCEPT.md) |
| Who | [PERSONAS.md](./PERSONAS.md) (P1 Riley / P2 Mia) |
| Product | [PRD-3d-gallery.md](./PRD-3d-gallery.md) |
| Paths | [FLOWS.md](./FLOWS.md) |
| **Build** | **This file + `features/FEAT-XX.md`** |
| UX guardrails | [docs/ux-principles.md](./docs/ux-principles.md) · [docs/ui-patterns.md](./docs/ui-patterns.md) |
| Git | [docs/GIT-WORKFLOW.md](./docs/GIT-WORKFLOW.md) |
| Assets | [docs/ASSET-PIPELINE.md](./docs/ASSET-PIPELINE.md) |
| Prompts | [docs/BUILD-PROMPTS.md](./docs/BUILD-PROMPTS.md) |

Work item shape: Persona lens → User stories → Requirements → Acceptance criteria → Flow map → Build.

---

## Status

| ID | Feature | Wave | Status | Flows | Branch |
|----|---------|------|--------|-------|--------|
| [FEAT-00](./features/FEAT-00-foundation.md) | Scene foundation + deploy | A | `draft` | FLOW-00, 03 | `feat/feat-00-foundation` |
| [FEAT-01](./features/FEAT-01-desktop-movement.md) | Desktop movement + collision | A | `draft` | FLOW-01 | `feat/feat-01-desktop-movement` |
| [FEAT-02](./features/FEAT-02-touch-movement.md) | Touch movement | A | `draft` | FLOW-01 | `feat/feat-02-touch-movement` |
| [FEAT-03](./features/FEAT-03-artwork-detail.md) | Artwork detail flow + list view | B | `draft` | FLOW-02, 03 | `feat/feat-03-artwork-detail` |
| [FEAT-04](./features/FEAT-04-splat-assets.md) | Splat environment + artwork assets | C | `draft` | FLOW-00, 01 | `feat/feat-04-splat-assets` |
| [FEAT-05](./features/FEAT-05-wayfinding.md) | Spatial wayfinding | D | `draft` | FLOW-01 | `feat/feat-05-wayfinding` |
| [FEAT-06](./features/FEAT-06-performance.md) | Performance budgets + caching | D | `draft` | FLOW-00 | `feat/feat-06-performance` |

**Status values:** `draft` → `ready` (decisions resolved) → `building` → `done` (merged to `main`)

---

## Build waves

| Wave | Features | Demo outcome |
|------|----------|--------------|
| **A — Walkable blockout** | FEAT-00 → FEAT-01 + FEAT-02 | Open the live URL, walk a gray-box room on laptop or phone, can't walk through walls |
| **B — Art detail** | FEAT-03 | Approach a placeholder frame, select it, read its card; list view works |
| **C — Real assets** | FEAT-04 | Captured splat environment + real artwork streamed in |
| **D — Polish** | FEAT-05 + FEAT-06 | Light/floor/audio guide you; smooth on a mid-range phone |

Wave B uses placeholder frames (image planes) so it never waits on cloud asset processing.

---

## Decisions (blocking `ready`)

| ID | Topic | Owner FEAT | Recommendation | State |
|----|-------|------------|----------------|-------|
| D-01 | Renderer: WebGL2 + Spark vs WebGPU + native splats | FEAT-00 | **WebGL2 + Spark** (Spark doesn't support WebGPURenderer yet) | TBD |
| D-02 | Vanilla Three.js vs React Three Fiber | FEAT-00 | **Vanilla Three.js + TypeScript** (closest to Spark docs, fewer layers) | TBD |
| D-03 | Hosting: GitHub Pages vs Vercel/Netlify | FEAT-00 | **GitHub Pages** now; move if cache headers matter (FEAT-06) | TBD |
| D-04 | Collision: hand-placed boxes vs Rapier.js | FEAT-01 | **Boxes first**; Rapier only if the space gets complex | TBD |
| D-05 | Touch: joystick vs tap-to-teleport vs both | FEAT-02 | **Tap-to-move first**, joystick as option | TBD |
| D-06 | Setting: personal portfolio gallery vs restaurant space (brief §6) | FEAT-04 | Decide before capture day | TBD |
| D-07 | Splat source: World Labs vs Luma vs Polycam | FEAT-04 | Whichever exports `.spz`; test one piece first | TBD |
| D-08 | Ambient audio in v1? | FEAT-05 | Optional; muted by default | TBD |

---

## Build handoff contract

When you say **"build FEAT-XX"**:

1. **Branch.** Create `feat/feat-XX-<name>` from up-to-date `main`. Never build on `main`.
2. **Read** `features/FEAT-XX-*.md` (incl. its flow map) — prefer status `ready`; override only if you say so.
3. **Read** the linked FLOW steps + [FLOWS.md shared rules](./FLOWS.md#shared-rules-apply-to-every-flow), and the persona lens + acceptance criteria.
4. **Read** [docs/ux-principles.md](./docs/ux-principles.md) + [docs/ui-patterns.md](./docs/ui-patterns.md) before any UI.
5. **Implement** from the flow map nodes and REQs — include empty, loading, error, and reduced-motion states, not just the happy path.
6. **Verify locally** in `app/`: `npm run build` and `npm run lint` pass; click through every map node at 320 / 390 / 1280 px; check with reduced motion on. Develop in `low` quality (default); spot-check `?quality=high` briefly. For movement, touch, or asset features, also test on a real phone via the dev server's network URL ([PRD §6.1](./PRD-3d-gallery.md#61-hardware-constraints-cloud-first)).
7. **End with** a short click-through checklist mapped to the acceptance criteria.
8. **Update docs:** set FEAT status `building` → `done` (on merge); add a Changelog line below; update `docs/ui-patterns.md` if a new pattern was introduced.
9. **Open a PR** into `main`. Merge only when the PR check is green and the [merge checklist](./docs/GIT-WORKFLOW.md#merge-checklist-per-feat) passes.

Don't commit or push unless asked.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-11-02 | Project docs scaffolded from discovery brief: CONCEPT, PERSONAS, PRD, FLOWS, FEATURES, FEAT-00…06, build contract |
| 2026-11-02 | Cloud-first hardware constraints: PRD §6.1, low-quality dev default (REQ-00-11/12), quality tiers moved to FEAT-04, real-phone testing in contract |
