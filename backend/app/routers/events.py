# backend/app/routers/events.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from datetime import datetime

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/events",
    tags=["Calendar Events"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# Helper (remains the same)
def get_event_and_check_auth(event_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Event:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_event = crud.get_event(db, event_id=event_id, tenant_id=effective_tenant_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return db_event

@router.post("/", response_model=schemas.EventRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_event(
    request: Request,
    event_data: schemas.EventCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    if event_data.project_id:
        project = crud.get_project(db, project_id=event_data.project_id, tenant_id=current_user.tenant_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")
    return crud.create_event(db, event_data=event_data, user=current_user)

# --- THIS ENDPOINT IS CORRECTED ---
@router.get("/", response_model=List[schemas.EventRead])
@limiter.limit("100/minute")
def get_events_in_range(
    request: Request,
    start: datetime,
    end: datetime,
    db: DbDependency,
    current_user: CurrentUserDependency # Allows any authenticated user
):
    # If the user is a superuser, they don't belong to a single tenant.
    # We currently don't support viewing *all* events across tenants for superusers here.
    # Raise an error or return empty list for superusers for now.
    if current_user.is_superuser:
        # Option 1: Return empty list
        # return []
        # Option 2: Raise error (more explicit)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superusers cannot view tenant-specific calendars via this endpoint."
        )

    # For regular tenant users, their tenant_id *must* exist.
    if current_user.tenant_id is None:
        # This case should ideally not happen for an active, non-superuser.
        # Log this server-side if it occurs.
        print(f"ERROR: User {current_user.id} ({current_user.email}) is missing tenant_id.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User tenant information is missing. Please contact support."
        )

    # Fetch events only for the user's specific tenant.
    return crud.get_events_for_tenant(db, tenant_id=current_user.tenant_id, start=start, end=end)
# --- END CORRECTION ---


@router.get("/{event_id}", response_model=schemas.EventRead)
@limiter.limit("100/minute")
def get_single_event(
    request: Request,
    event_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    return get_event_and_check_auth(event_id, db, current_user)

@router.put("/{event_id}", response_model=schemas.EventRead)
@limiter.limit("100/minute")
def update_an_event(
    request: Request,
    event_id: int,
    event_update: schemas.EventUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_event = get_event_and_check_auth(event_id, db, current_user)
    # Optional permission check (e.g., allow only creator or admin/pm)
    # if db_event.creator_id != current_user.id and not (current_user.role == 'admin' or current_user.role == 'project manager'):
    #     raise HTTPException(status_code=403, detail="Not authorized to update this event.")
    return crud.update_event(db, db_event=db_event, event_update=event_update, tenant_id=current_user.tenant_id)

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_an_event(
    request: Request,
    event_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_event = get_event_and_check_auth(event_id, db, current_user)
    # Optional permission check
    # if db_event.creator_id != current_user.id and not (current_user.role == 'admin' or current_user.role == 'project manager'):
    #     raise HTTPException(status_code=403, detail="Not authorized to delete this event.")
    crud.delete_event(db, db_event=db_event)
    return None