# backend/app/routers/reports.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

@router.get("/project-summary/{project_id}", response_model=schemas.ReportProjectSummary)
@limiter.limit("30/minute")
def get_report_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """
    Generates a financial and labor summary report for a specific project.
    Superadmins can report on any project; others are limited to their own tenant.
    """
    # 1. Determine tenant scope
    # Superadmins (God Mode) bypass tenant filters by passing None
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # 2. Verify project exists and the user has access
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Project not found or not accessible."
        )
        
    # 3. Aggregate data (Calculation logic is in crud.py)
    summary_data = crud.get_project_cost_summary(db=db, project=project)
    
    return summary_data