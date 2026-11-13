import { mkdir, writeFile } from 'node:fs/promises';
const dir = new URL('../frontend/public/data/', import.meta.url);
await mkdir(dir, { recursive: true });
const worldUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const world = await fetch(worldUrl).then(r => { if (!r.ok) throw Error(r.status); return r.json(); });
for (const f of world.features) f.properties = { name: f.properties.NAME_DE || f.properties.NAME, iso: f.properties.ADM0_A3 };
await writeFile(new URL('world.geojson', dir), JSON.stringify(world));
const query = '[out:json][timeout:30];way["aeroway"~"^(runway|taxiway|terminal|apron)$"](47.435,8.515,47.495,8.585);out geom;';
const response = await fetch('https://overpass.private.coffee/api/interpreter?data=' + encodeURIComponent(query));
if (!response.ok) throw Error('Overpass '+response.status);
const osm = await response.json();
const features = osm.elements.filter(e => e.geometry?.length > 1).map(e => {
 const coords=e.geometry.map(p=>[p.lon,p.lat]);
 const polygon=e.nodes[0]===e.nodes.at(-1) && (['terminal','apron'].includes(e.tags.aeroway) || e.tags.area==='yes');
 return {type:'Feature',id:e.id,properties:{...e.tags,osm_id:e.id},geometry:{type:polygon?'Polygon':'LineString',coordinates:polygon?[coords]:coords}};
});
await writeFile(new URL('zurich-airport.geojson',dir),JSON.stringify({type:'FeatureCollection',features}));
await writeFile(new URL('sources.json',dir),JSON.stringify({retrieved:new Date().toISOString(),world:{url:worldUrl,license:'Public domain',attribution:'Natural Earth'},airport:{url:'https://overpass.private.coffee/api/interpreter',query,license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',copyright:'https://www.openstreetmap.org/copyright',timestamp:osm.osm3s?.timestamp_osm_base}},null,2));
console.log('Countries:',world.features.length,'Airport features:',features.length);
console.log(Object.fromEntries(['runway','taxiway','terminal','apron'].map(t=>[t,features.filter(f=>f.properties.aeroway===t).length])));



