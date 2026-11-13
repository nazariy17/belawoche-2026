import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { airportMatches, type Airport } from '../src/app/airports.ts';
const airports: Airport[] = JSON.parse(readFileSync(new URL('../public/data/airports.json', import.meta.url), 'utf8'));
test('airport coordinate order places Zurich and JFK in their actual countries', () => {
  const zrh = airportMatches(airports, 'ZRH')[0];
  assert.equal(zrh.icao, 'LSZH');
  assert.ok(Math.abs(zrh.lat - 47.458) < 0.01 && Math.abs(zrh.lon - 8.55) < 0.01);
  const jfk = airportMatches(airports, 'KJFK')[0];
  assert.ok(jfk.lat > 40 && jfk.lat < 41 && jfk.lon < -73 && jfk.lon > -74);
});
test('airport search handles accents and an unknown query', () => {
  assert.ok(airportMatches(airports, 'Zurich').some(a => a.icao === 'LSZH'));
  assert.equal(airportMatches(airports, 'does-not-exist-123').length, 0);
});
