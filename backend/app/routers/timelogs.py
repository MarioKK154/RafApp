# backend/app/routers/timelogs.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal
from datetime import datetime

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

AllowedTimeLogSortFields = Literal["start_time", "end_time", "duration"]
AllowedSortDirections = Literal["asc", "desc"]


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
    user_id: Optional[int] = Query(None, description="Filter logs by a specific user ID (Admin only)"),
    start_date: Optional[datetime] = Query(None, description="Filter logs from this start date (inclusive)"),
    end_date: Optional[datetime] = Query(None, description="Filter logs up to this end date (inclusive)"),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time', description="Field to sort by"),
    sort_dir: Optional[AllowedSortDirections] = Query('desc', description="Sort direction"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Retrieves time logs based on filters.
    - Admins see all logs within their tenant, and can filter by any user or project.
    - PMs can only see logs for projects they are assigned to manage.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id

    # PM-specific validation
    if current_user.role == 'project manager':
        if project_id:
            project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
            if not project or project.project_manager_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view time logs for projects you manage.")
        elif user_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project Managers cannot filter by user, please filter by a project you manage.")
        else: # PM must specify a project they manage
            # An alternative is to list logs for ALL projects they manage
            # For now, let's require they specify one project at a time.
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project Managers must specify a project ID to view time logs.")

    # Admin validation
    if current_user.role == 'admin' and not current_user.is_superuser:
        if user_id: # Ensure user being queried is in the admin's tenant
            user_to_view = crud.get_user(db, user_id=user_id)
            if not user_to_view or user_to_view.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your tenant.")
        if project_id: # Ensure project being queried is in admin's tenant
            project_to_view = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
            if not project_to_view:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
        # If no filters, admin sees all logs in their tenant
        if not project_id and not user_id:
            # crud.get_timelogs will be called with the tenant_id
            pass

    logs = crud.get_timelogs(
        db=db, user_id=user_id, project_id=project_id, tenant_id=effective_tenant_id,
        start_date=start_date, end_date=end_date,
        sort_by=sort_by, sort_dir=sort_dir,
        skip=skip, limit=limit
    )
    return logs


# The old /project/{project_id} endpoint is now covered by the general GET / endpoint with query parameters
# We can remove it to avoid confusion
# @router.get("/project/{project_id}", ...)