"""Build a compact public-domain runway snapshot from OurAirports."""
import csv
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

url = 'https://davidmegginson.github.io/ourairports-data/runways.csv'
text = urlopen(Request(url, headers={'User-Agent': 'EwanFlightRadar/0.1'}), timeout=30).read().decode('utf-8-sig')
airports = {}
for row in csv.DictReader(io.StringIO(text)):
    if row['closed'] != '0':
        continue
    ends = []
    for prefix in ('le', 'he'):
        try:
            lat, lon, heading = [float(row[f'{prefix}_{key}']) for key in ('latitude_deg', 'longitude_deg', 'heading_degT')]
            ident = row[f'{prefix}_ident']
            if not ident or not (-90 <= lat <= 90 and -180 <= lon <= 180 and 0 <= heading <= 360):
                continue
            ends.append(dict(ident=ident, point=[lon, lat], heading=heading,
                             displacedFt=float(row.get(f'{prefix}_displaced_threshold_ft') or 0)))
        except ValueError:
            continue
    if len(ends) == 2:
        airports.setdefault(row['airport_ident'], []).append(dict(ends=ends, lengthFt=float(row['length_ft'] or 0)))
target = Path(__file__).resolve().parents[1] / 'frontend/public/data/runways.json'
target.write_text(json.dumps(airports, separators=(',', ':')), encoding='utf-8')
print(f'{len(airports)} airports with paired runway ends')
