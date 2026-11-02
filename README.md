# 3D Gallery

Experiments and app code for a 3D gallery experience.

## Layout

```
3d-gallery/
├── README.md
├── app/                 ← application (scaffold TBD)
├── docs/                ← UX principles and UI patterns
├── .agents/skills/      ← design / a11y agent skills (from design-skills)
└── .cursor/rules/       ← Cursor rules for this repo
```

## Agent skills

Skills from [cuellarfr/design-skills](https://github.com/cuellarfr/design-skills) are pinned in `skills-lock.json`. Cursor loads them from `.agents/skills/` automatically.

Useful defaults for UI work:

| Skill | When |
| --- | --- |
| **accessibility-audit** | WCAG checks before ship |
| **design-critique** | Heuristic review of layouts and flows |
| **interaction-design** | Motion, states, 3D controls |
| **ux-writing** | Labels, errors, empty states |
| **design-systems** | Tokens and components as the UI grows |

## Docs

- [UX principles](./docs/ux-principles.md)
- [UI patterns](./docs/ui-patterns.md)

## Run locally

Add build/run steps here once `app/` is scaffolded (e.g. Vite + Three.js).
