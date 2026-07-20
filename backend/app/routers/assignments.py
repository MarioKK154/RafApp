# backend/app/routers/assignments.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from .. import crud, schemas, models, security
from ..database import get_db

router = APIRouter(
    prefix="/assignments",
    tags=["Resource Management"]
)

@router.get("/", response_model=List[schemas.AssignmentRead])
def read_assignments(
    start: date = Query(...),
    end: date = Query(...),
    tenant_id: Optional[int] = Query(None, description="Superadmin-only tenant scope filter"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Registry Telemetry: Fetches all project assignments within a specific temporal window.
    """
    effective_tenant_id = current_user.tenant_id
    if current_user.is_superuser:
        effective_tenant_id = tenant_id
    assignments = crud.get_assignments(db, start=start, end=end, tenant_id=effective_tenant_id)
    
    # Enrich the data for the Frontend Grid
    for a in assignments:
        a.user_name = a.user.full_name
        a.project_name = a.project.name
        a.project_number = a.project.project_number
        
    return assignments

@router.post("/", response_model=schemas.AssignmentRead)
def create_new_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Deployment Protocol: Pins an employee node to a specific project for a date range.
    """
    # Permission Guard: Only Admins or Managers can schedule personnel
    if current_user.role not in ['admin', 'project manager'] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Insufficient clearance for resource scheduling.")
        
    new_assignment = crud.create_assignment(db=db, assignment=assignment)
    
    # Dispatch in-app notification to assigned user
    try:
        project_obj = crud.get_project(db, project_id=assignment.project_id)
        proj_name = project_obj.name if project_obj else f"Project #{assignment.project_id}"
        msg = f"You have been assigned to project '{proj_name}' in the schedule ({assignment.start_date} to {assignment.end_date})."
        crud.create_notification(db=db, user_id=assignment.user_id, message=msg, link="/scheduling")
    except Exception as e:
        print(f"Failed to dispatch schedule assignment notification: {e}")

    return new_assignment

@router.delete("/{assignment_id}")
def purge_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Purge Protocol: Removes a personnel link from a project.
    """
    if current_user.role not in ['admin', 'project manager'] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Purge protocol denied.")
        
    crud.delete_assignment(db, assignment_id=assignment_id)
    return {"message": "Assignment node purged successfully."}
