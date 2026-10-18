import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateDataset } from '../src/data/validate';
import type { CityDataset } from '../src/data/contracts';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const original: CityDataset = read('public/data/m0-2025-v1/cities.json');
const manifest = read('data/source-manifests/cities.json');
describe('city delivery gate', () => {
  it('accepts the verified 48-city sample', () => {
    expect(original.cities).toHaveLength(48);
    expect(() => validateDataset(original, manifest)).not.toThrow();
  });
  it.each([
    ['duplicate ID', (d: CityDataset) => { d.cities[1] = d.cities[0]; }],
    ['missing source ID', (d: CityDataset) => { d.cities[0].sourceRecordId = ''; }],
    ['unknown source', (d: CityDataset) => { d.cities[0].coordinateSourceId = 'unverified'; }],
    ['wrong units', (d: CityDataset) => { d.cities[0].population /= 1000; }],
    ['non-finite population', (d: CityDataset) => { d.cities[0].population = Infinity; }],
    ['invalid latitude', (d: CityDataset) => { d.cities[0].latitude = 91; }],
    ['invalid longitude', (d: CityDataset) => { d.cities[0].longitude = -181; }],
    ['wrong year', (d: CityDataset) => { d.cities[0].referenceYear = 2030; }],
    ['wrong status', (d: CityDataset) => { d.cities[0].valueStatus = 'projection'; }],
    ['mixed definition', (d: CityDataset) => { d.cities[0].definitionId = 'metro-area'; }],
    ['below threshold', (d: CityDataset) => { d.cities[0].population = 49999; }],
  ] as const)('rejects %s', (_, mutate) => {
    const copy = structuredClone(original);
    mutate(copy);
    expect(() => validateDataset(copy, manifest)).toThrow();
  });
  it('matches independently inspected source cells across continents and scales', () => {
    const fixtures = [
      ['5590', 41913860, 106.824820671592, -6.32754415510498],
      ['4435', 25566102, 31.2607144569505, 30.0646095252452],
      ['2994', 9381921, 2.35557109932262, 48.8491114639848],
      ['8354', 13920148, -73.9326853899908, 40.7378578900136],
      ['7303', 18949790, -46.5998582137567, -23.5767447751221],
      ['2139', 4150917, 151.078965122611, -33.8589905191914],
      ['9137', 50018, 79.2048264129028, 28.5425372899306],
    ] as const;
    for (const [id, population, longitude, latitude] of fixtures) {
      const city = original.cities.find(c => c.sourceRecordId === id)!;
      expect(city.population).toBe(population);
      expect(city.longitude).toBeCloseTo(longitude, 10);
      expect(city.latitude).toBeCloseTo(latitude, 10);
    }
  });
  it('reconciles every source row and freezes the release ceiling', () => {
    const report = read('data/source-manifests/import-report.json');
    expect(report.sourceRows).toBe(16828);
    expect(report.eligible2025).toBe(12138);
    expect(report.excluded).toBe(4690);
    expect(report.sourceRows).toBe(report.eligible2025 + report.excluded);
    expect(report.fullReleasePopulationCeiling).toBe(41913860);
  });
});
