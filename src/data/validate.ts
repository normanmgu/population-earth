import Ajv from 'ajv';
import schema from './city-dataset.schema.json';
import type { CityDataset, SourceManifest } from './contracts';

const checkSchema = new Ajv({ allErrors: true, strict: true }).compile(schema);
export function validateDataset(value: unknown, manifest: SourceManifest): asserts value is CityDataset {
  if (!checkSchema(value)) throw new Error('Schema: ' + JSON.stringify(checkSchema.errors));
  const data = value as CityDataset;
  const ids = new Set<string>();
  const sourceIds = new Set(manifest.sources.map(s => s.id));
  const definitionIds = new Set(manifest.definitions.map(d => d.id));
  const definitions = new Set(data.cities.map(c => c.definitionId));
  if (definitions.size !== 1) throw new Error('Mixed definitions');
  if (data.coverage === 'sample' && (data.cities.length < 30 || data.cities.length > 100)) {
    throw new Error('Sample must contain 30–100 records');
  }
  for (const city of data.cities) {
    if (ids.has(city.id)) throw new Error('Duplicate ID: ' + city.id);
    ids.add(city.id);
    if (city.id !== 'un-wup2025:' + city.sourceRecordId) throw new Error('Source ID mismatch');
    if (city.referenceYear !== data.referenceYear) throw new Error('Mixed reference years');
    if (city.population < data.thresholdPeople) throw new Error('Below threshold: ' + city.id);
    if (!definitionIds.has(city.definitionId)) throw new Error('Unknown definition');
    for (const id of [city.populationSourceId, city.coordinateSourceId, ...city.localNames.map(n => n.sourceId)]) {
      if (!sourceIds.has(id)) throw new Error('Unknown source: ' + id);
    }
  }
}
