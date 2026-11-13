import type { Aircraft } from './traffic';

export type AircraftIcon = 'small' | 'medium' | 'large' | 'heavy-twin' | 'heavy-four' | 'heavy' | 'helicopter' | 'unknown';
export const iconLabels: Record<AircraftIcon, string> = {
  small: 'Klein', medium: 'Mittel', large: 'Groß', 'heavy-twin': 'Heavy · 2 Triebwerke',
  'heavy-four': 'Heavy · 4 Triebwerke', heavy: 'Heavy · Triebwerke unbekannt', helicopter: 'Hubschrauber', unknown: 'Typ unbekannt',
};
export const iconSizes: Record<AircraftIcon, number> = { small: 27, medium: 32, large: 37, 'heavy-twin': 43, 'heavy-four': 49, heavy: 43, helicopter: 31, unknown: 30 };
const types: Partial<Record<string, AircraftIcon>> = {};
function register(icon: AircraftIcon, codes: string) { for (const code of codes.split(' ')) types[code] = icon; }
// Deliberately explicit ICAO designators: do not infer engine count from size,
// callsign, altitude or a prefix (A30B is twin-engine; A343 has four engines).
register('small', 'C150 C152 C172 C177 C182 C206 C208 PA28 PA32 PA34 PA44 SR20 SR22 DA20 DA40 DA42 P28A PC12 TBM7 TBM8 TBM9');
register('medium', 'AT43 AT45 AT46 AT72 AT73 AT75 AT76 DH8A DH8B DH8C DH8D E135 E145 E170 E175 E190 E195 E290 E295 CRJ1 CRJ2 CRJ7 CRJ9 CRJX C525 C550 C560 C56X C680 C68A C700 C750 CL30 CL35 CL60 GL5T GL6T GLEX GL7T GLF4 GLF5 GLF6');
register('large', 'A318 A319 A320 A321 A19N A20N A21N B731 B732 B733 B734 B735 B736 B737 B738 B739 B37M B38M B39M B3XM B752 B753 BCS1 BCS3 MD80 MD81 MD82 MD83 MD87 MD88 MD90');
register('heavy-twin', 'A306 A30B A310 A332 A333 A338 A339 A359 A35K B762 B763 B764 B772 B773 B77L B77W B778 B779 B788 B789 B78X');
register('heavy-four', 'A342 A343 A345 A346 A388 B741 B742 B743 B744 B748 B74R B74S');
register('helicopter', 'EC35 EC45 EC55 H145 H160 AS50 AS55 AS65 R22 R44 R66 B06 B407 B429 S76 S92');

export function aircraftIcon(plane: Pick<Aircraft, 'aircraftType' | 'category'>): AircraftIcon {
  const known = types[plane.aircraftType?.trim().toUpperCase() ?? ''];
  if (known) return known;
  switch (plane.category?.toUpperCase()) {
    case 'A1': return 'small';
    case 'A2': return 'medium';
    case 'A3': case 'A4': return 'large';
    case 'A5': return 'heavy'; // An emitter category alone cannot establish engine count.
    case 'A7': return 'helicopter';
    default: return 'unknown';
  }
}
export function iconUrl(icon: AircraftIcon) { return `/icons/aircraft/${icon}.svg`; }
