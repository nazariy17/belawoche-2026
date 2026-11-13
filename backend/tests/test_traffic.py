import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import providers
from main import app


def test_coordinate_validation_prevents_upstream_requests():
    client = TestClient(app)
    assert client.get('/api/traffic?lat=99&lon=8&radius=25').status_code == 422
    assert client.get('/api/traffic?lat=47&lon=8&radius=999').status_code == 422


def test_units_observation_age_and_missing_values():
    result = providers.normalize({'now': 100_000, 'ac': [dict(hex='abc123', lat=47, lon=8, seen_pos=2, flight='SWR123 ', alt_baro='ground', mag_heading=100)]})['aircraft'][0]
    assert result['observedAt'] == 98000
    assert result['altitudeFt'] == 0
    assert result['heading'] is None
    assert result['callsign'] == 'SWR123'
    assert result['speedKt'] is None


def test_provider_failure_is_not_reported_as_empty():
    with pytest.raises(HTTPException) as error:
        providers.normalize({'error': 'unavailable'})
    assert error.value.status_code == 502


def test_cache_and_rate_limit_cooldown():
    async def check():
        providers.CACHE.clear()
        providers.COOLDOWNS.clear()
        url = 'https://api.adsb.lol/v2/point/47/8/14'
        ok = httpx.Response(200, json={'ac': [], 'now': 1000}, request=httpx.Request('GET', url))
        limited = httpx.Response(429, headers={'Retry-After': '120'}, request=httpx.Request('GET', url))
        with patch('httpx.AsyncClient.get', new=AsyncMock(return_value=ok)) as get:
            await providers.cached_json(url)
            await providers.cached_json(url)
            assert get.await_count == 1
        providers.CACHE.clear()
        with patch('httpx.AsyncClient.get', new=AsyncMock(return_value=limited)) as get:
            for _ in range(2):
                with pytest.raises(HTTPException) as error:
                    await providers.cached_json(url)
                assert error.value.status_code == 429
            assert get.await_count == 1
        providers.COOLDOWNS.clear()
    asyncio.run(check())


def test_nearby_cache_query_uses_nm_and_filters_exact_distance():
    async def check():
        data = {'now': 1000, 'ac': [dict(hex='near', lat=47.458, lon=8.555, seen_pos=0), dict(hex='far', lat=48, lon=8.555, seen_pos=0)]}
        with patch('providers.cached_json', new=AsyncMock(return_value=data)) as get:
            result = await providers.traffic(47.458, 8.555, 25)
            assert [a['id'] for a in result['aircraft']] == ['near']
            assert get.call_args.args[0].endswith('/17')
    asyncio.run(check())
