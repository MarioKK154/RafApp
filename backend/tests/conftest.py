# backend/tests/conftest.py

import pytest
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.main import app
from app.database import Base, get_db
from app import crud, schemas
from app.security import create_access_token

# Use a local SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure the test schema always matches the current models
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

@pytest.fixture(scope="function")
def db() -> Generator:
    """Fixture to provide a test database session for each test function."""
    connection = engine.connect()
    transaction = connection.begin()
    db_session = TestingSessionLocal(bind=connection)

    yield db_session

    db_session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db: Session) -> Generator:
    """Fixture to provide a TestClient for making API requests in tests."""

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- NEW AUTHENTICATION FIXTURE ---
@pytest.fixture(scope="function")
def authenticated_user_token(db: Session) -> Dict[str, Any]:
    """
    Creates a test tenant and a test admin user, then returns the user
    object and a valid JWT token for them.
    """
    # Ensure tenant exists
    tenant = crud.get_tenant(db, 1)
    if not tenant:
        tenant = crud.create_tenant(db, schemas.TenantCreate(name="Test Tenant"))

    # Ensure user exists
    test_email = "admin@test.com"
    test_password = "testpassword"
    user = crud.get_user_by_email(db, email=test_email)
    if not user:
        user_in = schemas.UserCreateAdmin(
            email=test_email,
            password=test_password,
            full_name="Test Admin",
            role="admin",
            tenant_id=tenant.id
        )
        user = crud.create_user_by_admin(db, user_data=user_in)

    # Generate token
    token = create_access_token(data={"sub": user.email})
    
    return {"user": user, "token": token}
# --- END NEW FIXTURE ---