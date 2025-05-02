# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Projects"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)] # Managers or Admins

# --- Project CRUD ---

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_new_project(project: schemas.ProjectCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Creates a new project (Requires Manager or Admin role)."""
    return crud.create_project(db=db, project=project, creator_id=current_user.id)

@router.get("/", response_model=List[schemas.ProjectRead])
async def read_all_projects(db: DbDependency, skip: int = 0, limit: int = 100):
    """Retrieves a list of all projects (Requires logged-in user)."""
    projects = crud.get_projects(db=db, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectRead)
async def read_single_project(project_id: int, db: DbDependency):
    """Retrieves a single project by its ID (Requires logged-in user)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if db_project is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectRead)
async def update_existing_project(project_id: int, project_update: schemas.ProjectUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Updates an existing project (Requires Manager or Admin role)."""
    updated_project = crud.update_project(db=db, project_id=project_id, project_update=project_update)
    if updated_project is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return updated_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(project_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Deletes an existing project (Requires Manager or Admin role)."""
    deleted_project = crud.delete_project(db=db, project_id=project_id)
    if deleted_project is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return None

# --- NEW: Project Membership Endpoints ---

@router.get("/{project_id}/members", response_model=List[schemas.UserRead])
async def get_project_member_list(
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin to see member list
):
    """Gets the list of members for a specific project (Requires Manager or Admin role)."""
    # crud.get_project_members already checks if project exists implicitly
    members = crud.get_project_members(db=db, project_id=project_id)
    # If project didn't exist, get_project_members returns [], which is fine
    return members


@router.post("/{project_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def assign_member_to_project(
    project_id: int,
    assignment: schemas.ProjectAssignMember, # Contains user_id
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin to assign members
):
    """Assigns a user to a project (Requires Manager or Admin role)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db_user = crud.get_user(db=db, user_id=assignment.user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    success = crud.add_member_to_project(db=db, project=db_project, user=db_user)
    if not success:
        # Optionally return a different status or message if already a member
        pass # Do nothing, idempotency often preferred

    return None # Return No Content on success or if already member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_project(
    project_id: int,
    user_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency # Require Manager/Admin to remove members
):
    """Removes a user from a project (Requires Manager or Admin role)."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db_user = crud.get_user(db=db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    success = crud.remove_member_from_project(db=db, project=db_project, user=db_user)
    if not success:
        # Optionally return 404 if user wasn't a member?
        pass # Do nothing if user wasn't a member

    return None # Return No Content