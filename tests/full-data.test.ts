import { describe, expect, it, vi, afterEach } from 'vitest';
import provenance from '../public/data/m3-2025-v1/provenance.json';
import { loadCities } from '../src/data/loader';
import full from '../public/data/m3-2025-v1/cities.json';
import manifest from '../public/data/m3-2025-v1/manifest.json';
import sample from '../public/data/m0-2025-v1/cities.json';
import exclusions from '../public/data/m3-2025-v1/exclusions.json';
import { createCityLayer } from '../src/layers/cities';
import { PerspectiveCamera, Points } from 'three';
afterEach(() => vi.unstubAllGlobals());
describe('M3 complete audited release', () => {
  it('contains every eligible source row exactly once and preserves the frozen sample', () => {
    expect(full.cities).toHaveLength(12138);
    const origins = provenance as Record<string, { row: number }>;
    expect(new Set(full.cities.map(c => c.id))).toEqual(new Set(Object.keys(origins)));
    const rows = [...Object.values(origins).map(p => p.row), ...exclusions.map(e => e.row)];
    expect(rows).toHaveLength(16828);
    expect(new Set(rows)).toEqual(new Set(Array.from({ length: 16828 }, (_, i) => i + 2)));
    const excludedIds = new Set(exclusions.map(e => e.sourceRecordId));
    expect(full.cities.some(c => excludedIds.has(c.sourceRecordId))).toBe(false);
    for (const city of sample.cities) expect(full.cities.find(c => c.id === city.id)).toEqual(city);
  });
  it('rejects an incomplete full release at the loader boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/cities.json') ? { ...full, cities: full.cities.slice(1) } : manifest })));
    await expect(loadCities(new AbortController().signal)).rejects.toThrow('Unexpected city release');
  });
  it('loads full coverage with its matching manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/cities.json') ? full : manifest })));
    expect((await loadCities(new AbortController().signal)).dataset.cities).toHaveLength(12138);
  });
  it('caps decoration without dropping pillars and can pick an unsampled city', () => {
    const layer = createCityLayer(full as any, manifest.display);
    try {
      expect(layer.heights).toHaveLength(12138);
      const particles = layer.group.children.find(c => c instanceof Points) as Points;
      expect(particles.geometry.attributes.position.count).toBeLessThanOrEqual(50000);
      const index = full.cities.findIndex(c => !sample.cities.some(s => s.id === c.id));
      const camera = new PerspectiveCamera(42, 1440 / 900, .1, 30);
      camera.position.copy(layer.normals[index]).multiplyScalar(2.25); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      expect(layer.pick(720, 450, 1440, 900, camera)).toContain(full.cities[index].id);
    } finally { layer.dispose(); }
  });
});
