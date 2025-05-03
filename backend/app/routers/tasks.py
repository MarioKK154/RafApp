# backend/app/routers/tasks.py
# Final Verified Version: Includes Comment Endpoints
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/tasks", # Define prefix here
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigher = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

# --- Task CRUD Endpoints ---
@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task: schemas.TaskCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    db_project = crud.get_project(db, project_id=task.project_id)
    if not db_project: raise HTTPException(status_code=404, detail="Project not found")
    if task.assignee_id and not crud.get_user(db, task.assignee_id): raise HTTPException(status_code=404, detail="Assignee not found")
    return crud.create_task(db=db, task=task)

@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    db: DbDependency,
    project_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    return crud.get_tasks(db=db, project_id=project_id, assignee_id=assignee_id, skip=skip, limit=limit)

@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(
    task_id: int,
    db: DbDependency
):
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task: raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    if task_update.assignee_id is not None and not crud.get_user(db, task_update.assignee_id):
         raise HTTPException(status_code=404, detail="Assignee user not found")
    updated_task = crud.update_task(db=db, task_id=task_id, task_update=task_update)
    if not updated_task: raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigher
):
    deleted_task = crud.delete_task(db=db, task_id=task_id)
    if not deleted_task: raise HTTPException(status_code=404, detail="Task not found")
    return None

# --- Task Assignment Endpoints ---
@router.post("/{task_id}/assign", response_model=schemas.TaskRead)
async def assign_task_to_user(task_id: int, assignment: schemas.TaskAssignUser, db: DbDependency, assigner: TeamLeaderOrHigher):
    db_task = crud.get_task(db=db, task_id=task_id)
    assignee = crud.get_user(db=db, user_id=assignment.user_id)
    if not db_task or not assignee: raise HTTPException(status_code=404, detail="Task or User not found")
    return crud.assign_user_to_task(db=db, task=db_task, user=assignee)

@router.delete("/{task_id}/assign", response_model=schemas.TaskRead)
async def unassign_task_from_user(task_id: int, db: DbDependency, assigner: TeamLeaderOrHigher):
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task: raise HTTPException(status_code=404, detail="Task not found")
    if db_task.assignee_id is None: raise HTTPException(status_code=400, detail="Task is not assigned")
    return crud.unassign_user_from_task(db=db, task=db_task)

@router.get("/assigned/me", response_model=List[schemas.TaskRead])
async def read_my_assigned_tasks(db: DbDependency, current_user: CurrentUserDependency, skip: int = 0, limit: int = 100):
    return crud.get_tasks_assigned_to_user(db=db, user_id=current_user.id, skip=skip, limit=limit)

# --- Task Comment Endpoints ---
@router.post("/{task_id}/comments/", response_model=schemas.TaskCommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment_for_task(
    task_id: int,
    comment: schemas.TaskCommentCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    new_comment = crud.create_task_comment(db=db, comment=comment, task_id=task_id, author_id=current_user.id)
    return new_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.TaskCommentRead])
async def read_comments_for_task(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
):
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    comments = crud.get_comments_for_task(db=db, task_id=task_id, skip=skip, limit=limit)
    return comments