import { Component, effect, input, signal } from '@angular/core';

interface Photo { url: string; pageUrl: string; author: string; license: string; licenseUrl: string; title: string; date: string }

@Component({
  selector: 'app-aircraft-photo',
  template: `
    @if (photo(); as image) {
      <figure>
        <a [href]="image.pageUrl" target="_blank" rel="noopener noreferrer"><img [src]="image.url" [alt]="image.title" (error)="imageFailed()" /></a>
        <figcaption>Foto nach Registrierung · {{ registration() }}
          <br />© {{ image.author }} · <a [href]="image.licenseUrl" target="_blank" rel="noopener noreferrer">{{ image.license }}</a>
          · <a [href]="image.pageUrl" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
          <br />Archivfoto{{ image.date ? ' · ' + image.date : '' }}; Lackierung kann abweichen.
        </figcaption>
      </figure>
    } @else { <p aria-live="polite">{{ status() }}</p> }
  `,
  styles: `figure{margin:12px 0}img{display:block;width:100%;height:auto;border-radius:8px}figcaption,p{font-size:11px;line-height:1.5;color:#acc1c9}a{color:#74dfc3}`,
})
export class AircraftPhoto {
  registration = input<string | null>(null);
  simulation = input(false);
  photo = signal<Photo | null>(null);
  status = signal('');
  constructor() {
    effect(onCleanup => {
      const registration = this.registration();
      const simulation = this.simulation();
      this.photo.set(null);
      if (simulation || !registration) {
        this.status.set(simulation ? 'Simulation: kein reales Flugzeugfoto.' : 'Foto nicht verfügbar: Registrierung fehlt.');
        return;
      }
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      this.status.set('Foto wird geladen …');
      fetch(`/api/aircraft/photo?registration=${encodeURIComponent(registration)}`, { signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error('Photo lookup failed'); return response.json(); })
        .then((result: { photo: Photo | null }) => {
          if (controller.signal.aborted) return;
          this.photo.set(result.photo);
          this.status.set('Kein passend lizenziertes Foto für diese Registrierung gefunden.');
        })
        .catch(() => {
          if (!controller.signal.aborted) this.status.set('Foto momentan nicht erreichbar.');
        });
    });
  }
  imageFailed() { this.photo.set(null); this.status.set('Foto konnte nicht geladen werden.'); }
}
