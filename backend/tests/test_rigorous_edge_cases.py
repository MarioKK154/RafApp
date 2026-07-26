import pytest
from fastapi.testclient import TestClient

def test_unauthenticated_request_rejected(client: TestClient):
    """Verify endpoints enforce authentication requirement."""
    res = client.get("/projects/")
    assert res.status_code == 401

def test_tampered_jwt_token_rejected(client: TestClient):
    """Verify tampered JWT signature is rejected immediately with 401."""
    headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature"}
    res = client.get("/projects/", headers=headers)
    assert res.status_code == 401

def test_sql_injection_attempt_in_search(client: TestClient, auth_headers: dict):
    """Verify SQL injection strings are safely parameterized and sanitized."""
    injection_queries = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "SELECT * FROM tenants WHERE 'a'='a'",
        "<script>alert(1)</script>"
    ]
    for query in injection_queries:
        res = client.get(f"/projects/?search={query}", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

def test_icelandic_unicode_character_payloads(client: TestClient, auth_headers: dict):
    """Verify full Icelandic alphabet and special characters are preserved without encoding corruption."""
    icelandic_title = "Verkefni Þórsmerkur Ægisgötu 42 (Önundarfjörður & Hafnarfjörður)"
    res = client.post("/projects/", json={
        "name": icelandic_title,
        "description": "Lýsing með öllum íslenskum stöfum: þæöð ÞÆÖÐ - 100% prófað.",
        "status": "active"
    }, headers=auth_headers)
    assert res.status_code in [200, 201]
    data = res.json()
    assert data["name"] == icelandic_title

def test_invalid_date_format_rejection(client: TestClient, auth_headers: dict):
    """Verify invalid date strings return 422 validation errors."""
    res = client.post("/tasks/", json={
        "title": "Invalid Date Task",
        "project_id": 1,
        "due_date": "invalid-2026-99-99"
    }, headers=auth_headers)
    assert res.status_code == 422

def test_nonexistent_entity_404(client: TestClient, auth_headers: dict):
    """Verify requesting non-existent IDs yields clean 404 responses."""
    assert client.get("/projects/9999999", headers=auth_headers).status_code == 404
    assert client.get("/tasks/9999999", headers=auth_headers).status_code == 404
    assert client.get("/tools/9999999", headers=auth_headers).status_code == 404
    assert client.get("/cars/9999999", headers=auth_headers).status_code == 404
