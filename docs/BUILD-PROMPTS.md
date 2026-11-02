# Build prompts (copy/paste)

Short prompts for Agent mode. The [build handoff contract](../FEATURES.md#build-handoff-contract) applies automatically.

## FEAT-00 — Foundation (start here)

```text
Build FEAT-00 per the FEATURES build handoff contract.
Read features/FEAT-00-foundation.md, FLOWS.md (FLOW-00, FLOW-03, shared rules), PRD-3d-gallery.md §7, docs/ux-principles.md, docs/ui-patterns.md, docs/GIT-WORKFLOW.md.
Decisions: D-01 WebGL2 + Spark, D-02 vanilla Three.js + TypeScript, D-03 GitHub Pages (change if I say otherwise).
Deliver: Vite + TS app in app/, gray-box room with placeholder frames, loading + error + unsupported states, artworks.ts, quality setting (low default in dev, ?quality= override), dev server reachable from my phone, PR check + deploy workflows.
End with a click-through checklist for the acceptance criteria.
```

## FEAT-01 — Desktop movement

```text
Build FEAT-01 on the existing app. Read FEAT-01, FLOW-01, shared rules. Collision per D-04. End with a click-through checklist.
```

## FEAT-02 — Touch movement

```text
Build FEAT-02 on the existing app. Read FEAT-02, FLOW-01, shared rules. Reuse FEAT-01 collision. Touch mode per D-05. End with a click-through checklist for real phones.
```

## FEAT-03 — Artwork detail

```text
Build FEAT-03 on the existing app. Read FEAT-03, FLOW-02, FLOW-03, shared rules, ui-patterns § Overlays. Placeholder images only. Run the accessibility-audit skill on the dialog and list view.
```

## Wave A in one go

```text
Build FEAT-00 + FEAT-01 + FEAT-02 per the build handoff contract, one branch per FEAT, in order. Demo outcome: walk a gray-box room on laptop and phone without passing through walls.
```
