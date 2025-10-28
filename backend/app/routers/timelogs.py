# backend/app/routers/timelogs.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal
from datetime import datetime

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/timelogs",
    tags=["Time Logs"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

AllowedTimeLogSortFields = Literal["start_time", "end_time", "duration"]
AllowedSortDirections = Literal["asc", "desc"]

async def get_project_if_accessible(project_id: int, db: DbDependency, current_user: CurrentUserDependency) -> Optional[models.Project]:
    if not project_id: return None
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible.")
    return project

@router.post("/clock-in", response_model=schemas.TimeLogRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def clock_in(request: Request, timelog_data: schemas.TimeLogCreate, db: DbDependency, current_user: CurrentUserDependency):
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if open_log:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already clocked in.")
    if timelog_data.project_id:
        await get_project_if_accessible(project_id=timelog_data.project_id, db=db, current_user=current_user)
    return crud.create_timelog_entry(db=db, timelog_data=timelog_data, user_id=current_user.id)

@router.post("/clock-out", response_model=schemas.TimeLogRead)
@limiter.limit("100/minute")
async def clock_out(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if not open_log:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not currently clocked in.")
    return crud.update_timelog_entry(db=db, timelog_id=open_log.id)

@router.get("/status", response_model=schemas.TimeLogStatus)
@limiter.limit("100/minute")
async def get_timelog_status(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    return {"is_clocked_in": bool(open_log), "current_log": open_log}

@router.get("/me", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_my_timelogs(request: Request, db: DbDependency, current_user: CurrentUserDependency, skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)):
    return crud.get_timelogs(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_all_timelogs_for_tenant(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency,
    project_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time'),
    sort_dir: Optional[AllowedSortDirections] = Query('desc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_timelogs(db=db, user_id=user_id, project_id=project_id, tenant_id=effective_tenant_id, start_date=start_date, end_date=end_date, sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit)

@router.get("/project/{project_id}/active", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_active_timelogs_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency # Only managers/admins can see this
):
    """Gets a list of users currently clocked in to a specific project."""
    # Verify the project exists and is accessible
    project = await get_project_if_accessible(project_id=project_id, db=db, current_user=current_user)
    if not project:
        # get_project_if_accessible raises HTTPException, but check just in case
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        
    active_logs = crud.get_active_timelogs_for_project(db=db, project_id=project_id)
    return active_logs