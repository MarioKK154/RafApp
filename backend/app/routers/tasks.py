# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)] # Base auth for all task routes
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Role dependency for actions TL/PM/Admin can do
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]
ManagerOrAdmin = Annotated[models.User, Depends(security.require_manager)] # If needed

# Endpoint to get tasks assigned to the current user
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

# Create Task (now allows assignee_id, requires TL role minimum)
@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task: schemas.TaskCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher # Require TL/PM/Admin to create tasks
):
    """Creates a new task (Requires Team Leader, PM, or Admin role)."""
    db_project = crud.get_project(db, project_id=task.project_id)
    if not db_project:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with id {task.project_id} not found")

    # Optional: Check if assignee exists if provided
    if task.assignee_id:
        assignee = crud.get_user(db, user_id=task.assignee_id)
        if not assignee:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assignee user with id {task.assignee_id} not found")
        # Optional: Check if assignee has 'electrician' role? Or if assigner is allowed for project?

    return crud.create_task(db=db, task=task)

# List Tasks (allow filtering by assignee, requires basic login)
@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    db: DbDependency,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None, # New filter
    skip: int = 0,
    limit: int = 100
    # current_user: CurrentUserDependency - Applied at router level
):
    """Retrieves a list of tasks, optionally filtered by project_id or assignee_id."""
    tasks = crud.get_tasks(db=db, project_id=project_id, assignee_id=assignee_id, skip=skip, limit=limit)
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(
    task_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency - Applied at router level
):
    """Retrieves a single task by its ID."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return db_task

# Update Task (allow updating assignee_id, requires TL role minimum)
@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher # Require TL/PM/Admin to update tasks
):
    """Updates an existing task (Requires Team Leader, PM, or Admin role)."""
    # Optional: Check if assignee exists if provided in update
    if task_update.assignee_id is not None:
         assignee = crud.get_user(db, user_id=task_update.assignee_id)
         if not assignee:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assignee user with id {task_update.assignee_id} not found")
         # Optional: Check if assignee role is allowed ('electrician'?)

    updated_task = crud.update_task(db=db, task_id=task_id, task_update=task_update)
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return updated_task


# --- NEW: Task Assignment Endpoints ---

@router.post("/{task_id}/assign", response_model=schemas.TaskRead)
async def assign_task_to_user(
    task_id: int,
    assignment: schemas.TaskAssignUser, # Contains user_id
    db: DbDependency,
    assigner: TeamLeaderOrHigher # Require TL/PM/Admin to assign
):
    """Assigns a user to a task (Requires Team Leader, PM, or Admin role)."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    assignee = crud.get_user(db=db, user_id=assignment.user_id)
    if not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to assign not found")

    # Optional Rule: Only allow assigning users with 'electrician' role?
    # if assignee.role != 'electrician':
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only assign tasks to users with 'electrician' role")

    # Optional Rule: Check if assigner (TL/PM/Admin) is allowed for the task's project?
    # project = db_task.project # Need to load relationship or fetch project
    # if not crud.is_user_member_of_project(db, project_id=project.id, user_id=assigner.id) and assigner.role != 'admin':
    #      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to assign tasks for this project")

    updated_task = crud.assign_user_to_task(db=db, task=db_task, user=assignee)
    return updated_task


@router.delete("/{task_id}/assign", response_model=schemas.TaskRead)
async def unassign_task_from_user(
    task_id: int,
    db: DbDependency,
    assigner: TeamLeaderOrHigher # Require TL/PM/Admin to unassign
):
    """Unassigns the current user from a task (Requires Team Leader, PM, or Admin role)."""
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if db_task.assignee_id is None:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is not currently assigned")

    # Optional: Check if assigner is allowed for the task's project? (similar to assign)

    updated_task = crud.unassign_user_from_task(db=db, task=db_task)
    return updated_task


# Delete Task (Require TL role minimum - adjust if needed)
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigher # Require TL/PM/Admin to delete
):
    """Deletes an existing task (Requires Team Leader, PM, or Admin role)."""
    deleted_task = crud.delete_task(db=db, task_id=task_id)
    if deleted_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return None