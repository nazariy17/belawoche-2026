import type { FeatureCollection, Point as GeoPoint, Position } from 'geojson';
import type { Map } from 'maplibre-gl';
import { bearing, distanceKm, type Point } from './geo';
import { destination } from './runways';

export const lightLayers = ['global-runway-halo', 'global-runway-core', 'runway-halo', 'runway-core', 'taxiway-light', 'runway-lights', 'taxiway-points', 'approach-light-glow', 'approach-light-points'];

export async function addAirportLights(map: Map): Promise<void> {
  // Keep all lights in WebGL layers beneath aircraft, never per-light DOM nodes.
  const before = 'airport-labels';
  for (const global of [true, false]) {
    const prefix = global ? 'global-' : '';
    const source = global ? 'detail' : 'airport';
    const common = global ? { 'source-layer': 'aeroway' } : {};
    for (const halo of [true, false]) map.addLayer({
      id: `${prefix}runway-${halo ? 'halo' : 'core'}`, type: 'line', source, ...common,
      minzoom: 10,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', global ? 'class' : 'aeroway'], 'runway']],
      paint: { 'line-color': '#ffe9b0', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, halo ? 5 : 0.5, 16, halo ? 16 : 1.5], 'line-opacity': halo ? 0.18 : 0.85, 'line-blur': halo ? 6 : 0 },
    }, before);
  }
  map.addLayer({ id: 'taxiway-light', type: 'line', source: 'airport', minzoom: 13,
    filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'aeroway'], 'taxiway']],
    paint: { 'line-color': '#47a68a', 'line-width': 0.5, 'line-opacity': 0.35 } }, before);
  const response = await fetch('/data/zurich-airport.geojson');
  if (!response.ok) throw Error('Airport geometry unavailable');
  const airport: FeatureCollection = await response.json();
  const lights: FeatureCollection<GeoPoint> = { type: 'FeatureCollection', features: [] };
  const seen = new Set<string>();
  function sample(points: Position[]) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as Point, b = points[i] as Point;
      const count = Math.ceil(distanceKm(a, b) / 0.06);
      for (let j = 0; j < count; j++) {
        const t = j / count;
        const p: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const key = p.map(n => n.toFixed(5)).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        lights.features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } });
      }
    }
  }
  for (const feature of airport.features) {
    if (feature.properties?.['aeroway'] !== 'runway') continue;
    if (feature.geometry.type === 'Polygon') sample(feature.geometry.coordinates[0]);
    if (feature.geometry.type === 'MultiPolygon') feature.geometry.coordinates.forEach(p => sample(p[0]));
  }
  if (!map.getLayer(before)) return; // component disposed during loading
  map.addSource('lights', { type: 'geojson', data: lights });
  map.addLayer({ id: 'runway-lights', type: 'circle', source: 'lights', minzoom: 14,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 17, 2], 'circle-color': '#fff1c9', 'circle-blur': 0.25, 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, 0.95] } }, before);
  const taxiLights: FeatureCollection<GeoPoint> = { type: 'FeatureCollection', features: [] };
  for (const feature of airport.features) {
    if (feature.properties?.['aeroway'] !== 'taxiway' || feature.geometry.type !== 'LineString') continue;
    const points = feature.geometry.coordinates as Point[];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], count = Math.ceil(distanceKm(a, b) / 0.03), heading = bearing(a, b);
      for (let j = 0; j < count; j++) {
        const p: Point = [a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count];
        for (const offset of [-0.01, 0, 0.01]) taxiLights.features.push({ type: 'Feature', properties: { color: offset ? '#409cff' : '#4df5ad' }, geometry: { type: 'Point', coordinates: destination(p, heading + 90, offset) } });
      }
    }
  }
  map.addSource('taxi-lights', { type: 'geojson', data: taxiLights });
  map.addLayer({ id: 'taxiway-points', type: 'circle', source: 'taxi-lights', minzoom: 12, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 17, 1.5], 'circle-color': ['get', 'color'], 'circle-blur': 0.25 } }, before);
}

export function setLights(map: Map, enabled: boolean) {
  for (const id of lightLayers) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
}
