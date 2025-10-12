# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminOfTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

AllowedProjectSortFields = Literal["name", "status", "start_date", "end_date", "created_at"]
AllowedSortDirections = Literal["asc", "desc"]

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_new_project(
    request: Request, 
    project_data: schemas.ProjectCreate, 
    db: DbDependency, 
    current_user: ManagerOrAdminOfTenantDependency
):
    if project_data.project_manager_id:
        pm_user = crud.get_user(db, user_id=project_data.project_manager_id)
        if not pm_user or pm_user.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected Project Manager is invalid or not in your tenant.")
        if pm_user.role != 'project manager':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User ID {pm_user.id} is not a Project Manager.")
    
    new_project = crud.create_project(db=db, project=project_data, creator_id=current_user.id, tenant_id=current_user.tenant_id)
    return new_project

@router.get("/", response_model=List[schemas.ProjectRead])
@limiter.limit("100/minute")
async def read_all_projects_for_tenant(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    status_filter: Optional[str] = Query(None, alias="status"),
    sort_by: Optional[AllowedProjectSortFields] = Query('name'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    projects = crud.get_projects(db=db, tenant_id=effective_tenant_id, status=status_filter, sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectRead)
@limiter.limit("100/minute")
async def read_single_project_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if db_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectRead)
@limiter.limit("100/minute")
async def update_existing_project_for_tenant(
    request: Request,
    project_id: int,
    project_update_data: schemas.ProjectUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    # First, verify the project exists in the tenant
    project_to_update = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    if project_update_data.project_manager_id is not None:
        pm_user = crud.get_user(db, user_id=project_update_data.project_manager_id)
        if not pm_user or pm_user.tenant_id != project_to_update.tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected Project Manager is invalid or not in the project's tenant.")
        if pm_user.role != 'project manager':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User ID {pm_user.id} is not a Project Manager.")
    
    updated_project = crud.update_project(db=db, project_id=project_id, project_update=project_update_data, tenant_id=project_to_update.tenant_id)
    return updated_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_existing_project_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    deleted_project = crud.delete_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if deleted_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return None

@router.get("/{project_id}/members", response_model=List[schemas.UserReadBasic])
@limiter.limit("100/minute")
async def get_project_member_list_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return crud.get_project_members(db=db, project_id=project_id, tenant_id=effective_tenant_id)

@router.post("/{project_id}/members", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def assign_member_to_project_for_tenant(
    request: Request,
    project_id: int,
    assignment: schemas.ProjectAssignMember,
    db: DbDependency,
    current_user_assigning: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user_assigning.is_superuser else current_user_assigning.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    
    user_to_assign = crud.get_user(db=db, user_id=assignment.user_id)
    if not user_to_assign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to assign not found.")
    
    if user_to_assign.tenant_id != db_project.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign users from a different tenant to this project.")
    
    crud.add_member_to_project(db=db, project=db_project, user=user_to_assign)
    return None

@router.delete("/{project_id}/members/{user_id_to_remove}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def remove_member_from_project_for_tenant(
    request: Request,
    project_id: int,
    user_id_to_remove: int,
    db: DbDependency,
    current_user_removing: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user_removing.is_superuser else current_user_removing.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    
    user_to_remove = crud.get_user(db=db, user_id=user_id_to_remove)
    if not user_to_remove:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to remove not found.")
    
    success = crud.remove_member_from_project(db=db, project=db_project, user=user_to_remove)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a member of this project.")
    return None