import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { LiveTraffic } from '../src/app/live-traffic.ts';

test('live polling ignores cancelled locations and freezes stale observations', async () => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldFetch = globalThis.fetch;
  const document = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
  const requests: { url: string; resolve: (r: Response) => void; signal: AbortSignal }[] = [];
  globalThis.fetch = ((url, init) => new Promise<Response>(resolve => requests.push({ url: String(url), resolve, signal: init!.signal as AbortSignal }))) as typeof fetch;
  const messages: string[] = [];
  const live = new LiveTraffic(message => messages.push(message));
  const now = Date.now();
  const plane = { id: 'abc', callsign: 'TEST', registration: null, airline: null, operator: null, aircraftType: 'B744', category: 'A5', lon: 8, lat: 47, observedAt: now, track: 90, heading: null, speedKt: 200, altitudeFt: 5000 };
  try {
    live.start([8, 47], 25);
    live.start([9, 48], 10);
    assert.equal(requests[0].signal.aborted, true);
    requests[0].resolve(Response.json({ aircraft: [{ ...plane, id: 'old' }] }));
    requests[1].resolve(Response.json({ aircraft: [plane] }));
    await setImmediate();
    assert.match(requests[1].url, /lat=48&lon=9&radius=10/);
    assert.equal(live.at(now)[0].id, 'abc');
    assert.equal(live.at(now + 61000)[0].stale, true);
    assert.equal(live.at(now + 61000)[0].lon, 8);
    assert.ok(live.lastReceivedAt > 0);
    document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(requests.length, 2);
    document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
    requests[2].resolve(new Response('', { status: 429, headers: { 'Retry-After': '60' } }));
    await setImmediate();
    assert.ok(messages.at(-1)?.includes('Anfragelimit'));
    live.start([10, 49], 25);
    assert.equal(requests.length, 3, 'moving the pin must not bypass Retry-After');
  } finally {
    live.destroy(); globalThis.fetch = oldFetch;
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
