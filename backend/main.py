"""Same-origin API. Provider integrations belong here, never in the browser."""

from typing import Literal
from fastapi import FastAPI, Query, HTTPException
from providers import traffic, cached_json, normalize, weather

app = FastAPI(
    title="Ewan's flight radar",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "flight-radar-api"}


@app.get("/api/capabilities")
def capabilities() -> dict:
    """Only advertise features actually implemented and verified."""
    return {
        "liveTraffic": True,
        "callsignSearch": True,
        "registrationSearch": True,
        "routes": False,
        "weather": True,
        "demoAirport": {"icao": "LSZH", "name": "Zürich", "lat": 47.458, "lon": 8.555},
    }


@app.get('/api/traffic')
async def get_traffic(lat: float = Query(ge=-85, le=85), lon: float = Query(ge=-180, le=180), radius: int = Query(default=25, ge=10, le=50)):
    if radius not in (10, 25, 50):
        raise HTTPException(422, 'Radius must be 10, 25 or 50 km')
    return await traffic(lat, lon, radius)


@app.get('/api/aircraft/search')
async def search_aircraft(kind: Literal['callsign', 'registration'], q: str = Query(min_length=2, max_length=12, pattern=r'^[A-Za-z0-9-]+$')):
    endpoint = 'callsign' if kind == 'callsign' else 'reg'
    return normalize(await cached_json(f'https://api.adsb.lol/v2/{endpoint}/{q.upper()}', ttl=30))


@app.get('/api/weather')
async def get_weather(icao: str = Query(pattern=r'^[A-Za-z]{4}$')):
    return await weather(icao.upper())
