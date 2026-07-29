# backend/tests/test_offer_bundles_and_einingar.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import models

def test_offer_bundle_and_custom_items_flow(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    token = authenticated_user_token["token"]
    user = authenticated_user_token["user"]
    user.is_superuser = True
    db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Project
    project = models.Project(
        name="Offer Engine Jobsite",
        tenant_id=user.tenant_id,
        creator_id=user.id
    )
    db.add(project); db.commit(); db.refresh(project)

    # 2. Create a Draft Offer
    offer_res = client.post("/offers/", headers=headers, json={
        "project_id": project.id,
        "title": "Commercial Electrical Proposal",
        "client_name": "Tengill ehf.",
        "status": "Draft"
    })
    assert offer_res.status_code == 201, offer_res.text
    offer_id = offer_res.json()["id"]

    # 3. Add Custom Material Item without inventory_item_id
    mat_res = client.post(f"/offers/{offer_id}/items", headers=headers, json={
        "item_type": "Material",
        "description": "Ísetningardós í steypu (SART E-001)",
        "quantity": 10,
        "unit_price": 450,
        "unit": "stk",
        "eining_value": 0.15
    })
    assert mat_res.status_code == 201, mat_res.text
    mat_data = mat_res.json()
    assert mat_data["quantity"] == 10
    assert mat_data["unit_price"] == 450
    assert mat_data["total_price"] == 4500
    assert mat_data["unit"] == "stk"

    # 4. Add Labor Item
    labor_res = client.post(f"/offers/{offer_id}/items", headers=headers, json={
        "item_type": "Labor",
        "description": "Frágangur og tengingar (SART Taxti)",
        "quantity": 5.0,
        "unit_price": 12500,
        "unit": "klst",
        "eining_value": 1.0
    })
    assert labor_res.status_code == 201, labor_res.text
    labor_data = labor_res.json()
    assert labor_data["total_price"] == 62500

    # 5. Fetch Full Offer and Check Total Valuation
    get_res = client.get(f"/offers/{offer_id}", headers=headers)
    assert get_res.status_code == 200
    full_offer = get_res.json()
    assert full_offer["total_amount"] == 4500 + 62500
    assert len(full_offer["line_items"]) == 2
