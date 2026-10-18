import { Matrix4, Quaternion, Vector3 } from 'three';
import type { DisplayScale } from '../data/contracts';
import { geographicNormal } from '../globe/geography';

export type HeightMode = 'linear' | 'logarithmic';
export function populationHeight(population: number, mode: HeightMode, scale: DisplayScale) {
  if (!Number.isFinite(population) || population < 0 || population > scale.populationReference) throw new Error('Population outside the audited scale');
  return scale.heightReference * (mode === 'linear'
    ? population / scale.populationReference
    : Math.log1p(population / scale.logReferencePeople) / Math.log1p(scale.populationReference / scale.logReferencePeople));
}
// Geometry runs from local y=0 to y=1: its base is exactly on the unit sphere.
export function pillarMatrix(longitude: number, latitude: number, height: number, width = .0028) {
  const normal = geographicNormal(longitude, latitude);
  return new Matrix4().compose(normal, new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal), new Vector3(width, height, width));
}
export function visibleAnchor(normal: Vector3, cameraPosition: Vector3) {
  return normal.dot(cameraPosition) > 1.001;
}
export function isClick(start: { x: number; y: number }, end: { x: number; y: number }) {
  return Math.hypot(start.x - end.x, start.y - end.y) <= 6;
}
export function formatPopulation(population: number, precision = 1000) {
  return `≈ ${new Intl.NumberFormat('en-US').format(Math.round(population / precision) * precision)}`;
}
