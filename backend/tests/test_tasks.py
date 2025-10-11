# backend/tests/test_tasks.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_create_task(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated user with the correct role can create a new task.
    """
    # ARRANGE: Get user info, token, and create a project to add the task to.
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # A task needs a project, so we create one directly in the DB for this test.
    project_in = schemas.ProjectCreate(name="Project for Task Testing")
    db_project = crud.create_project(db, project=project_in, creator_id=user.id, tenant_id=user.tenant_id)

    task_data = {
        "title": "New Test Task",
        "description": "A task created during an automated test.",
        "project_id": db_project.id,
        "status": "To Do"
    }

    # ACT: Make the API call to create the task
    response = client.post("/tasks/", headers=headers, json=task_data)

    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["title"] == task_data["title"]
    assert data["project_id"] == db_project.id
    assert "id" in data

    # Verify the task was actually created in the database
    db_task = crud.get_task(db, task_id=data["id"])
    assert db_task is not None
    assert db_task.title == task_data["title"]


def test_get_tasks_for_project(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests retrieving a list of tasks filtered by a specific project.
    """
    # ARRANGE: Get user info, token, and create two projects with one task each.
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project1 = crud.create_project(db, project=schemas.ProjectCreate(name="Project 1"), creator_id=user.id, tenant_id=user.tenant_id)
    project2 = crud.create_project(db, project=schemas.ProjectCreate(name="Project 2"), creator_id=user.id, tenant_id=user.tenant_id)

    task1 = crud.create_task(db, task=schemas.TaskCreate(title="Task for Project 1", project_id=project1.id), project_tenant_id=user.tenant_id)
    crud.create_task(db, task=schemas.TaskCreate(title="Task for Project 2", project_id=project2.id), project_tenant_id=user.tenant_id)

    # ACT: Make the API call to get tasks for Project 1 only
    response = client.get(f"/tasks/?project_id={project1.id}", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()
    
    # We should get exactly one task
    assert len(data) == 1
    # And it should be the correct task
    assert data[0]["title"] == task1.title
    assert data[0]["project_id"] == project1.id