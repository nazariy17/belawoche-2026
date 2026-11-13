import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runwayFeatures, windRunways, type Runway } from '../src/app/runways.ts';
import { bearing, distanceKm } from '../src/app/geo.ts';
const data = JSON.parse(readFileSync(new URL('../public/data/runways.json', import.meta.url), 'utf8'));
test('Zurich and JFK have real runway-end identifiers', () => {
  assert.deepEqual(data.LSZH.flatMap((r: Runway) => r.ends.map(e => e.ident)).sort(), ['10', '14', '16', '28', '32', '34']);
  assert.ok(data.KJFK.some((r: Runway) => r.ends.some(e => e.ident === '04L')));
});
test('approach extensions point away from the threshold for ten nautical miles', () => {
  const runway: Runway = data.LSZH[0];
  const feature = runwayFeatures([runway]).features[1];
  assert.equal(feature.geometry.type, 'LineString');
  if (feature.geometry.type !== 'LineString') return;
  const [a, b] = feature.geometry.coordinates as [number, number][];
  assert.ok(Math.abs(distanceKm(a, b) - 18.52) < 0.01);
  assert.ok(Math.abs(bearing(a, b) - (runway.ends[0].heading + 180) % 360) < 0.1);
});
test('runway estimate uses true headings and rejects calm, variable and stale wind', () => {
  const now = Date.now();
  assert.equal(windRunways(data.LSZH, 278, 10, now)[0].ident, '28');
  for (const [direction, speed, time] of [['VRB', 10, now], [90, 0, now], [90, 10, now - 7200001]] as const) assert.deepEqual(windRunways(data.LSZH, direction, speed, time, now), []);
});
