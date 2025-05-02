# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List # Import List

from .. import crud, models, schemas, security # Use .. for parent directory imports
from ..database import get_db # Use .. for parent directory imports

router = APIRouter(
    prefix="/users", # Set prefix for all routes in this router
    tags=["Users"] # Tag for Swagger UI documentation
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
# Dependency to get the current active user (imports from security)
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(current_user: CurrentUserDependency):
    """
    Fetches the profile of the currently authenticated user.
    Requires a valid access token.
    """
    # The CurrentUserDependency already fetches and validates the user.
    # If the code reaches here, current_user is a valid, active user model instance.
    return current_user

# Optional: Add endpoint to list users (maybe restrict later)
# This also requires authentication
@router.get("/", response_model=List[schemas.UserRead])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: DbDependency = None, # Provide default None if not used by current_user
    current_user: CurrentUserDependency = None # Add dependency to protect route
):
    """
    Retrieves a list of users (requires authentication).
    Pagination supported via skip and limit query parameters.
    TODO: Add role-based access control (e.g., only admins can list all users).
    """
    users = crud.get_users(db=db, skip=skip, limit=limit)
    return users