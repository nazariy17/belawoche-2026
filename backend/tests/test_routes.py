import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app
from routes import aircraft_route, normalize_route

NOW = datetime(2026, 11, 13, tzinfo=timezone.utc)
FLIGHT = {'flight_status': 'active', 'flight_date': '2026-11-13', 'flight': {'icao': 'SWR123'},
          'aircraft': {'registration': 'HB-JCA'}, 'departure': {'icao': 'LSZH', 'iata': 'ZRH'},
          'arrival': {'icao': 'EGLL', 'iata': 'LHR'}}


def test_unique_current_route_with_matching_aircraft():
    route = normalize_route({'data': [FLIGHT]}, 'SWR123', 'HBJCA', NOW)
    assert route['departure']['iata'] == 'ZRH'
    assert route['arrival']['iata'] == 'LHR'


def test_wrong_registration_old_flight_and_ambiguous_matches():
    assert normalize_route({'data': [FLIGHT]}, 'SWR123', 'HB-JCB', NOW) is None
    assert normalize_route({'data': [FLIGHT, FLIGHT]}, 'SWR123', 'HBJCA', NOW) is None
    old = deepcopy(FLIGHT)
    old['flight_date'] = '2026-10-01'
    assert normalize_route({'data': [old]}, 'SWR123', 'HBJCA', NOW) is None
    assert normalize_route({'data': [FLIGHT]}, 'SWR999', 'HBJCA', NOW) is None


def test_no_credentials_makes_no_external_request():
    with patch.dict('os.environ', {}, clear=True), patch('routes.cached_json', new=AsyncMock()) as upstream:
        assert asyncio.run(aircraft_route('SWR123', 'HB-JCA'))['status'] == 'unconfigured'
        upstream.assert_not_called()
    assert TestClient(app).get('/api/aircraft/route?callsign=../invalid').status_code == 422
