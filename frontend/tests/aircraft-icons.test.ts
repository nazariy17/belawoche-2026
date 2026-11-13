import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aircraftIcon, iconLabels, iconUrl } from '../src/app/aircraft-icons.ts';

test('common ICAO types have distinct silhouettes and correct heavy engine counts', () => {
  for (const [type, icon] of [['C172', 'small'], ['AT76', 'medium'], ['A320', 'large'], ['B738', 'large'], ['A359', 'heavy-twin'], ['B77W', 'heavy-twin'], ['B789', 'heavy-twin'], ['A343', 'heavy-four'], ['B744', 'heavy-four'], ['A388', 'heavy-four']]) {
    assert.equal(aircraftIcon({ aircraftType: type, category: null }), icon, type);
  }
  assert.equal(aircraftIcon({ aircraftType: ' a30b ', category: 'A5' }), 'heavy-twin');
});
test('category fallback never invents heavy engine counts or treats a helicopter as an airliner', () => {
  assert.equal(aircraftIcon({ aircraftType: null, category: 'A5' }), 'heavy');
  assert.equal(aircraftIcon({ aircraftType: 'ZZZZ', category: 'A2' }), 'medium');
  assert.equal(aircraftIcon({ aircraftType: null, category: 'A7' }), 'helicopter');
  assert.equal(aircraftIcon({ aircraftType: 'ZZZZ', category: 'A0' }), 'unknown');
});
test('all mapped icons exist and heavy icons have visibly different engine counts', () => {
  for (const icon of Object.keys(iconLabels) as (keyof typeof iconLabels)[]) {
    const svg = readFileSync(new URL(`../public${iconUrl(icon)}`, import.meta.url), 'utf8');
    assert.ok(svg.includes('<svg'));
    if (icon.startsWith('heavy-')) assert.equal((svg.match(/class="engine"/g) ?? []).length, icon === 'heavy-four' ? 4 : 2);
  }
});
