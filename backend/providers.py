"""Fixed upstream hosts, bounded in-process cache, and normalized observations."""
import asyncio
import math
import os
import time
from collections import OrderedDict

import httpx
from fastapi import HTTPException

CACHE: OrderedDict = OrderedDict()
LOCK = asyncio.Lock()
COOLDOWNS: dict[str, float] = {}
AIRLINES = {'SWR': 'SWISS', 'DLH': 'Lufthansa', 'EZY': 'easyJet', 'BAW': 'British Airways', 'UAE': 'Emirates'}


async def cached_json(url: str, ttl: int = 30):
    """One request per cache key/TTL per warm process; failures are not empty feeds."""
    async with LOCK:
        now = time.monotonic()
        host = httpx.URL(url).host
        if host not in ('api.adsb.lol', 'aviationweather.gov'):
            raise ValueError('Unapproved upstream')
        if url in CACHE and CACHE[url][0] > now:
            CACHE.move_to_end(url)
            return CACHE[url][1]
        remaining = COOLDOWNS.get(host, 0) - now
        if remaining > 0:
            raise HTTPException(429, 'Provider rate limit', headers={'Retry-After': str(math.ceil(remaining))})
        headers = {'User-Agent': 'EwanFlightRadar/0.1 (educational demo)'}
        if host == 'api.adsb.lol' and os.getenv('ADSB_LOL_API_KEY'):
            headers['x-api-key'] = os.environ['ADSB_LOL_API_KEY']
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                response = await client.get(url, headers=headers)
            if response.status_code == 429:
                retry = response.headers.get('Retry-After', '60')
                seconds = min(max(int(retry), 1), 86400) if retry.isdigit() else 60
                COOLDOWNS[host] = time.monotonic() + seconds
                raise HTTPException(429, 'Provider rate limit', headers={'Retry-After': str(seconds)})
            if response.status_code == 204:
                data = []
            else:
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise HTTPException(504, 'Provider timeout') from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise HTTPException(502, 'Provider unavailable or invalid response') from exc
        CACHE[url] = (time.monotonic() + ttl, data)
        while len(CACHE) > 256:
            CACHE.popitem(last=False)
        return data


def distance_km(lat1, lon1, lat2, lon2):
    a, b = math.radians(lat1), math.radians(lat2)
    h = math.sin((b - a) / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(min(1, h)))


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else None


def normalize(data):
    if not isinstance(data, dict) or not isinstance(data.get('ac'), list) or number(data.get('now')) is None:
        raise HTTPException(502, 'Invalid traffic response')
    timestamp = data['now']  # adsb.lol V2 now is Unix milliseconds; seen_pos is seconds.
    aircraft = []
    for item in data['ac']:
        if not isinstance(item, dict):
            continue
        lat, lon = number(item.get('lat')), number(item.get('lon'))
        seen = number(item.get('seen_pos'))
        if lat is None or lon is None or seen is None or not (-90 <= lat <= 90 and -180 <= lon <= 180) or not item.get('hex'):
            continue
        callsign = str(item.get('flight') or item['hex']).strip()
        prefix = callsign[:3]
        heading = number(item.get('true_heading'))  # Do not confuse magnetic heading with true heading.
        aircraft.append(dict(id=str(item['hex']), callsign=callsign, registration=item.get('r'),
            airline=AIRLINES.get(prefix), operator=prefix if prefix in AIRLINES else None,
            aircraftType=item.get('t'), lon=lon, lat=lat,
            altitudeFt=0 if item.get('alt_baro') == 'ground' else number(item.get('alt_baro')),
            speedKt=number(item.get('gs')), track=number(item.get('track')), heading=heading,
            observedAt=timestamp - max(0, seen) * 1000))
    return {'source': 'adsb.lol', 'license': 'ODbL-1.0', 'timestamp': timestamp, 'aircraft': aircraft}


async def traffic(lat: float, lon: float, radius: int):
    # Shared nearby queries use a 0.05-degree grid. The extra 5 km covers rounding.
    grid_lat, grid_lon = round(lat * 20) / 20, round(lon * 20) / 20
    nm = math.ceil((radius + 5) / 1.852)
    data = normalize(await cached_json(f'https://api.adsb.lol/v2/point/{grid_lat}/{grid_lon}/{nm}'))
    data['aircraft'] = [a for a in data['aircraft'] if distance_km(lat, lon, a['lat'], a['lon']) <= radius]
    return data


async def weather(icao: str):
    data = await cached_json(f'https://aviationweather.gov/api/data/metar?ids={icao}&format=json', ttl=600)
    if not isinstance(data, list):
        raise HTTPException(502, 'Invalid weather response')
    reports = [r for r in data if isinstance(r, dict) and r.get('icaoId') == icao and number(r.get('obsTime')) is not None]
    if not reports:
        return {'station': icao, 'report': None, 'source': 'NOAA Aviation Weather Center'}
    report = max(reports, key=lambda r: r['obsTime'])
    return {'station': icao, 'source': 'NOAA Aviation Weather Center', 'report': {
        'observedAt': report['obsTime'] * 1000,
        'windDirection': report.get('wdir'), 'windSpeedKt': number(report.get('wspd')),
        'visibilityMiles': report.get('visib'), 'raw': report.get('rawOb'),
    }}
