import asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app
from providers import weather


def test_weather_no_report_is_distinct_from_error():
    with patch('providers.cached_json', new=AsyncMock(return_value=[])):
        assert asyncio.run(weather('LSZH'))['report'] is None


def test_weather_keeps_station_time_and_visibility_units():
    report = {'icaoId': 'LSZH', 'obsTime': 1000, 'wdir': 'VRB', 'wspd': 3, 'visib': '6+', 'rawOb': 'TEST METAR'}
    with patch('providers.cached_json', new=AsyncMock(return_value=[report])):
        result = asyncio.run(weather('LSZH'))
    assert result['report']['observedAt'] == 1000000
    assert result['report']['windDirection'] == 'VRB'
    assert result['report']['visibilityMiles'] == '6+'
    assert TestClient(app).get('/api/weather?icao=../../other').status_code == 422


def test_cloud_layers_gusts_and_variable_sector():
    report = {'icaoId': 'LSZH', 'obsTime': 1000, 'wdir': 70, 'wspd': 9, 'wgst': 18,
              'clouds': [{'cover': 'BKN', 'base': 3000}, {'cover': 'OVC', 'base': None}],
              'rawOb': '07009G18KT 010V110 BKN030'}
    with patch('providers.cached_json', new=AsyncMock(return_value=[report])):
        result = asyncio.run(weather('LSZH'))['report']
    assert result['variableWind'] is True
    assert result['windGustKt'] == 18
    assert result['clouds'] == [{'cover': 'BKN', 'baseFt': 3000}, {'cover': 'OVC', 'baseFt': None}]
