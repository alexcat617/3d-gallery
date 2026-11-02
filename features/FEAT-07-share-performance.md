# FEAT-07: Share links + performance

| Field | Value |
|-------|-------|
| ID | FEAT-07 |
| Wave | D |
| Status | `ready` |
| Flows | [FLOW-00](../FLOWS.md#flow-00-owner-opens-the-pitch-p2) |
| Depends on | FEAT-03, FEAT-04 (FEAT-06 for scan budgets) |
| Primary persona | **P2** Dana |

## Outcome

The pitch link looks professional when texted or emailed (title + preview image) and opens fast on a mid-range phone.

## Persona lens

- **P2:** A link preview with her restaurant's name gets opened; a bare URL gets ignored.
- **P1:** First impression is the pitch.

## Requirements

| ID | Requirement | Trace |
|----|-------------|-------|
| REQ-07-01 | Per-venue link preview (Open Graph): title "Artwork by {artistName} for {venue}" (e.g. "Artwork by Alex Farrell for Corner Bistro"), description, preview image (a rendered viewpoint or chosen photo) | FLOW-00 step 1 |
| REQ-07-02 | Add the Open Graph tags to the per-venue `v/<id>/index.html` pages that FEAT-00 already generates (GitHub Pages is static, so tags must be in the HTML file) | D-03; REQ-00-10b |
| REQ-07-03 | Budgets: interactive ≤ 5 s on mid phone 4G (measured room); JS ≤ 500 KB gzip excl. assets; ≥ 30 fps phone | PRD G4 |
| REQ-07-04 | Images WebP/AVIF; wall photos ≤ 2048 px (1024 low); hashed filenames + long cache | PRD §6.1 |
| REQ-07-05 | Pause rendering when tab hidden; render on demand when nothing moves (battery) | — |
| REQ-07-06 | Tune quality tiers on real devices | FEAT-06 REQ-06-05 |
| REQ-07-07 | Optional dev stats overlay (`?debug`) | — |

## Acceptance criteria

- (P2) **Given** the link texted to an iPhone, **when** it arrives, **then** it shows the venue title and preview image.
- (P2) **Given** a mid-range Android on 4G, **when** opened, **then** the first viewpoint is interactive within 5 s.
- **Given** nothing is moving, **when** checked in devtools, **then** frames aren't rendered continuously.

## Out of scope

Analytics/view tracking (consider later: "did they open it?"), offline mode.
