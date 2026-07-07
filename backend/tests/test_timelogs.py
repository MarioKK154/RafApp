# backend/tests/test_timelogs.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas

def test_clock_in_and_clock_out(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests the full clock-in -> get status -> clock-out -> get status lifecycle.
    """
    # ARRANGE: Get user, token, and a project to log time against.
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    project_in = schemas.ProjectCreate(name="Project for Time Log Test")
    db_project = crud.create_project(db, project=project_in, creator_id=user.id, tenant_id=user.tenant_id)

    # ACT 1: Clock in
    clock_in_data = {"project_id": db_project.id}
    response_clock_in = client.post("/timelogs/clock-in", headers=headers, json=clock_in_data)

    # ASSERT 1: Verify clock-in was successful
    assert response_clock_in.status_code == 201, response_clock_in.text
    clock_in_data = response_clock_in.json()
    assert clock_in_data["project_id"] == db_project.id
    assert clock_in_data["user_id"] == user.id
    assert clock_in_data["end_time"] is None # Crucially, end_time should be null

    # ACT 2: Check the status endpoint
    response_status_1 = client.get("/timelogs/status", headers=headers)

    # ASSERT 2: Verify user is clocked in
    assert response_status_1.status_code == 200, response_status_1.text
    status_data_1 = response_status_1.json()
    assert status_data_1["is_clocked_in"] is True
    assert status_data_1["current_log"]["id"] == clock_in_data["id"]

    # ACT 3: Clock out
    response_clock_out = client.post(
        "/timelogs/clock-out",
        headers=headers,
        json={"notes": "Finished work on time log test"},
    )

    # ASSERT 3: Verify clock-out was successful
    assert response_clock_out.status_code == 200, response_clock_out.text
    clock_out_data = response_clock_out.json()
    assert clock_out_data["id"] == clock_in_data["id"]
    assert clock_out_data["end_time"] is not None # end_time should now be populated
    assert clock_out_data["duration"] is not None # duration should be calculated

    # ACT 4: Check the status endpoint again
    response_status_2 = client.get("/timelogs/status", headers=headers)

    # ASSERT 4: Verify user is now clocked out
    assert response_status_2.status_code == 200, response_status_2.text
    status_data_2 = response_status_2.json()
    assert status_data_2["is_clocked_in"] is False
    assert status_data_2["current_log"] is None

    # ACT 5: Upgrade user to Project Manager and adjust travel hours
    user.role = "project manager"
    db.commit()

    res_patch = client.patch(
        f"/timelogs/{clock_out_data['id']}",
        headers=headers,
        json={"travel_hours": 1.5, "notes": "Adjusted travel time"},
    )

    # ASSERT 5: Verify PATCH succeeded and recalculated billable hours
    assert res_patch.status_code == 200, res_patch.text
    patched = res_patch.json()
    assert patched["travel_hours"] == 1.5
    assert patched["notes"] == "Adjusted travel time"
    # duration_hours is total time logged
    duration_hours = patched["duration_hours"]
    assert duration_hours is not None
    # billable_hours should be max(0.0, duration_hours - 1.5)
    expected_billable = max(0.0, round(duration_hours - 1.5, 2))
    assert patched["billable_hours"] == expected_billable