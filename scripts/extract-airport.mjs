import {writeFile} from 'node:fs/promises';
import {VectorTile} from '../frontend/node_modules/@mapbox/vector-tile/index.js';
import {PbfReader as Pbf} from '../frontend/node_modules/pbf/index.js';
const info=await fetch('https://tiles.openfreemap.org/planet').then(r=>r.json());

const z=14, n=2**z;
const x= Math.floor((8.555+180)/360*n);
const y= Math.floor((1-Math.asinh(Math.tan(47.458*Math.PI/180))/Math.PI)/2*n);
const features=[];
for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) {
 const url=info.tiles[0].replace('{z}',z).replace('{x}',x+dx).replace('{y}',y+dy);
 const r=await fetch(url);if(!r.ok)throw Error(r.status);
 const tile=new VectorTile(new Pbf(new Uint8Array(await r.arrayBuffer())));
 for(const name of ['aeroway','building']) {
 const layer=tile.layers[name]; if(!layer)continue;
 for(let i=0;i<layer.length;i++){
 const f=layer.feature(i).toGeoJSON(x+dx,y+dy,z);
 if(name==='building') { const s=JSON.stringify(f.geometry.coordinates); if(!s.includes('8.5')) continue; }
 f.properties.aeroway=name==='building'?'building':f.properties.class;
 features.push(f);
 }
 }
}
await writeFile(new URL('../frontend/public/data/zurich-airport.geojson',import.meta.url),JSON.stringify({type:'FeatureCollection',features}));
await writeFile(new URL('../frontend/public/data/sources.json',import.meta.url),JSON.stringify({retrieved:new Date().toISOString(),world:{url:'https://github.com/nvkelso/natural-earth-vector',license:'Public domain'},airport:{url:'https://tiles.openfreemap.org/planet',tiles:info.tiles,z,x,y,license:'ODbL-1.0',attribution:'© OpenStreetMap contributors · OpenFreeMap',copyright:'https://www.openstreetmap.org/copyright'}},null,2));
console.log('Extracted features:',features.length);


