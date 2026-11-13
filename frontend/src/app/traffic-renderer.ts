import { Marker, type Map as RadarMap } from 'maplibre-gl';
import type { Aircraft } from './traffic';

export const airplaneSvg = '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M29 4Q32 0 35 4L37 23 59 37 59 43 37 36 36 51 44 57 44 61 32 57 20 61 20 57 28 51 27 36 5 43 5 37 27 23Z"/></svg>';
export const operatorColors: Record<string, string> = { SWR: '#d42b3b', DLH: '#294c9d', EZY: '#d75b08', BAW: '#263f80', UAE: '#ac2636' };
type Item = { marker: Marker; element: HTMLButtonElement; icon: HTMLSpanElement; label: HTMLSpanElement; badge: HTMLSpanElement; text: HTMLSpanElement };
export class TrafficRenderer {
  private markers = new Map<string, Item>();
  constructor(private map: RadarMap, private select: (id: string) => void) {}
  update(aircraft: Aircraft[]) {
    const ids = new Set(aircraft.map(a => a.id));
    for (const [id, item] of this.markers) if (!ids.has(id)) { item.marker.remove(); this.markers.delete(id); }
    const occupied: { x: number; y: number }[] = [];
    for (const plane of [...aircraft].sort((a, b) => a.id.localeCompare(b.id))) {
      let item = this.markers.get(plane.id);
      if (!item) {
        const element = document.createElement('button');
        element.className = 'aircraft';
        const icon = document.createElement('span'); icon.className = 'aircraft-icon'; icon.innerHTML = airplaneSvg;
        const label = document.createElement('span'); label.className = 'aircraft-label';
        const badge = document.createElement('span'); badge.className = 'operator-badge';
        const text = document.createElement('span'); text.className = 'aircraft-text';
        label.append(badge, text); element.append(icon, label);
        element.onclick = event => { event.stopPropagation(); this.select(plane.id); };
        item = { marker: new Marker({ element }).setLngLat([plane.lon, plane.lat]).addTo(this.map), element, icon, label, badge, text };
        this.markers.set(plane.id, item);
      }
      item.marker.setLngLat([plane.lon, plane.lat]);
      const angle = plane.heading ?? plane.track;
      item.icon.style.transform = `rotate(${angle ?? 0}deg)`;
      item.icon.style.color = plane.stale ? '#9caab2' : '#e5fff8';
      item.badge.textContent = plane.operator ?? '?';
      item.badge.style.background = operatorColors[plane.operator ?? ''] ?? '#536571';
      const direction = angle === null ? 'Richtung unbekannt' : `${plane.heading !== null ? 'Steuerkurs' : 'Flugrichtung'} ${Math.round(angle)}°`;
      item.text.textContent = `${plane.callsign}\n${direction} · ${plane.altitudeFt === null ? 'Höhe unbekannt' : Math.round(plane.altitudeFt) + ' ft'}${plane.stale ? ' · veraltet' : ''}`;
      item.element.setAttribute('aria-label', `${plane.airline ?? 'Unbekannte Airline'}, ${item.text.textContent}. Details öffnen`);
      const p = this.map.project([plane.lon, plane.lat]);
      const offsets = [[24, -18], [24, 28], [-210, -18], [-210, 28], [24, -65], [-210, -65]];
      const offset = offsets.find(([x, y]) => !occupied.some(q => Math.abs(q.x - (p.x + x)) < 195 && Math.abs(q.y - (p.y + y)) < 42));
      item.label.hidden = !offset;
      if (offset) {
        item.label.style.left = `${offset[0]}px`; item.label.style.top = `${offset[1]}px`;
        occupied.push({ x: p.x + offset[0], y: p.y + offset[1] });
      }
    }
  }
  destroy() { this.markers.forEach(item => item.marker.remove()); this.markers.clear(); }
}
