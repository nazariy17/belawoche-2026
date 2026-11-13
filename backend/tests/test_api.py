from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_and_public_docs():
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/openapi.json").status_code == 200


def test_unimplemented_providers_are_not_advertised():
    capabilities = client.get("/api/capabilities").json()
    for feature in ("liveTraffic", "callsignSearch", "registrationSearch", "routes", "weather"):
        assert capabilities[feature] is False
    assert client.get("/api/unknown").status_code == 404
