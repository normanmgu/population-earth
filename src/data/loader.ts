import type { CityDataset, CityManifest } from './contracts';
import { validateDataset } from './validate';

export async function loadCities(signal: AbortSignal, release: 'm0-2025-v1' | 'm3-2025-v1' = 'm3-2025-v1'): Promise<{ dataset: CityDataset; manifest: CityManifest }> {
  const base = `${import.meta.env.BASE_URL}data/${release}/`;
  const [dataset, manifest] = await Promise.all(['cities.json', 'manifest.json'].map(async file => {
    const response = await fetch(base + file, { signal });
    if (!response.ok) throw new Error(`Unable to load ${file}`);
    return response.json();
  }));
  validateDataset(dataset, manifest);
  const sample = release === 'm0-2025-v1';
  if (dataset.datasetVersion !== release || manifest.datasetVersion !== release || manifest.coverage !== dataset.coverage || dataset.coverage !== (sample ? 'sample' : 'full') || dataset.cities.length !== (sample ? 48 : 12138) || manifest.disclosure !== (sample ? 'Sample: 48 urban areas' : '12,138 cities · 50,000+ people') || (!sample && (manifest.publishedCount !== dataset.cities.length || manifest.eligibleCount !== dataset.cities.length))) {
    throw new Error('Unexpected city release');
  }
  const { populationReference, heightReference, logReferencePeople } = manifest.display;
  if (![populationReference, heightReference, logReferencePeople].every(n => Number.isFinite(n) && n > 0) || dataset.cities.some(c => c.population > populationReference)) {
    throw new Error('Invalid display scale');
  }
  return { dataset, manifest };
}

export const loadSample = (signal: AbortSignal) => loadCities(signal, 'm0-2025-v1');
