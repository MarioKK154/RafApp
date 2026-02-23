# backend/tests/test_inventory.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_create_inventory_item(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated admin can create a new inventory item.
    Note: Our fixture provides an 'admin' role, which satisfies the permission check.
    """
    # ARRANGE: Get token and set headers
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    item_data = {
        "name": "Test Cable 500m",
        "description": "A reel of cable for testing.",
        "unit": "m"
    }

    # ACT: Make the API call to create the catalog inventory item
    response = client.post("/inventory/catalog", headers=headers, json=item_data)
    
    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == item_data["name"]
    assert "id" in data
    
    # Verify the item exists in the database
    db_item = crud.get_inventory_item(db, item_id=data["id"])
    assert db_item is not None
    assert db_item.name == item_data["name"]


def test_get_inventory_items(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that any authenticated user can retrieve the list of inventory items.
    """
    # ARRANGE: Get token and headers, and create some items directly in the DB
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a couple of catalog items to ensure the list endpoint works
    crud.create_inventory_item(db, item=schemas.InventoryItemCreate(name="Item A"))
    crud.create_inventory_item(db, item=schemas.InventoryItemCreate(name="Item B"))

    # ACT: Make the API call to get the list of catalog items
    response = client.get("/inventory/catalog", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()
    
    # The list should contain at least the two items we created
    assert len(data) >= 2
    item_names = [item["name"] for item in data]
    assert "Item A" in item_names
    assert "Item B" in item_names