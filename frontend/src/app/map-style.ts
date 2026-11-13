import type { StyleSpecification } from 'maplibre-gl';

/** Local geographic layers stay available even when the optional vector tiles fail. */
export function radarStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: `${location.origin}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      world: { type: 'geojson', data: '/data/world.geojson', attribution: '<a href="https://naturalearthdata.com">Natural Earth</a>' },
      airport: { type: 'geojson', data: '/data/zurich-airport.geojson', attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors (ODbL)</a>' },
      detail: { type: 'vector', url: '/data/tiles.json' },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#11171c' } },
      { id: 'land', type: 'fill', source: 'world', paint: { 'fill-color': '#20272b' } },
      { id: 'borders', type: 'line', source: 'world', paint: { 'line-color': '#394146', 'line-width': 0.7 } },
      { id: 'water', type: 'fill', source: 'detail', 'source-layer': 'water', paint: { 'fill-color': '#11171c' } },
      { id: 'roads', type: 'line', source: 'detail', 'source-layer': 'transportation', minzoom: 8, paint: { 'line-color': '#3b4449', 'line-width': 1 } },
      { id: 'buildings', type: 'fill', source: 'detail', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': '#354046', 'fill-outline-color': '#48565e' } },
      { id: 'global-airport-area', type: 'fill', source: 'detail', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#343c43', 'fill-opacity': 0.6 } },
      { id: 'global-runways', type: 'line', source: 'detail', 'source-layer': 'aeroway', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'runway']], paint: { 'line-color': '#8a979e', 'line-width': 3 } },
      { id: 'local-airport-area', type: 'fill', source: 'airport', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['match', ['get', 'aeroway'], 'runway', '#3c464f', 'building', '#41515b', 'apron', '#29343b', '#253036'], 'fill-outline-color': '#768d94' } },
      { id: 'local-runways', type: 'line', source: 'airport', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'aeroway'], 'runway']], paint: { 'line-color': '#a1adb4', 'line-width': 2 } },
      { id: 'local-taxiways', type: 'line', source: 'airport', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'aeroway'], 'taxiway']], minzoom: 12, paint: { 'line-color': '#867357', 'line-width': 1 } },
      { id: 'airport-labels', type: 'symbol', source: 'airport', minzoom: 14, filter: ['all', ['==', ['geometry-type'], 'LineString'], ['!=', ['get', 'aeroway'], 'runway'], ['has', 'ref']], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'ref'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 }, paint: { 'text-color': '#e3dfc8', 'text-halo-color': '#12242d', 'text-halo-width': 2 } },
      { id: 'places', type: 'symbol', source: 'detail', 'source-layer': 'place', layout: { 'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name:latin'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12 }, paint: { 'text-color': '#a7c4ca', 'text-halo-color': '#10232b', 'text-halo-width': 2 } },
    ],
  };
}
