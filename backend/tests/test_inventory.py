# backend/tests/test_inventory.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_create_inventory_item(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated superuser can create a new inventory item.
    """
    # ARRANGE: Upgrade user to superuser
    user = authenticated_user_token["user"]
    user.is_superuser = True
    db.commit()

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

def test_dynamic_shop_url_updates(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that only a superuser can update dynamic shop_url_* fields.
    """
    from app.security import create_access_token
    from app import models

    # ARRANGE: Get token and headers for the admin user
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a superuser directly in the DB
    superuser_email = "superuser@test.com"
    superuser = crud.get_user_by_email(db, email=superuser_email)
    if not superuser:
        superuser = crud.create_user_by_admin(
            db,
            user_data=schemas.UserCreateAdmin(
                email=superuser_email,
                password="superpassword",
                full_name="Super User",
                role="admin",
                tenant_id=1,
                is_superuser=True
            )
        )
    super_token = create_access_token(data={"sub": str(superuser.id)})
    super_headers = {"Authorization": f"Bearer {super_token}"}

    # Add dynamic shop column for shop id 999
    models.add_dynamic_shop_column(db, 999)
    
    # Create an inventory item
    item = crud.create_inventory_item(db, item=schemas.InventoryItemCreate(name="Dynamic Item"))
    
    # ACT & ASSERT: Try to update as admin (should fail with 403 Forbidden)
    update_payload = {
        "name": "Updated Name",
        "shop_url_999": "https://nonsuperuser.com/item"
    }
    response = client.put(f"/inventory/catalog/{item.id}", headers=headers, json=update_payload)
    assert response.status_code == 403

    # ACT & ASSERT: Try to update shop_url_999 as superuser (should succeed)
    super_update_payload = {
        "shop_url_999": "https://superuser.com/item"
    }
    response = client.put(f"/inventory/catalog/{item.id}", headers=super_headers, json=super_update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("shop_url_999") == "https://superuser.com/item"