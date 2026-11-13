"""Optional current-flight route lookup. No route is inferred from a position."""
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from fastapi import HTTPException
from providers import cached_json


def normalize_route(data, callsign, registration, now=None):
    if not isinstance(data, dict) or data.get('error') or not isinstance(data.get('data'), list):
        raise HTTPException(502, 'Route provider unavailable or invalid response')
    today = (now or datetime.now(timezone.utc)).date()
    dates = {str(today + timedelta(days=d)) for d in (-1, 0, 1)}
    matches = []
    for flight in data['data']:
        if not isinstance(flight, dict) or flight.get('flight_status') != 'active' or flight.get('flight_date') not in dates:
            continue
        if (flight.get('flight') or {}).get('icao', '').upper() != callsign:
            continue
        actual_reg = str((flight.get('aircraft') or {}).get('registration') or '').replace('-', '').upper()
        if registration and actual_reg != registration.replace('-', '').upper():
            continue
        departure, arrival = flight.get('departure') or {}, flight.get('arrival') or {}
        if not departure.get('icao') or not arrival.get('icao'):
            continue
        matches.append(dict(departure={k: departure.get(k) for k in ('airport', 'iata', 'icao', 'scheduled')},
                            arrival={k: arrival.get(k) for k in ('airport', 'iata', 'icao', 'scheduled')},
                            flightDate=flight['flight_date']))
    # Reused callsigns / multiple legs must not silently select an arbitrary flight.
    return matches[0] if len(matches) == 1 else None


async def aircraft_route(callsign, registration):
    key = os.getenv('AVIATIONSTACK_API_KEY')
    if not key:
        return {'status': 'unconfigured', 'route': None, 'source': 'aviationstack'}
    query = urlencode(dict(access_key=key, flight_icao=callsign, flight_status='active', limit=100))
    data = await cached_json('https://api.aviationstack.com/v1/flights?' + query, ttl=600)
    route = normalize_route(data, callsign, registration)
    return {'status': 'found' if route else 'unavailable', 'route': route, 'source': 'aviationstack'}
