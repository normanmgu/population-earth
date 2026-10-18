# Population Earth — Technical Plan

Date: October 17, 2026  
Status: M0 completed October 17, 2026; audited sample and technical foundation available. M1 approved October 17, 2026; M2 accepted for progression October 18, 2026; M3 full-city implementation and baseline checks completed October 18, 2026. See [M3 review](m3-review.md). See [M2 review](m2-review.md), [M1 review](m1-review.md) and [M0 source audit](source-audit.md).  
Inputs: [product brief](product-brief.md) and [approved concept image](population-earth-concept.png). Both guide this plan: the brief governs data meaning and interaction; the image governs composition, materials, light, and visual hierarchy.

## 1. Recommended direction

Build a desktop-first, static browser application with TypeScript, React, Vite, and a Three.js WebGL2 renderer. Use a single globe canvas underneath a small HTML interface. Publish preprocessed, versioned data and textures as static assets; a database, application server, and live population API are unnecessary for this scope.

Deliver two separately identifiable population layers:

1. **City populations:** source-defined urban settlements represented by radial pillars. Height represents total population, with linear scaling by default.
2. **Population density:** a geographically registered raster surface, with a teal-to-yellow-to-orange palette representing people per square kilometre.

The brief initially defers density, but its approved-concept addendum makes that surface essential to the intended appearance. Resolve this through staged delivery: the first working prototype contains cities only; the later concept-complete release includes both layers. Do not call the city prototype a completed recreation of the image. Never synthesize a density map by blurring city points or painting decorative lights across land.

The reference is illustrative, so copy its visual language rather than its apparent city positions, rankings, or settlement patterns. Actual data wins whenever the reference conflicts with geography or population values.

## 2. Translate the image into implementation

| Reference feature | Implementation | Acceptance condition |
| --- | --- | --- |
| Large, near-black orbital Earth | Perspective camera, dark navy ocean, charcoal land, subtle terrain normal map | Coastlines remain recognizable without competing with population |
| Asia-facing opening composition | Start above the Indian Ocean/Asia region, with Africa and Australia visible; tune against the reference | Main population regions are visible; controls have breathing room |
| Thin blue atmospheric rim | Lightweight Fresnel atmosphere shell with restrained additive light | Clear silhouette without a thick neon outline |
| Teal, gold, and orange settlement surface | Independent density texture and fixed, labeled color scale | Rural and urban patterns come from a documented grid; legend has units and ticks |
| Slender orange pillars | Instanced radial geometry with emissive cores and bounded decorative particles | Correct anchors, readable heights, no unlabelled aggregation |
| Sparse dark city tags and fine leader lines | Project selected/priority city anchors into a capped HTML overlay | Tags avoid collisions and disappear when occluded by Earth |
| Minimal top-left controls | Wordmark, independent layer controls, height mode, legends, compact source access | Each metric is named; legends appear only for active layers |

Preserve the cinematic crop on wide displays where useful, but include a reset-to-whole-globe view. On narrow screens, fit the globe and move controls into a compact panel. Use subdued lighting across the visible hemisphere rather than a dramatic day/night terminator that obscures the data. Avoid clouds over settlement patterns.

Opening sequence: show the interface and coarse globe first, then reveal city pillars over approximately 0.8–1.2 seconds. Once density exists, fade it in independently when ready. A failed density request must not stop globe interaction. Gentle introductory rotation stops on first interaction; reduced-motion preference disables automatic rotation and growth animation.

## 3. Browser stack and application boundaries

| Area | Decision | Reason |
| --- | --- | --- |
| Language/build | TypeScript, Vite, npm lockfile | Typed data contracts and a straightforward static build |
| Interface | React plus CSS | Accessible controls, localized-script names, responsive details panel |
| Scene | Direct Three.js integration through one renderer controller | Explicit control of instancing, shaders, picking, and resource disposal |
| Graphics baseline | WebGL2 | Matches the current Three.js WebGL renderer; test capability at startup |
| Camera/input | OrbitControls with pan disabled, bounded zoom, pointer/touch support | Globe remains centered and cannot be entered by the camera |
| Data validation | JSON Schema with a build-time validator | Reject inconsistent exports before shipping |
| Preparation | TypeScript for city normalization; Python/GDAL for raster processing | Large geospatial processing happens outside the browser |
| Verification | Vitest for transforms/data math; Playwright for browser flows; manual GPU/browser profiling | Checks meaning, interaction, and visual performance separately |
| Distribution | Static HTTPS hosting/CDN | Reproducible assets, compression, immutable caching |

