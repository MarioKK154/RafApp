# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigherTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

AllowedTaskSortFields = Literal["title", "status", "priority", "start_date", "due_date", "created_at", "id"]
AllowedSortDirections = Literal["asc", "desc"]

async def get_task_and_verify_tenant(task_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Task:
    """
    Helper function to fetch a task and verify tenant access. 
    Superusers bypass the tenant ownership check.
    """
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    effective_tenant_id = db_task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task")
    return db_task

@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_new_task(request: Request, task_data: schemas.TaskCreate, db: DbDependency, current_user: TeamLeaderOrHigherTenantDependency):
    """
    Creates a new task. 
    Superadmins can create tasks for any project; others are limited to projects in their tenant.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=task_data.project_id, tenant_id=effective_tenant_id)
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible.")
    
    return crud.create_task(db=db, task=task_data, project_tenant_id=project.tenant_id)

@router.get("/", response_model=List[schemas.TaskRead])
@limiter.limit("1000/minute")
async def read_all_tasks(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    project_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    status: Optional[schemas.TaskStatusLiteral] = Query(None),
    search: Optional[str] = Query(None, description="Search tasks by title"),
    sort_by: Optional[AllowedTaskSortFields] = Query('id'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Retrieves all tasks based on filters. 
    If a project_id is provided, access is verified. 
    Superadmins see all; regular users are filtered by their tenant.
    """
    if project_id:
        effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
        project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
        if not project:
            return []

    tasks = crud.get_tasks(
        db=db, 
        project_id=project_id, 
        assignee_id=assignee_id, 
        status=status,
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

    # Filter tasks by tenant for non-superusers
    if not current_user.is_superuser:
        tasks = [task for task in tasks if task.project.tenant_id == current_user.tenant_id]

    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def read_single_task(request: Request, task_id: int, db: DbDependency, current_user: CurrentUserDependency):
    """Fetches details for a single task."""
    return await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)

@router.put("/{task_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def update_existing_task(
    request: Request,
    task_id: int,
    task_update_data: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Updates an existing task."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    # Use None as project_tenant_id for superadmins to skip interior tenant validation in CRUD
    effective_validation_id = None if current_user.is_superuser else current_user.tenant_id
    
    return crud.update_task(
        db=db, 
        task_id=task_id, 
        task_update=task_update_data, 
        project_tenant_id=effective_validation_id
    )

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_existing_task(request: Request, task_id: int, db: DbDependency, current_user: TeamLeaderOrHigherTenantDependency):
    """Deletes a task from the system."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    crud.delete_task(db=db, task_id=db_task.id)
    return None

@router.post("/{task_id}/commission", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def commission_task_endpoint(request: Request, task_id: int, db: DbDependency, current_user: ManagerOrAdminTenantDependency):
    """Marks a task as commissioned. Task status must be 'Done'."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    if db_task.status != "Done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task must be 'Done' to be commissioned.")
    return crud.commission_task(db=db, task_to_commission=db_task)

@router.post("/{task_id}/dependencies", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def add_dependency_to_task(
    request: Request,
    task_id: int,
    dependency: schemas.TaskDependencyCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Adds a predecessor dependency (task B must be done before task A)."""
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(dependency.predecessor_id, db, current_user)
    
    if task.id == predecessor_task.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A task cannot depend on itself.")
    if task.project_id != predecessor_task.project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tasks must be in the same project.")
        
    updated_task = crud.add_task_dependency(db=db, task=task, predecessor=predecessor_task)
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Circular dependency detected.")
    return updated_task

@router.delete("/{task_id}/dependencies/{predecessor_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def remove_dependency_from_task(
    request: Request,
    task_id: int,
    predecessor_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Removes a dependency between two tasks."""
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(predecessor_id, db, current_user)
    return crud.remove_task_dependency(db=db, task=task, predecessor=predecessor_task)

@router.post("/{task_id}/comments/", response_model=schemas.TaskCommentRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_comment_for_task(
    request: Request,
    task_id: int,
    comment: schemas.TaskCommentCreate,
    db: DbDependency,
    current_user: CurrentUserDependency 
):
    """Adds a comment to a specific task."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    new_comment = crud.create_task_comment(db=db, comment=comment, task_id=db_task.id, author_id=current_user.id)
    return new_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.TaskCommentRead])
@limiter.limit("100/minute")
async def read_comments_for_task(
    request: Request,
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """Retrieves all comments associated with a specific task."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    comments = crud.get_comments_for_task(db=db, task_id=db_task.id, skip=skip, limit=limit)
    return comments