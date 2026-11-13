import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import type { GeoJSONSource, Map, Marker } from 'maplibre-gl';
import type { Feature, Polygon } from 'geojson';
import { radarStyle } from './map-style';
import { addAirportLights, setLights } from './airport-lights';
import { distanceKm, type Point } from './geo';
import { replayAt, type Aircraft, type Replay } from './traffic';
import type { TrafficRenderer } from './traffic-renderer';
import { AircraftCard } from './aircraft-card';
import { airportMatches, zurich, type Airport } from './airports';

@Component({ selector: 'app-root', imports: [AircraftCard], templateUrl: './app.html', styleUrl: './app.scss' })
export class App implements AfterViewInit, OnDestroy {
  readonly radius = signal(25);
  readonly lights = signal(true);
  readonly placing = signal(false);
  readonly mapError = signal(false);
  readonly dataError = signal('');
  readonly apiStatus = signal('Nicht geprüft');
  readonly checking = signal(false);
  readonly selected = signal<Aircraft | null>(null);
  readonly empty = signal(false);
  readonly playing = signal(true);
  readonly elapsed = signal(0);
  readonly aircraftCount = signal(0);
  readonly visibleAircraft = signal<Aircraft[]>([]);
  readonly clock = signal(0);
  readonly airport = signal<Airport>(zurich);
  readonly airportResults = signal<Airport[]>([]);
  readonly airportQuery = signal('');
  readonly searchStatus = signal('');
  readonly accent = signal('#5ae2c4');
  readonly preferenceStatus = signal('');
  private airports?: Airport[];
  private airportLoad?: Promise<Airport[]>;
  protected map?: Map;
  protected center: Point = [8.555, 47.458];
  private pin?: Marker;
  private renderer?: TrafficRenderer;
  private destroyed = false;
  private frame = 0;
  private replay?: Replay;
  private playbackTime = 0;
  private lastFrame = 0;
  private selectedId: string | null = null;
  private current: Aircraft[] = [];

