"""Same-origin API. Provider integrations belong here, never in the browser."""

from fastapi import FastAPI

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
        "liveTraffic": False,
        "callsignSearch": False,
        "registrationSearch": False,
        "routes": False,
        "weather": False,
        "demoAirport": {"icao": "LSZH", "name": "Zürich", "lat": 47.458, "lon": 8.555},
    }
