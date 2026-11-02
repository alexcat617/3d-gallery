# Concept — See the art in your space

*Working title: 3D Gallery (see decision D-08).*

## Problem

Getting artwork into local restaurants and venues is hard, and most of the difficulty is in the pitch, not the art:

- Many artists find it hard to describe and "sell" their own work.
- Approaching a business is intimidating. Who do you even talk to?
- Showing photos on your phone feels amateur and proves nothing about fit.
- A website link may never get opened, and may not show the newest, best work.
- The business owner has to *imagine* the piece on their wall, at the right size, next to their booths and lighting. Most can't, so the easy answer is "no" or "maybe later".

Every one of these is a point where a good match fails.

## Idea

A link the artist sends (or opens on the spot) that puts **the artist's actual work on the venue's actual walls, at true scale**, in a simple 3D view.

- The **artist** measures and photographs the room once, adds photos and sizes of their artwork, and arranges pieces on the walls.
- The **venue stakeholder** opens the link on their phone or laptop, taps between a few views of their own room, and taps any piece to see its title, medium, and size.

The 3D view does the "selling" the artist finds hard: the owner *sees* the fit instead of being told about it.

## Who benefits

| Who | Gets |
|-----|------|
| Artist | A professional, specific pitch, prepared ahead of time, that is easy to send and easy to update |
| Venue owner / manager | A low-effort, no-risk preview of the art in their space, to scale, before committing |

## Principles

1. **The owner needs zero learning.** Tap, look, done. No game controls, no instructions beyond one hint.
2. **True scale or nothing.** Sizes come from real measurements; the app never guesses dimensions.
3. **The artist's prep is guided.** Clear capture checklist; arranging art needs no code.
4. **Start simple, add realism later.** A measured room with wall photos first; a realistic phone scan later.
5. **Always deployable.** `main` is the live app; features land through PRs.

## Now vs later

- **Now (v1):** One artist (Alex), two restaurants, a private pitch link for each.
- **Later:** Any artist can sign up, upload work, and create venue pitches. v1 data is organized per venue and per artwork so this can grow, but accounts and uploads are out of scope.

## Non-goals (v1)

- Accounts, sign-up, or uploads in the app (Alex adds content to the project files).
- Payments, contracts, pricing, or sales.
- Free-walk game controls (viewpoints replace them).
- VR headsets, multiplayer.
- Local 3D processing. Anything heavy happens in the cloud.

## Links

[PERSONAS.md](./PERSONAS.md) · [PRD-3d-gallery.md](./PRD-3d-gallery.md) · [FLOWS.md](./FLOWS.md) · [FEATURES.md](./FEATURES.md)
