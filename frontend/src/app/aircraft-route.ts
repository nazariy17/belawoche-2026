import { Component, effect, input, signal } from '@angular/core';
interface AirportStop { airport: string | null; iata: string | null; icao: string; scheduled: string | null }
interface Route { departure: AirportStop; arrival: AirportStop; flightDate: string }
@Component({
  selector: 'app-aircraft-route',
  template: `<section><h3>Start → Ziel</h3>
    @if (route(); as flight) {
      <p><strong>{{ flight.departure.iata || flight.departure.icao }} → {{ flight.arrival.iata || flight.arrival.icao }}</strong></p>
      <p>{{ flight.departure.airport }} → {{ flight.arrival.airport }}</p>
      <small>Flugdatum {{ flight.flightDate }} · Quelle: aviationstack · gemeldete Route, keine ATC-Freigabe.</small>
    } @else { <p role="status">{{ status() }}</p> }
    @if (eligible()) { <button (click)="load()" [disabled]="loading()">{{ loading() ? 'Route wird geladen …' : 'Route abfragen' }}</button> }
  </section>`,
  styles: `section{border-top:1px solid #36515b;padding-top:12px;margin-top:16px}h3{font-size:14px}p,small{font-size:12px;color:#acc1c9;line-height:1.5}button{background:#18323d;border:1px solid #48616a;color:white;padding:8px;border-radius:6px;cursor:pointer}`,
})
export class AircraftRoute {
  callsign = input(''); registration = input<string | null>(null); simulation = input(false);
  route = signal<Route | null>(null); status = signal(''); loading = signal(false);
  private controller?: AbortController;
  eligible() { return !this.simulation() && /^[A-Z]{3}[0-9][A-Z0-9]{0,8}$/.test(this.callsign()); }
  constructor() {
    effect(onCleanup => {
      this.callsign(); this.registration(); this.simulation();
      this.route.set(null); this.loading.set(false);
      this.status.set(this.simulation() ? 'Simulation: keine reale Flugroute.' : 'Start und Ziel werden nur bei eindeutigem Treffer angezeigt.');
      onCleanup(() => this.controller?.abort());
    });
  }
  async load() {
    this.controller?.abort(); const controller = this.controller = new AbortController();
    this.loading.set(true); this.route.set(null); this.status.set('Route wird abgefragt …');
    try {
      const query = new URLSearchParams({ callsign: this.callsign(), registration: this.registration() ?? '' });
      const response = await fetch(`/api/aircraft/route?${query}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (controller.signal.aborted) return;
      this.route.set(data.route);
      this.status.set(data.status === 'unconfigured' ? 'Routendaten sind noch nicht freigeschaltet.' : 'Keine eindeutig passende aktuelle Flugroute gefunden.');
    } catch { if (!controller.signal.aborted) this.status.set('Routendienst momentan nicht erreichbar.'); }
    finally { if (!controller.signal.aborted) this.loading.set(false); }
  }
}
