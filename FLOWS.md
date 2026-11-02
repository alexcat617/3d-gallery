# Flows — user paths

Behavior source of truth. FEAT files trace requirements to these steps.

## Shared rules (apply to every flow)

1. **User owns the camera.** No automatic camera moves except the selection transition the user asked for.
2. **Esc always backs out** one level: detail card → free movement → pointer lock released.
3. **Reduced motion:** with `prefers-reduced-motion`, camera transitions become an instant cut or short fade; no idle camera drift.
4. **Content without 3D:** every artwork is reachable from the list view.
5. **Never a blank canvas:** loading shows progress; failure shows a plain-language message and a way forward.
6. **Selection is not color-only:** highlight uses light + outline/label, not just tint.
7. **Audio is opt-in** or starts muted with a visible toggle.

---

## FLOW-00 — Arrive & load

1. Visitor opens the URL.
2. App checks 3D support (WebGL2).
   - **Unsupported →** list view with a short explanation (FLOW-03).
3. Loading screen with progress (assets + scene).
   - **Load error →** message + Retry + "View as list".
4. First frame: spawn at entrance, facing the first wing.
5. Controls hint appears (desktop: "Click to look around · WASD to move"; touch: "Drag to look · Tap the floor to move"). Dismisses on first input.

## FLOW-01 — Move & explore

1. Desktop: click canvas → pointer lock → mouse-look; WASD/arrows move. Touch: drag to look; joystick or tap floor to move.
2. Collision keeps the visitor inside walkable space.
3. Wayfinding cues (light pools, floor pattern, audio) pull toward the next piece/wing.
4. Esc releases pointer lock and shows the hint again.

## FLOW-02 — Artwork detail

1. Visitor comes within the proximity radius of an artwork → artwork brightens + label "Select to view" (desktop: crosshair/click; touch: tap).
2. Visitor selects the artwork (click, tap, or Enter when highlighted).
3. Camera transitions to a head-on frame (cut if reduced motion). Movement input paused.
4. Detail card opens (dialog): title, medium, year, narrative; actions: **Zoom**, **Open link** (if any), **Close**.
   - Zoom: larger view of the piece (image or camera dolly).
   - Keyboard: ←/→ previous/next artwork while card is open.
5. Close / Esc → camera returns to pre-selection position → free movement resumes; focus returns to canvas.

## FLOW-03 — List view (fallback & shortcut)

1. Reached from: gallery chrome button "All works", unsupported 3D, or load error.
2. Accessible list/grid: thumbnail, title, medium.
3. Selecting an item opens the same detail card content (no 3D required).
4. If 3D is available: "View in gallery" jumps the camera to that piece (FLOW-02 step 3).
