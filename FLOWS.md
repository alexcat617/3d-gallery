# Flows: user paths

Behavior source of truth. FEAT files trace requirements to these steps.

## Shared rules (apply to every flow)

1. **Owner-facing views need no instructions** beyond a single dismissible hint.
2. **True scale always.** Artwork and walls come from measurements; nothing is resized to "look better".
3. **Esc / Close always backs out** one level (card → view; arrange tool → arrange idle).
4. **Reduced motion:** with `prefers-reduced-motion`, viewpoint changes are an instant cut or short fade.
5. **Content without 3D:** every piece in a pitch is reachable from the list view.
6. **Never a blank screen:** loading shows progress; failure shows a plain message and a way forward.
7. **Selection is not color-only:** highlights use outline/label as well as tint.
8. **Artist tools are invisible to owners.** Arrange mode is never reachable from a shared link in production.
9. **Sizes are shown in plain units:** "24 × 36 in".

---

## FLOW-00: Owner opens the pitch (P2)

1. Dana opens the link (e.g. `/v/corner-bistro`) from a text or email.
   - **Unknown link →** friendly "This page isn't available" + artist name/contact text.
2. App checks 3D support.
   - **Unsupported →** list view (FLOW-03) with a short note.
3. Loading with progress.
   - **Error →** message + Retry + "See the pieces as a list".
4. Intro card: "Artwork by Alex Farrell for *Corner Bistro*" + **Start**.
5. First viewpoint shows the first wall with art. Hint: "Tap a piece to learn more · Swipe or tap arrows for the next wall". Dismisses on first interaction.

## FLOW-01: Owner looks around (P2)

1. Viewpoint bar shows named views ("Bar wall", "From the booths", "Entrance") + ‹ › arrows. Some views are at seated eye height so the owner sees what diners see.
2. Tap a name / arrow / swipe → camera moves to that viewpoint (cut if reduced motion).
3. Drag (or mouse-drag) to look around a little within limits; releases back gently.
4. Keyboard: ←/→ previous/next viewpoint; Tab reaches the viewpoint bar and pieces.

## FLOW-02: Owner checks a piece (P2)

1. Tap/click a piece (or Enter when focused) → piece outlined.
2. Info card: **title**, **medium**, **size** ("24 × 36 in"). Close button.
3. Close / Esc / tap outside → back to the same view; focus returns to the piece.

## FLOW-03: List view (P2, fallback & shortcut)

1. From the "All pieces" button, unsupported 3D, or load error.
2. List of pieces in this pitch: image, title, medium, size, and which wall it's on.
3. If 3D is available: "Show on wall" jumps to the viewpoint that shows that piece.

## FLOW-04: Artist prepares a venue (P1)

1. **Ask permission** from the venue to photograph and measure, and mention the pitch link and photos are on a public website (unlisted).
2. **Capture** per [docs/VENUE-CAPTURE.md](./docs/VENUE-CAPTURE.md): rough sketch of the plan with rough lengths; tape-measure art-wall widths, ceiling, and keep-clear heights; straight-on wall photos with a reference object; context photos (+ optional scan video). Save to the private `captures/<id>/` folder.
3. **Create venue file:** the agent builds `app/src/data/venues/<id>.json` from the sketch + photos, marks estimated values, and flags inconsistencies.
   - **Iterate:** compare the room (`?debug`) with context photos; correct lengths (bar, walls, doors); rebuild. Repeat until it looks right.
4. **Add artwork** to `app/src/data/artworks.json`: photo + title + medium + width × height.
5. **Arrange** (FLOW-05).
6. **Preview** as the owner sees it; check on phone.
7. **Share** the link (merge to `main` → live).

## FLOW-05: Artist arranges art (P1, arrange mode)

1. Open the venue with arrange mode (dev only: `npm run dev`, then `?arrange`).
2. Pick a wall from the wall list → camera faces that wall; wall shows its width/height.
3. Pick an artwork from the library → tap the wall to place it. Height is set automatically above the wall's **keep-clear zone** (wainscoting, booth backs, seat backs + 10 in), never lower than a 57 in center.
4. Drag to adjust; position readout shows inches from left and from floor. Snap guides: center of wall, recommended-height line, align with neighbor, equal spacing.
   - **Over a door/window, off the wall, or into the keep-clear zone →** placement shows invalid (outline + message). Keep-clear can be overridden with a confirm (e.g. above a bar counter).
5. Remove or swap a piece.
6. Move camera to a good spot → **Save as viewpoint** with a name.
7. **Save** → writes the venue file. Unsaved changes warn before leaving.
