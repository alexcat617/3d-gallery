# Git workflow — 3D Gallery

**Goal:** `main` is always the working live demo. All work happens on branches and lands through pull requests (PRs).

**Repo:** [alexcat617/3d-gallery](https://github.com/alexcat617/3d-gallery) · product docs at repo root · app in [`app/`](../app/)

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Live demo. Deploys to GitHub Pages. Only changes via merged PRs. |
| `feat/feat-XX-<name>` | One branch per FEAT (see [FEATURES.md](../FEATURES.md#status)) |
| `docs/<topic>` | Docs-only changes (PRD, flows, features) |
| `fix/<topic>` | Small bug fixes |

Always branch from an up-to-date `main`:

```bash
git switch main
git pull
git switch -c feat/feat-01-desktop-movement
```

## Checks

| Check | When | What |
|-------|------|------|
| **PR check** (GitHub Actions) | Every PR into `main` | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` in `app/` |
| **Deploy** (GitHub Actions) | Push to `main` only | Build `app/` → publish `app/dist` to GitHub Pages |

Added in FEAT-00. Feature branches never deploy, so they can't overwrite the live site.

## Merge checklist (per FEAT)

1. PR check is green.
2. Every node in the FEAT flow map clicked through, including error paths.
3. Acceptance criteria in `features/FEAT-XX-*.md` pass.
4. 320 / 390 / 1280 px checked; reduced motion checked; real phone checked for movement, touch, or asset changes.
5. Earlier FEATs still work (quick regression click-through).
6. FEAT status + Changelog updated in [FEATURES.md](../FEATURES.md).

## Protect `main` (one-time, on GitHub)

**Settings → Branches → Add branch ruleset** (or classic rule) for `main`:

- Require a pull request before merging.
- Require status checks to pass → select the PR check (after FEAT-00 adds it).
- Block force pushes.

## Run the app

Once FEAT-00 scaffolds `app/`:

```bash
cd app
npm install
npm run dev
```

The dev server starts in `low` quality to keep the laptop responsive. Add `?quality=high` to the URL for a quick look at full detail.

**Test on your phone:** with phone and laptop on the same Wi-Fi, open the **Network** URL that `npm run dev` prints (e.g. `http://192.168.1.20:5173`). If Windows asks about the firewall, allow private networks.

Do not commit `.env` files, API keys, or raw capture footage.
