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

- Document max content width and padding for non-canvas UI here.
- Separate **chrome** (nav, title) from **canvas** (WebGL) layers in CSS stacking.

### Gallery / 3D viewport

- Reserve aspect ratio or min-height so layout doesn’t jump on load.
- Loading skeleton or progress for asset fetch.
- Document pointer vs keyboard behavior in this section when implemented.

### Overlays & detail

- Modal or panel: focus trap, Escape to close, return focus to trigger.
- `aria-modal` and labelled headings where applicable.

## Agent checklist

1. Read `docs/ux-principles.md` and this file before UI edits.
2. Set explicit `color` on light buttons/inputs.
3. Test 320 / 390 / 1280 widths.
4. Check `prefers-reduced-motion` for camera and transitions.
