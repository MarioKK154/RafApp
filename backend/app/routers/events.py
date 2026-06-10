from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from datetime import datetime

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter
from ..services.push_service import notify_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/events",
    tags=["Calendar Events"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "superuser"]))]

# Helper to fetch event and verify access
def get_event_and_check_auth(event_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Event:
    """
    Retrieves an event and verifies tenant access. 
    Superadmins bypass the tenant check.
    """
    effective_tenant_id = current_user.tenant_id
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
    current_user: CurrentUserDependency # Changed to CurrentUser to allow anyone to create personal events
):
    """
    Creates a new calendar event (Meeting, Task, or Custom). 
    Logic: Automatically handles attendee linkage and type categorization.
    """
    if event_data.project_id:
        effective_tenant_id = current_user.tenant_id
        project = crud.get_project(db, project_id=event_data.project_id, tenant_id=effective_tenant_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or not accessible.")
            
    new_event = crud.create_event(db, event_data=event_data, user=current_user)
    
    for attendee in new_event.attendees:
        if attendee.id != current_user.id:
            try:
                notify_user(
                    db=db,
                    user_id=attendee.id,
                    title="New Calendar Event",
                    body=f"You've been invited to: {new_event.title}",
                    url="/calendar"
                )
            except Exception as e:
                logger.error(f"Failed to send push notification: {e}")
                
    return new_event

@router.get("/", response_model=List[schemas.EventRead])
@limiter.limit("100/minute")
def get_events_in_range(
    request: Request,
    db: DbDependency,           # Moved Up
    current_user: CurrentUserDependency, # Moved Up
    start: datetime = Query(...), # Moved Down
    end: datetime = Query(...),    # Moved Down
    tenant_id: Optional[int] = Query(None, description="Superadmin-only tenant scope filter"),
):
    """
    Oversight: Retrieves all events within a specific temporal window.
    Isolation: Superadmins see system-wide; regular users see tenant-specific sequences.
    """
    effective_tenant_id = current_user.tenant_id
    if False:
        effective_tenant_id = tenant_id

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
    """Registry: Retrieve specific event telemetry."""
    return get_event_and_check_auth(event_id, db, current_user)

@router.put("/{event_id}", response_model=schemas.EventRead)
@limiter.limit("100/minute")
def update_an_event(
    request: Request,
    event_id: int,
    event_update: schemas.EventUpdate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Protocol: Synchronize changes to timing, type, or personnel registry.
    """
    db_event = get_event_and_check_auth(event_id, db, current_user)
    
    # Permission logic: Only creator or admins/managers can update
    is_manager = current_user.role in ["admin", "project manager", "superuser"]
    if db_event.creator_id != current_user.id and not is_manager:
        raise HTTPException(status_code=403, detail="Unauthorized to modify this sequence.")

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
    current_user: CurrentUserDependency
):
    """Protocol: Terminate event sequence."""
    db_event = get_event_and_check_auth(event_id, db, current_user)
    
    is_manager = current_user.role in ["admin", "project manager", "superuser"]
    if db_event.creator_id != current_user.id and not is_manager:
        raise HTTPException(status_code=403, detail="Unauthorized to terminate this sequence.")
        
    crud.delete_event(db, db_event=db_event)
    return None
