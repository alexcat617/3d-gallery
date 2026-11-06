# Venue capture guide

How to collect enough to build a restaurant's room to scale. No floor plans needed. The approach:

1. **Sketch** a rough plan with rough measurements.
2. **Photograph** the walls (with something of known size in view).
3. **Hand both to the agent**, which builds a first version and estimates missing lengths from the photos.
4. **Iterate**: compare with your photos, correct a few numbers, rebuild.

Plan for **20–30 minutes** on site, ideally before opening or in a quiet afternoon slot.

## Before you go

- [ ] **Ask permission** to measure and photograph. Be upfront: the pitch is an unlisted page on a public website, so photos are viewable by anyone with the link. Photograph walls only, with no customers or staff. (This is also a good, low-pressure first conversation.)
- [ ] Ask who decides on art for the space; note their name for the pitch intro.
- [ ] Bring: phone with charge; a tape measure (25 ft) or laser measure (about $25–40, quicker for long walls and ceilings); paper + pen for the sketch.

## What must be measured vs what can be estimated

True scale matters most where the art will hang, so measure those few numbers with a tape. Everything else can be rough and refined from photos.

| Measure with tape (art walls only) | OK to estimate / get from photos |
|------------------------------------|----------------------------------|
| Width of each wall you'll hang art on | Walls with no art |
| Ceiling height **at each art wall** (heights often differ: soffits over the bar, beams, sloped or dropped ceilings) | Bar length, counter depth |
| Wainscoting / chair-rail top on art walls | Door and window positions and sizes |
| Booth / seat-back top on art walls | Table spacing, room depth |
| One **reference object** per photo (see below) | Light switches, vents, sconces |

If you only have time for one number per wall, take the **wall width**.

## 1. Sketch the plan

Draw a rough top-down outline on paper. Anything works; neat isn't required.

- Number corners clockwise from the entrance: C1, C2, C3…
- Name each wall by what's on it (bar wall, booth wall). Those names show up in the app.
- Write rough lengths along each wall ("~22 ft", "bar ≈ 14 ft") and mark doors, windows, bar, booths.
- Mark which walls are candidates for art (a star is fine).
- Note heights at the side: ceiling, wainscot top, booth-back top, table height, counter height, and the center height of any art already hanging (the venue's own "normal").
- If the ceiling changes height, mark where: a lowered **soffit/bulkhead** (where it starts and ends along the wall, and how far it drops), a **beam**, or a **sloped** ceiling (height at each end of the wall). Every venue is different, so don't assume one ceiling height for the whole room.

```text
   C1 ─────── bar wall (~24 ft) ─────── C2
   │   [======= bar ≈ 14 ft =======]     │
 entrance                          booth wall ★ (18 ft 4 in measured)
 (~16 ft)                          booths: back top 44 in
   │                                     │
   C4 ─────── window wall (~24 ft) ──── C3
   ceiling 10 ft 2 in · soffit over bar drops ~18 in · wainscot 36 in
```

Take a straight-down photo of the sketch.

## 2. Photograph

**Wall photos (one set per art wall):**

- Stand in the **middle of the wall**, as far back as possible, phone **level**, facing it **straight-on**.
- Use the normal 1× lens, not ultra-wide (wide lenses bend straight lines and throw off estimates).
- Get the whole wall corner to corner, floor to ceiling if you can; overlap left → right if it's too wide.
- Even lights on, no strong window glare, 2–3 shots each.

**Include a reference of known size in each wall photo**, on or right against the wall. This is what lets the agent estimate other lengths:

| Good reference | Size |
|----------------|------|
| Your tape measure pulled out and laid along the floor/wall | Read it in the photo |
| A sheet of printer paper taped to the wall | 8.5 × 11 in |
| A standard interior door | Usually ~80 in tall, 30–36 in wide (measure one to be sure) |
| Something you measured on site (a booth back, the bar top) | Your number |

Estimates are most accurate when the reference is **on the same wall surface** as what's being measured, and the photo is straight-on. Expect roughly ±5 % from a good photo, worse at an angle, which is why art-wall widths get the tape.

**Context photos:** the whole room from where an owner would stand **and sit** (from a booth, at a table). These guide viewpoints and help check the layout.

## 3. Hand it over

Put everything in `captures/<venue-id>/` in the project (for example `captures/corner-bistro/`). That folder is **private**: git ignores it, so raw photos never reach GitHub. See [captures/README.md](../captures/README.md).

Tracked list of venue ids in use (Stalk, Topolino, links): [docs/venues/README.md](./venues/README.md).

Then ask the agent:

```text
Build the venue file for corner-bistro from captures/corner-bistro.
```

The agent reads the sketch and photos, fills in `app/src/data/venues/<venue-id>.json`, marks which numbers are **estimated** vs **measured**, and lists anything that doesn't add up (e.g. walls that don't close into a room, a bar longer than its wall).

## 4. Iterate

1. Open the venue in the app (`npm run dev` → `/v/<venue-id>?debug` shows wall sizes).
2. Compare with your context photos: does the bar look the right length? Do the booths line up?
3. Tell the agent what's off ("bar wall feels too long, the bar takes up about two-thirds of it"), or re-measure one thing next visit.
4. Repeat until it looks like the room. Two or three rounds is normal.

## 5. Crop wall photos for the app

Once wall sizes are settled, each wall photo is cropped to its corners, floor, and ceiling, and straightened so the wall is a rectangle. The agent can do this from your photos, or you can use any editor with crop + perspective (phone Photos app, Photopea in the browser, or Figma). Cropped photos go in `app/public/venues/<venue-id>/`, and only these are uploaded.

## 6. Optional: scan video (FEAT-06)

For the realistic version later, record a slow video sweep in a capture app ([ASSET-PIPELINE](./ASSET-PIPELINE.md)). If your phone has LiDAR (iPhone Pro), Polycam's room mode also measures the room, a great cross-check for the sketch.

## Measurement sheet (optional; the sketch is enough)

| Venue | | Date | |
|---|---|---|---|
| Contact / decision maker | | Ceiling height (in) | |

| Wall | From → to | Width (in) | Measured / est. | Wall height (in) + soffits / slope | Wainscot top (in) | Booth / seat-back top (in) | Existing art center (in) | Notes (bar, doors, windows) |
|------|-----------|------------|-----------------|------------------------------------|-------------------|----------------------------|--------------------------|-----------------------------|
| | C1 → C2 | | | | | | | |
| | C2 → C3 | | | | | | | |
| | C3 → C4 | | | | | | | |
| | C4 → C1 | | | | | | | |
