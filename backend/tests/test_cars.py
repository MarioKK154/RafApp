# backend/tests/test_cars.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas, models

def test_create_car(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests that an authenticated admin/manager can create a new car.
    """
    # ARRANGE: Get token and set headers
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    car_data = {
        "make": "Volkswagen",
        "model": "Transporter",
        "year": 2023,
        "license_plate": "TEST-123",
        "vin": "WV123TESTVIN456"
    }

    # ACT: Make the API call to create the car
    response = client.post("/cars/", headers=headers, json=car_data)
    
    # ASSERT: Check the results
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["make"] == car_data["make"]
    assert data["license_plate"] == car_data["license_plate"]
    assert "id" in data
    
    # Verify the car exists in the database
    db_car = crud.get_car(db, car_id=data["id"], tenant_id=authenticated_user_token["user"].tenant_id)
    assert db_car is not None
    assert db_car.make == car_data["make"]


def test_checkout_and_checkin_car(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Tests the full checkout and checkin lifecycle of a car, including log creation.
    """
    # ARRANGE: Get user info, token, and create a car directly in the DB
    user = authenticated_user_token["user"]
    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    car_in = schemas.CarCreate(make="Ford", model="Transit", license_plate="TEST-456")
    db_car = crud.create_car(db, car=car_in, tenant_id=user.tenant_id)
    crud.create_car_log(db, car_id=db_car.id, user_id=user.id, action=models.CarLogAction.Created, notes="Initial creation.")
    
    assert db_car.status == models.CarStatus.Available
    assert db_car.current_user_id is None

    # ACT 1: Check out the car
    checkout_data = {"odometer_reading": 50000}
    response_checkout = client.post(f"/cars/{db_car.id}/checkout", headers=headers, json=checkout_data)

    # ASSERT 1: Verify the checkout was successful
    assert response_checkout.status_code == 200, response_checkout.text
    data_checkout = response_checkout.json()
    assert data_checkout["status"] == "Checked Out"
    assert data_checkout["current_user_id"] == user.id

    # ACT 2: Check in the car
    checkin_data = {"odometer_reading": 50500, "notes": "Returned after project X."}
    response_checkin = client.post(f"/cars/{db_car.id}/checkin", headers=headers, json=checkin_data)

    # ASSERT 2: Verify the checkin was successful
    assert response_checkin.status_code == 200, response_checkin.text
    data_checkin = response_checkin.json()
    assert data_checkin["status"] == "Available"
    assert data_checkin["current_user_id"] is None
    
    # ASSERT 3: Verify history logs were created
    db.refresh(db_car, attribute_names=["history_logs"])
    assert len(db_car.history_logs) == 3 # Created, Checked Out, Checked In
    log_actions = [log.action.value for log in db_car.history_logs]
    assert "Checked Out" in log_actions
    assert "Checked In" in log_actions