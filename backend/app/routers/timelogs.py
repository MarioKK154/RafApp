# backend/app/routers/timelogs.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Time Logs"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# ManagerOrAdmin for viewing broader sets of logs
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]


# Helper function to check project access within tenant (can be shared or defined locally)
async def get_project_if_accessible(
    project_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> Optional[models.Project]:
    if not project_id:
        return None
    
    # Superusers can access any project
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible in your tenant.")
    
    return project


@router.post("/clock-in", response_model=schemas.TimeLogRead, status_code=status.HTTP_201_CREATED)
async def clock_in(
    timelog_data: schemas.TimeLogCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Clocks in the current user, optionally associating with a project/task in their tenant."""
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if open_log:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already clocked in.")

    # If project_id is provided, verify it's accessible by the user
    if timelog_data.project_id:
        await get_project_if_accessible(project_id=timelog_data.project_id, db=db, current_user=current_user)
        # TODO: A further check could be if the user is a member of that project
    
    # TODO: If task_id is provided, verify it belongs to the project_id and tenant

    new_log = crud.create_timelog_entry(db=db, timelog_data=timelog_data, user_id=current_user.id)
    return new_log


@router.post("/clock-out", response_model=schemas.TimeLogRead)
async def clock_out(
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Clocks out the current user."""
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if not open_log:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not currently clocked in.")
    
    updated_log = crud.update_timelog_entry(db=db, timelog_id=open_log.id)
    return updated_log


@router.get("/status", response_model=schemas.TimeLogStatus)
async def get_timelog_status(
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Gets the current clock-in status for the authenticated user."""
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    return {"is_clocked_in": bool(open_log), "current_log": open_log}


@router.get("/me", response_model=List[schemas.TimeLogRead])
async def read_my_timelogs(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """Retrieves all time logs for the currently authenticated user."""
    # crud.get_timelogs is the new general function
    logs = crud.get_timelogs(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return logs


@router.get("/", response_model=List[schemas.TimeLogRead])
async def read_all_timelogs_for_tenant(
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency, # Requires PM or Admin
    project_id: Optional[int] = Query(None, description="Filter logs by a specific project ID"),
    user_id: Optional[int] = Query(None, description="Filter logs by a specific user ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Retrieves time logs based on filters.
    - Admins can see all logs within their tenant, and can filter by any user or project in their tenant.
    - PMs can see logs for projects they manage.
    """
    # If a project_id filter is provided, validate it first
    if project_id:
        project = await get_project_if_accessible(project_id=project_id, db=db, current_user=current_user)
        # Further check if PM is actually the manager of this project
        if current_user.role == 'project manager' and project.project_manager_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view time logs for projects you manage.")
        # If admin, access is granted by get_project_if_accessible
    
    # If a user_id filter is provided, ensure that user is in the current admin's tenant
    if user_id and not current_user.is_superuser:
        user_to_view = crud.get_user(db, user_id=user_id)
        if not user_to_view or user_to_view.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your tenant.")
    
    # If no filters, Admins see all logs in their tenant. PMs must filter by a project they manage.
    if current_user.role == 'project manager' and not project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project Managers must specify a project ID to view time logs.")
    
    # Get all logs for the tenant if user is admin and no filters are applied
    # This requires modifying crud.get_timelogs to filter by tenant if project_id is not given
    # For now, crud.get_timelogs filters on user_id or project_id if provided.
    logs = crud.get_timelogs(db=db, user_id=user_id, project_id=project_id, skip=skip, limit=limit)
    
    # Post-filter to ensure tenant isolation if no filters were provided and user is not superuser
    if not user_id and not project_id and not current_user.is_superuser:
        logs = [log for log in logs if log.user.tenant_id == current_user.tenant_id]

    return logs


# The old /project/{project_id} endpoint is now covered by the general GET / endpoint with query parameters
# We can remove it to avoid confusion
# @router.get("/project/{project_id}", ...)