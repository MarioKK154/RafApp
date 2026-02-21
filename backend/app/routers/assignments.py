# backend/app/routers/assignments.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Registry Telemetry: Fetches all project assignments within a specific temporal window.
    """
    assignments = crud.get_assignments(db, start=start, end=end)
    
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
        
    return crud.create_assignment(db=db, assignment=assignment)

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