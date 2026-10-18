import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSample } from '../src/data/loader';
import dataset from '../public/data/m0-2025-v1/cities.json';
import manifest from '../public/data/m0-2025-v1/manifest.json';
const mock = (data: unknown, source: unknown) => vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/cities.json') ? data : source })));
afterEach(() => vi.unstubAllGlobals());
describe('sample loader boundary', () => {
  it('loads the frozen sample and its matching display configuration', async () => {
    mock(dataset, manifest);
    expect((await loadSample(new AbortController().signal)).dataset.cities).toHaveLength(48);
  });
  it.each(['version', 'disclosure', 'ceiling', 'invalid scale'])('rejects an inconsistent %s before rendering', async kind => {
    const changed = structuredClone(manifest);
    if (kind === 'version') changed.datasetVersion = 'wrong';
    if (kind === 'disclosure') changed.disclosure = 'All cities';
    if (kind === 'ceiling') changed.display.populationReference = 1e6;
    if (kind === 'invalid scale') changed.display.heightReference = -1;
    mock(dataset, changed);
    await expect(loadSample(new AbortController().signal)).rejects.toThrow();
  });
  it('rejects failed requests rather than publishing an empty layer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    await expect(loadSample(new AbortController().signal)).rejects.toThrow('Unable to load');
  });
});
