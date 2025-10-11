# backend/tests/test_auth.py

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import crud, schemas
from app.security import get_password_hash

def test_login_for_access_token(client: TestClient, db: Session):
    """
    Tests the /auth/token endpoint to ensure a user can log in and receive a token.
    """
    # 1. ARRANGE: Create a test user directly in the test database
    test_email = "test@example.com"
    test_password = "testpassword123"
    
    # First, ensure there isn't a user with this email from a previous failed test
    user_in_db = crud.get_user_by_email(db, email=test_email)
    if user_in_db:
        db.delete(user_in_db)
        db.commit()

    # Create a user to log in with
    user_create = schemas.UserCreateAdmin(
        email=test_email,
        password=test_password,
        full_name="Test User",
        role="admin",
        is_superuser=False,
        tenant_id=1  # Assuming a tenant with ID 1 exists, or create one for testing
    )
    # We create a dummy tenant here if it doesn't exist, to satisfy the foreign key
    tenant = crud.get_tenant(db, 1)
    if not tenant:
        crud.create_tenant(db, schemas.TenantCreate(name="Test Tenant"))

    crud.create_user_by_admin(db, user_data=user_create)

    # 2. ACT: Make a POST request to the login endpoint
    response = client.post(
        "/auth/token",
        data={"username": test_email, "password": test_password}
    )

    # 3. ASSERT: Check if the response is correct
    assert response.status_code == 200, f"Expected status 200, but got {response.status_code}. Response: {response.text}"
    
    response_data = response.json()
    assert "access_token" in response_data
    assert response_data["token_type"] == "bearer"