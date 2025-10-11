# backend/tests/test_projects.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_create_project(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated admin can successfully create a new project.
    """
    # ARRANGE: Get the token from our fixture
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    project_data = {
        "name": "New Test Project",
        "description": "A project created during an automated test.",
        "status": "Planning",
        "budget": 50000.0
    }

    # ACT: Make the API call to create the project
    response = client.post("/projects/", headers=headers, json=project_data)
    
    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == project_data["name"]
    assert data["description"] == project_data["description"]
    assert "id" in data
    
    # Verify the project was actually created in the database
    db_project = crud.get_project(db, project_id=data["id"], tenant_id=authenticated_user_token["user"].tenant_id)
    assert db_project is not None
    assert db_project.name == project_data["name"]


def test_get_project(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated user can retrieve a project from their tenant.
    """
    # ARRANGE: Get user info and token, and create a project directly in the DB
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project_in = schemas.ProjectCreate(name="Project to Retrieve")
    db_project = crud.create_project(db, project=project_in, creator_id=user.id, tenant_id=user.tenant_id)

    # ACT: Make the API call to get the project
    response = client.get(f"/projects/{db_project.id}", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["name"] == db_project.name
    assert data["id"] == db_project.id