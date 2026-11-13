import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('Angular publishes MapLibre worker assets independently of application chunks', () => {
  const root = new URL('../', import.meta.url);
  const config = JSON.parse(readFileSync(new URL('angular.json', root), 'utf8'));
  const assets = config.projects.frontend.architect.build.options.assets;
  for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
    assert.ok(assets.some((a: { glob: string; input: string; output: string }) => a.glob === name && a.input === 'node_modules/maplibre-gl/dist' && a.output === 'maplibre'));
    assert.ok(existsSync(new URL(`node_modules/maplibre-gl/dist/${name}`, root)));
  }
  const worker = readFileSync(new URL('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', root), 'utf8');
  // Some releases inline the shared code; others import the adjacent module.
  // Check each actual relative dependency without assuming a particular bundle shape.
  for (const match of worker.matchAll(/from\s*["'`](\.\/[^"'`]+)["'`]/g)) {
    assert.ok(existsSync(new URL(`node_modules/maplibre-gl/dist/${match[1]}`, root)), `Missing worker dependency: ${match[1]}`);
  }
});
