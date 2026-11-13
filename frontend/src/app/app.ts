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
import { LiveTraffic } from './live-traffic';
import { WeatherCard } from './weather-card';
import { iconLabels, iconUrl, type AircraftIcon } from './aircraft-icons';

@Component({ selector: 'app-root', imports: [AircraftCard, WeatherCard], templateUrl: './app.html', styleUrl: './app.scss' })
export class App implements AfterViewInit, OnDestroy {
  readonly iconLabels = iconLabels;
  readonly iconUrl = iconUrl;
  readonly legendIcons: AircraftIcon[] = ['small', 'medium', 'large', 'heavy-twin', 'heavy-four', 'heavy', 'helicopter', 'unknown'];
  readonly radius = signal(25);
  readonly lights = signal(true);
  readonly placing = signal(false);
  readonly mapError = signal('');
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
  readonly mode = signal<'simulation' | 'live'>('live');
  readonly liveStatus = signal('Live-Verbindung wird gestartet …');
  readonly liveError = signal(false);
  readonly following = signal(false);
  private lastFollow = 0;
  readonly lookupStatus = signal('');
  readonly lookupResults = signal<Aircraft[]>([]);
  readonly lookupKind = signal<'callsign' | 'registration'>('callsign');
  readonly lookupQuery = signal('');
  private lookupController?: AbortController;
  private live = new LiveTraffic((message, error) => { this.liveStatus.set(message); this.liveError.set(error); });
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
      const [{ Map, NavigationControl, Marker, setWorkerUrl }, { TrafficRenderer }] = await Promise.all([import('maplibre-gl'), import('./traffic-renderer')]);
      if (this.destroyed) return;
      // MapLibre 6's ESM worker and its shared module must be served separately
      // from Angular's bundled chunks, both in ng serve and the Vercel build.
      setWorkerUrl(new URL('maplibre/maplibre-gl-worker.mjs', document.baseURI).href);
      this.map = new Map({ container: 'radar-map', center: this.center, zoom: 9, style: radarStyle() });
      this.map.on('error', event => {
        console.error('Radar map error:', event.error);
        this.dataError.set('Ein Teil der Kartendaten konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.');
      });
      this.map.addControl(new NavigationControl(), 'top-right');
      this.map.once('style.load', () => {
        void addAirportLights(this.map!).then(() => { if (!this.destroyed) setLights(this.map!, this.lights()); }).catch(() => this.dataError.set('Flughafenbeleuchtung konnte nicht geladen werden.'));
        this.map!.addSource('ring', { type: 'geojson', data: this.ring() });
        this.map!.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': this.accent(), 'fill-opacity': 0.06 } });
        this.map!.addLayer({ id: 'ring-line', type: 'line', source: 'ring', paint: { 'line-color': this.accent(), 'line-width': 1.5 } });
        this.pin = new Marker({ color: '#5ae2c4' }).setLngLat(this.center).addTo(this.map!);
        this.renderer = new TrafficRenderer(this.map!, id => this.selectAircraft(id));
        this.map!.on('click', event => { if (this.placing()) this.moveRadar([event.lngLat.lng, event.lngLat.lat]); });
        this.map!.on('dragstart', () => this.following.set(false));
        this.frame = requestAnimationFrame(time => this.animate(time));
        if (this.mode() === 'live') this.live.start(this.center, this.radius());
        void this.loadReplay();
      });
    } catch (error) {
      console.error('Radar initialization failed:', error);
      this.mapError.set('Die Karte konnte nicht gestartet werden. Bitte Seite neu laden. Falls der Fehler bleibt, prüfe die Browserkonsole; WebGL muss verfügbar sein.');
    }
  }
  private async loadReplay() {
    try {
      const response = await fetch('/data/simulation.json');
      if (!response.ok) throw new Error();
      this.replay = await response.json();
      this.playbackTime = this.replay!.start;
    } catch { this.dataError.set('Simulation konnte nicht geladen werden. Bitte Seite neu laden.'); }
  }
  private animate(time: number) {
    const delta = this.lastFrame ? Math.min(time - this.lastFrame, 250) : 0;
    this.lastFrame = time;
    if (this.replay && this.mode() === 'simulation') {
      if (this.playing() && !document.hidden) this.playbackTime = Math.min(this.replay.end, this.playbackTime + delta);
      if (this.playbackTime === this.replay.end) this.playing.set(false);
      this.elapsed.set(Math.floor((this.playbackTime - this.replay.start) / 1000));
      this.current = replayAt(this.replay, this.playbackTime);
      this.clock.set(this.playbackTime);
      this.renderTraffic();
    }
    if (this.mode() === 'live') {
      this.clock.set(Date.now()); this.current = this.live.at(this.clock()); this.renderTraffic();
    }
    const followed = this.selected();
    if (this.following() && followed && !followed.stale && time - this.lastFollow > 1000) {
      this.lastFollow = time;
      this.map?.easeTo({ center: [followed.lon, followed.lat], duration: 900 });
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
  closeAircraft() { this.selectedId = null; this.selected.set(null); this.following.set(false); }
  restart() { if (this.replay) this.playbackTime = this.replay.start; this.playing.set(true); }
  moveRadar(point: Point) { this.center = [((point[0] + 540) % 360) - 180, Math.max(-85, Math.min(85, point[1]))]; this.pin?.setLngLat(this.center); this.placing.set(false); this.updateRing(); if (this.mode() === 'live') this.live.start(this.center, this.radius()); }
  setRadius(radius: number) { this.radius.set(radius); this.updateRing(); this.savePreferences(); if (this.mode() === 'live') this.live.start(this.center, radius); }
  setMode(mode: 'simulation' | 'live') {
    if (mode === this.mode()) return;
    this.mode.set(mode); this.closeAircraft(); this.current = []; this.renderTraffic();
    if (mode === 'live') this.live.start(this.center, this.radius());
    else { this.live.stop(); this.chooseAirport(zurich); this.restart(); }
  }
  liveUpdateAge() {
    return this.live.lastReceivedAt ? Math.max(0, Math.floor((this.clock() - this.live.lastReceivedAt) / 1000)) : null;
  }
  async lookupAircraft() {
    this.lookupController?.abort();
    this.lookupResults.set([]);
    const query = this.lookupQuery().trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,12}$/.test(query)) { this.lookupStatus.set('Bitte 2–12 Buchstaben, Ziffern oder Bindestriche eingeben.'); return; }
    const controller = this.lookupController = new AbortController();
    this.lookupStatus.set('Weltweite Suche …');
    try {
      const response = await fetch(`/api/aircraft/search?kind=${this.lookupKind()}&q=${encodeURIComponent(query)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw Error(response.status === 429 ? 'Anfragelimit erreicht. Bitte später erneut suchen.' : 'Flugzeugsuche derzeit nicht erreichbar.');
      const data = await response.json();
      if (controller.signal.aborted) return;
      this.lookupResults.set(data.aircraft);
      this.lookupStatus.set(data.aircraft.length ? 'Außerhalb des Radar-Radius wird ebenfalls gesucht. Wähle ein Ergebnis, um den Radar zu versetzen.' : 'Kein Flugzeug mit aktueller Position gefunden.');
    } catch (error) { if (!controller.signal.aborted) this.lookupStatus.set(error instanceof Error ? error.message : 'Suche fehlgeschlagen'); }
  }
  locateAircraft(plane: Aircraft) {
    this.moveRadar([plane.lon, plane.lat]); this.setMode('live'); this.reset();
    this.selectedId = plane.id; this.lookupResults.set([]); this.lookupStatus.set('Radar zur letzten gemeldeten Position versetzt.');
  }
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
  ngOnDestroy() { this.destroyed = true; this.lookupController?.abort(); this.live.destroy(); cancelAnimationFrame(this.frame); this.renderer?.destroy(); this.pin?.remove(); this.map?.remove(); }
}
