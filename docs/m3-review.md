# M3 — full city layer

Completed October 18, 2026 (America/Chicago). The creator's manual M2 review and instruction to focus on M3 were accepted as authorization to proceed. The M2 handoff was brief: existing implementation, review evidence, opening screenshot and baseline measurements were inspected; its extended visual review was not repeated. M0's 48-city sample, public manifest and source manifests remain unchanged.

M3 now loads `m3-2025-v1` by default. The persistent header reads **“12,138 cities · 50,000+ people”**, with 2025 estimate status and DEGURBA coverage. Search, details and sources remain available without WebGL2. This is the full eligible city release, not a map of every settlement or all people. Density remains M4 work.

## Coverage and provenance

| Reconciliation | Count |
| --- | ---: |
| Original UN F21 source rows | 16,828 |
| Eligible / published 2025 records | 12,138 / 12,138 |
| Excluded: no published 2025 value | 4,690 |
| Excluded: nonmissing value below 50,000 | 0 |
| Countries or areas represented | 191 |
| Minimum / maximum population | 50,016 / 41,913,860 |
| Sum of included city populations | 3,685,888,174 |

The sum describes the included source-defined cities, not total world population. Empty source values are never converted to zero. No rows were silently dropped, merged or geographically moved. The population precision, estimate status, source names, centroids and definition are inherited from the M0 audit. Local-script names remain unavailable; no translations were invented.

The full importer verifies the raw XLSX checksum, expected extracted headers, M0 eligible count, exact exclusion list and equality of every M0 sample record before writing a separate release. It leaves the M0 files untouched. Population and coordinate provenance is retained for every city. The companion manifest provides SHA-256 checksums for each full-release artifact; the build validates these checksums.

An **independent openpyxl reader** compared all 12,138 published IDs, names, countries, coordinates, population conversions and row/cell references directly against the original workbook, and checked all 4,690 exclusions and reasons. [Independent verification](m3/independent-verification.json) passed. The original workbook SHA-256 remains `3a96030d87aec6c1c50f658d5321067d6345e1ab936c5d2854524f972caa75c0`.

Public, downloadable evidence:

