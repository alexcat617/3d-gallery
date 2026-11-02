# FEAT-06: Performance budgets + caching

| Field | Value |
|-------|-------|
| ID | FEAT-06 |
| Wave | D |
| Status | `draft` |
| Flows | [FLOW-00](../FLOWS.md#flow-00--arrive--load) |
| Depends on | FEAT-04 |
| Primary persona | **P2** Mia |

## Outcome

The gallery runs smoothly on a mid-range phone and loads fast on repeat visits.

## Persona lens

- **P2:** Weak signal, older phone, battery — the budget is set for her.
- **P1:** Desktop gets more detail automatically.

## Requirements

| ID | Requirement | Trace |
|----|-------------|-------|
| REQ-06-01 | Tune the quality tiers from FEAT-04 (REQ-04-08) against real devices; add shadow/light count per tier | PRD §6.1 |
| REQ-06-02 | Budgets: first interactive ≤ 5 s on mid phone 4G; ≥ 30 fps mobile, 60 fps desktop; JS bundle ≤ 500 KB gzip (excl. assets) | PRD G3 |
| REQ-06-03 | Textures ≤ 2048 px (≤ 1024 mobile); images as WebP/AVIF | Brief §5 Phase 4 |
| REQ-06-04 | Cache: hashed filenames for app files; long-cache asset URLs (versioned) | Brief §5 Phase 4; D-03 |
| REQ-06-05 | Pause rendering when tab hidden; reduce frame rate when idle | — |
| REQ-06-06 | Optional dev-only FPS/stats overlay (`?debug`) | — |

## Acceptance criteria

- **Given** a mid-range Android phone on 4G, **when** opening the URL, **then** I can move within 5 s.
- **Given** a repeat visit, **when** opening the URL, **then** assets come from cache.
- **Given** the tab is hidden, **when** checked in devtools, **then** the render loop is paused.

## Out of scope

Service worker / offline mode.
