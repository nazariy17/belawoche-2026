import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import type { GeoJSONSource, Map, Marker } from 'maplibre-gl';
import type { Feature, Polygon } from 'geojson';
import { radarStyle } from './map-style';
import { addAirportLights, setLights } from './airport-lights';
import { distanceKm, type Point } from './geo';
import { replayAt, type Aircraft, type Replay } from './traffic';
import type { TrafficRenderer } from './traffic-renderer';

@Component({ selector: 'app-root', templateUrl: './app.html', styleUrl: './app.scss' })
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
      const [{ Map, NavigationControl, Marker }, { TrafficRenderer }] = await Promise.all([import('maplibre-gl'), import('./traffic-renderer')]);
      if (this.destroyed) return;
      this.map = new Map({ container: 'radar-map', center: this.center, zoom: 9, style: radarStyle() });
      this.map.addControl(new NavigationControl(), 'top-right');
      this.map.on('load', () => {
        void addAirportLights(this.map!).then(() => { if (!this.destroyed) setLights(this.map!, this.lights()); }).catch(() => this.dataError.set('Flughafenbeleuchtung konnte nicht geladen werden.'));
        this.map!.addSource('ring', { type: 'geojson', data: this.ring() });
        this.map!.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': '#5ae2c4', 'fill-opacity': 0.06 } });
        this.map!.addLayer({ id: 'ring-line', type: 'line', source: 'ring', paint: { 'line-color': '#5ae2c4', 'line-width': 1.5 } });
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
      this.renderTraffic();
    }
    if (!this.destroyed) this.frame = requestAnimationFrame(next => this.animate(next));
  }
  protected renderTraffic() {
    const visible = this.current.filter(plane => distanceKm(this.center, [plane.lon, plane.lat]) <= this.radius());
    this.renderer?.update(visible);
    this.empty.set(visible.length === 0);
    this.aircraftCount.set(visible.length);
    this.selected.set(visible.find(plane => plane.id === this.selectedId) ?? null);
  }
  selectAircraft(id: string) { this.selectedId = id; this.renderTraffic(); }
  closeAircraft() { this.selectedId = null; this.selected.set(null); }
  restart() { if (this.replay) this.playbackTime = this.replay.start; this.playing.set(true); }
  moveRadar(point: Point) { this.center = point; this.pin?.setLngLat(point); this.placing.set(false); this.updateRing(); }
  setRadius(radius: number) { this.radius.set(radius); this.updateRing(); }
  reset() { this.map?.flyTo({ center: this.center, zoom: 9 }); }
  airportZoom(zoom: number) { this.map?.flyTo({ center: [8.555, 47.458], zoom }); }
  toggleLights() { this.lights.update(value => !value); if (this.map) setLights(this.map, this.lights()); }
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
