import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateDataset } from '../../src/data/validate';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
for (const version of ['m0-2025-v1', 'm3-2025-v1']) {
  const dir = 'public/data/' + version + '/';
  const data = read(dir + 'cities.json'), manifest = read(dir + 'manifest.json');
  validateDataset(data, manifest);
  if (data.datasetVersion !== manifest.datasetVersion) throw new Error('Version mismatch');
  if (data.coverage === 'full' && (data.cities.length !== manifest.eligibleCount || data.cities.length !== manifest.publishedCount)) throw new Error('Coverage mismatch');
  for (const [file, artifact] of Object.entries(manifest.artifacts ?? {})) {
    if (createHash('sha256').update(readFileSync(dir + file)).digest('hex') !== (artifact as { sha256: string }).sha256) throw new Error('Checksum mismatch: ' + file);
  }
  console.log('Validated ' + data.cities.length + ' ' + data.coverage + ' cities');
}
