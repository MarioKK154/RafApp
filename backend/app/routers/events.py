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

# Helper to fetch event and verify access
def get_event_and_check_auth(event_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Event:
    """
    Retrieves an event and verifies tenant access. 
    Superadmins bypass the tenant check.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_event = crud.get_event(db, event_id=event_id, tenant_id=effective_tenant_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found or access denied.")
    return db_event

@router.post("/", response_model=schemas.EventRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_event(
    request: Request,
    event_data: schemas.EventCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """
    Creates a new calendar event. 
    Superadmins can link events to any project; regular users are limited to their tenant.
    """
    if event_data.project_id:
        effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
        project = crud.get_project(db, project_id=event_data.project_id, tenant_id=effective_tenant_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or not accessible.")
            
    return crud.create_event(db, event_data=event_data, user=current_user)

@router.get("/", response_model=List[schemas.EventRead])
@limiter.limit("100/minute")
def get_events_in_range(
    request: Request,
    start: datetime,
    end: datetime,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Retrieves all events within a specific time range.
    Superadmins see all system events; regular users see events for their tenant.
    """
    # Superadmin bypass: Passing None to the CRUD function triggers the "return all" logic
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id

    # If a regular user is missing a tenant ID, something is wrong with the account configuration
    if not current_user.is_superuser and effective_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User tenant information is missing."
        )

    return crud.get_events_for_tenant(db, tenant_id=effective_tenant_id, start=start, end=end)

@router.get("/{event_id}", response_model=schemas.EventRead)
@limiter.limit("100/minute")
def get_single_event(
    request: Request,
    event_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Retrieves details for a specific event."""
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
    """
    Updates an event's time, location, or attendees.
    """
    db_event = get_event_and_check_auth(event_id, db, current_user)
    
    # We pass the event's actual tenant_id to the CRUD to ensure 
    # attendee validation happens within the correct company context.
    return crud.update_event(
        db, 
        db_event=db_event, 
        event_update=event_update, 
        tenant_id=db_event.tenant_id
    )

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_an_event(
    request: Request,
    event_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Removes an event from the calendar."""
    db_event = get_event_and_check_auth(event_id, db, current_user)
    crud.delete_event(db, db_event=db_event)
    return None