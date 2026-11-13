import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import type { GeoJSONSource, Map, Marker } from 'maplibre-gl';
import type { Feature, Polygon } from 'geojson';

@Component({ selector: 'app-root', templateUrl: './app.html', styleUrl: './app.scss' })
export class App implements AfterViewInit, OnDestroy {
  readonly radius = signal(25);
  readonly placing = signal(false);
  readonly mapError = signal(false);
  readonly apiStatus = signal('Nicht geprüft');
  readonly checking = signal(false);
  readonly selected = signal(false);
  readonly empty = signal(false);
  private map?: Map;
  private markers: Marker[] = [];
  private destroyed = false;
  private center: [number, number] = [8.555, 47.458];
  private refreshAircraft = () => {};

  async ngAfterViewInit() {
    try {
      const { Map, NavigationControl, Marker } = await import('maplibre-gl');
      if (this.destroyed) return;
      this.map = new Map({ container: 'radar-map', center: this.center, zoom: 9,
        style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#091b26' } }] } });
      this.map.addControl(new NavigationControl(), 'top-right');
      this.map.on('load', () => {
        this.map!.addSource('ring', { type: 'geojson', data: this.ring() });
        this.map!.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': '#5ae2c4', 'fill-opacity': 0.06 } });
        this.map!.addLayer({ id: 'ring-line', type: 'line', source: 'ring', paint: { 'line-color': '#5ae2c4', 'line-width': 1.5 } });
        const pin = new Marker({ color: '#5ae2c4' }).setLngLat(this.center).addTo(this.map!);
        const plane = document.createElement('button');
        plane.className = 'aircraft';
        plane.textContent = '✈ DEMO 01 · 4 000 ft';
        plane.setAttribute('aria-label', 'Simuliertes Flugzeug DEMO 01 auswählen');
        plane.onclick = (event) => { event.stopPropagation(); this.selected.set(true); };
        const aircraft = new Marker({ element: plane }).setLngLat([8.62, 47.50]).addTo(this.map!);
        this.markers.push(pin, aircraft);
        this.refreshAircraft = () => {
          const rad = Math.PI / 180;
          const a = Math.sin((47.50 - this.center[1]) * rad / 2) ** 2
            + Math.cos(this.center[1] * rad) * Math.cos(47.50 * rad) * Math.sin((8.62 - this.center[0]) * rad / 2) ** 2;
          plane.hidden = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a))) > this.radius();
          this.empty.set(plane.hidden);
          if (plane.hidden) this.selected.set(false);
        };
        this.map!.on('click', (event) => {
          if (!this.placing()) return;
          this.center = [event.lngLat.lng, event.lngLat.lat];
          pin.setLngLat(this.center);
          this.placing.set(false);
          this.updateRing();
        });
        this.updateRing();
      });
    } catch { this.mapError.set(true); }
  }

  setRadius(radius: number) { this.radius.set(radius); this.updateRing(); }
  reset() { this.map?.flyTo({ center: this.center, zoom: 9 }); }
  private updateRing() {
    const source = this.map?.getSource<GeoJSONSource>('ring');
    source?.setData(this.ring());
    this.refreshAircraft();
  }
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
  ngOnDestroy() { this.destroyed = true; this.markers.forEach(marker => marker.remove()); this.map?.remove(); }
}
