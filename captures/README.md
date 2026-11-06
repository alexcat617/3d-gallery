# captures/ (private, not uploaded)

Drop raw venue material here, one folder per venue:

```text
captures/
  stalk/                ← restaurant #1 (example)
  topolino/             ← restaurant #2 (example)
  corner-bistro/
    sketch.jpg          ← photo of your hand-drawn plan with rough measurements
    bar-wall-1.jpg      ← straight-on wall photos
    room-from-door.jpg  ← context photos
    notes.md            ← anything else (heights, who you talked to)
```

Everything in this folder except this README is ignored by git, so it never reaches GitHub. Only cropped, approved wall photos are copied into `app/public/venues/<venue-id>/`.

Then ask the agent: "Build the venue file for corner-bistro from captures/corner-bistro."
