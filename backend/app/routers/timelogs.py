from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal, Union
from datetime import datetime, date

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/timelogs",
    tags=["Time Logs"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Type Aliases for cleaner signatures
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]
AdminOnlyDependency = Annotated[models.User, Depends(security.require_role(["admin"]))]

AllowedTimeLogSortFields = Literal["start_time", "end_time", "duration"]
AllowedSortDirections = Literal["asc", "desc"]

# --- Internal Helpers ---

async def get_project_if_accessible(project_id: int, db: Session, current_user: models.User) -> models.Project:
    """
    Verifies that a project exists and is accessible by the user.
    Superadmins bypass tenant isolation.
    """
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required.")
        
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Project not found or access denied."
        )
    return project

# --- Endpoints ---

@router.get("/active", response_model=Union[schemas.TimeLogRead, None])
@router.get("/status", response_model=schemas.TimeLogStatus)
@limiter.limit("100/minute")
async def get_current_session_status(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    """
    DUAL-PROTOCOL ENDPOINT:
    - /active: Returns the raw log or None if not clocked in.
    - /status: Returns structured boolean telemetry.
    """
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    
    # Check the actual path called
    if "/active" in request.url.path:
        return open_log
        
    return {"is_clocked_in": bool(open_log), "current_log": open_log}

@router.post("/clock-in", response_model=schemas.TimeLogRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def clock_in(
    request: Request, 
    timelog_data: schemas.TimeLogCreate, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    """Starts a new session. Rejects if user has an active log already."""
    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if open_log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Active session already exists. Clock out first."
        )
    
    if timelog_data.project_id:
        await get_project_if_accessible(timelog_data.project_id, db, current_user)
    
    return crud.create_timelog_entry(db=db, timelog_data=timelog_data, user_id=current_user.id)

@router.post("/clock-out", response_model=schemas.TimeLogRead)
@limiter.limit("100/minute")
async def clock_out(
    request: Request,
    payload: schemas.TimeLogClockOut,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    """Sets the end_time for the user's current open session and records a required work description."""
    if not payload.notes or not payload.notes.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work description is required to clock out.",
        )

    open_log = crud.get_open_timelog_for_user(db, user_id=current_user.id)
    if not open_log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No active session found to close."
        )
    
    return crud.update_timelog_entry(db=db, timelog_id=open_log.id, notes=payload.notes.strip())

@router.get("/me", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_my_timelogs(
    request: Request, 
    db: DbDependency, 
    current_user: CurrentUserDependency,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time'),
    sort_dir: Optional[AllowedSortDirections] = Query('desc'),
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000)
):
    """Retrieves the personal activity history for the user."""
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None

    return crud.get_timelogs(
        db=db, 
        user_id=current_user.id, 
        project_id=None, 
        tenant_id=None, 
        start_date=start_dt, 
        end_date=end_dt, 
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

@router.get("/project/{project_id}/active", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_active_timelogs_for_project(
    request: Request,
    project_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    """
    Returns all personnel currently 'On-Site' for a specific project.
    Used by the ProjectMembers component to show real-time status pulses.
    """
    await get_project_if_accessible(project_id, db, current_user)
    return crud.get_active_timelogs_by_project(db=db, project_id=project_id)

@router.get("/", response_model=List[schemas.TimeLogRead])
@limiter.limit("100/minute")
async def read_all_timelogs(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
    project_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[AllowedTimeLogSortFields] = Query('start_time'),
    sort_dir: Optional[AllowedSortDirections] = Query('desc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """Administrative oversight: View and filter activity across the entire tenant."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None

    return crud.get_timelogs(
        db=db, 
        user_id=user_id, 
        project_id=project_id, 
        tenant_id=effective_tenant_id,
        start_date=start_dt, 
        end_date=end_dt, 
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

@router.patch("/{timelog_id}", response_model=schemas.TimeLogRead)
@limiter.limit("60/minute")
async def update_timelog_admin(
    request: Request,
    timelog_id: int,
    payload: schemas.TimeLogUpdate,
    db: DbDependency,
    current_user: AdminOnlyDependency,
):
    """Admin only: Edit clocked hours (start/end) or reassign to a different project."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    existing = crud.get_timelog_by_id(db, timelog_id=timelog_id, tenant_id=effective_tenant_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time log not found or access denied.")
    if payload.project_id is not None:
        await get_project_if_accessible(payload.project_id, db, current_user)
    updated = crud.update_timelog_by_id(
        db,
        timelog_id=timelog_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        project_id=payload.project_id,
        notes=payload.notes,
    )
    return updated