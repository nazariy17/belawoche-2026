import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { bearing, distanceKm, type Point } from './geo';
import type { Aircraft } from './traffic';
import { aircraftIcon, iconLabels, iconUrl } from './aircraft-icons';
import { AircraftPhoto } from './aircraft-photo';

@Component({
  selector: 'app-aircraft-card', imports: [DecimalPipe, AircraftPhoto],
  template: `
    <button class="close" (click)="closed.emit()" aria-label="Flugzeugdetails schließen">✕</button>
    <p class="eyebrow">{{ simulation() ? 'SIMULATION' : 'BEOBACHTETES FLUGZEUG' }}</p>
    <h2>{{ aircraft().callsign }}</h2>
    <p>{{ aircraft().airline || 'Airline unbekannt' }} · {{ aircraft().operator || '—' }}</p>
    <div class="silhouette"><img [src]="iconUrl(icon())" [alt]="iconLabels[icon()] + ' · Silhouette, kein Foto'" width="84" height="84" /></div>
    <p>{{ iconLabels[icon()] }}</p>
    <app-aircraft-photo [registration]="aircraft().registration" [simulation]="simulation()" />
    <dl>
      <dt>Registrierung</dt><dd>{{ aircraft().registration || 'Unbekannt' }}</dd>
      <dt>Flugzeugtyp</dt><dd>{{ aircraft().aircraftType || 'Unbekannt' }}</dd>
      <dt>Höhe</dt><dd>{{ aircraft().altitudeFt === null ? 'Unbekannt' : (aircraft().altitudeFt | number:'1.0-0') + ' ft' }}<small>{{ aircraft().altitudeFt === null ? '' : ((aircraft().altitudeFt! * 0.3048 | number:'1.0-0') + ' m') }}</small></dd>
      <dt>Geschwindigkeit</dt><dd>{{ aircraft().speedKt === null ? 'Unbekannt' : (aircraft().speedKt | number:'1.0-0') + ' kt' }}<small>{{ aircraft().speedKt === null ? '' : ((aircraft().speedKt! * 1.852 | number:'1.0-0') + ' km/h') }}</small></dd>
      <dt>Steuerkurs</dt><dd>{{ aircraft().heading === null ? 'Nicht gemeldet' : (aircraft().heading | number:'1.0-0') + '°' }}</dd>
      <dt>Flugrichtung</dt><dd>{{ aircraft().track === null ? 'Nicht gemeldet' : (aircraft().track | number:'1.0-0') + '°' }}</dd>
      <dt>Vom Radar-Punkt</dt><dd>{{ distance() | number:'1.1-1' }} km · {{ direction() | number:'1.0-0' }}°</dd>
      <dt>Letzte Position</dt><dd>{{ age() }} s {{ simulation() ? '(Simulationszeit)' : 'alt' }} @if (aircraft().stale) { <strong> · Veraltet, Bewegung angehalten</strong> }</dd>
    </dl>
    <div class="route"><strong>Route unbekannt</strong><p>Start und Ziel werden nicht aus der beobachteten Flugspur abgeleitet.</p></div>
  `,
  styles: `:host{display:block;position:relative}.close{float:right;border:1px solid #4c686f;border-radius:6px;background:#19343c;color:white;padding:8px;cursor:pointer}.eyebrow{font-size:10px;letter-spacing:2px;color:#74dfc3}h2{margin:12px 0;font-size:26px}p{color:#acc1c9;font-size:13px;line-height:1.5}.silhouette{text-align:center;font-size:64px;color:#91b5bd;background:#17303b;border-radius:12px}.muted{font-size:11px}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px 8px;font-size:12px}dt{color:#9bb4bf}dd{margin:0;text-align:right}small{display:block;color:#9bb4bf;margin-top:4px}.route{border-top:1px solid #36515b;padding-top:16px;margin-top:20px;font-size:13px}`,
})
export class AircraftCard {
  readonly iconLabels = iconLabels;
  readonly iconUrl = iconUrl;
  aircraft = input.required<Aircraft>();
  icon = computed(() => aircraftIcon(this.aircraft()));
  center = input.required<Point>();
  now = input.required<number>();
  simulation = input(true);
  closed = output<void>();
  distance = computed(() => distanceKm(this.center(), [this.aircraft().lon, this.aircraft().lat]));
  direction = computed(() => bearing(this.center(), [this.aircraft().lon, this.aircraft().lat]));
  age = computed(() => Math.max(0, Math.floor((this.now() - this.aircraft().observedAt) / 1000)));
}
