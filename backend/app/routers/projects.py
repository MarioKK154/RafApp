# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    # Add dependency for authentication to all routes in this router
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project: schemas.ProjectCreate,
    db: DbDependency,
    current_user: CurrentUserDependency # Get current user to associate as creator
):
    """Creates a new project."""
    return crud.create_project(db=db, project=project, creator_id=current_user.id)

@router.get("/", response_model=List[schemas.ProjectRead])
async def read_all_projects(
    skip: int = 0,
    limit: int = 100,
    db: DbDependency
    # current_user: CurrentUserDependency # Dependency already applied at router level
):
    """Retrieves a list of all projects."""
    projects = crud.get_projects(db=db, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectRead)
async def read_single_project(
    project_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency
):
    """Retrieves a single project by its ID."""
    db_project = crud.get_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectRead)
async def update_existing_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: DbDependency
    # current_user: CurrentUserDependency
):
    """Updates an existing project."""
    # TODO: Add authorization check - does current_user have permission to update this project?
    updated_project = crud.update_project(db=db, project_id=project_id, project_update=project_update)
    if updated_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return updated_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(
    project_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency
):
    """Deletes an existing project."""
    # TODO: Add authorization check - does current_user have permission to delete this project?
    deleted_project = crud.delete_project(db=db, project_id=project_id)
    if deleted_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    # No content needed in response body for 204
    return None