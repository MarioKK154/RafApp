# backend/tests/test_tools.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas, models

def test_create_tool(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated admin/manager can create a new tool.
    Our fixture provides an 'admin' user, which satisfies the permission check.
    """
    # ARRANGE: Get token and set headers
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    tool_data = {
        "name": "Hilti TE 70-ATC/AVR",
        "brand": "Hilti",
        "model": "TE 70",
        "serial_number": "SN-12345XYZ"
    }

    # ACT: Make the API call to create the tool
    response = client.post("/tools/", headers=headers, json=tool_data)
    
    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == tool_data["name"]
    assert data["brand"] == tool_data["brand"]
    assert "id" in data
    
    # Verify the tool exists in the database
    db_tool = crud.get_tool(db, tool_id=data["id"], tenant_id=authenticated_user_token["user"].tenant_id)
    assert db_tool is not None
    assert db_tool.name == tool_data["name"]


def test_checkout_and_checkin_tool(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests the full checkout and checkin lifecycle of a tool.
    """
    # ARRANGE: Get user info, token, and create a tool directly in the DB
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    tool_in = schemas.ToolCreate(name="Cordless Drill", brand="DeWalt")
    db_tool = crud.create_tool(db, tool=tool_in, tenant_id=user.tenant_id)
    
    # Assert initial state
    assert db_tool.status == models.ToolStatus.Available
    assert db_tool.current_user_id is None

    # ACT 1: Check out the tool
    response_checkout = client.post(f"/tools/{db_tool.id}/checkout", headers=headers)

    # ASSERT 1: Verify the checkout was successful
    assert response_checkout.status_code == 200, response_checkout.text
    data_checkout = response_checkout.json()
    assert data_checkout["status"] == "In Use"
    assert data_checkout["current_user_id"] == user.id

    # ACT 2: Check in the tool
    response_checkin = client.post(f"/tools/{db_tool.id}/checkin", headers=headers)

    # ASSERT 2: Verify the checkin was successful
    assert response_checkin.status_code == 200, response_checkin.text
    data_checkin = response_checkin.json()
    assert data_checkin["status"] == "Available"
    assert data_checkin["current_user_id"] is None