# UI patterns — 3D Gallery

Layout and component rules for `app/`. Pair with [UX principles](./ux-principles.md).

## Responsive strategy

**Primary surface:** Mobile and desktop browsers. **Approach:** Mobile-first; the 3D viewport and chrome must coexist without horizontal scroll at **320px** unless the canvas intentionally fills width.

### Viewport checks

Before shipping UI changes, sanity-check at **320px**, **390px**, and **1280px**:

- Controls remain tappable; overlays don’t trap focus.
- Text in chrome wraps; no clipped buttons.
- Reduced-motion path still usable.

## Pattern catalog (fill in as you build)

### Page shell

Implemented in FEAT-00 (`app/index.html`, `app/src/style.css`, `app/src/ui/screens.ts`).

- Two fixed layers: `#stage` (canvas, `z-index: 0`, `touch-action: none`) and `#ui` (HTML, `z-index: 10`). `#ui` ignores pointer events except on its children, so the canvas stays draggable.
- **Full screens** (`.screen` > `.panel`): loading, error, list, not-found, home. Opaque background over the canvas; the canvas gets `aria-hidden="true"` while one is shown. Content max width `40rem`, 16 px side padding, safe-area insets.
- **Room chrome** (`.topbar`): venue name (h1) + "Artwork by {artist}" + one secondary button. Translucent white with blur; safe-area top inset.
- Focus: each full screen moves focus to its h1 (`tabindex="-1"`, no outline on the heading). Returning from the list puts focus back on "All Pieces". Escape closes the list.
- Buttons: pill shape, min 44 × 44 px. `.button--primary` dark fill / white text; `.button--secondary` white fill / dark text + border (explicit colors). Focus ring: 3 px `#2563eb`, 2 px offset.
- Copy patterns: page titles in title case ("The Room Didn’t Load", "Page Not Available"); buttons verb-first sentence case ("Try again", "See pieces as a list", "Back to room").

### Gallery / 3D viewport

- Full-viewport canvas; renders on demand (no idle animation loop).
- Loading: status text + progress bar (`role="progressbar"`) fed by one Three.js `LoadingManager` (`LoadTracker`).
- Errors: full-screen message, **Try again** (primary), **See pieces as a list** (secondary, when venue data loaded).
- No WebGL2: list view with a note, no 3D.
- Test hooks: `?simulate=no-webgl`, `?simulate=load-error` (first attempt fails, retry succeeds), `?quality=low|medium|high`.
- **Owner navigation (FEAT-03):** Canvas drag = limited look (yaw ±35°, pitch ±15°, eases back). Horizontal swipe = next/prev view. ←/→ = prev/next. Bottom **viewpoint bar**: ‹ ›, center opens named list. **Explore room** (top bar) = full orbit; **Back to guided views** or Esc returns to the tour. Intro **Start** before first view; one dismissible hint. Dev-only full orbit without intro: `?orbit=1`. **Auto viewpoints** (empty `viewpoints[]`) step back based on how large the art is so owners see the piece in the room, not a tight crop — override with saved viewpoints from arrange.

### Overlays & detail

- Modal or panel: focus trap, Escape to close, return focus to trigger.
- `aria-modal` and labelled headings where applicable.

## Agent checklist

1. Read `docs/ux-principles.md` and this file before UI edits.
2. Set explicit `color` on light buttons/inputs.
3. Test 320 / 390 / 1280 widths.
4. Check `prefers-reduced-motion` for camera and transitions.
