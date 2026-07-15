# backend/tests/test_piecework.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any

from app import models, crud

def test_piecework_flow_and_calculation_math(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Test the complete piecework settlement calculation flow, matching the specified mathematical model.
    """
    token = authenticated_user_token["token"]
    user = authenticated_user_token["user"]
    
    # 1. Upgrade user to superuser to create rates and tasks
    user.is_superuser = True
    db.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register PieceworkRate
    rate_payload = {
        "effective_from": datetime.now(timezone.utc).isoformat(),
        "effective_to": None,
        "base_wage_rate": 731.82,
        "tool_allowance": 41.71,
        "holiday_pay": 29.27,
        "attendance_pay": 19.54,
        "clothing_pay": 6.59,
        "sick_pay": 10.98,
        "reiknitala": 1000.0  # Set custom reiknitala for clean test math
    }
    rate_res = client.post("/piecework/rates", headers=headers, json=rate_payload)
    assert rate_res.status_code == 201, rate_res.text
    rate_id = rate_res.json()["id"]

    # 3. Create piecework task in catalog
    task_payload = {
        "id": "TASK-TEST-A",
        "category": "Conduits",
        "description_is": "Prófunarlögn A",
        "base_standard_hours": 2.0
    }
    task_res = client.post("/piecework/tasks", headers=headers, json=task_payload)
    assert task_res.status_code == 201, task_res.text

    # 4. Create a project
    project = models.Project(
        name="Test Piecework Jobsite",
        tenant_id=user.tenant_id,
        creator_id=user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 5. Log completed installation tasks with compound surcharges
    # Log 1: quantity = 10, height surcharge = True (+15%), occupied = False, concrete = False
    log1_payload = {
        "project_id": project.id,
        "catalog_task_id": "TASK-TEST-A",
        "quantity": 10.0,
        "has_height_surcharge": True,
        "has_concrete_surcharge": False,
        "is_occupied_space": False
    }
    log1_res = client.post(f"/piecework/projects/{project.id}/logs", headers=headers, json=log1_payload)
    assert log1_res.status_code == 201, log1_res.text

    # Log 2: quantity = 5, height = False, occupied = True (+10%), concrete = True (+25%)
    log2_payload = {
        "project_id": project.id,
        "catalog_task_id": "TASK-TEST-A",
        "quantity": 5.0,
        "has_height_surcharge": False,
        "has_concrete_surcharge": True,
        "is_occupied_space": True
    }
    log2_res = client.post(f"/api/piecework/projects/{project.id}/logs" if False else f"/piecework/projects/{project.id}/logs", headers=headers, json=log2_payload)
    assert log2_res.status_code == 201, log2_res.text

    # 6. Log physical electrician hours worked on-site
    # Log 1: 10 hours at 2000.0 ISK advance
    time_log1 = models.TimeLog(
        project_id=project.id,
        user_id=user.id,
        actual_hours=10.0,
        base_hourly_wage_paid=2000.0,
        start_time=datetime.now(timezone.utc)
    )
    # Log 2: 5 hours at 1500.0 ISK advance
    time_log2 = models.TimeLog(
        project_id=project.id,
        user_id=user.id,
        actual_hours=5.0,
        base_hourly_wage_paid=1500.0,
        start_time=datetime.now(timezone.utc)
    )
    db.add(time_log1)
    db.add(time_log2)
    db.commit()

    # 7. Get Settlement & Validate mathematics
    settlement_res = client.get(f"/piecework/projects/{project.id}/settlement", headers=headers)
    assert settlement_res.status_code == 200, settlement_res.text
    data = settlement_res.json()

    # MATH VERIFICATION:
    # Adjusted hours 1: 10 * 2.0 * 1.15 = 23.0 hours
    # Adjusted hours 2: 5 * 2.0 * 1.10 * 1.25 = 13.75 hours
    # Total Standard Hours: 23.0 + 13.75 = 36.75 hours
    assert abs(data["total_standard_hours"] - 36.75) < 0.001

    # Valuation: 36.75 * 1000.0 reiknitala = 36750.0 ISK
    assert abs(data["piecework_valuation"] - 36750.0) < 0.001

    # Physical hours: 10.0 + 5.0 = 15.0 hours
    assert abs(data["total_physical_hours_logged"] - 15.0) < 0.001

    # Advance Wages Paid: (10.0 * 2000) + (5.0 * 1500) = 27500.0 ISK
    assert abs(data["total_advance_wages_paid"] - 27500.0) < 0.001

    # Surplus/Bonus Pool: 36750.0 - 27500.0 = 9250.0 ISK
    assert abs(data["bonus_pool"] - 9250.0) < 0.001
    assert data["is_profitable_for_crew"] is True

    # 8. Certify project
    cert_res = client.post(f"/piecework/projects/{project.id}/certify", headers=headers)
    assert cert_res.status_code == 200
    assert cert_res.json()["certified"] is True
