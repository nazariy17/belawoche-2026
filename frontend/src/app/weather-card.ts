import { Component, computed, effect, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import type { Airport } from './airports';
import { loadRunways, windRunways, type Runway } from './runways';

interface Weather { station: string; source: string; report: { observedAt: number; windDirection: string | number | null; windSpeedKt: number | null; windGustKt: number | null; variableWind: boolean; cloudCover: string | null; clouds: { cover: string; baseFt: number | null }[]; visibilityMiles: string | number | null; raw: string | null } | null; }

@Component({
  selector: 'app-weather-card', imports: [DatePipe, DecimalPipe],
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
          @if (windAngle() !== null) {
            <div style="width:70px;text-align:center;border:1px solid #48616a;border-radius:50%" aria-label="Windrichtung, Norden oben"><span>N</span><b style="display:block;font-size:32px" [style.transform]="'rotate(' + windAngle() + 'deg)'">↑</b></div>
            <p>Wind aus {{ report.windDirection }}° wahr · Pfeil zeigt, wohin er weht.</p>
          }
          @if (report.windGustKt !== null) { <p>Böen: {{ report.windGustKt }} kt</p> }
          @if (report.variableWind) { <p>Windrichtung schwankt (siehe METAR).</p> }
          <h4>Bewölkung</h4>
          @for (cloud of report.clouds; track $index) {
            <p>{{ cloudLabel(cloud.cover) }} @if (cloud.baseFt !== null) { · {{ cloud.baseFt | number:'1.0-0' }} ft über Grund } @else { · Basis nicht gemeldet }</p>
          } @empty { <p>{{ cloudLabel(report.cloudCover) }}</p> }
          <h4>Piste nach Wind · Schätzung</h4>
          @if (suggestions().length) {
            @for (runway of suggestions().slice(0, 3); track runway.ident) {
              <p>RWY {{ runway.ident }} · Gegenwind {{ runway.headwind | number:'1.0-0' }} kt · Seitenwind {{ runway.crosswind | number:'1.0-0' }} kt</p>
            }
          } @else { <p>Keine eindeutige Wind-Empfehlung: Wind variabel/schwach, Bericht veraltet oder Pistendaten fehlen.</p> }
          <p class="credit">Keine bestätigte aktive Piste. ATC, Sperrungen und Betriebsverfahren sind nicht berücksichtigt.</p>
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
  runways = signal<Runway[]>([]);
  windAngle = computed(() => { const r = this.weather()?.report; return r && typeof r.windDirection === 'number' && (r.windSpeedKt ?? 0) > 0 ? (r.windDirection + 180) % 360 : null; });
  suggestions = computed(() => { const r = this.weather()?.report; return r && !r.variableWind ? windRunways(this.runways(), r.windDirection, r.windSpeedKt, r.observedAt) : []; });
  cloudLabel(code: string | null) { return ({ FEW: 'Wenige Wolken (1–2 Achtel)', SCT: 'Aufgelockert (3–4 Achtel)', BKN: 'Stark bewölkt (5–7 Achtel)', OVC: 'Bedeckt (8 Achtel)', SKC: 'Wolkenlos', CLR: 'Keine Wolken unter der Messgrenze', NSC: 'Keine signifikanten Wolken', NCD: 'Keine Wolken erkannt', VV: 'Vertikalsicht bei verdecktem Himmel' } as Record<string, string>)[code ?? ''] ?? (code || 'Bewölkung nicht gemeldet'); }
  private controller?: AbortController;
  constructor() {
    effect(onCleanup => {
      const airport = this.airport(); this.weather.set(null); this.runways.set([]); this.loading.set(false); this.status.set('Wetter wird nur auf Anfrage geladen.');
      let cancelled = false;
      void loadRunways(airport.icao).then(runways => { if (!cancelled) this.runways.set(runways); }).catch(() => {});
      onCleanup(() => { cancelled = true; this.controller?.abort(); });
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
