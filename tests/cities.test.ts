import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, PerspectiveCamera, Points, Vector3 } from 'three';
import dataset from '../public/data/m0-2025-v1/cities.json';
import manifest from '../public/data/m0-2025-v1/manifest.json';
import type { CityDataset } from '../src/data/contracts';
import { formatPopulation, isClick, pillarMatrix, populationHeight, visibleAnchor } from '../src/layers/city-math';
import { geographicNormal } from '../src/globe/geography';
import { createCityLayer } from '../src/layers/cities';
import { overlaps } from '../src/interaction/labels';
const scale = manifest.display;

describe('fixed quantitative encoding', () => {
  it('preserves 2:1 linear ratios, zero and the full-release ceiling', () => {
    expect(populationHeight(20e6, 'linear', scale) / populationHeight(10e6, 'linear', scale)).toBe(2);
    expect(populationHeight(0, 'linear', scale)).toBe(0);
    expect(populationHeight(scale.populationReference, 'linear', scale)).toBe(.12);
    expect(populationHeight(50018, 'linear', scale)).toBeLessThan(.00015);
    expect(() => populationHeight(scale.populationReference + 1, 'linear', scale)).toThrow();
  });
  it('uses fixed logarithmic constants and remains strictly monotonic', () => {
    const populations = [0, 50018, 1e6, 10e6, scale.populationReference];
    const heights = populations.map(p => populationHeight(p, 'logarithmic', scale));
    expect(heights[0]).toBe(0); expect(heights.at(-1)).toBe(.12);
    heights.slice(1).forEach((h, i) => expect(h).toBeGreaterThan(heights[i]));
    expect(heights[1]).toBeCloseTo(.12 * Math.log1p(50018 / 50000) / Math.log1p(41913860 / 50000), 12);
  });
  it.each([[0, 0], [90, 0], [0, 90], [0, -90], [-180, 0], [180, 0], [106.8248, -6.3275], [-73.9327, 40.7379]])('anchors and orients actual geometry at %s°, %s°', (lon, lat) => {
    const matrix = pillarMatrix(lon, lat, .12);
    const normal = geographicNormal(lon, lat);
    const base = new Vector3(0, 0, 0).applyMatrix4(matrix);
    const tip = new Vector3(0, 1, 0).applyMatrix4(matrix);
    expect(base.distanceTo(normal)).toBeLessThan(1e-12);
    expect(tip.distanceTo(normal.clone().multiplyScalar(1.12))).toBeLessThan(1e-12);
  });
  it('changes selection without changing geometry and restores exact linear instance matrices', () => {
    const layer = createCityLayer(dataset as CityDataset, scale);
    const mesh = layer.group.children[0] as InstancedMesh;
    const original = [...mesh.instanceMatrix.array];
    layer.selectCity(dataset.cities[0].id);
    expect([...mesh.instanceMatrix.array]).toEqual(original);
    layer.setHeightMode('logarithmic');
    expect([...mesh.instanceMatrix.array]).not.toEqual(original);
    layer.setHeightMode('linear');
    expect([...mesh.instanceMatrix.array]).toEqual(original);
    const matrix = new Matrix4(); mesh.getMatrixAt(0, matrix);
    expect(new Vector3(0, 1, 0).applyMatrix4(matrix).length()).toBeCloseTo(1.12, 6);
    layer.dispose();
  });
  it('keeps particles bounded and deterministic', () => {
    const a = createCityLayer(dataset as CityDataset, scale), b = createCityLayer(dataset as CityDataset, scale);
    const points = (l: typeof a) => (l.group.children[2] as Points).geometry;
    expect(points(a).attributes.position.count).toBe(384);
    expect([...points(a).attributes.offset.array]).toEqual([...points(b).attributes.offset.array]);
    a.dispose(); b.dispose();
  });
});
describe('selection and truthful presentation', () => {
  it('rejects far-side and horizon anchors', () => {
    const camera = new Vector3(3, 0, 0);
    expect(visibleAnchor(new Vector3(1, 0, 0), camera)).toBe(true);
    expect(visibleAnchor(new Vector3(-1, 0, 0), camera)).toBe(false);
    expect(visibleAnchor(new Vector3(0, 1, 0), camera)).toBe(false);
  });
  it('raycasts only front-facing cities and respects hidden layers', () => {
    const data = structuredClone(dataset) as CityDataset;
    data.cities = [0, 1].map((_, i) => ({ ...data.cities[i], longitude: i * 180, latitude: 0 }));
    const layer = createCityLayer(data, scale);
    const camera = new PerspectiveCamera(42, 1, .1, 30);
    camera.position.set(3, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    expect(layer.pick(450, 450, 900, 900, camera)).toEqual([data.cities[0].id]);
    layer.growth.value = 0;
    expect(layer.pick(450, 450, 900, 900, camera)).toEqual([data.cities[0].id]);
    layer.group.visible = false;
    expect(layer.pick(450, 450, 900, 900, camera)).toEqual([]);
    layer.dispose();
  });
  it('distinguishes clicks from drags and rejects label collisions', () => {
    expect(isClick({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
    expect(isClick({ x: 0, y: 0 }, { x: 7, y: 0 })).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 50, h: 25 }, { x: 55, y: 0, w: 30, h: 20 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 50, h: 25 }, { x: 70, y: 0, w: 30, h: 20 })).toBe(false);
  });
  it('shows approximate source precision without transforming values', () => {
    expect(formatPopulation(41913860)).toBe('≈ 41,914,000');
    expect(formatPopulation(50018)).toBe('≈ 50,000');
  });
});
