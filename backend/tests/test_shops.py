# backend/tests/test_shops.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_create_shop(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated admin/manager can create a new shop.
    """
    # ARRANGE: Get token and set headers
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    shop_data = {
        "name": "Local Electrical Supply",
        "address": "123 Main St, Anytown",
        "contact_person": "John Doe",
        "phone_number": "555-1234"
    }

    # ACT: Make the API call to create the shop
    response = client.post("/shops/", headers=headers, json=shop_data)
    
    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == shop_data["name"]
    assert data["address"] == shop_data["address"]
    assert "id" in data
    
    # Verify the shop exists in the database
    db_shop = crud.get_shop(db, shop_id=data["id"], tenant_id=authenticated_user_token["user"].tenant_id)
    assert db_shop is not None
    assert db_shop.name == shop_data["name"]


def test_get_shops(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that any authenticated user can retrieve the list of shops in their tenant.
    """
    # ARRANGE: Get user info, token, and create some shops directly in the DB
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    crud.create_shop(db, shop=schemas.ShopCreate(name="Shop A"), tenant_id=user.tenant_id)
    crud.create_shop(db, shop=schemas.ShopCreate(name="Shop B"), tenant_id=user.tenant_id)

    # ACT: Make the API call to get the list of shops
    response = client.get("/shops/", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()
    
    assert len(data) >= 2
    shop_names = [shop["name"] for shop in data]
    assert "Shop A" in shop_names
    assert "Shop B" in shop_names