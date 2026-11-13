import { Marker, type Map as RadarMap } from 'maplibre-gl';
import type { Aircraft } from './traffic';

export class TrafficRenderer {
  private markers = new Map<string, { marker: Marker; element: HTMLButtonElement }>();
  constructor(private map: RadarMap, private select: (id: string) => void) {}

  update(aircraft: Aircraft[]) {
    const ids = new Set(aircraft.map(a => a.id));
    for (const [id, item] of this.markers) if (!ids.has(id)) { item.marker.remove(); this.markers.delete(id); }
    for (const plane of aircraft) {
      let item = this.markers.get(plane.id);
      if (!item) {
        const element = document.createElement('button');
        element.className = 'aircraft';
        element.onclick = event => { event.stopPropagation(); this.select(plane.id); };
        item = { marker: new Marker({ element }).setLngLat([plane.lon, plane.lat]).addTo(this.map), element };
        this.markers.set(plane.id, item);
      }
      item.marker.setLngLat([plane.lon, plane.lat]);
      item.element.textContent = `âœˆ ${plane.callsign} Â· ${Math.round(plane.altitudeFt ?? 0)} ft`;
      item.element.setAttribute('aria-label', `Flugzeug ${plane.callsign} auswÃ¤hlen`);
    }
  }
  destroy() { this.markers.forEach(item => item.marker.remove()); this.markers.clear(); }
}

