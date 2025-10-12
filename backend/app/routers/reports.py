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
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
        
    summary_data = crud.get_project_cost_summary(db=db, project=project)
    
    return summary_data