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
AdminOnlyDependency = Annotated[models.User, Depends(security.require_role(["admin"]))]

AllowedProjectSortFields = Literal["name", "status", "start_date", "end_date", "created_at", "project_number"]
AllowedSortDirections = Literal["asc", "desc"]

@router.get("/managed", response_model=List[schemas.ProjectRead])
@limiter.limit("100/minute")
async def read_managed_projects(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Returns projects where the current user is the manager OR 
    all projects if the user is an admin/superuser.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    if current_user.is_superuser or current_user.role == 'admin':
        return crud.get_projects(db=db, tenant_id=effective_tenant_id, limit=100)
    
    return db.query(models.Project).filter(
        models.Project.project_manager_id == current_user.id,
        models.Project.tenant_id == effective_tenant_id if effective_tenant_id else True
    ).all()

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("50/minute")
async def create_new_project(
    request: Request, 
    project_data: schemas.ProjectCreate, 
    db: DbDependency, 
    current_user: ManagerOrAdminOfTenantDependency
):
    """
    ROADMAP #6: Standardized Serialization.
    Handles 'Main' vs 'Extra Work' numbering via parent_id integration.
    """
    if current_user.is_superuser:
        target_tenant_id = getattr(project_data, 'tenant_id', 1) or 1
    else:
        target_tenant_id = current_user.tenant_id

    # Validation: Ensure PM belongs to the correct cluster
    if project_data.project_manager_id:
        pm_user = crud.get_user(db, user_id=project_data.project_manager_id)
        if not pm_user or (pm_user.tenant_id != target_tenant_id and not pm_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Personnel node invalid for this cluster."
            )
    
    return crud.create_project(
        db=db, 
        project=project_data, 
        creator_id=current_user.id, 
        tenant_id=target_tenant_id
    )

@router.get("/", response_model=List[schemas.ProjectRead])
@limiter.limit("1000/minute")
async def read_all_projects_for_tenant(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Query by Name or Project Number"),
    sort_by: Optional[AllowedProjectSortFields] = Query('name'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_projects(
        db=db, 
        tenant_id=effective_tenant_id, 
        status=status_filter,
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

@router.post("/{project_id}/archive", response_model=schemas.ProjectRead)
async def finalize_and_archive_project(
    project_id: int,
    db: DbDependency,
    current_user: AdminOnlyDependency
):
    """
    ROADMAP #1: Commissioning Protocol.
    Strictly restricted to Admin role. Moves project to 'Completed' and verified status.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Project node not found.")
    
    if db_project.status != "Commissioned":
        raise HTTPException(
            status_code=400, 
            detail="Node must be in 'Commissioned' state before Archival."
        )

    return crud.update_project_status(db=db, db_project=db_project, status="Completed")

@router.get("/{project_id}", response_model=schemas.ProjectRead)
async def read_single_project_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project node not found.")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectRead)
async def update_existing_project_for_tenant(
    request: Request,
    project_id: int,
    project_update_data: schemas.ProjectUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project_to_update = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    
    if not project_to_update:
        raise HTTPException(status_code=404, detail="Project node not found.")

    # Prevent accidental archival via standard PUT; force the /archive endpoint for 'Completed'
    if project_update_data.status == "Completed" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative verification required for archival.")

    if project_update_data.project_manager_id is not None:
        pm_user = crud.get_user(db, user_id=project_update_data.project_manager_id)
        if not pm_user or (pm_user.tenant_id != project_to_update.tenant_id and not pm_user.is_superuser):
            raise HTTPException(status_code=400, detail="Invalid PM Selection.")
    
    return crud.update_project(db=db, project_id=project_id, project_update=project_update_data, tenant_id=effective_tenant_id)

@router.delete("/{project_id}", status_code=204)
async def delete_existing_project_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    if not crud.delete_project(db=db, project_id=project_id, tenant_id=effective_tenant_id):
        raise HTTPException(status_code=404, detail="Project node not found.")
    return None

# --- MEMBER MANAGEMENT ---

@router.get("/{project_id}/members", response_model=List[schemas.UserReadBasic])
async def get_project_member_list_for_tenant(
    request: Request, 
    project_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    if not crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id):
        raise HTTPException(status_code=404, detail="Project node not found.")
    return crud.get_project_members(db=db, project_id=project_id, tenant_id=effective_tenant_id)

@router.post("/{project_id}/members", status_code=204)
async def assign_member_to_project_for_tenant(
    request: Request,
    project_id: int,
    assignment: schemas.ProjectAssignMember,
    db: DbDependency,
    current_user_assigning: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user_assigning.is_superuser else current_user_assigning.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not db_project: raise HTTPException(status_code=404, detail="Project node not found.")
    
    user_to_assign = crud.get_user(db=db, user_id=assignment.user_id)
    if not user_to_assign or (user_to_assign.tenant_id != db_project.tenant_id and not user_to_assign.is_superuser):
        raise HTTPException(status_code=400, detail="Personnel node incompatible with cluster security.")
    
    crud.add_member_to_project(db=db, project=db_project, user=user_to_assign)
    return None

@router.delete("/{project_id}/members/{user_id_to_remove}", status_code=204)
async def remove_member_from_project_for_tenant(
    request: Request,
    project_id: int,
    user_id_to_remove: int,
    db: DbDependency,
    current_user_removing: ManagerOrAdminOfTenantDependency
):
    effective_tenant_id = None if current_user_removing.is_superuser else current_user_removing.tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=effective_tenant_id)
    if not db_project: raise HTTPException(status_code=404, detail="Project node not found.")
    
    user_to_remove = crud.get_user(db=db, user_id=user_id_to_remove)
    if not user_to_remove or not crud.remove_member_from_project(db=db, project=db_project, user=user_to_remove):
        raise HTTPException(status_code=404, detail="Personnel node not linked to this project.")
    return None