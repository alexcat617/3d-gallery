# Build prompts (copy/paste)

Short prompts for Agent mode. The [build handoff contract](../FEATURES.md#build-handoff-contract) applies automatically.

## FEAT-00: Foundation (start here)

```text
Build FEAT-00 per the build handoff contract.
Read features/FEAT-00-foundation.md, FLOWS.md (FLOW-00, FLOW-03, shared rules), PRD-3d-gallery.md §6.1 and §7, docs/ux-principles.md, docs/ui-patterns.md, docs/GIT-WORKFLOW.md.
Decisions are resolved in FEATURES.md (WebGL2, plain Three.js + TypeScript, GitHub Pages).
Deliver: Vite + TS app in app/ (base /3d-gallery/), /v/<venue-id> routing with a generated index.html per venue, sample venue + artworks JSON, loading/error/unsupported/not-found states, quality setting (low in dev), phone-reachable dev server, PR check + deploy.
End with a click-through checklist for the acceptance criteria.
```

## FEAT-01: Measured room

```text
Build FEAT-01. Read FEAT-01, FLOW-04, docs/VENUE-CAPTURE.md. Start with the sample room, then here are my measurements for <venue>: <paste notes>.
```

## FEAT-02: Artwork to scale

```text
Build FEAT-02. Read FEAT-02, docs/ASSET-PIPELINE.md. Here are my pieces: <title, medium, W × H in, photo file>. Place them on <wall> for now.
```

## FEAT-03 + FEAT-04: Owner-ready

```text
Build FEAT-03, then FEAT-04, one branch each. Read the FEAT files, FLOW-00–03, shared rules, ui-patterns § Overlays. Test on my phone. Run accessibility-audit on the card and list.
```

## FEAT-05: Arrange mode

```text
Build FEAT-05. Read FEAT-05, FLOW-05. Dev-only per D-06. Run design-critique on the arrange panel.
```

## Turn my sketch + photos into a venue file

```text
Build the venue file for <venue-id> from captures/<venue-id>. Follow docs/VENUE-CAPTURE.md and _template.json.
Use my sketch for the layout; estimate missing lengths from the photos using the reference objects; mark estimated fields in estimated[].
Check the outline closes, the bar/fixtures fit their walls, and openings fit; list anything that looks off and what to re-measure.
```

## Iterate on a venue

```text
In <venue-id>: <what looks off, e.g. "the bar looks too short, it covers about two-thirds of the bar wall in photo bar-wall-1.jpg">. Re-check against the photos and update the venue file.
```
