# backend/app/routers/assignments.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
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
    target_date: Optional[date] = Query(None, description="Optional single date to unassign without deleting the full multi-day period"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Purge Protocol: Removes a personnel link from a project.
    If target_date is provided, removes or unassigns ONLY that single day.
    """
    # Permission Guard: Only Admins or Managers can unassign personnel
    if current_user.role not in ['admin', 'project manager'] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Insufficient clearance for resource scheduling.")

    # Security: verify the assignment belongs to this tenant before deleting
    db_assignment = db.query(models.ProjectAssignment).filter(
        models.ProjectAssignment.id == assignment_id
    ).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment node not found.")
    
    if not current_user.is_superuser:
        proj = db_assignment.project
        if proj and proj.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Cross-tenant operation denied.")

    if target_date:
        start_d = db_assignment.start_date
        end_d = db_assignment.end_date

        if start_d == end_d or (target_date <= start_d and target_date >= end_d):
            crud.delete_assignment(db, assignment_id=assignment_id)
            return {"message": "Assignment node purged successfully."}

        if target_date == start_d:
            db_assignment.start_date = start_d + timedelta(days=1)
            db.commit()
            return {"message": f"Single day {target_date} removed from assignment start."}

        if target_date == end_d:
            db_assignment.end_date = end_d - timedelta(days=1)
            db.commit()
            return {"message": f"Single day {target_date} removed from assignment end."}

        if start_d < target_date < end_d:
            old_end = db_assignment.end_date
            db_assignment.end_date = target_date - timedelta(days=1)
            
            segment_2 = models.ProjectAssignment(
                project_id=db_assignment.project_id,
                user_id=db_assignment.user_id,
                start_date=target_date + timedelta(days=1),
                end_date=old_end,
                role=db_assignment.role,
                notes=db_assignment.notes
            )
            db.add(segment_2)
            db.commit()
            return {"message": f"Single day {target_date} removed; assignment split into two range segments."}

    crud.delete_assignment(db, assignment_id=assignment_id)
    return {"message": "Assignment node purged successfully."}
