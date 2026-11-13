import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, bearing, turn } from '../src/app/geo.ts';
import { interpolate, type Observation } from '../src/app/traffic.ts';

test('distance and bearing handle the date line', () => {
  assert.ok(Math.abs(distanceKm([179.9, 0], [-179.9, 0]) - 22.239) < 0.01);
  assert.equal(Math.round(bearing([0, 0], [1, 0])), 90);
});
test('headings cross north by the shortest turn', () => {
  assert.equal(turn(350, 10, 0.5), 0);
  assert.equal(turn(10, 350, 0.5), 0);
});
const a: Observation = { observedAt: 1000, lon: 8, lat: 47, altitudeFt: 5000, speedKt: 100, track: 350, heading: null };
const b = { ...a, observedAt: 11000, lon: 10, track: 10 };
test('interpolation preserves missing heading and stops at latest sample', () => {
  assert.equal(interpolate([a, b], 6000).lon, 9);
  assert.equal(interpolate([a, b], 6000).track, 0);
  assert.equal(interpolate([a, b], 6000).heading, null);
  assert.equal(interpolate([a, b], 50000).lon, 10);
  assert.equal(interpolate([a, b], 50000).stale, true);
});
test('long observation gaps freeze instead of inventing movement', () => {
  const result = interpolate([a, { ...b, observedAt: 100000 }], 50000);
  assert.equal(result.lon, a.lon);
  assert.equal(result.stale, true);
});
