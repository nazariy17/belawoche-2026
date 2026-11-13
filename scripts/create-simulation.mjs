import { writeFile } from 'node:fs/promises';
const start = Date.parse('2026-11-13T12:00:00Z');
const specs = [
 ['demo-swiss','SWR-DEMO','HB-DEMO','SWISS','SWR','A320',8.48,47.56,150,140,4500],
 ['demo-lufthansa','DLH-DEMO','D-DEMO','Lufthansa','DLH','B744',8.68,47.40,350,190,8500],
 ['demo-easyjet','EZY-DEMO','G-DEMO','easyJet','EZY','A319',8.40,47.40,65,160,6200],
 ['demo-unknown','DEMO-04',null,null,null,null,8.74,47.56,240,120,11000],
 ['demo-small','KLEIN-DEMO',null,null,null,'C172',8.52,47.42,320,80,2500],
 ['demo-medium','MITTEL-DEMO',null,null,null,'AT76',8.60,47.57,195,150,5500],
 ['demo-heavy-twin','HEAVY-DEMO',null,null,null,'A359',8.38,47.50,90,200,9500],
];
const aircraft = specs.map(([id,callsign,registration,airline,operator,aircraftType,lon,lat,track,speedKt,altitudeFt],i)=>{
 const samples=[];
 for(let t=0;t<=120;t+=10){
  const direction=(track + (i===1 ? t/3 : 0))%360;
  samples.push({observedAt:start+t*1000,lon,lat,track:direction,heading:i===3?null:(direction-4+360)%360,speedKt,altitudeFt:Math.round(altitudeFt-t*(i===0?12:0))});
  const km=speedKt*1.852/3600*10;
  lon+=km*Math.sin(direction*Math.PI/180)/(111.32*Math.cos(lat*Math.PI/180));
  lat+=km*Math.cos(direction*Math.PI/180)/111.32;
 }
 return {id,callsign,registration,airline,operator,aircraftType,samples};
});
await writeFile(new URL('../frontend/public/data/simulation.json',import.meta.url), JSON.stringify({mode:'simulation',credit:'Original synthetic teaching scenario for Ewan; no observed flights or real registrations.',start,end:start+120000,aircraft},null,2));
