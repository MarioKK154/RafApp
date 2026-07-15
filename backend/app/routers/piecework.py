# backend/app/routers/piecework.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/piecework",
    tags=["Piecework Incentive Engine"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Depends(get_db)
CurrentUserDependency = Depends(security.get_current_active_user)
SuperUserDependency = Depends(security.require_superuser)

@router.get("/rates", response_model=List[schemas.PieceworkRateRead])
@limiter.limit("60/minute")
def read_piecework_rates(request: Request, db: Session = DbDependency):
    """Retrieve all periodic union agreements and reiknitala multipliers."""
    return crud.get_piecework_rates(db)

@router.post("/rates", response_model=schemas.PieceworkRateRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_piecework_rate(request: Request, rate: schemas.PieceworkRateCreate, db: Session = DbDependency, current_user: models.User = SuperUserDependency):
    """Register a new active union agreement and reiknitala rate (superadmin only)."""
    return crud.create_piecework_rate(db, rate)

@router.get("/tasks", response_model=List[schemas.PieceworkTaskCatalogRead])
@limiter.limit("60/minute")
def read_piecework_tasks(request: Request, db: Session = DbDependency):
    """List all standardized tasks from the 'Green Book' catalog."""
    return crud.get_piecework_task_catalog(db)

@router.post("/tasks", response_model=schemas.PieceworkTaskCatalogRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_piecework_task(request: Request, task: schemas.PieceworkTaskCatalogCreate, db: Session = DbDependency, current_user: models.User = SuperUserDependency):
    """Create a new standardized piecework catalog task definition (superadmin only)."""
    return crud.create_piecework_task(db, task)

@router.get("/projects/{project_id}/logs", response_model=List[schemas.ProjectInstallationLogRead])
@limiter.limit("60/minute")
def read_installation_logs(request: Request, project_id: int, db: Session = DbDependency):
    """Retrieve all completed installation logs clocked on the jobsite for a project."""
    return crud.get_installation_logs_for_project(db, project_id)

@router.post("/projects/{project_id}/logs", response_model=schemas.ProjectInstallationLogRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_installation_log(request: Request, project_id: int, log: schemas.ProjectInstallationLogCreate, db: Session = DbDependency):
    """Log a quantity of completed physical tasks with surcharges on the jobsite."""
    if log.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch in payload.")
    # Verify project exists
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud.create_installation_log(db, log)

@router.get("/projects/{project_id}/settlement", response_model=schemas.ProjectSettlementRead)
@limiter.limit("30/minute")
def get_project_settlement(request: Request, project_id: int, db: Session = DbDependency):
    """Run the Ákvæðisvinna settlement algorithm and calculate surplus bonus pools."""
    try:
        settlement = crud.calculate_project_settlement(db, project_id)
        return settlement
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/projects/{project_id}/certify")
@limiter.limit("10/minute")
def certify_project(request: Request, project_id: int, db: Session = DbDependency):
    """Certify and freeze a project installation layout for final settlement payout (auditor / admin)."""
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found.")
    from datetime import datetime, timezone
    proj.is_certified = True
    proj.certification_date = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Project successfully certified for settlement.", "certified": True, "certification_date": proj.certification_date}
