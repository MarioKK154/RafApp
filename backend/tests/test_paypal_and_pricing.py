# backend/tests/test_paypal_and_pricing.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Dict, Any
from unittest.mock import MagicMock

from app import crud, schemas, models

def test_get_paypal_client_id(client: TestClient):
    """
    Verifies that the public /system/paypal-client-id endpoint works and returns the client id.
    """
    response = client.get("/system/paypal-client-id")
    assert response.status_code == 200, response.text
    data = response.json()
    assert "client_id" in data
    assert isinstance(data["client_id"], str)


def test_paypal_endpoints_require_authentication(client: TestClient):
    """
    Verifies that invoice paypal endpoints require proper authentication.
    """
    response = client.post("/system/my-tenant/invoices/1/paypal-order")
    assert response.status_code == 401, "Expected unauthorized response without token"

    response = client.post("/system/my-tenant/invoices/1/paypal-capture", json={"order_id": "mock_id"})
    assert response.status_code == 401, "Expected unauthorized response without token"


def test_paypal_order_flow_success(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session, monkeypatch):
    """
    Mocks PayPal API endpoints to test the end-to-end PayPal Smart Button order creation
    and capture flow in the system router.
    """
    # Override settings using environment variables and clear lru_cache
    monkeypatch.setenv("PAYPAL_CLIENT_ID", "mock_paypal_client_id")
    monkeypatch.setenv("PAYPAL_CLIENT_SECRET", "mock_paypal_client_secret")
    from app.config import get_settings
    get_settings.cache_clear()

    try:
        user = authenticated_user_token["user"]
        token = authenticated_user_token["token"]
        headers = {"Authorization": f"Bearer {token}"}
        tenant_id = user.tenant_id

        # 1. Create a mock pending invoice in the test database for the user's tenant
        invoice_in = schemas.BillingInvoiceCreate(
            tenant_id=tenant_id,
            amount=16390.0,
            currency="ISK",
            due_date=date.today(),
            status="Pending",
            provider="manual",
            description="Test Subscription Invoice"
        )
        db_invoice = crud.create_billing_invoice(db, invoice=invoice_in)

        # 2. Mock external requests calls for getting access token, creating order, and capturing order
        mock_post = MagicMock()
        
        class MockResponse:
            def __init__(self, json_data, status_code):
                self.json_data = json_data
                self.status_code = status_code
                self.text = str(json_data)
                
            def json(self):
                return self.json_data

        def side_effect(url, headers=None, json=None, data=None, auth=None):
            if "/v1/oauth2/token" in url:
                return MockResponse({"access_token": "mock_access_token"}, 200)
            elif "/v2/checkout/orders" in url and url.endswith("/v2/checkout/orders"):
                return MockResponse({"id": "mock_paypal_order_12345"}, 201)
            elif url.endswith("/capture"):
                return MockResponse({"status": "COMPLETED", "id": "mock_paypal_capture_12345"}, 201)
            return MockResponse({"error": "not found"}, 404)

        mock_post.side_effect = side_effect
        
        # Apply monkeypatch to mock requests.post in routers.system
        import requests
        monkeypatch.setattr(requests, "post", mock_post)

        # 3. Create PayPal Order via Endpoint
        order_res = client.post(
            f"/system/my-tenant/invoices/{db_invoice.id}/paypal-order",
            headers=headers
        )
        assert order_res.status_code == 200, order_res.text
        order_data = order_res.json()
        assert order_data["order_id"] == "mock_paypal_order_12345"

        # 4. Capture PayPal Order via Endpoint
        capture_res = client.post(
            f"/system/my-tenant/invoices/{db_invoice.id}/paypal-capture",
            headers=headers,
            json={"order_id": "mock_paypal_order_12345"}
        )
        assert capture_res.status_code == 200, capture_res.text
        capture_data = capture_res.json()
        assert capture_data["status"] == "COMPLETED"
        assert capture_data["invoice"]["status"] == "Paid"

        # 5. Check database to ensure invoice status is updated to Paid with provider set to paypal
        db.refresh(db_invoice)
        assert db_invoice.status == "Paid"
        assert db_invoice.provider == "paypal"
        assert db_invoice.paid_at is not None
    finally:
        get_settings.cache_clear()
