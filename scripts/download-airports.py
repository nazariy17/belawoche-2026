import csv, io, json, pathlib, urllib.request
url='https://raw.githubusercontent.com/datasets/airport-codes/main/data/airport-codes.csv'
# This mirror is sourced from OurAirports; the compact distribution retains provenance.
with urllib.request.urlopen(url) as r:
    rows=list(csv.DictReader(io.StringIO(r.read().decode('utf-8-sig'))))
airports=[]
for r in rows:
    if r['type'] not in ('large_airport','medium_airport','small_airport'): continue
    lat,lon=map(float,r['coordinates'].split(','))
    if not (-90 <= lat <= 90 and -180 <= lon <= 180): raise ValueError('Invalid airport coordinates')
    airports.append(dict(icao=r['ident'],iata=r.get('iata_code') or '',name=r['name'],city=r.get('municipality') or '',country=r['iso_country'],lon=lon,lat=lat))
pathlib.Path('frontend/public/data/airports.json').write_text(json.dumps(airports,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(len(airports),'airports')
