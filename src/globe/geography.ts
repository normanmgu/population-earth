import { Vector3 } from 'three';
export const OPENING = { longitude: 85, latitude: 8, distance: 3.15 };
export function geographicNormal(longitude: number, latitude: number) {
  const phi = latitude * Math.PI / 180;
  const lambda = longitude * Math.PI / 180;
  return new Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda));
}
// Natural Earth is north-up, -180..180. SphereGeometry's default UVs match
// this convention: u=.5 at +X/Greenwich, u=.75 at -Z/90°E.
export function geographicUV(longitude: number, latitude: number) {
  return { u: (longitude + 180) / 360, v: (latitude + 90) / 180 };
}
