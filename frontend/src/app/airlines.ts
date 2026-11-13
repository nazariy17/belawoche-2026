// Logos are bundled, credited public-domain Commons marks; no third-party image requests.
export const airlineBrand: Record<string, string> = { SWR: 'SWR', DLH: 'DLH', EZY: 'EZY', EJU: 'EZY', EZS: 'EZY', BAW: 'BAW', EDW: 'EDW', UAE: 'UAE' };
export function airlineLogo(operator: string | null): string | null {
  const brand = airlineBrand[operator ?? ''];
  return brand ? `/icons/airlines/${brand}.png` : null;
}