- [Full dataset](../public/data/m3-2025-v1/cities.json) and [manifest](../public/data/m3-2025-v1/manifest.json).
- [Coverage reconciliation](../public/data/m3-2025-v1/reconciliation.json), [every exclusion](../public/data/m3-2025-v1/exclusions.json), and [every row's provenance](../public/data/m3-2025-v1/provenance.json).

Coordinate validation proves fidelity to the publisher and finite, in-range coordinates; it does not independently certify settlement footprints or a geodetic datum. The opening and focused screenshots were checked for broad geographic alignment. Coastal and island centroids are preserved even when a coarse decorative basemap makes a point appear offshore. Detailed land-polygon/settlement-extent verification remains a documented geographic limitation; no unverified coordinate correction or supplemental join was introduced.

## Full-dataset behavior

- Every eligible city has an instanced pillar and marker. Linear and logarithmic heights retain the same fixed population ceiling, height ceiling and log reference as M2. There is no minimum height, population-dependent width, normalization by viewport, clustering or aggregation.
- Full-release pillar radius and base-marker radius are uniformly 0.0012R. M2's 0.0028R pillar radius and 0.0045R markers were too prominent with 12,138 records. Only these nonquantitative widths changed; height and anchor semantics are unchanged. The unchanged sample path retains its original widths.
- Decoration uses four deterministic particles per city, **48,552 total**, below the 50,000 cap. Particles are not residents or a density raster. Layer, growth and reduced-motion controls remain independent.
- Labels use **12 reusable buttons and 12 leaders**, at most 12 visible on desktop and 5 on narrow screens. Population priority is sorted once. Each update considers at most 128 front-facing candidates for placement, with selected/hovered cities first, text-bound collision checks and globe occlusion. A selected city can always be inspected in its panel even if its label cannot fit.
- Picking retains every city, the common animated growth factor and a 12-CSS-pixel tolerance. It scans the fixed dataset on clicks and throttled hover events (at most once per 80 ms); measured CPU cost did not justify a spatial index. Dense overlaps open a chooser rather than silently choosing or moving a city.
- Search indexes city/country names once, supports accent-insensitive matching, and exposes every match through **50-result pages**. Previous/next controls work by keyboard. No 12,138-row DOM list is created. No worker or binary format was needed at measured costs.

## Evidence and baseline measurements

Installed Chrome **155.0.8059.84**, ANGLE Metal / Apple M2, M0 MacBook Air with 8 GB RAM. Desktop screenshots use 1440×900 CSS pixels, DPR 1.5; narrow screenshots use 390×844. The camera and particle seed remain reproducible. Screenshots use reduced motion; the functional script separately verifies animated growth and live reduced-motion changes.

- [Opening](m3/opening-chrome.png), [logarithmic](m3/logarithmic-chrome.png), [selection](m3/selection-chrome.png), [source details](m3/source-chrome.png).
- [Dense-region focus](m3/dense-region-chrome.png), [overlap selection](m3/nearby-selection-chrome.png), [narrow opening](m3/mobile-chrome.png), [narrow selection](m3/mobile-selection-chrome.png), [WebGL2 fallback](m3/fallback-chrome.png).
- [Chrome functional report](m3/chrome-check.json): **13 groups passed**, no page/shader errors. Includes full count, pagination and accent search, fixed heights, source details, keyboard navigation, layer independence, overlap picking, drag suppression, label bounds/occlusion, narrow layout, context recovery, failed-data/texture retry, WebGL2 fallback and growth behavior.
- [Performance report](m3/performance.json) and [Chrome trace (gzip JSON)](m3/interaction-trace.json.gz). Decompress and load into Chrome DevTools Performance.
- [Production cold-load and transfer report](m3/cold-load.json).

The final interaction run uses an optimized Vite **benchmark** build, with a QA control hook enabled explicitly. It warms 120 frames, then runs the specified 30-second sinusoidal Asia rotation/zoom route with all city effects enabled. Routine production omits the hook; the cold-load test confirmed its absence. The benchmark route avoids constructing full city snapshots on every frame.

| Metric | Final measurement | Target |
| --- | ---: | ---: |
| Median / p95 frame interval | 16.7 / 16.7 ms | p95 ≤20 ms |
| Maximum frame interval | 33.3 ms | Report outliers |
| Long tasks during route | 0 | No recurring tasks >50 ms |
| Selection feedback, 20 list clicks | p95 17.7 ms; max 39.8 ms | p95 ≤100 ms |
| Search feedback, 20 queries | p95 27.8 ms | Report |
| Picking CPU, 100 dense-view probes | p95 1.1 ms; max 4.7 ms | Report |
| Draw calls | 5; 6 with selection ring | ≤50 |
| Heap after load / after 30 toggle cycles | 10.99 / 13.26 MiB | ≤150 MB |
| Heap delta across toggle cycles, forced GC | +0.086 MiB | No sustained growth |
| Application buffers + texture/mipmap estimate | 13.85 MiB | ≤128 MiB target; see limitation |
| Full city JSON gzip | 509,219 bytes | ≤2 MB |
| Initial production transfer, including full city JSON | 1,629,080 bytes | ≤5 MB |
| Three cold-load readiness runs | 0.920 / 0.921 / 0.971 seconds | ≤4 seconds |

Selection timing is list click dispatch to the next frame after details enter the DOM. Search timing is input dispatch to two animation frames, including the React update. Picking is measured separately as CPU execution, and browser checks verify canvas selection and overlap handling. RAF intervals measure browser scheduling rather than GPU timer queries.

Cold-load runs used three fresh contexts, disabled cache, 20 Mbps download and 50 ms latency, and a local HTTP gzip server serving the ordinary production build. Readiness requires a loaded Earth, loaded cities and visible city labels; subsequent search/selection is also verified. These are local controlled results, not CDN or internet measurements. **Production hosting must enable gzip or Brotli for JSON/JS/CSS**: the city JSON is 7.62 MB uncompressed.

## Reproduction and remaining scope

```sh
npm run data:import:full  # requires the original extracted workbook; preserves M0
npm test
npm run build -- --mode benchmark
npm run preview -- --host 127.0.0.1 --port 5174 --strictPort
# In another terminal, run sequentially to avoid competing browser workloads:
node scripts/qa/m3-check.mjs
node scripts/qa/m3-performance.mjs
```

Run `scripts/data/verify_full.py` with openpyxl 3.1.5 and the original XLSX for independent reconciliation. The known working Python path is documented in the README. Ordinary builds and unit tests require only the versioned JSON artifacts, not the raw workbook.

For production cold load, run `npm run build`, start `node scripts/qa/serve-compressed.mjs` (port 5175), then run `node scripts/qa/m3-cold-load.mjs`. Final production build and strict typechecking passed; **47 unit tests passed**. Vite's >500 kB JavaScript chunk advisory remains visible, with approximately 254 kB gzip reported by the build.

M3's coverage and primary-device interaction gates are met. This is not M5 release certification or creator approval of the new full-layer appearance. Safari/Firefox/Edge and physical touch testing remain M5 work. The GPU estimate accounts for unique application buffers and the Earth texture with mipmaps, but excludes driver copies, internal textures and the default multisampled framebuffer; total GPU residency is not certified. One short heap comparison does not prove leak freedom. Detailed coastal/settlement validation remains open as described above. The earlier M2 scheduling outlier is retained in its historical report; this final run's maximum is 33.3 ms and does not guarantee every future frame will be smooth.

**Next planned milestone: M4**, beginning with actual density-raster metadata/CRS/no-data inspection and conservation checks. No raster processing or time animation was added to M3.
