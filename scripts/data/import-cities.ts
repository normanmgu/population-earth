import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { CityDataset, CityRecord } from '../../src/data/contracts';
import { validateDataset } from '../../src/data/validate';

type Row = { row: number; cells: Record<string, string | null> };
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const write = (p: string, data: unknown) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
const source = read('data/source-manifests/cities.json');
const workbook = read('data/intermediate/workbook.json');
if (workbook.sha256 !== source.sources[0].sha256) throw new Error('Workbook checksum changed; audit required');
if (createHash('sha256').update(readFileSync('data/raw/WUP2025-F21-DEGURBA-Cities_Pop.xlsx')).digest('hex') !== workbook.sha256) throw new Error('Raw workbook checksum mismatch');
const rows: Row[] = workbook.sheets.Data;
for (const [column, expected] of Object.entries(source.sources[0].columns)) {
  if (rows[0].cells[column + '1'] !== expected) throw new Error('Unexpected header: ' + column);
}
const eligible: CityRecord[] = [];
const provenance: Record<string, unknown> = {};
const excluded: unknown[] = [];
for (const row of rows.slice(1)) {
  const cell = (column: string) => row.cells[column + row.row];
  const id = cell('G');
  if (!id || !/^\d+$/.test(id)) throw new Error('Missing/invalid City_Code at row ' + row.row);
  const raw = cell('BJ');
  if (raw == null || raw === '') {
    excluded.push({ sourceRecordId: id, row: row.row, reason: 'No published 2025 value' });
    continue;
  }
  const thousands = Number(raw);
  if (!Number.isFinite(thousands) || thousands < 0) throw new Error('Invalid population');
  // Excel serializes decimal thousand-person values as binary floats. Reject
  // unexpected precision; remove only sub-micro-person floating point noise.
  const people = thousands * 1000;
  if (Math.abs(people - Math.round(people)) > 0.00001) throw new Error('Unexpected source precision');
  const population = Math.round(people);
  if (population < 50000) {
    excluded.push({ sourceRecordId: id, row: row.row, reason: 'Below 50,000 in 2025' });
    continue;
  }
  for (const col of ['B', 'E', 'H', 'J', 'K']) {
    if (cell(col) == null || cell(col) === '') throw new Error('Missing ' + col + ' at row ' + row.row);
  }
  const city: CityRecord = {
    id: 'un-wup2025:' + id, sourceRecordId: id, nameEn: cell('H')!,
    localNames: [], countryOrArea: { code: cell('E')!, name: cell('B')!, codeSystem: 'ISO-3166-1-alpha-3' },
    longitude: Number(cell('J')), latitude: Number(cell('K')),
    coordinateSourceId: 'un-wup2025-f21', coordinateMethod: 'publisher population-weighted centroid',
    population, referenceYear: 2025, valueStatus: 'estimate',
    definitionId: 'un-wup2025-degurba-city', populationSourceId: 'un-wup2025-f21',
  };
  eligible.push(city);
  provenance[id] = { row: row.row, populationCell: 'BJ' + row.row, populationThousandsRaw: raw,
    longitudeCell: 'J' + row.row, latitudeCell: 'K' + row.row, sourceNote: cell('C') ?? null };
}
const base = { schemaVersion: '1.0.0', datasetVersion: 'm0-2025-v1', thresholdPeople: 50000, referenceYear: 2025 };
validateDataset({ ...base, coverage: 'full', cities: eligible }, source);
// M3 derives a new release without rewriting any M0 artifact.
if (process.argv.includes('--full')) {
  const dir = 'public/data/m3-2025-v1';
  mkdirSync(dir, { recursive: true });
  const frozen = read('public/data/m0-2025-v1/manifest.json');
  const data: CityDataset = { ...base, datasetVersion: 'm3-2025-v1', coverage: 'full', cities: eligible };
  if (eligible.length !== frozen.eligibleCount || rows.length - 1 !== eligible.length + excluded.length) throw new Error('Audited coverage changed');
  if (JSON.stringify(excluded) !== JSON.stringify(read('data/source-manifests/exclusions.json'))) throw new Error('M0 exclusions changed');
  for (const city of read('public/data/m0-2025-v1/cities.json').cities) {
    if (JSON.stringify(city) !== JSON.stringify(eligible.find(c => c.id === city.id))) throw new Error('M0 record changed');
  }
  validateDataset(data, source);
  write(dir + '/cities.json', data);
  write(dir + '/provenance.json', Object.fromEntries(eligible.map(c => [c.id, provenance[c.sourceRecordId]])));
  write(dir + '/exclusions.json', excluded);
  const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  write(dir + '/reconciliation.json', {
    sourceRows: rows.length - 1, eligible2025: eligible.length, publishedCount: eligible.length,
    excluded: excluded.length, missing2025: excluded.filter((e: any) => e.reason === 'No published 2025 value').length,
    belowThreshold: excluded.filter((e: any) => e.reason === 'Below 50,000 in 2025').length,
    countriesOrAreas: new Set(eligible.map(c => c.countryOrArea.code)).size,
    populationSum: eligible.reduce((sum, c) => sum + c.population, 0),
    minimumPeople: Math.min(...eligible.map(c => c.population)), maximumPeople: Math.max(...eligible.map(c => c.population)),
    sourceSha256: workbook.sha256, sampleRecordsUnchanged: true,
  });
  write(dir + '/manifest.json', { ...frozen, datasetVersion: data.datasetVersion, coverage: 'full',
    disclosure: '12,138 cities · 50,000+ people', publishedCount: eligible.length,
    basis: 'UN WUP 2025 F21, DEGURBA cities with a published mid-year 2025 value of at least 50,000 people; not all people or settlements.',
    display: { ...frozen.display, heightReferenceStatus: 'M2 reviewed by creator October 18, 2026' },
    artifacts: Object.fromEntries(['cities.json', 'provenance.json', 'exclusions.json', 'reconciliation.json'].map(file => [file, { sha256: sha256(dir + '/' + file) }])) });
  console.log('Published ' + eligible.length + ' eligible cities; preserved ' + excluded.length + ' exclusions and all M0 artifacts');
  process.exit(0);
}
// Explicit source identifiers make sample membership stable across source ordering.
const selection: { ids: string[] } = read('data/source-manifests/sample-selection.json');
const cities = selection.ids.map(id => {
  const city = eligible.find(c => c.sourceRecordId === id);
  if (!city) throw new Error('Selected city not eligible: ' + id);
  return city;
});
const data: CityDataset = { ...base, coverage: 'sample', cities };
validateDataset(data, source);
write('public/data/m0-2025-v1/cities.json', data);
write('data/source-manifests/sample-provenance.json', Object.fromEntries(cities.map(c => [c.id, provenance[c.sourceRecordId]])));
write('data/source-manifests/exclusions.json', excluded);
write('data/source-manifests/import-report.json', {
  sourceRows: rows.length - 1, eligible2025: eligible.length, excluded: excluded.length,
  missing2025: excluded.filter((e: any) => e.reason === 'No published 2025 value').length,
  sampleCount: cities.length, minimumPeople: Math.min(...cities.map(c => c.population)),
  maximumPeople: Math.max(...cities.map(c => c.population)),
  countries: new Set(cities.map(c => c.countryOrArea.code)).size,
  sampleSha256: createHash('sha256').update(readFileSync('public/data/m0-2025-v1/cities.json')).digest('hex'),
  fullReleasePopulationCeiling: Math.max(...eligible.map(c => c.population)),
});
write('public/data/m0-2025-v1/manifest.json', { ...source, disclosure: 'Sample: ' + cities.length + ' urban areas',
  coverage: 'sample', datasetVersion: base.datasetVersion, eligibleCount: eligible.length,
  display: { populationReference: Math.max(...eligible.map(c => c.population)), heightReference: 0.12,
    heightReferenceStatus: 'provisional; visual calibration in M2', logReferencePeople: 50000 } });
console.log('Imported ' + cities.length + ' sample records from ' + eligible.length + ' eligible records');
