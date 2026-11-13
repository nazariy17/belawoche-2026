"""Same-origin API. Provider integrations belong here, never in the browser."""

from typing import Literal
from fastapi import FastAPI, Query
from providers import traffic

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
        "callsignSearch": False,
        "registrationSearch": False,
        "routes": False,
        "weather": False,
        "demoAirport": {"icao": "LSZH", "name": "Zürich", "lat": 47.458, "lon": 8.555},
    }


@app.get('/api/traffic')
async def get_traffic(lat: float = Query(ge=-85, le=85), lon: float = Query(ge=-180, le=180), radius: Literal[10, 25, 50] = 25):
    return await traffic(lat, lon, radius)
