import { Component, effect, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { Airport } from './airports';

interface Weather { station: string; source: string; report: { observedAt: number; windDirection: string | number | null; windSpeedKt: number | null; visibilityMiles: string | number | null; raw: string | null } | null; }

@Component({
  selector: 'app-weather-card', imports: [DatePipe],
  template: `
    <section aria-label="Flughafenwetter">
      <h3>Wetter · {{ airport().icao }}</h3>
      <button (click)="load()" [disabled]="loading()">{{ loading() ? 'Wird geladen …' : 'Aktuelles METAR laden' }}</button>
      <p role="status">{{ status() }}</p>
      @if (weather(); as data) {
        @if (data.report; as report) {
          <p>{{ data.station }} · {{ report.observedAt | date:'dd.MM.yyyy HH:mm':'UTC' }} UTC</p>
          <p>Wind: {{ report.windDirection === null ? 'unbekannt' : report.windDirection === 'VRB' ? 'variabel' : report.windDirection + '°' }} · {{ report.windSpeedKt === null ? 'unbekannt' : report.windSpeedKt + ' kt' }}</p>
          <p>Sicht: {{ report.visibilityMiles === null ? 'unbekannt' : report.visibilityMiles + ' statute miles' }}</p>
          <code>{{ report.raw || 'Kein Rohbericht verfügbar' }}</code>
          <p class="credit">Quelle: NOAA Aviation Weather Center · Live-Bericht, unabhängig von der Simulation</p>
        }
      }
      @if (airport().country === 'DE') {
        <a href="https://ais.dfs.de/" target="_blank" rel="noopener noreferrer">Offizielles DFS-Briefing öffnen ↗</a>
        <p class="credit">Registrierung erforderlich. NOTAM werden hier nicht eingebettet.</p>
      }
    </section>
  `,
  styles: `section{margin-top:24px;border-top:1px solid #36515b;padding-top:16px}h3{font-size:16px}button{border:1px solid #48616a;background:#18323d;color:white;border-radius:6px;padding:10px;cursor:pointer}p{font-size:12px;line-height:1.5;color:#acc1c9}code{display:block;white-space:normal;overflow-wrap:anywhere;font-size:11px;background:#0c2029;padding:10px;border-radius:6px}.credit{font-size:10px}a{color:#81ebcb}`,
})
export class WeatherCard {
  airport = input.required<Airport>();
  weather = signal<Weather | null>(null);
  status = signal('Wetter wird nur auf Anfrage geladen.');
  loading = signal(false);
  private controller?: AbortController;
  constructor() {
    effect(onCleanup => {
      this.airport(); this.weather.set(null); this.loading.set(false); this.status.set('Wetter wird nur auf Anfrage geladen.');
      onCleanup(() => this.controller?.abort());
    });
  }
  async load() {
    this.controller?.abort();
    this.weather.set(null);
    if (!/^[A-Z]{4}$/.test(this.airport().icao)) { this.status.set('Für diesen Flugplatz ist kein ICAO-Wettercode vorhanden.'); return; }
    const controller = this.controller = new AbortController();
    this.loading.set(true); this.status.set('');
    try {
      const response = await fetch(`/api/weather?icao=${this.airport().icao}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw Error(response.status === 429 ? 'Wetter-Anfragelimit erreicht. Bitte später erneut versuchen.' : 'Wetterdienst derzeit nicht erreichbar.');
      const data: Weather = await response.json();
      if (controller.signal.aborted) return;
      this.weather.set(data);
      this.status.set(data.report ? (Date.now() - data.report.observedAt > 7200000 ? 'Bericht älter als zwei Stunden.' : '') : 'Kein aktueller METAR-Bericht für diese Station.');
    } catch (error) { if (!controller.signal.aborted) this.status.set(error instanceof Error ? error.message : 'Wetter konnte nicht geladen werden.'); }
    finally { if (!controller.signal.aborted) this.loading.set(false); }
  }
}
