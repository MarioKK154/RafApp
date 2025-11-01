# backend/app/routers/timelogs.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal
from datetime import datetime, date

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

# --- THIS ENDPOINT IS NOW CORRECTED ---
@router.get("/me", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_my_timelogs(
    request: Request, 
    db: DbDependency, 
    current_user: CurrentUserDependency,
    # Add all the same filter/sort parameters
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search notes, project, user"),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time'),
    sort_dir: Optional[AllowedSortDirections] = Query('desc'),
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000)
):
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.min.time()) if end_date else None

    # Call crud.get_timelogs, but force the user_id to the current user
    return crud.get_timelogs(
        db=db, 
        user_id=current_user.id, # Force user_id
        project_id=None, # User can see logs from all their projects
        tenant_id=current_user.tenant_id,
        start_date=start_dt, 
        end_date=end_dt, 
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

@router.get("/", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_all_timelogs_for_tenant(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency,
    project_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search notes, project, user"),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time'),
    sort_dir: Optional[AllowedSortDirections] = Query('desc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.min.time()) if end_date else None

    return crud.get_timelogs(
        db=db, user_id=user_id, project_id=project_id, tenant_id=effective_tenant_id,
        start_date=start_dt, end_date=end_dt, search=search,
        sort_by=sort_by, sort_dir=sort_dir, skip=skip, limit=limit
    )