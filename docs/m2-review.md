# M2 honest city prototype — creator review

Implemented October 18, 2026 (America/Chicago). **M2 accepted for progression on October 18, 2026.** The creator reported that manual review looked fine and directed work toward M3. The evidence below is the historical M2 sample review; the current app now uses the full M3 release. See [M3 review](m3-review.md). M0 artifacts remain unchanged; M4 has not started.

Run `npm run dev` and open http://127.0.0.1:5173/. The opening uses the approved M1 globe and the unchanged M0 release, `m0-2025-v1`. “Sample: 48 urban areas” stays visible in the header, including while the city layer is hidden or graphics are unavailable.

## Review route

1. Compare the default linear pillars with the approved globe. Switch to logarithmic heights and back; the current mode stays labeled. The legend represents 1M, 10M and 40M people on the same fixed scale as the geometry.
2. Select Jakarta's pillar or label. Its detail panel shows approximately 41,914,000 people, a mid-year 2025 estimate rounded to the nearest 1,000. The underlying stored count remains unchanged in both modes. Inspect the definition, centroid method, source and license.
3. Click near the Jakarta/Bandung bases to open the nearby-city chooser. Select either city and use **Zoom to city**. Pillars keep their geographic anchors; the chooser resolves overlap without moving or merging data.
4. Use **Browse cities** to search by city or country, including cities on the far side of Earth. Keyboard Tab/Enter selects a result. Try Paris, Sydney and a small city. Search and source details also work without WebGL2.
5. Toggle city pillars and decorative particles independently. Replay the one-second growth reveal. Reduced motion disables introduction rotation and growth, including when that preference changes while the app is open.
6. Check the narrow layout and reset view. Creator approval should cover the sample composition, pillar thickness, fixed maximum height, label density, controls and inspection behavior before M3 begins.

## Implementation and quantitative meaning

- One instanced six-sided pillar batch, one base-marker batch, 384 deterministic decorative points and a selected-city ring. Particles are static after growth; they do not imply resident counts or a density surface. No bloom render targets are used.
- All pillar bases use the M1 geographic convention and sit at radius 1. Width is constant. Selection changes color and a nonquantitative ring, never height or width.
- The untouched M0 manifest supplies `P_ref = 41,913,860`, `H_ref = 0.12R`, and `P0 = 50,000`. Linear is the default. Logarithmic mode uses the documented `log1p` transform. No minimum pillar height, dynamic normalization or silent clamping is applied. The 0.12R visual calibration remains subject to creator review; the source manifest's provisional status is preserved.
- Growth applies one shared shader factor to every height. Raycasting uses CPU radial segments with that same factor and a 12 CSS-pixel tolerance, so small cities and growing pillars remain selectable. Drag excursions above six pixels and multi-pointer gestures suppress click selection.
- HTML labels use actual text bounds, collision rejection, globe occlusion and a maximum of 12 desktop / 5 narrow-screen labels. Selected and hovered cities take precedence. Leaders terminate at true projected pillar tips. Labels may be suppressed by UI or other labels; the selected detail panel remains available.
- F21's publisher names are retained verbatim. All 48 `localNames` arrays are empty, so no translations are invented. The UI renders verified language/direction metadata if supplied by a later audited release.
- The source panel exposes the DEGURBA definition, units/conversion, estimate status, precision policy, coordinate-datum caveat, source workbook, attribution, license and original manifest/checksum.
- Data loading and texture loading have separate failure/retry paths. Context rebuilding restores UI selection and settings. Resources, label nodes and listeners are disposed on replacement.

## Evidence

- [Linear opening](m2/opening-chrome.png), [logarithmic opening](m2/logarithmic-chrome.png).
- [Selected city](m2/selection-chrome.png), [source details](m2/source-chrome.png), [nearby-city selection](m2/nearby-selection-chrome.png), [dense-region zoom](m2/dense-region-chrome.png).
- [Narrow opening](m2/mobile-chrome.png), [narrow selection](m2/mobile-selection-chrome.png), [WebGL2 fallback](m2/fallback-chrome.png).
- [Chrome functional checks](m2/chrome-check.json), [initial performance measurements](m2/performance.json), [Chrome interaction trace, gzip JSON](m2/interaction-trace.json.gz). Decompress the trace and load it into Chrome DevTools Performance.

Screenshots use installed Chrome on the M0 host, 1440×900 or 390×844 CSS pixels, DPR 1.5 and reduced motion. The particle seed is fixed at 20251017. Desktop opening uses the unchanged 85°E / 8°N / 3.15R M1 camera. Narrow reset refits the whole sphere. Selection and zoom screenshots intentionally use different cameras or panel states.

Reproduce with the local dev server running:

```sh
npm test
npm run build
node scripts/qa/m2-check.mjs
node scripts/qa/m2-performance.mjs
```

The performance script uses a 120-frame warm-up followed by a 30-second sinusoidal rotation/zoom route over Asia. It records a Chrome trace, RAF intervals during continuous rendering, long tasks, 20 selection timings and heap measurements around 30 repeated layer/scale changes. Results apply to this 48-city development build on the M0 host, not the future full release.

## Initial measurements on the M0 device

Chrome 155.0.8059.84 reports ANGLE Metal on Apple M2. At 1440×900 CSS pixels and DPR 1.5:

| Measurement | Result |
| --- | ---: |
| 30-second route | 1,762 frame intervals over 30.016 seconds |
| Median / p95 frame interval | 16.7 / 16.8 ms (p95 target ≤20 ms) |
| Maximum frame interval | 583.3 ms; scheduling outlier, cause unclassified |
| Selection feedback, 20 clicks | p95 16.8 ms; maximum 51.8 ms (p95 target ≤100 ms) |
| Long Task API entries during route | 0 |
| Draw calls at route end | 5 (6 when the selection ring is visible) |
| JS heap after forced GC, before / after 30 toggle cycles | 15.32 / 15.52 MiB; +0.20 MiB |
| Renderer resource counts | 4 geometries, 2 textures reported during route |

The p95 budgets pass for this sample, but the maximum frame gap is retained as a limitation for subsequent profiling; a p95 result does not guarantee every frame is smooth. One short heap comparison is not proof of leak freedom. Full-dataset, release-build and broader browser measurements remain later gates. The final UI-only adjustments stop the introduction on all interface interactions and make short-view controls scrollable; they do not change the traced scene or explicit camera route.

`npm test` passes **43 tests**, including fixed scale math, actual radial transforms, selection invariance, occlusion/raycasting, deterministic particle count, source precision, existing source reconciliation and loader rejection of mismatched manifests. The Chrome script passes **12 groups** of interaction/resilience checks with no page or shader errors. The production build validates all 48 records and passes strict TypeScript checking.

## Review boundary and limitations

M0's sample and all source manifests remain byte-for-byte unchanged. The audited full eligible count of 12,138 is not shipped. Density has not been investigated or processed in this milestone.

Chrome automation is functional evidence, not creator visual approval or cross-browser release certification. Safari/Firefox/Edge, physical touch/pinch, cold-load throttling and complete GPU byte accounting remain unverified. RAF timing measures browser scheduling, not GPU timer queries. The production build retains Vite's advisory about a JavaScript chunk over 500 kB; compressed application transfer is much smaller and the warning is not suppressed.

**M2 gate closed for progression:** creator manual review and direction to proceed recorded October 18, 2026. M4 still requires inspection of actual raster metadata, resolution, no-data, seams and count conservation before processing.
