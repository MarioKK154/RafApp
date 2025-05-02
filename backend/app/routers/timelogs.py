# backend/app/routers/timelogs.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    # No prefix here, set in main.py
    tags=["Time Logs"],
    dependencies=[Depends(security.get_current_active_user)] # All timelog routes require login
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.post("/clock-in", response_model=schemas.TimeLogRead, status_code=status.HTTP_201_CREATED)
async def clock_in(
    # Allow optional project/task association and notes on clock-in
    timelog_data: schemas.TimeLogCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Clocks in the current user, starting a new time log."""
    open_log = crud.get_open_timelog_for_user(db=db, user_id=current_user.id)
    if open_log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already clocked in. Clock out first."
        )

    # Optional: Validate project_id or task_id if provided
    if timelog_data.project_id and not crud.get_project(db, timelog_data.project_id):
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if timelog_data.task_id and not crud.get_task(db, timelog_data.task_id):
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


    new_log = crud.create_timelog_entry(db=db, timelog_data=timelog_data, user_id=current_user.id)
    return new_log

@router.post("/clock-out", response_model=schemas.TimeLogRead)
async def clock_out(
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Clocks out the current user, closing the currently open time log."""
    open_log = crud.get_open_timelog_for_user(db=db, user_id=current_user.id)
    if not open_log:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not currently clocked in."
        )

    closed_log = crud.update_timelog_entry(db=db, timelog_id=open_log.id)
    if not closed_log: # Should not happen if open_log was found, but check anyway
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not clock out.")

    return closed_log

@router.get("/status", response_model=schemas.TimeLogStatus)
async def get_clock_in_status(
     db: DbDependency,
     current_user: CurrentUserDependency
):
    """Checks if the current user is clocked in and returns the current open log if any."""
    open_log = crud.get_open_timelog_for_user(db=db, user_id=current_user.id)
    if open_log:
        return schemas.TimeLogStatus(is_clocked_in=True, current_log=open_log)
    else:
        return schemas.TimeLogStatus(is_clocked_in=False, current_log=None)


@router.get("/me", response_model=List[schemas.TimeLogRead])
async def read_my_timelogs(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = 0,
    limit: int = 100
    # TODO: Add date range filters? project filter?
):
    """Retrieves all time logs for the currently authenticated user."""
    logs = crud.get_timelogs_for_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return logs

# Optional: Add endpoint to get timelogs for a specific project
@router.get("/project/{project_id}", response_model=List[schemas.TimeLogRead])
async def read_project_timelogs(
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency, # Still need auth
    skip: int = 0,
    limit: int = 100
):
    """Retrieves time logs associated with a specific project."""
     # Check if project exists
    db_project = crud.get_project(db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    # TODO: Authorization check? Can user see logs for this project?

    logs = crud.get_timelogs_for_project(db=db, project_id=project_id, skip=skip, limit=limit)
    return logs

# Optional: Add endpoint to update notes on a timelog?
# Optional: Add endpoint to delete a timelog? (Requires careful consideration)