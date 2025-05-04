# backend/app/routers/projects.py
# Final check version
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Projects"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]

# --- Project CRUD ---

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project: schemas.ProjectCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Creates a new project (Requires Manager or Admin role)."""
    return crud.create_project(db=db, project=project, creator_id=current_user.id)

@router.get("/", response_model=List[schemas.ProjectRead])
async def read_all_projects(
    db: DbDependency,
    status: Optional[str] = Query(None, description="Filter projects by status (e.g., Planning, In Progress)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """Retrieves a list of all projects, optionally filtered by status."""
    projects = crud.get_projects(db=db, status=status, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectRead)
async def read_single_project(
    project_id: int,
    db: DbDependency
):
    """Retrieves a single project by its ID (Requires logged-in user)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectRead)
async def update_existing_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Updates an existing project (Requires Manager or Admin role)."""
    updated_project = crud.update_project(db=db, project_id=project_id, project_update=project_update)
    if updated_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return updated_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Deletes an existing project (Requires Manager or Admin role)."""
    deleted_project = crud.delete_project(db=db, project_id=project_id)
    if deleted_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return None

# --- Project Membership Endpoints ---

@router.get("/{project_id}/members", response_model=List[schemas.UserRead])
async def get_project_member_list(
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Gets the list of members for a specific project (Requires Manager or Admin role)."""
    members = crud.get_project_members(db=db, project_id=project_id)
    return members


@router.post("/{project_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def assign_member_to_project(
    project_id: int,
    assignment: schemas.ProjectAssignMember,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Assigns a user to a project (Requires Manager or Admin role)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db_user = crud.get_user(db=db, user_id=assignment.user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") # Ensure quote is closed

    crud.add_member_to_project(db=db, project=db_project, user=db_user)
    return None


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_project(
    project_id: int,
    user_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Removes a user from a project (Requires Manager or Admin role)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db_user = crud.get_user(db=db, user_id=user_id)
    if not db_user:
        # --- Check this line carefully ---
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") # Line ~123
        # --- Ensure closing quote and parenthesis are correct ---

    success = crud.remove_member_from_project(db=db, project=db_project, user=db_user)
    # Optional: Check success if needed
    # if not success:
    #     pass # Or maybe raise 404 if user wasn't member?

    return None