Vite supports a React/TypeScript starting template and static production output ([Vite guide](https://vite.dev/guide/)). Three.js currently requires WebGL2 for `WebGLRenderer` ([renderer documentation](https://threejs.org/docs/pages/WebGLRenderer)). These are proposed stack choices, not dependencies installed by this plan. Pin compatible stable package versions and a supported Node LTS version during setup.

Support the current and previous stable desktop Chrome, Edge, Firefox, and Safari at release, recording the exact versions tested. The creator's actual desktop is the primary performance acceptance device. Touch devices receive functional rotation, pinch, selection, and a lower visual-quality tier; mobile visual parity is outside the first release gate.

If WebGL2 initialization fails, show an explanation and an accessible searchable city list with source details. Handle context loss by displaying a recoverable state and rebuilding GPU resources. Keep the UI responsive while textures load.

React owns layer visibility, height mode, selection, quality preference, and source panels. The renderer owns the camera, GPU buffers, frame loop, picking, and projected label positions. Do not push per-frame camera or particle updates through React state. A small typed controller interface (`setLayers`, `setHeightMode`, `selectCity`, `resetView`, `dispose`) keeps the two systems independent.

Suggested structure:

```text
src/app/                  application state and accessible controls
src/globe/                renderer, camera, Earth materials, lifecycle
src/layers/               city pillars, particles, density surface
src/interaction/          picking, projected labels, keyboard selection
src/data/                 contracts, loader, dataset validation
scripts/data/             reproducible imports and raster preparation
data/source-manifests/    provenance, checksums, processing configuration
public/data/<version>/    city JSON, manifest, density overview and tiles
public/textures/          attributed Earth and terrain assets
tests/                    numeric, data, interaction, visual fixtures
docs/                     brief, concept, plan, source audit, measurements
```

## 4. Rendering and quantitative encoding

### Globe and geographic coordinates

Use a unit-radius sphere (`R = 1`) with WGS84 longitude/latitude anchors. A spherical globe is sufficient for this orbital visualization; terrain shading is decorative and does not change city positions. Agree on one coordinate convention and test texture alignment against it:

```text
phi = latitude in radians; lambda = longitude in radians
n = (cos(phi) * cos(lambda), sin(phi), -cos(phi) * sin(lambda))
base = R * n
tip = (R + height) * n
```

Orient each pillar's local up-axis to `n`, with geometry anchored at its base. Verify Greenwich, the poles, the antimeridian, and known cities before aesthetic tuning. Earth writes depth so geometry on its far side is hidden. Labels require explicit globe-occlusion checks because HTML does not participate in the depth buffer.

Start with a moderate-resolution sphere, a 2K base texture, and an optional subtle normal map. Add higher texture resolution only after profiling. Use one transparent atmosphere shell; avoid expensive volumetric clouds, physically simulated scattering, and real-time shadows in the initial architecture.

### Pillars and scale

Use shared low-sided pillar geometry in an `InstancedMesh`, initially one batch. Instancing reduces repeated draw calls ([Three.js documentation](https://threejs.org/docs/pages/InstancedMesh.html)). Give all pillars the same visual width within a quality/view configuration; width does not encode population or urban area. Keep bloom tight enough that nearby cities remain distinct.

Define `P_ref` as a fixed population ceiling derived from the audited release dataset, `H_ref` as its configured maximum display height, and `P0 = 50,000 people` as a documented log reference:

```text
Linear:      h(P) = H_ref * P / P_ref
Logarithmic: h(P) = H_ref * ln(1 + P/P0) / ln(1 + P_ref/P0)
```

Start visual calibration with `H_ref = 0.12R`; freeze the chosen value in the dataset/display configuration after visual review. Do not recalculate it for the visible hemisphere, zoom level, filtering, or selection. Never enforce a minimum pillar height or silently clamp tall cities: either would break linear ratios. If a new release exceeds `P_ref`, revise the release configuration explicitly. Use a small nonquantitative base marker and larger invisible hit target for otherwise hard-to-see cities.

Show “Height: linear — total city population” by default, with population reference marks in the legend. Log mode must say “Height: logarithmic” persistently. The values in the detail panel always remain untransformed. Perspective foreshortening affects apparent screen height; the geometry preserves ratios, and exact values remain available for comparisons.

Animation multiplies all target heights by the same time-dependent factor. Decoration uses deterministic point seeds, a global particle budget, and no claim that one point equals a fixed number of residents. Selected-city emphasis changes its outline/glow, not its height. Shader-driven animation must also be reflected in picking or use separate CPU-maintained picking proxies.

### Selection, labels, and density-region inspection

Use raycasting for the 30–100-city prototype. For the full dataset, maintain projected screen-space hit candidates, exclude globe-occluded candidates, and resolve clicks by screen distance and frontmost depth. Rebuild the candidate index when the camera changes; throttle hover work. If profiling shows this insufficient, introduce an ID picking pass only on pointer events.

Distinguish drag from click with a small movement threshold. In crowded regions, offer a compact nearby-city chooser and zoom-to-selection rather than moving pillars off their geographic anchors. Keep every eligible city in the underlying dataset; label suppression is not data aggregation.

Budget up to 12 simultaneous desktop labels and 5 on smaller screens. Prioritize selected, hovered, then prominent visible cities, using screen rectangles for collision rejection. Place leader lines from the true anchors to displaced tags. The selected-city panel remains available even if its geographic label is hidden.

Provide keyboard-accessible city search/list selection, reset view, layer switches, and height-mode controls. Use Unicode text, appropriate `lang`/direction metadata, and system font fallbacks for local names. No information should require hover alone.

## 5. Data definition, provenance, and formats

### Source decision and audit gate

The UN's 2025 revision includes more than 12,000 cities at the 50,000 threshold and introduces harmonized Degree of Urbanization definitions ([UN FAQ](https://population.un.org/wup/faqs)). This differs from older country-specific urban-agglomeration definitions ([UN summary, Box 2.2](https://population.un.org/wup/assets/Publications/undesa_pd_2025_wup2025_summary_of_results_final.pdf)).

Recommend the harmonized 2025 city series because it supports worldwide comparison, while exposing the publisher's exact definition in the interface. Do not relabel it as a metropolitan-area series or assume it is identical to the brief's informal “urban agglomeration” wording. Document this interpretation in the source audit before importing the full layer.

The [UN download center](https://population.un.org/wup/downloads) is verified, but this planning step has not inspected a downloadable city table. Milestone 0 must select the exact city file, sheet/columns, source identifiers, coordinate fields, population units, reference year, estimate/projection status, and coverage rule. Do not use country aggregates or splice in incompatible city-proper totals. Record exclusions and report the actual eligible record count.

Begin with 30–100 source-verified records spread across continents and population sizes. Display “Sample: N urban areas” continuously in the prototype. The full layer must say what threshold, year, and definition it covers; it cannot claim to map all people.

### City delivery contract

Ship UTF-8 JSON, compressed in transit, with a versioned JSON Schema. GeoJSON offers little benefit for this point-only renderer; store explicit longitude/latitude fields to avoid coordinate-order ambiguity. The following TypeScript describes the proposed wire contract, not actual imported data:

```ts
type CityRecord = {
  id: string;                     // source-qualified stable identifier
  sourceRecordId: string;
  nameEn: string;
  localNames: Array<{
    value: string;
    language: string;              // BCP 47, including script when known
    sourceId: string;
  }>;
  countryOrArea: { code: string; name: string; codeSystem: string };
  longitude: number;               // WGS84 degrees, -180..180
  latitude: number;                // WGS84 degrees, -90..90
  coordinateSourceId: string;
  coordinateMethod: string;        // publisher point, centroid, etc.
  population: number;              // people; preserve source precision
  referenceYear: number;
  valueStatus: 'estimate' | 'projection';
  definitionId: string;
  populationSourceId: string;
};

type CityDataset = {
  schemaVersion: string;
  datasetVersion: string;
  coverage: 'sample' | 'full';
  thresholdPeople: number;
  referenceYear: number;
  cities: CityRecord[];
};
```

A companion manifest resolves source and definition IDs to publisher, title, exact file/sheet/column, URL, retrieval date, license/attribution, checksum, units, and transformation notes. Use source IDs when stable; otherwise keep a persistent explicit crosswalk. Never derive IDs solely from translated city names. Missing reliable local names become an empty array; omit that secondary line in the UI.

Validate unique IDs, finite populations, geographic ranges, a single intended year/definition, source references, threshold eligibility, and unit conversion. Audit suspicious coordinates against land and settlement extents without automatically rejecting valid coastal sites. Keep supplemental coordinate/name joins reviewable, with ambiguous matches unresolved rather than guessed. Display the source's precision honestly if its totals were published in thousands.

### Density delivery contract

Evaluate **GHS-WUP-POP R2025A, 2025 epoch** as the first candidate. Its documentation describes values as people per cell and 2025 onward as projections; the advertised grids include equal-area and geographic options ([JRC dataset documentation](https://human-settlement.emergency.copernicus.eu/ghs_wup_pop_r2025a.php)). Its matching year does not prove that raster-derived settlement totals equal the selected UN city table. Label the layers independently and avoid claiming exact agreement.

Process the source raster offline. Preserve counts, valid-data masks, coordinate reference system, and cell areas. Compute density as count divided by cell area in square kilometres. For coarse overviews, aggregate counts and represented areas before division; do not average already colorized pixels. Treat missing data separately from zero population. Validate reprojection seams, coasts, and conservation of counts within a documented tolerance.

Use a globally fixed logarithmic density color transfer for the broad dynamic range, explicitly labeled in its legend. This is independent of the pillar height mode. Start proposed ticks at 0, 10, 100, 1,000, and 10,000 people/km², then calibrate against the audited grid. Any upper clipping must be labeled “10,000+” or its configured equivalent.

Publish a compact 2:1 global overview, followed by 256×256 geographic tiles selected by projected screen coverage. Store display textures as lossless, precolored PNG with transparency for no-data; record the transform and scale in `density-manifest.json`. These images are visualization assets, not a numeric query API. If numeric density inspection is added later, publish separate scalar tiles rather than reverse-reading colors.

The manifest must include source release/epoch, projection status, source and display resolution, tile bounds and axis convention, units, no-data treatment, palette/ticks, resampling method, checksums, attribution, and maximum zoom. Clamp zoom to the available resolution. Do not imply building-level accuracy. Retain original raster inputs and processing scripts outside the shipped browser bundle.

## 6. Performance strategy and acceptance budgets

These are proposed engineering targets, not measured results. M0 recorded a MacBook Air Mac14,2 with an M2 10-core GPU and 8 GB RAM, Chrome 155.0.8059.84, and Safari 26.2. Use this device as the initial target at 1440×900 CSS pixels, with device pixel ratio capped at 1.5. Installed browser versions are recorded; compatibility, WebGL2, and performance are not yet tested. See [hardware baseline](hardware-baseline.md).

| Metric | Initial acceptance target | Measurement |
| --- | --- | --- |
| Steady interaction | Aim for 60 fps; 95th-percentile frame interval ≤20 ms | 30-second rotation/zoom through dense Asia, after warm-up |
| Reduced-quality tier | 95th-percentile interval ≤33 ms | Same route with reduced particles, bloom, and resolution |
| Selection feedback | ≤100 ms at the 95th percentile | Pointer/tap to visible selected panel across repeated selections |
| First interactive city view | ≤4 seconds cold load | 20 Mbps down, 50 ms latency, baseline device |
| Initial transfer | ≤5 MB compressed including coarse globe and sample | Network capture, density/detail deferred |
| Full city JSON | Target ≤2 MB compressed | Build report; split optional metadata if needed |
| GPU resources | Estimated live textures/buffers/render targets ≤128 MiB | Explicit resource accounting; browser GPU metrics where exposed |
| JS heap | Target ≤150 MB after load | Available browser tooling; repeated toggles show no sustained growth |
| Draw calls | Target ≤50 including effects | Renderer statistics, full dataset |
| Main-thread work | No recurring task >50 ms during interaction | Browser performance trace |

Implementation order:

1. Batch pillars and particles; preallocate typed arrays and reuse scratch vectors. Start with a 50,000 decorative-point cap across the scene, then tune by profiling.
2. Upload population/position buffers once. Run growth and decorative movement in shaders. Update buffers only when data or scale configuration changes.
3. Load low-resolution geography first; lazy-load density and higher detail. Decode/prepare large payloads in workers where they otherwise block input.
4. Use bounded bloom render targets, capped pixel ratio, and limited transparent overdraw. Avoid a light or material per city.
5. Load only visible density tiles, cancel obsolete requests, cap concurrent fetches, and evict least-recently-used tiles within the GPU budget. Include texture mipmaps and postprocessing targets in memory estimates.
6. Limit DOM labels and hover frequency. Run full scene frames during motion/animation; stop continuous rendering when settled, and pause when the tab is hidden.
7. Adapt visual quality using sustained frame-time measurements and hysteresis: reduce particles, bloom resolution, pixel ratio, then texture detail. Never alter population values, height ratios, or merge cities to gain speed.

Avoid premature binary city formats or WebGPU migration. The first full-dataset profile determines whether JSON parsing, picking, or GPU fill rate is the real bottleneck. Dispose textures, geometry, materials, render targets, workers, and listeners on teardown or replacement.

## 7. Milestones and exit criteria

Estimates are focused engineering days for one implementer, with data access and review available. They are planning ranges, not delivery promises. Sequence: M0 → M1 → M2 → M3 → M4 → M5; raster investigation can begin after M0 without delaying the city prototype.

| Milestone | Work and reviewable deliverable | Exit gate | Estimate |
| --- | --- | --- | --- |
| **M0 — Data and technical foundation** | Source audit, representative city sample, asset/license manifest, dependency lockfile, hardware/browser baseline | Exact city definition/file/units verified; sample validates; density source candidate and processing risks documented | 2–3 days |
| **M1 — Orbital visual foundation** | Interactive restrained Earth, atmosphere, approved opening composition, minimal responsive controls | Geography aligns; drag/zoom works; screenshot compared with reference; reduced motion works | 2–3 days |
| **M2 — Honest city prototype** | 30–100 sourced pillars, particles, growth toggle, linear/log modes, selection, local names where verified | Ratios and radial orientation pass; sample disclosure visible; creator can inspect dense regions; initial performance trace captured | 3–4 days |
| **M3 — Full city layer** | Complete audited eligible dataset, bounded labels/picking, source details, keyboard/list access | Coverage reconciles with source; no silent losses; full-dataset interaction meets baseline budgets | 2–4 days |
| **M4 — Approved density appearance** | Validated density overview/tiles, separate legend and toggle, calibrated combined composition | Density units/resampling verified; no-data distinct; combined view preserves pillar readability and matches reference direction | 4–6 days |
| **M5 — Release candidate** | Cross-browser QA, graceful failures, production static build, attribution, benchmark and known-limitations report | Core flows pass supported browsers; performance targets measured; visual review closes; assets reproducibly rebuild | 2–3 days |

Estimated total: **15–23 focused engineering days**. M2 is the first meaningful interactive review; M3 satisfies the city-focused first-version scope; M4/M5 deliver the approved two-layer visual direction. If source semantics remain unresolved, continue globe work with a clearly identified sample, but do not declare the full data milestone complete.

## 8. Validation and completion

- **Quantitative:** prove that a 2:1 population pair produces 2:1 linear geometry; log scale is monotonic and uses fixed constants; toggles/zoom do not rescale heights. Validate population-unit conversion and source-year/status fields.
- **Geographic:** verify named points across hemispheres, poles and antimeridian; pillars follow surface normals; Earth occludes distant cities correctly; density textures do not mirror or wrap incorrectly.
- **Data:** reconcile counts and selected values with the publisher, test duplicate/missing identifiers, retain exclusion reports, and manually audit a diverse sample of supplemental name/coordinate joins.
- **Interaction:** test drag versus click, wheel/pinch, reset, overlapping cities, keyboard selection, persistent scale labeling, layer independence, and source details.
- **Visual:** capture reproducible screenshots with a fixed camera, viewport, quality tier, and random seed. Compare the opening and dense-region views with the supplied concept for hierarchy, globe material, atmosphere, palette, and restrained tags. Keep browser-specific tolerances for GPU differences.
- **Performance and resilience:** run the specified camera route on the full dataset, repeat layer/scale switches, simulate slow/missing assets and lost WebGL context, and check that resource use stabilizes.

The release is complete when it is compelling at first load, all encoded values retain documented meaning, both layers can be understood independently, the target desktop meets measured interaction budgets, and the production build includes provenance and attribution. A beautiful screenshot alone is not the acceptance test.

## 9. Key risks and next steps after M0

| Risk | Response |
| --- | --- |
| Approved image and first-version scope differ | Keep M2/M3 as city checkpoints and M4 as an explicit concept-completion gate |
| UN table differs from informal urban-agglomeration terminology | Audit and expose the exact harmonized definition before full import |
| Reference implies more precise settlement detail than the raster supports | Respect source resolution, limit zoom, and label modeled density |
| Strong glow obscures quantitative pillars | Separate layer controls, tight bloom, fixed-scale legends, selected-city values |
| Small linear pillars become hard to select | Nonquantitative markers/hit targets, city search, explicit log option |
| Full data overwhelms the GPU or label layout | Instancing, bounded decoration/labels, streamed density, measured quality tiers |
| Missing reliable local names | Omit gracefully and retain provenance; never invent translations |

**M0 is complete. M1 was approved October 17, 2026. M2 was accepted for progression October 18, 2026 following creator manual review. M3 now publishes all 12,138 audited eligible 2025 records.** The independent workbook comparison covers every published record and all 4,690 exclusions. M0's sample and source manifests are unchanged. Full-city search, selection, label bounds, rendering and baseline measurements are documented in [M3 review](m3-review.md). Density remains deferred to M4; M5 retains cross-browser and deployment certification.

Next steps:

1. **M2 handoff complete.** Historical screenshots, sample disclosure and trace remain in [M2 review](m2-review.md). No extended repeat of the creator's visual review was required.
2. **M3 implemented and verified.** See [full-city review and measurements](m3-review.md) for coverage reconciliation, provenance, exclusions, screenshots, Chrome checks and the full-dataset trace. Review its documented limitations before release.
3. **Then complete M4.** Before processing density, inspect the candidate raster's actual metadata, resolution, no-data values and CRS. Validate seams and count conservation before creating display tiles; matching years do not establish agreement with the city series.
4. **Complete M5 release review.** Run supported-browser and failure-path checks, measure release-build performance and cold load, record limitations and attribution, and reproduce the production assets.
5. **After the release milestones, scope a time-enabled population atlas as a separate feature decision.** Begin with a data feasibility study and a dated, uncertainty-aware prototype; do not treat the current 48-city sample as a historical sample or introduce time animation into M3/M4.

## 10. Future exploration — population through time

The creator has proposed an animated globe that explains how population centers have changed, potentially alongside selected historical periods and empires. This is a promising follow-on concept, separate from the current city-and-density milestones. Frame it as **population distribution through time**: a map can show where populations are estimated at different dates, but does not by itself identify individual migration flows, their causes, or the effects of a particular empire.

Start with a source comparison rather than animation code:

- For recent urban change, evaluate the UN [World Urbanization Prospects 2025 city series](https://population.un.org/wup/downloads?tab=Cities), which provides estimates from 1975 and projections through 2050. Separate observed/source-estimated years from projected years in the timeline and legend. Check whether its city identities, historical boundary/definition rules and per-city series are appropriate before pairing it with a later full-city release.
- For deep-time regional patterns, evaluate [HYDE 3.2](https://doi.org/10.17026/DANS-25G-GEZ3), an internally consistent reconstruction extending to 10,000 BCE. It supplies irregular historical snapshots: 1,000-year steps in 10,000 BCE–1 CE, 100-year steps in 1–1700 CE, 10-year steps in 1700–2000, and annual steps in 2000–2015. Preserve those source intervals; do not imply annual observations or smoothly measured movement between snapshots. Inspect its rasters, CRS, cell semantics, licenses and uncertainty before selecting a product. HYDE population grids are modeled spatial reconstructions, not ancient city censuses.
- Keep city totals, gridded regional populations, and political boundaries as distinct layers with independent definitions and citations. City coordinates are representative points, not historical settlement footprints. The current purposive 2025 sample has survivorship/selection bias for earlier eras and cannot stand in for the full historical city distribution.
- Treat “migration” as a stronger claim than a changing choropleth or growing/declining pillar. Showing net population change between regions requires compatible, dated flows or a clearly labeled inference. Historical movement causes require additional evidence.
- Treat empire or polity boundaries as an optional, separately sourced overlay. Select a specific region/period and vet a boundary dataset's temporal coverage, uncertainty, licensing and interpretation with historical expertise. A society database such as [Seshat](https://seshatdatabank.info/how-we-work) records uncertainty and expert disagreement, but should not be assumed to supply a complete global series of precise empire polygons.

Suggested first review question for that feature: **“Where did modeled population become more concentrated between selected historical snapshots, and how uncertain is that reconstruction?”** A separate approval should decide the geographic/time scope, reconstruction source, uncertainty display and whether boundary overlays add useful evidence before implementation begins.

M1 required no new population-source decision and is approved. Its asset alignment and first Chrome checks are recorded in [M1 review](m1-review.md); M0 hardware remains documented in [hardware-baseline.md](hardware-baseline.md), and M0 source choices and limits remain in [source-audit.md](source-audit.md).
