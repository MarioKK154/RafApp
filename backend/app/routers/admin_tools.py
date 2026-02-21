from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated
from datetime import datetime, timedelta

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/admin", # Changed from admin-tools to match your frontend dashboard call
    tags=["Admin Tools"]
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]
# Dependency for general dashboard access
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

@router.get("/stats", response_model=schemas.DashboardStats)
@limiter.limit("60/minute")
async def get_dashboard_stats(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # 1. Project Query
    project_query = db.query(models.Project)
    if effective_tenant_id:
        project_query = project_query.filter(models.Project.tenant_id == effective_tenant_id)
    active_projects = project_query.filter(models.Project.status == "active").count()

    # 2. Task Query
    task_query = db.query(models.Task)
    if effective_tenant_id:
        task_query = task_query.join(models.Project).filter(models.Project.tenant_id == effective_tenant_id)
    pending_tasks = task_query.filter(models.Task.status != "completed").count()

    # 3. User Query
    user_query = db.query(models.User)
    if effective_tenant_id:
        user_query = user_query.filter(models.User.tenant_id == effective_tenant_id)
    active_users = user_query.filter(models.User.is_active == True).count()

    # 4. Weekly Hours Calculation (Fixing the AttributeError)
    # We fetch logs from the last 7 days that have both a start and end time
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    logs_query = db.query(models.TimeLog).filter(
        models.TimeLog.start_time >= seven_days_ago,
        models.TimeLog.end_time != None
    )

    if effective_tenant_id:
        logs_query = logs_query.join(models.User).filter(models.User.tenant_id == effective_tenant_id)
    
    weekly_logs = logs_query.all()
    
    total_seconds = 0
    for log in weekly_logs:
        # Calculate duration for each log entry
        duration = log.end_time - log.start_time
        total_seconds += duration.total_seconds()
    
    weekly_hours = round(total_seconds / 3600.0, 2)

    return {
        "active_projects": active_projects,
        "pending_tasks": pending_tasks,
        "active_users": active_users,
        "weekly_hours": float(weekly_hours)
    }

@router.post("/perform-clean-slate", response_model=schemas.CleanSlateResponse)
@limiter.limit("10/minute")
async def perform_clean_slate_operation(
    request: Request,
    request_data: schemas.CleanSlateRequest,
    db: DbDependency,
    current_super_user: SuperUserDependency # Stays as SuperUser only
):
    main_admin_user_to_keep = crud.get_user_by_email(db, email=request_data.main_admin_email)

    if not main_admin_user_to_keep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The main admin user specified by email was not found."
        )
    if not main_admin_user_to_keep.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user account to keep must be a superuser."
        )

    try:
        summary_details = await crud.reassign_and_deactivate_other_users(
            db=db, main_admin_user_to_keep=main_admin_user_to_keep
        )
        return schemas.CleanSlateResponse(
            message="Clean slate operation completed successfully.", 
            summary=summary_details
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during the clean slate operation: {str(e)}"
        )