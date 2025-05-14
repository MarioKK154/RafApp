# backend/app/routers/users.py
# FINAL Uncondensed Version: Includes DELETE /users/{user_id}
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(security.get_current_active_user)] # Base auth check for all user routes
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
AdminOnlyDependency = Annotated[models.User, Depends(security.require_admin)]


@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(
    current_user: CurrentUserDependency
):
    """
    Fetches the profile of the currently authenticated user.
    """
    return current_user

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    password_data: schemas.UserChangePassword,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Allows the currently authenticated user to change their own password."""
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    # Basic validation for new password (Pydantic schema already checks min_length)
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password."
        )

    crud.update_user_password(db=db, user=current_user, new_password=password_data.new_password)
    # No content returned for 204
    return None


@router.get("/{user_id}", response_model=schemas.UserRead)
async def read_single_user(
    user_id: int,
    db: DbDependency,
    current_viewer: ManagerOrAdminDependency # Require Manager/Admin to view arbitrary users
):
    """
    Retrieves details for a specific user by ID.
    (Requires Manager or Admin role).
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.get("/", response_model=List[schemas.UserRead])
async def read_users(
    db: DbDependency,
    current_admin_or_manager: ManagerOrAdminDependency, # Parameter order corrected
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieves a list of users.
    (Requires Manager or Admin role).
    """
    users = crud.get_users(db=db, skip=skip, limit=limit)
    return users


@router.post("/", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user_by_admin(
    user_create_data: schemas.UserCreateAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency # Ensure ONLY admin can call this
):
    """
    Creates a new user by an administrator. Allows setting role, active status, etc.
    (Requires Admin role).
    """
    existing_user = crud.get_user_by_email(db, email=user_create_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    new_user = crud.create_user_by_admin(db=db, user_data=user_create_data)
    return new_user


@router.put("/{user_id}", response_model=schemas.UserRead)
async def update_user_details_by_admin(
    user_id: int,
    user_update_data: schemas.UserUpdateAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency # Ensure ONLY admin can call this
):
    """
    Updates a user's details (role, active status, etc.) by an administrator.
    (Requires Admin role).
    """
    db_user_to_update = crud.get_user(db, user_id=user_id)
    if not db_user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to update not found")
    
    # Optional safety checks (example)
    # if db_user_to_update.id == current_admin.id and \
    #    'is_active' in user_update_data.model_dump(exclude_unset=True) and \
    #    not user_update_data.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot deactivate their own account.")
    # if db_user_to_update.id == current_admin.id and \
    #    'role' in user_update_data.model_dump(exclude_unset=True) and \
    #    user_update_data.role != 'admin':
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot change their own role from 'admin'.")

    updated_user = crud.update_user_by_admin(db=db, user_to_update=db_user_to_update, user_data=user_update_data)
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_by_admin_endpoint(
    user_id: int,
    db: DbDependency,
    current_admin: AdminOnlyDependency # Ensure ONLY admin can call this
):
    """
    Deletes a user by ID (Requires Admin role).
    """
    if current_admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot delete their own account."
        )

    deleted_user = crud.delete_user_by_admin(db=db, user_id=user_id)
    if deleted_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return None # For 204 No Content