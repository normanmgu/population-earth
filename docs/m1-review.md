# M1 orbital foundation — creator review

Implemented October 17, 2026 (America/Chicago). **Creator approved the opening composition and material direction. M1 is complete. M2 was subsequently implemented October 18, 2026 and is awaiting creator sample review; see [M2 review](m2-review.md).**

Run `npm run dev` and open http://127.0.0.1:5173/. Drag or use arrow keys while the canvas is focused; scroll, pinch, or use +/− to zoom. Home and Reset view restore the whole-globe opening. The gentle introduction lasts at most 12 seconds and stops on interaction; reduced motion disables automatic rotation and damping. Rendering settles when idle and pauses while hidden. Resize across portrait/landscape refits Earth.

## Review artifacts

- [Fixed opening, Chrome](m1/opening-chrome.png): 1440×900 CSS pixels, DPR 1.5, reduced motion, reset camera, longitude 85°E / latitude 8°N / distance 3.15 Earth radii. No random decoration.
- [Narrow viewport](m1/mobile-chrome.png): 390×844 CSS pixels, DPR 1.5, whole-globe fit.
- [Approved concept](population-earth-concept.png).
- [Machine-readable Chrome check](m1/chrome-check.json).

The opening retains Asia at the center, Africa at left and Australia at lower right. The entire sphere fits to make reset useful, while retaining the concept's large silhouette. Charcoal land, navy water, subtle source relief and a thin blue shell establish the material direction. A separate normal map is deferred. The concept's settlement colors, pillars and city tags belong to later milestones and are intentionally absent from this review.

Creator review outcome: approved. The opening composition, land/ocean contrast and atmosphere intensity are accepted for the M2 sample layer. No M1 visual changes are pending.

## Asset and alignment

Natural Earth II with shaded relief and water, 1:50m, version 3.2.0, public domain. Archive and output SHA-256 checksums, original dimensions, world-file coefficients, processing runtime and attribution are recorded in [asset manifest](../data/source-manifests/assets.json). The 84.7 MiB archive stays in ignored `data/raw/earth/`; only the 2048×1024 PNG ships (~844 KiB).

Reproduce with the archive URL in the manifest, then run:

```sh
/Users/normangutierrez/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/assets/prepare-earth.py
```

The script verifies the archive hash before processing. The source world file resolves to −180..180 longitude / −90..90 latitude, north-up, without rotation. Full extent is retained; no geographic crop or mirror is applied. Numeric tests compare actual Three.js sphere vertices/UVs with the plan's coordinate convention, including Greenwich, ±90°, the poles and antimeridian. Screenshot inspection confirms India, Arabia, east Africa, Southeast Asia and Australia in their expected relative positions. The muted color treatment is decorative geography, not a population or density layer.

## First Chrome check on M0 hardware

Installed Chrome 155.0.8059.84, automated headless run on the documented MacBook Air M2. WebGL2 reports `ANGLE Metal Renderer: Apple M2`. At 1440×900 / DPR 1.5: texture load, drag, keyboard rotation, zoom, exact reset, reduced-motion stillness, simulated context loss and rebuild passed. At 390×844: layout fits without horizontal overflow. Forced WebGL2 unavailability produces accessible messaging; blocked texture requests show retry and recover after the request is restored. No page errors were recorded.

Reproduce with the dev server running: `node scripts/qa/m1-check.mjs`. `npm test` passes 21 tests; `npm run build` validates the frozen 48-city sample, typechecks and builds successfully. Vite reports a >500 kB JS chunk (about 208 kB gzip); texture plus compressed application is roughly 1.1 MB, not a measured cold-load transfer result.

This is a functional Chrome check, not a 30-second performance benchmark or cross-browser release certification. Safari, Edge, Firefox, physical touch/pinch, normal-motion timing, frame/heap measurements, throttled networking and creator visual approval remain unverified. The M0 source manifest and 48-city sample have not changed. The future searchable city fallback is deferred until population data is exposed in M2.
