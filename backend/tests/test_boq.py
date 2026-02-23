# backend/tests/test_boq.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_get_or_create_boq_for_project(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that a BoQ is automatically created for a project when requested for the first time.
    """
    # ARRANGE: Get user, token, and create a project that has no BoQ yet.
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project_in = schemas.ProjectCreate(name="Project for BoQ Test")
    db_project = crud.create_project(db, project=project_in, creator_id=user.id, tenant_id=user.tenant_id)

    # ACT: Make the API call to get the BoQ for the project
    response = client.get(f"/boq/project/{db_project.id}", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["project_id"] == db_project.id
    assert data["name"] == f"BoQ for {db_project.name}"
    assert data["items"] == []

    # Verify the BoQ was actually created in the database
    db_boq = crud.get_boq_by_project_id(db, project_id=db_project.id)
    assert db_boq is not None
    assert db_boq.id == data["id"]


def test_add_and_remove_item_from_boq(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests adding an item to a BoQ and then removing it.
    """
    # ARRANGE: Get user, token, create a project, and an inventory item.
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project_in = schemas.ProjectCreate(name="Project for BoQ Items Test")
    db_project = crud.create_project(db, project=project_in, creator_id=user.id, tenant_id=user.tenant_id)
    
    # Create a catalog inventory item (quantity is tracked per project, not in the catalog)
    inventory_item_in = schemas.InventoryItemCreate(name="BoQ Test Item")
    db_inventory_item = crud.create_inventory_item(db, item=inventory_item_in)

    # ACT 1: Add an item to the project's BoQ
    item_to_add = {
        "inventory_item_id": db_inventory_item.id,
        "quantity_required": 50.0
    }
    response_add = client.post(f"/boq/project/{db_project.id}/items", headers=headers, json=item_to_add)

    # ASSERT 1: Verify the item was added successfully
    assert response_add.status_code == 200, response_add.text
    data_add = response_add.json()
    assert len(data_add["items"]) == 1
    added_item = data_add["items"][0]
    assert added_item["inventory_item_id"] == db_inventory_item.id
    assert added_item["quantity_required"] == 50.0

    boq_item_id_to_remove = added_item["id"]

    # ACT 2: Remove the item from the BoQ
    response_remove = client.delete(f"/boq/items/{boq_item_id_to_remove}", headers=headers)

    # ASSERT 2: Verify the item was removed successfully
    assert response_remove.status_code == 204, response_remove.text

    # Verify by fetching the BoQ again that it's empty
    response_final = client.get(f"/boq/project/{db_project.id}", headers=headers)
    data_final = response_final.json()
    assert len(data_final["items"]) == 0