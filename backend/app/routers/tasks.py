# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task: schemas.TaskCreate,
    db: DbDependency
    # current_user: CurrentUserDependency # Needed if associating task with creator/assignee
):
    """Creates a new task for a given project."""
    # Check if project exists (optional but good practice)
    db_project = crud.get_project(db, project_id=task.project_id)
    if not db_project:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with id {task.project_id} not found")
    # TODO: Add authorization - check if user can add task to this project
    return crud.create_task(db=db, task=task)

@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    project_id: Optional[int] = None, # Allow filtering by project_id
    skip: int = 0,
    limit: int = 100,
    db: DbDependency
):
    """Retrieves a list of tasks, optionally filtered by project_id."""
    tasks = crud.get_tasks(db=db, project_id=project_id, skip=skip, limit=limit)
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(
    task_id: int,
    db: DbDependency
):
    """Retrieves a single task by its ID."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return db_task

@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: DbDependency
):
    """Updates an existing task."""
    # TODO: Add authorization check
    updated_task = crud.update_task(db=db, task_id=task_id, task_update=task_update)
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: int,
    db: DbDependency
):
    """Deletes an existing task."""
    # TODO: Add authorization check
    deleted_task = crud.delete_task(db=db, task_id=task_id)
    if deleted_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return None