  async ngAfterViewInit() {
    try {
      this.restorePreferences();
      const [{ Map, NavigationControl, Marker }, { TrafficRenderer }] = await Promise.all([import('maplibre-gl'), import('./traffic-renderer')]);
      if (this.destroyed) return;
      this.map = new Map({ container: 'radar-map', center: this.center, zoom: 9, style: radarStyle() });
      this.map.addControl(new NavigationControl(), 'top-right');
      this.map.on('load', () => {
        void addAirportLights(this.map!).then(() => { if (!this.destroyed) setLights(this.map!, this.lights()); }).catch(() => this.dataError.set('Flughafenbeleuchtung konnte nicht geladen werden.'));
        this.map!.addSource('ring', { type: 'geojson', data: this.ring() });
        this.map!.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': this.accent(), 'fill-opacity': 0.06 } });
        this.map!.addLayer({ id: 'ring-line', type: 'line', source: 'ring', paint: { 'line-color': this.accent(), 'line-width': 1.5 } });
        this.pin = new Marker({ color: '#5ae2c4' }).setLngLat(this.center).addTo(this.map!);
        this.renderer = new TrafficRenderer(this.map!, id => this.selectAircraft(id));
        this.map!.on('click', event => { if (this.placing()) this.moveRadar([event.lngLat.lng, event.lngLat.lat]); });
        void this.loadReplay();
      });
    } catch { this.mapError.set(true); }
  }
  private async loadReplay() {
    try {
      const response = await fetch('/data/simulation.json');
      if (!response.ok) throw new Error();
      this.replay = await response.json();
      this.playbackTime = this.replay!.start;
      if (!this.destroyed) this.frame = requestAnimationFrame(time => this.animate(time));
    } catch { this.dataError.set('Simulation konnte nicht geladen werden. Bitte Seite neu laden.'); }
  }
  private animate(time: number) {
    const delta = this.lastFrame ? Math.min(time - this.lastFrame, 250) : 0;
    this.lastFrame = time;
    if (this.replay) {
      if (this.playing() && !document.hidden) this.playbackTime = Math.min(this.replay.end, this.playbackTime + delta);
      if (this.playbackTime === this.replay.end) this.playing.set(false);
      this.elapsed.set(Math.floor((this.playbackTime - this.replay.start) / 1000));
      this.current = replayAt(this.replay, this.playbackTime);
      this.clock.set(this.playbackTime);
      this.renderTraffic();
    }
    if (!this.destroyed) this.frame = requestAnimationFrame(next => this.animate(next));
  }
  protected renderTraffic() {
    const visible = this.current.filter(plane => distanceKm(this.center, [plane.lon, plane.lat]) <= this.radius());
    this.renderer?.update(visible);
    this.empty.set(visible.length === 0);
    this.aircraftCount.set(visible.length);
    this.visibleAircraft.set(visible);
    this.selected.set(visible.find(plane => plane.id === this.selectedId) ?? null);
  }
  selectAircraft(id: string) { this.selectedId = id; this.renderTraffic(); }
  closeAircraft() { this.selectedId = null; this.selected.set(null); }
  restart() { if (this.replay) this.playbackTime = this.replay.start; this.playing.set(true); }
  moveRadar(point: Point) { this.center = point; this.pin?.setLngLat(point); this.placing.set(false); this.updateRing(); }
  setRadius(radius: number) { this.radius.set(radius); this.updateRing(); this.savePreferences(); }
  reset() { this.map?.flyTo({ center: this.center, zoom: 9 }); }
  airportZoom(zoom: number) { this.map?.flyTo({ center: [8.555, 47.458], zoom }); }
  toggleLights() { this.lights.update(value => !value); if (this.map) setLights(this.map, this.lights()); }
  async searchAirports(query: string) {
    this.airportQuery.set(query);
    if (query.trim().length < 2) { this.airportResults.set([]); this.searchStatus.set(''); return; }
    this.searchStatus.set('Flughäfen werden gesucht …');
    try {
      this.airportLoad ??= fetch('/data/airports.json').then(r => { if (!r.ok) throw Error(); return r.json(); });
      this.airports = await this.airportLoad;
      if (query !== this.airportQuery()) return;
      this.airportResults.set(airportMatches(this.airports!, query));
      this.searchStatus.set(this.airportResults().length ? '' : 'Kein Flughafen gefunden. Suche nach Name, Stadt, IATA oder ICAO.');
    } catch { this.airportLoad = undefined; this.searchStatus.set('Flughafendaten nicht erreichbar. Bitte erneut suchen.'); }
  }
  chooseAirport(airport: Airport) {
    this.airport.set(airport); this.moveRadar([airport.lon, airport.lat]); this.reset();
    this.airportResults.set([]); this.airportQuery.set(''); this.searchStatus.set('');
  }
  setAccent(color: string) {
    if (!/^#[\da-f]{6}$/i.test(color)) return;
    this.accent.set(color);
    if (this.map?.getLayer('ring-line')) {
      this.map.setPaintProperty('ring-line', 'line-color', color);
      this.map.setPaintProperty('ring-fill', 'fill-color', color);
    }
    this.savePreferences();
  }
  saveOpeningAirport() { this.savePreferences(this.airport()); this.preferenceStatus.set('Startflughafen gespeichert.'); }
  private savePreferences(opening?: Airport) {
    try {
      const old = JSON.parse(localStorage.getItem('ewan-radar') || '{}');
      localStorage.setItem('ewan-radar', JSON.stringify({ radius: this.radius(), accent: this.accent(), airport: opening ?? old.airport ?? zurich }));
    } catch { this.preferenceStatus.set('Einstellungen können in diesem Browser nicht gespeichert werden.'); }
  }
  private restorePreferences() {
    try {
      const value = JSON.parse(localStorage.getItem('ewan-radar') || '{}');
      if ([10, 25, 50].includes(value.radius)) this.radius.set(value.radius);
      if (/^#[\da-f]{6}$/i.test(value.accent)) this.accent.set(value.accent);
      if (value.airport && typeof value.airport.icao === 'string' && Number.isFinite(value.airport.lat) && Math.abs(value.airport.lat) <= 85 && Number.isFinite(value.airport.lon) && Math.abs(value.airport.lon) <= 180) {
        this.airport.set(value.airport); this.center = [value.airport.lon, value.airport.lat];
      }
    } catch { /* Corrupt/disabled storage must not prevent the demo. */ }
  }
  protected updateRing() { this.map?.getSource<GeoJSONSource>('ring')?.setData(this.ring()); this.renderTraffic(); }
  private ring(): Feature<Polygon> {
    const rad = Math.PI / 180, lat = this.center[1] * rad, lon = this.center[0] * rad, distance = this.radius() / 6371;
    const coordinates = Array.from({ length: 97 }, (_, index) => {
      const bearing = index / 96 * Math.PI * 2;
      const nextLat = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing));
      const nextLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat), Math.cos(distance) - Math.sin(lat) * Math.sin(nextLat));
      return [nextLon / rad, nextLat / rad];
    });
    coordinates[96] = coordinates[0];
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } };
  }
  async checkApi() {
    this.checking.set(true);
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!response.ok || (await response.json()).status !== 'ok') throw new Error();
      this.apiStatus.set('Verbunden');
    } catch { this.apiStatus.set('Nicht erreichbar · Simulation bleibt verfügbar'); }
    finally { this.checking.set(false); }
  }
  ngOnDestroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.renderer?.destroy(); this.pin?.remove(); this.map?.remove(); }
}
