export interface Airport { icao: string; iata: string; name: string; city: string; country: string; lon: number; lat: number; }
export const zurich: Airport = { icao: 'LSZH', iata: 'ZRH', name: 'Zürich', city: 'Zürich', country: 'CH', lon: 8.555, lat: 47.458 };
export function airportMatches(airports: Airport[], query: string): Airport[] {
  const text = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (text.length < 2) return [];
  return airports.filter(a => `${a.icao} ${a.iata} ${a.name} ${a.city}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(text))
    .sort((a, b) => Number(b.icao.toLowerCase() === text || b.iata.toLowerCase() === text) - Number(a.icao.toLowerCase() === text || a.iata.toLowerCase() === text))
    .slice(0, 8);
}
