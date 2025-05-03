# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(security.get_current_active_user)] # Base auth check
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
AdminOnlyDependency = Annotated[models.User, Depends(security.require_admin)]

@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(current_user: CurrentUserDependency):
    """Fetches the profile of the currently authenticated user."""
    return current_user

# Get specific user by ID (Requires Manager or Admin)
@router.get("/{user_id}", response_model=schemas.UserRead)
async def read_single_user(
    user_id: int,
    db: DbDependency,
    current_viewer: ManagerOrAdminDependency
):
    """Retrieves details for a specific user by ID (Requires Manager or Admin role)."""
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

# List all users (Requires Manager or Admin)
@router.get("/", response_model=List[schemas.UserRead])
async def read_users(
    db: DbDependency,
    current_admin_or_manager: ManagerOrAdminDependency,
    skip: int = 0,
    limit: int = 100
):
    """Retrieves a list of users (Requires Manager or Admin role)."""
    users = crud.get_users(db=db, skip=skip, limit=limit)
    return users

# --- NEW: Admin Endpoint to Create User ---
@router.post("/", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user_by_admin(
    user_create_data: schemas.UserCreateAdmin, # Use the new schema for input
    db: DbDependency,
    current_admin: AdminOnlyDependency # Ensure ONLY admin can call this
):
    """Creates a new user (Requires Admin role). Allows setting role etc."""
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, email=user_create_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Call the new CRUD function
    new_user = crud.create_user_by_admin(db=db, user_data=user_create_data)
    return new_user

# Update User by Admin (as before)
@router.put("/{user_id}", response_model=schemas.UserRead)
async def update_user_details_by_admin(
    user_id: int,
    user_update_data: schemas.UserUpdateAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency
):
    """Updates a user's details (role, active status, etc.) by an administrator (Requires Admin role)."""
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updated_user = crud.update_user_by_admin(db=db, user_to_update=db_user, user_data=user_update_data)
    return updated_user

# TODO: Add endpoint for Admin to DELETE user? DELETE /users/{user_id} require_admin