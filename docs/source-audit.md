# M0 — data and technical foundation

Audit date: October 17, 2026 (America/Chicago).

**M0 exit criteria met. M1 has not started.** The exact city table, definition and
units are verified, the 48-city sample validates and independently matches the
source, and the density candidate and processing risks are documented.

## City source decision

Use UN DESA Population Division, World Urbanization Prospects 2025, **F21**,
POP/DB/WUP/Rev.2025/F21. The [UN download center](https://population.un.org/wup/downloads)
Cities tab links the audited
[workbook](https://population.un.org/wup/assets/Download/Cities/WUP2025-F21-DEGURBA-Cities_Pop.xlsx).
The original file remains in data/raw/ locally and is reproducibly downloadable
with scripts/data/fetch-source.py. Its SHA-256 is
3a96030d87aec6c1c50f658d5321067d6345e1ab936c5d2854524f972caa75c0.

Use harmonized **DEGURBA cities**. Workbook info!A17:A20 defines dense urban
settlements through population size, density and contiguity on 1 km² grids:
at least 50,000 inhabitants and high-density areas of at least 1,500 people/km².
This implements the plan's explicit interpretation of the brief. Do not label
these nationally defined metropolitan areas, city-proper populations, or the
older WUP urban-agglomeration series.

| Contract field | Exact source |
| --- | --- |
| Source ID | Data!G, City_Code; source-qualified as un-wup2025:<code> |
| Display name | Data!H, City_Name; preserved verbatim, including romanization |
| Country/area | Data!B, Location; Data!E, ISO3_Code |
| Longitude / latitude | Data!J/K, PWCent_Longitude / PWCent_Latitude |
| Population | Data!BJ, header 2025; thousands of people at mid-year |
| Definition | info!A17:A20 |
| Centroid method | info!A33:B34: population-weighted centroid, decimal degrees |
| License | info!D13: CC BY 3.0 IGO |

The [UN FAQ](https://population.un.org/wup/faqs) describes 1950–2025 as estimates,
so the city sample uses valueStatus=estimate. Never infer status from the raster.
IDs are unique in the audited eligible release; continuity across later releases
must be checked rather than assumed.

Multiply stored thousands by 1,000. Excel's stored binary float can introduce
tiny residuals; the importer verifies those are below 0.00001 person before
rounding to integer people. Stored values have up to three decimals in thousands,
but inspected population cells use Excel's whole-thousands display format.
Retain the numeric data and display approximately to the nearest 1,000 people.
Numerical precision is not statistical accuracy.

Use publisher centroid coordinates without modification. F21 names geographic
decimal degrees but does not explicitly state a datum: WGS84 is a documented
orbital-display interpretation, not an independently verified geodetic datum.
All eligible records have finite in-range coordinates. Spot inspection of
Jakarta, Cairo, Paris, New York, São Paulo and Sydney matches expected broad
locations and hemispheres. This is not a land-polygon or urban-extent test.
No supplemental joins or invented translations were used. localNames is empty
for every sample city; nameEn holds the source's display string.

## Reconciliation and verified sample

| Check | Result |
| --- | ---: |
| Source data rows | 16,828 |
| Eligible 2025 records at ≥50,000 | 12,138 |
| No published 2025 population | 4,690 |
| Nonmissing values below threshold | 0 |
| Eligible duplicate IDs / missing coordinates | 0 / 0 |
| Published sample | 48 |
| Countries represented | 21 |
| Inhabited continents represented | 6 |
| Sample minimum / maximum | 50,018 / 41,913,860 |

The sample takes two largest eligible cities in each of 21 chosen countries,
plus the smallest eligible city in six selected countries. This is a purposive
visualization sample, not a statistical sample or global population map.
Membership is frozen by source code in sample-selection.json.
Every excluded row and reason is retained in exclusions.json; blank 2025 cells
are not converted to zero or assumed to be a measured sub-threshold population.
Only the sample is shipped; full-layer publication remains M3.

Selected independent checks below show stored converted values, not suggested
UI precision. Full row and cell provenance accompanies all 48 records.

| City | Source code | Source cell | Thousands stored | People |
| --- | --- | --- | ---: | ---: |
| Jakarta | 5590 | BJ9580 | 41,913.860 | 41,913,860 |
| Al-Qahirah (Cairo) | 4435 | BJ5381 | 25,566.102 | 25,566,102 |
| Paris | 2994 | BJ6265 | 9,381.921 | 9,381,921 |
| New York City | 8354 | BJ16007 | 13,920.148 | 13,920,148 |
| São Paulo | 7303 | BJ1472 | 18,949.790 | 18,949,790 |
| Sydney | 2139 | BJ589 | 4,150.917 | 4,150,917 |

The import uses Python stdlib XML extraction and TypeScript normalization.
An independent openpyxl 3.1.5 pass compared every sample ID, name, country code,
coordinate and converted population with the XLSX. All 48 passed.
The result is recorded in independent-verification.json.

JSON Schema plus semantic validation checks mandatory fields, finite numeric
values, coordinate ranges, unique source-qualified IDs, the intended year,
estimate status, one definition, known source references and threshold.
Fourteen Vitest checks pass, including invalid-data rejection and independent
source fixtures. Production build and strict TypeScript checks pass.

## Density and assets

Keep **GHS-WUP-POP R2025A, 2025, Mollweide 1 km** as the first density candidate.
The [product metadata](https://human-settlement.emergency.copernicus.eu/ghs_wup_pop_r2025a.php)
specifies float counts per cell, no-data -200, and projection status for 2025.
It also contains a contradictory 100 m description. Actual TIFF metadata must
resolve resolution and CRS before processing. No raster was downloaded in M0.

Aggregate counts and valid represented areas before calculating density.
Keep no-data distinct from zero. Validate seams, coasts and count conservation,
with a proposed global relative tolerance of 0.1%, before M4 delivery.
Use bounded-memory GDAL processing on this 8 GB device. Matching years do not
establish agreement between layers.

The [JRC catalogue](https://data.jrc.ec.europa.eu/dataset/adba95af-db56-4569-acd3-9513201eba30)
allows reuse with source acknowledgement. Its citation year differs from the
product page; preserve the release identifier and DOI, then record archive
metadata at acquisition. The complete decision is in density-candidate.json.

Select Natural Earth II 1:50m shaded relief/water 3.2.0 as the M1 base candidate.
[Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/)
place the data in the public domain. Acquisition, checksum and 2K preparation
belong to M1. No texture or normal-map asset is shipped yet. The approved concept
is an internal design reference, never a data layer. assets.json records these
states; dependency-licenses.json inventories the locked packages.

## Technical foundation and remaining work

React, TypeScript, Vite, Three.js, Ajv, Vitest and Playwright are installed with
exact versions and an npm lockfile. Node 22.12.0 is the tested pinned runtime
on the supported Node 22 LTS line; update its patch before release.
The build contains only a minimal smoke entry, with no globe, scene,
orbital controls or M1 visual work. Hardware and installed browser versions
are recorded in hardware-baseline.md.

No unresolved issue blocks the stated M0 exit gate. Remaining limitations:

- Confirm datum metadata if higher geographic precision becomes necessary.
  Perform detailed coastal/settlement checks before declaring M3 full-layer QA complete.
- Verify WebGL2 and browser behavior in M1, then measure real scene performance.
- Obtain and checksum the selected base asset in M1; verify raster bytes and
  processing in M4. No raster conservation or texture-alignment result is claimed.
- Reliable local-script names remain unavailable from F21.
- The system Python has a broken Expat linkage; the documented bundled Python
  override successfully reproduces extraction without changing the system.

M1 is eligible to begin in a subsequent task; this M0 task stops here.
