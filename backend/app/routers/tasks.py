# backend/app/routers/tasks.py
# FINAL FINAL Corrected Version - Strict Multi-Line Formatting GUARANTEED
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal

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
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

# Define allowed sort fields and directions for Tasks
AllowedTaskSortFields = Literal["title", "status", "priority", "start_date", "due_date", "created_at", "id"] # Added id
AllowedSortDirections = Literal["asc", "desc"]


# --- Task CRUD Endpoints ---
@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task: schemas.TaskCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    """Creates a new task (Requires Team Leader, PM, or Admin role)."""
    db_project = crud.get_project(db, project_id=task.project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    if task.assignee_id and not crud.get_user(db, task.assignee_id):
        raise HTTPException(status_code=404, detail="Assignee not found")
    new_task = crud.create_task(db=db, task=task)
    return new_task

@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    db: DbDependency,
    # Filters
    project_id: Optional[int] = Query(None, description="Filter tasks by project ID"),
    assignee_id: Optional[int] = Query(None, description="Filter tasks by assignee ID"),
    # Sorting
    sort_by: Optional[AllowedTaskSortFields] = Query('id', description="Field to sort tasks by"),
    sort_dir: Optional[AllowedSortDirections] = Query('asc', description="Sort direction (asc or desc)"),
    # Pagination
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
    # current_user: CurrentUserDependency - Applied at router level
):
    """
    Retrieves a list of tasks, optionally filtered and sorted.
    (Requires logged-in user)
    """
    tasks = crud.get_tasks(
        db=db,
        project_id=project_id,
        assignee_id=assignee_id,
        sort_by=sort_by,
        sort_dir=sort_dir,
        skip=skip,
        limit=limit
    )
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(
    task_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency - Applied at router level
):
    """Retrieves a single task by its ID."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    """Updates an existing task (Requires Team Leader, PM, or Admin role)."""
    if task_update.assignee_id is not None and task_update.assignee_id != '' and not crud.get_user(db, task_update.assignee_id):
         raise HTTPException(status_code=404, detail="Assignee user not found")
    # TODO: Add check if project_id is being changed, ensure new project exists?
    updated_task = crud.update_task(db=db, task_id=task_id, task_update=task_update)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    """Deletes an existing task (Requires Team Leader, PM, or Admin role)."""
    deleted_task = crud.delete_task(db=db, task_id=task_id)
    if not deleted_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return None

# --- Task Assignment Endpoints ---
@router.post("/{task_id}/assign", response_model=schemas.TaskRead)
async def assign_task_to_user(
    task_id: int,
    assignment: schemas.TaskAssignUser,
    db: DbDependency,
    assigner: TeamLeaderOrHigher
):
    """Assigns a user to a task (Requires Team Leader, PM, or Admin role)."""
    db_task = crud.get_task(db=db, task_id=task_id)
    assignee = crud.get_user(db=db, user_id=assignment.user_id)
    if not db_task or not assignee:
        raise HTTPException(status_code=404, detail="Task or User not found")
    # TODO: Add more granular checks? (e.g., is assigner allowed for this project?)
    updated_task = crud.assign_user_to_task(db=db, task=db_task, user=assignee)
    return updated_task

@router.delete("/{task_id}/assign", response_model=schemas.TaskRead)
async def unassign_task_from_user(
    task_id: int,
    db: DbDependency,
    assigner: TeamLeaderOrHigher
):
    """Unassigns the current user from a task (Requires Team Leader, PM, or Admin role)."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    if db_task.assignee_id is None:
        raise HTTPException(status_code=400, detail="Task is not currently assigned")
    # TODO: Add more granular checks?
    updated_task = crud.unassign_user_from_task(db=db, task=db_task)
    return updated_task

@router.get("/assigned/me", response_model=List[schemas.TaskRead])
async def read_my_assigned_tasks(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    """Retrieves tasks assigned to the currently authenticated user."""
    tasks = crud.get_tasks_assigned_to_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return tasks


# --- Task Comment Endpoints ---
@router.post("/{task_id}/comments/", response_model=schemas.TaskCommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment_for_task(
    task_id: int,
    comment: schemas.TaskCommentCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Adds a comment to a specific task."""
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    # TODO: Check if user is member of project?
    new_comment = crud.create_task_comment(db=db, comment=comment, task_id=task_id, author_id=current_user.id)
    return new_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.TaskCommentRead])
async def read_comments_for_task(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency, # Just need login to view for now
    skip: int = 0,
    limit: int = 100
):
    """Retrieves all comments for a specific task."""
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    # TODO: Check if user is member of project?
    comments = crud.get_comments_for_task(db=db, task_id=task_id, skip=skip, limit=limit)
    return comments