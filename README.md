# 3D Gallery (working title)

Show your artwork on a venue's own walls, at true scale, before you ask to hang it. The artist measures and photographs a restaurant, adds photos and sizes of their work, and arranges pieces on the walls. The owner opens a link and taps through views of their own room.

First use: Alex pitching two local restaurants. Later: any artist.

## Start here

| Doc | What it answers |
| --- | --- |
| [CONCEPT.md](./CONCEPT.md) | The problem, the idea, now vs later |
| [PERSONAS.md](./PERSONAS.md) | Who: P1 Alex (artist), P2 Dana (venue owner) |
| [PRD-3d-gallery.md](./PRD-3d-gallery.md) | Requirements, data model, tech, risks |
| [FLOWS.md](./FLOWS.md) | User paths + shared rules |
| [FEATURES.md](./FEATURES.md) | Feature status, waves, decisions, **build handoff contract** |
| [features/](./features/) | One build package per feature (FEAT-00…07) |
| [docs/VENUE-CAPTURE.md](./docs/VENUE-CAPTURE.md) | What to measure and photograph at a restaurant |
| [docs/ASSET-PIPELINE.md](./docs/ASSET-PIPELINE.md) | Artwork photos; optional room scans |
| [docs/GIT-WORKFLOW.md](./docs/GIT-WORKFLOW.md) | Branches, PR checks, merge checklist |
| [docs/BUILD-PROMPTS.md](./docs/BUILD-PROMPTS.md) | Copy/paste Agent prompts per feature |
| [docs/ux-principles.md](./docs/ux-principles.md) · [docs/ui-patterns.md](./docs/ui-patterns.md) | UX guardrails |

## Layout

```
3d-gallery/
├── CONCEPT.md · PERSONAS.md · PRD-3d-gallery.md · FLOWS.md · FEATURES.md
├── features/            ← FEAT-XX build packages
├── docs/                ← capture guide, pipeline, workflow, UX guardrails
├── app/                 ← application (scaffolded in FEAT-00)
├── .agents/skills/      ← design / a11y agent skills
└── .cursor/rules/       ← Cursor rules for this repo
```

## How we build

1. Update the PRD and flows when ideas change.
2. Break work into `features/FEAT-XX` files; resolve decisions → status `ready`.
3. Say **"build FEAT-XX"**. The agent follows the [build handoff contract](./FEATURES.md#build-handoff-contract) on a `feat/` branch.
4. PR into `main`; merge when checks + [merge checklist](./docs/GIT-WORKFLOW.md#merge-checklist-per-feat) pass. `main` deploys.

## What you need

| Where | Tool |
| --- | --- |
| Computer | Cursor, Node.js (LTS), Git, Chrome or Edge. No 3D software or strong GPU needed |
| At the venue | Tape measure (or laser measure), phone camera, [capture checklist](./docs/VENUE-CAPTURE.md) |
| Later, for realistic scans | One capture app: Polycam, Luma AI, or World Labs ([ASSET-PIPELINE](./docs/ASSET-PIPELINE.md)) |

Heavy 3D processing runs in the cloud; see [PRD §6.1](./PRD-3d-gallery.md#61-hardware-constraints-cloud-first).

## Agent skills

Skills from [cuellarfr/design-skills](https://github.com/cuellarfr/design-skills) are pinned in `skills-lock.json`. Cursor loads them from `.agents/skills/` automatically.

| Skill | When |
| --- | --- |
| **accessibility-audit** | WCAG checks before ship |
| **design-critique** | Heuristic review of layouts and flows |
| **interaction-design** | Motion, states, viewpoint controls |
| **ux-writing** | Labels, errors, empty states |
| **design-systems** | Tokens and components as the UI grows |

## Run locally

After FEAT-00:

```bash
cd app
npm install
npm run dev
```
