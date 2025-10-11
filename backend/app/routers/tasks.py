# backend/app/routers/tasks.py
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

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigherTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

AllowedTaskSortFields = Literal["title", "status", "priority", "start_date", "due_date", "created_at", "id"]
AllowedSortDirections = Literal["asc", "desc"]

async def get_task_and_verify_tenant(task_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Task:
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    effective_tenant_id = db_task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task")
    return db_task

@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task_data: schemas.TaskCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    project = crud.get_project(db, project_id=task_data.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible in your tenant.")
    
    return crud.create_task(db=db, task=task_data, project_tenant_id=project.tenant_id)

@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    db: DbDependency,
    current_user: CurrentUserDependency,
    project_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    status: Optional[schemas.TaskStatusLiteral] = Query(None),
    sort_by: Optional[AllowedTaskSortFields] = Query('id'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    effective_project_id = project_id
    if project_id and not current_user.is_superuser:
        project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
        if not project:
            return [] # Return empty list if project not accessible
    
    tasks = crud.get_tasks(db=db, project_id=effective_project_id, assignee_id=assignee_id, status=status, sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit)
    
    if not current_user.is_superuser:
        tasks = [task for task in tasks if task.project.tenant_id == current_user.tenant_id]
        
    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(task_id: int, db: DbDependency, current_user: CurrentUserDependency):
    return await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)

@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update_data: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    return crud.update_task(db=db, task_id=task_id, task_update=task_update_data, project_tenant_id=db_task.project.tenant_id)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(task_id: int, db: DbDependency, current_user: TeamLeaderOrHigherTenantDependency):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    crud.delete_task(db=db, task_id=db_task.id)
    return None

@router.post("/{task_id}/commission", response_model=schemas.TaskRead)
async def commission_task_endpoint(task_id: int, db: DbDependency, current_user: ManagerOrAdminTenantDependency):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    if db_task.status != "Done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Task must be 'Done'.")
    return crud.commission_task(db=db, task_to_commission=db_task)

@router.post("/{task_id}/dependencies", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def add_dependency_to_task(
    task_id: int,
    dependency: schemas.TaskDependencyCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
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
async def remove_dependency_from_task(
    task_id: int,
    predecessor_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(predecessor_id, db, current_user)
    return crud.remove_task_dependency(db=db, task=task, predecessor=predecessor_task)