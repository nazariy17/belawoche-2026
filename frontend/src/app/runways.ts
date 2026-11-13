import type { FeatureCollection } from 'geojson';
import { type Point } from './geo';

export interface RunwayEnd { ident: string; point: Point; heading: number; displacedFt: number }
export interface Runway { ends: [RunwayEnd, RunwayEnd]; lengthFt: number }
let dataset: Promise<Record<string, Runway[]>> | undefined;
export function loadRunways(icao: string): Promise<Runway[]> {
  dataset ??= fetch('/data/runways.json').then(r => { if (!r.ok) throw Error('Runways unavailable'); return r.json(); }).catch(error => { dataset = undefined; throw error; });
  return dataset.then(data => data[icao] ?? []);
}
export function destination(point: Point, heading: number, km: number): Point {
  const rad = Math.PI / 180, angle = heading * rad, d = km / 6371, lat = point[1] * rad, lon = point[0] * rad;
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(angle));
  const nextLon = lon + Math.atan2(Math.sin(angle) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(nextLat));
  return [((nextLon / rad + 540) % 360) - 180, nextLat / rad];
}
export function runwayFeatures(runways: Runway[]): FeatureCollection {
  const data: FeatureCollection = { type: 'FeatureCollection', features: [] };
  for (const runway of runways) for (const end of runway.ends) {
    const threshold = destination(end.point, end.heading, end.displacedFt * 0.0003048);
    data.features.push({ type: 'Feature', properties: { kind: 'number', ident: end.ident, heading: end.heading }, geometry: { type: 'Point', coordinates: destination(threshold, end.heading, 0.12) } });
    data.features.push({ type: 'Feature', properties: { kind: 'approach', ident: end.ident }, geometry: { type: 'LineString', coordinates: [threshold, destination(threshold, end.heading + 180, 18.52)] } });
    for (const nm of [2, 4, 6, 8, 10]) {
      data.features.push({ type: 'Feature', properties: { kind: 'distance', ident: `${end.ident} · ${nm} NM` }, geometry: { type: 'Point', coordinates: destination(threshold, end.heading + 180, nm * 1.852) } });
    }
    // Illustrative lighting, not a surveyed airport lighting installation.
    for (let metres = 30; metres <= 900; metres += 30) {
      data.features.push({ type: 'Feature', properties: { kind: 'approach-light' }, geometry: { type: 'Point', coordinates: destination(threshold, end.heading + 180, metres / 1000) } });
    }
    const crossbar = destination(threshold, end.heading + 180, 0.3);
    for (let metres = -25; metres <= 25; metres += 5) {
      data.features.push({ type: 'Feature', properties: { kind: 'approach-light' }, geometry: { type: 'Point', coordinates: destination(crossbar, end.heading + 90, metres / 1000) } });
    }
    for (let metres = -22; metres <= 22; metres += 4) {
      data.features.push({ type: 'Feature', properties: { kind: 'threshold-light' }, geometry: { type: 'Point', coordinates: destination(threshold, end.heading + 90, metres / 1000) } });
      data.features.push({ type: 'Feature', properties: { kind: 'end-light' }, geometry: { type: 'Point', coordinates: destination(destination(end.point, end.heading + 180, 0.012), end.heading + 90, metres / 1000) } });
    }
  }
  return data;
}
export function windRunways(runways: Runway[], direction: unknown, speed: number | null, observedAt: number, now = Date.now()) {
  if (typeof direction !== 'number' || !Number.isFinite(direction) || direction < 0 || direction > 360 || speed === null || speed < 3 || now - observedAt > 7200000 || observedAt > now + 300000) return [];
  return runways.flatMap(r => r.ends).map(end => {
    const angle = (direction - end.heading) * Math.PI / 180;
    return { ident: end.ident, headwind: speed * Math.cos(angle), crosswind: Math.abs(speed * Math.sin(angle)) };
  }).filter(end => end.headwind > 0).sort((a, b) => b.headwind - a.headwind);
}
