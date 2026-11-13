import type { Point } from './geo';
import { interpolate, type Aircraft, type Observation } from './traffic';

export class LiveTraffic {
  private controller?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private active = false;
  private center: Point = [0, 0];
  private radius = 25;
  private latest: Aircraft[] = [];
  private history = new Map<string, Observation[]>();
  private retryAt = 0;
  constructor(private status: (message: string, error: boolean) => void) {
    document.addEventListener('visibilitychange', this.visibility);
  }
  private visibility = () => {
    this.cancel();
    if (this.active && !document.hidden) void this.poll();
  };
  start(center: Point, radius: number) {
    this.cancel(); this.active = true; this.center = center; this.radius = radius;
    this.latest = []; this.history.clear();
    if (!document.hidden) void this.poll();
  }
  stop() { this.active = false; this.cancel(); }
  private cancel() { this.generation++; this.controller?.abort(); clearTimeout(this.timer); }
  private async poll() {
    if (!this.active || document.hidden) return;
    const remaining = this.retryAt - Date.now();
    if (remaining > 0) { this.timer = setTimeout(() => void this.poll(), remaining); return; }
    const generation = this.generation;
    this.controller = new AbortController();
    let delay = 30_000;
    this.status('Live-Daten werden geladen …', false);
    try {
      const response = await fetch(`/api/traffic?lat=${this.center[1]}&lon=${this.center[0]}&radius=${this.radius}`, {
        signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(12_000)]),
      });
      if (response.status === 429) {
        const retry = Number(response.headers.get('Retry-After')) || 60;
        delay = Math.max(30_000, Math.min(86400, retry) * 1000);
        this.retryAt = Date.now() + delay;
        throw Error(`Anfragelimit erreicht. Nächster Versuch in ${Math.ceil(delay / 1000)} s. Simulation ist verfügbar.`);
      }
      if (!response.ok) throw Error('Live-Feed nicht erreichbar. Letzte Positionen bleiben stehen; Simulation ist verfügbar.');
      const data = await response.json();
      if (!Array.isArray(data.aircraft)) throw Error('Ungültige Antwort des Live-Feeds.');
      if (generation !== this.generation) return;
      this.latest = data.aircraft;
      const ids = new Set(this.latest.map(a => a.id));
      for (const id of this.history.keys()) if (!ids.has(id)) this.history.delete(id);
      for (const plane of this.latest) {
        const samples = this.history.get(plane.id) ?? [];
        if (!samples.length || plane.observedAt > samples.at(-1)!.observedAt) samples.push(plane);
        this.history.set(plane.id, samples.slice(-5));
      }
      this.status(this.latest.length ? 'Live · adsb.lol · Aktualisierung alle 30 s' : 'Live · keine Flugzeuge im gewählten Umkreis', false);
    } catch (error) {
      if (generation === this.generation) this.status(error instanceof Error ? error.message : 'Live-Feed fehlgeschlagen', true);
    } finally {
      if (generation === this.generation && this.active && !document.hidden) this.timer = setTimeout(() => void this.poll(), delay);
    }
  }
  at(now: number): Aircraft[] {
    return this.latest.map(plane => ({ ...plane, ...interpolate(this.history.get(plane.id) ?? [plane], now - 15_000), stale: now - plane.observedAt > 60_000 }));
  }
  destroy() { this.stop(); document.removeEventListener('visibilitychange', this.visibility); }
}
