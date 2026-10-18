# Population Earth

M3 now displays all 12,138 audited eligible 2025 UN DEGURBA cities. M2 was accepted
for progression after the creator's manual review on October 18, 2026.
See [M3 review and measurements](docs/m3-review.md), [M2 historical review](docs/m2-review.md),
[M0 audit](docs/source-audit.md), and [baseline](docs/hardware-baseline.md).

Run `npm run dev` to explore the globe locally.

## Local checks

Use Node 22.12.0 (the tested runtime, pinned in .nvmrc) and npm 11.7.0.
The Node 22 line is Maintenance LTS. Refresh the patch version before release.

```sh
npm ci
npm run data:validate
npm test
npm run build
```

The globe includes fixed linear/logarithmic pillars, bounded particles and labels,
paginated city/country search, nearby-city selection and source details. The header
states the 50,000-person threshold; coverage, exclusions and row provenance are
linked in the source panel. M0 data is preserved under its original version.
Density remains M4 work.

For full-city Chrome screenshots and a trace, build the optimized benchmark and
serve it on port 5174 (the ordinary production build omits the QA hook):

```sh
npm run build -- --mode benchmark
npm run preview -- --host 127.0.0.1 --port 5174 --strictPort
# In another terminal, run sequentially:
node scripts/qa/m3-check.mjs
node scripts/qa/m3-performance.mjs
```

For a production cold-load check, run `npm run build`, then
`node scripts/qa/serve-compressed.mjs` and `node scripts/qa/m3-cold-load.mjs`.
The local server emulates gzip delivery on port 5175; it is not a deployment.

## Reproduce the data

Python 3.10+ with a working XML/Expat module is sufficient; no Python packages
are needed by the import pipeline. Raw inputs stay outside public/ and Git.

```sh
python3 scripts/data/fetch-source.py
npm run data:extract
npm run data:import:full
npm run data:validate
```

On this machine, Homebrew Python 3.14 has a broken Expat linkage. Use the tested
bundled Python by setting PYTHON for the extraction wrapper:

```sh
PYTHON=/Users/normangutierrez/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 npm run data:extract
```

Use that same executable directly for fetch-source.py if needed. Downloading
requires network access; builds and unit checks work with the versioned JSON artifacts. A checksum
change fails the import and requires a new source audit. The frozen sample is
selected by City_Code; no name matching or supplemental coordinate joins occur.

Source attribution and licensing live in data/source-manifests/ and accompany
the full release in public/data/m3-2025-v1/manifest.json. The M0 manifest is unchanged.

For an independent source check, run scripts/data/verify_full.py using Python
with openpyxl 3.1.5 (already present in the tested bundled runtime).
