# backend/tests/test_reports.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime, timezone, timedelta # <-- CORRECTED IMPORT

from app import crud, schemas, models

def test_get_project_cost_summary_report(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests the project cost summary report by creating users, a project, and time logs,
    then verifying the calculated costs.
    """
    # ARRANGE: Get admin user, token, and headers
    admin_user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    tenant_id = admin_user.tenant_id

    # 1. Create a project with a budget
    project_in = schemas.ProjectCreate(name="Reporting Test Project", budget=100000.0)
    db_project = crud.create_project(db, project=project_in, creator_id=admin_user.id, tenant_id=tenant_id)

    # 2. Create a test user with an hourly rate
    user1_in = schemas.UserCreateAdmin(
        email="worker1@test.com", password="password", full_name="Worker One",
        role="electrician", tenant_id=tenant_id, hourly_rate=50.0
    )
    user1 = crud.create_user_by_admin(db, user_data=user1_in)

    # 3. Create time logs for the user on this project
    # --- CORRECTED LINES using the direct imports ---
    log1 = models.TimeLog(
        user_id=user1.id,
        project_id=db_project.id,
        start_time=datetime.now(timezone.utc) - timedelta(hours=3),
        end_time=datetime.now(timezone.utc) - timedelta(hours=1),
        duration=timedelta(hours=2)
    )
    log2 = models.TimeLog(
        user_id=user1.id,
        project_id=db_project.id,
        start_time=datetime.now(timezone.utc) - timedelta(hours=6),
        end_time=datetime.now(timezone.utc) - timedelta(hours=4.5),
        duration=timedelta(hours=1.5)
    )
    # --- END CORRECTION ---
    db.add_all([log1, log2])
    db.commit()

    # ACT: Make the API call to the reporting endpoint
    response = client.get(f"/reports/project-summary/{db_project.id}", headers=headers)

    # ASSERT: Check the results
    assert response.status_code == 200, response.text
    data = response.json()

    # Verify the summary calculations
    assert data["project_id"] == db_project.id
    assert data["budget"] == 100000.0
    assert data["total_hours"] == 3.5  # 2 + 1.5 hours
    
    # Expected cost = 3.5 hours * 50.0/hr = 175.0
    assert data["calculated_cost"] == 175.0
    
    # Expected variance = 100000.0 - 175.0 = 99825.0
    assert data["variance"] == 99825.0
    
    # Verify the detailed logs
    assert len(data["detailed_logs"]) == 2
    log_costs = [log["cost"] for log in data["detailed_logs"]]
    assert 100.0 in log_costs  # 2 hours * 50.0
    assert 75.0 in log_costs   # 1.5 hours * 50.0