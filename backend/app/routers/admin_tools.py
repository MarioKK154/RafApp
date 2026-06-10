from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Annotated, List, Optional
from datetime import datetime, timedelta
import time
from scripts.seed_demo_tenant import seed_demo_tenant, TENANT_ID, DEFAULT_PASSWORD

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/admin",
    tags=["Admin Tools"]
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]
# Dependency for general dashboard access
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]


@router.post("/super/seed-demo-tenant")
@limiter.limit("5/minute")
async def seed_demo_tenant_presentation(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """
    One-click presentation dataset.
    Rebuilds tenant id=2 with demo users/projects/tasks/cars/tools/customers.
    Superuser only.
    """
    # Function manages its own DB session safely; keep this endpoint thin.
    try:
        seed_demo_tenant(reset_existing=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed demo tenant: {str(e)}",
        )
    return {
        "ok": True,
        "tenant_id": TENANT_ID,
        "default_password": DEFAULT_PASSWORD,
        "message": "Demo tenant seeded successfully.",
    }

@router.get("/stats", response_model=schemas.DashboardStats)
@limiter.limit("60/minute")
async def get_dashboard_stats(
    request: Request,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    effective_tenant_id = current_user.tenant_id
    
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

    # 4. Weekly Hours Calculation
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
        duration = log.end_time - log.start_time
        total_seconds += duration.total_seconds()
    
    weekly_hours = round(total_seconds / 3600.0, 2)

    return {
        "active_projects": active_projects,
        "pending_tasks": pending_tasks,
        "active_users": active_users,
        "weekly_hours": float(weekly_hours)
    }


@router.get("/super/tenant-heatmap", response_model=schemas.TenantHeatmap)
@limiter.limit("60/minute")
async def get_tenant_heatmap(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    items = crud.get_tenant_heatmap_data(db=db)
    return {"items": [schemas.TenantHeatmapItem(**item) for item in items]}


@router.get("/super/growth-metrics", response_model=schemas.PlatformGrowthMetrics)
@limiter.limit("60/minute")
async def get_platform_growth(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    data = crud.get_platform_growth_metrics(db=db)
    return schemas.PlatformGrowthMetrics(**data)


@router.get("/super/system-load", response_model=schemas.SystemLoadStats)
@limiter.limit("60/minute")
async def get_system_load(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    start = time.perf_counter()
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    total_tenants = db.query(models.Tenant).count()
    total_users = db.query(models.User).count()
    total_projects = db.query(models.Project).count()

    return schemas.SystemLoadStats(
        db_ok=db_ok,
        db_latency_ms=round(elapsed_ms, 2),
        total_tenants=total_tenants,
        total_users=total_users,
        total_projects=total_projects,
    )

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


@router.get("/super/billing/overdue-tenants", response_model=List[schemas.BillingOverdueTenantSummary])
@limiter.limit("60/minute")
async def get_overdue_billing_tenants(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    data = crud.get_overdue_billing_by_tenant(db=db)
    return [schemas.BillingOverdueTenantSummary(**item) for item in data]


# --- Impersonation (superuser only, audit logged) ---

@router.post("/impersonate", response_model=schemas.ImpersonationStartResponse)
@limiter.limit("30/minute")
async def start_impersonation(
    request: Request,
    body: schemas.ImpersonateRequest,
    db: DbDependency,
    current_user: SuperUserDependency,
    token: Annotated[str, Depends(security.oauth2_scheme)],
):
    """Start impersonating another user. Returns new token and stores original for restore. Audit logged."""
    target = crud.get_user(db, user_id=body.user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not target.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot impersonate an inactive user")
    log = crud.create_impersonation_log(db, superuser_id=current_user.id, target_user_id=target.id)
    token_data = {
        "sub": str(target.id),
        "impersonated_by": current_user.email,
        "impersonation_log_id": log.id,
    }
    access_token = security.create_access_token(
        data=token_data,
        expires_delta=security.access_token_expires_delta(remember_me=True),
    )
    impersonated_user = schemas.UserRead.model_validate(target)
    return schemas.ImpersonationStartResponse(
        access_token=access_token,
        token_type="bearer",
        impersonated_user=impersonated_user,
        original_token=token,
        impersonation_log_id=log.id,
    )


@router.post("/impersonation/end", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def end_impersonation(
    request: Request,
    body: schemas.ImpersonationEndRequest,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """Mark an impersonation session as ended. Call with the superuser's token (after restoring it on the client)."""
    updated = crud.end_impersonation_log(db, log_id=body.impersonation_log_id, superuser_id=current_user.id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impersonation log not found or already ended, or you are not the superuser who started it.",
        )
    return None


@router.get("/impersonation/logs", response_model=List[schemas.ImpersonationLogRead])
@limiter.limit("60/minute")
async def get_impersonation_logs(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
    superuser_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 200,
):
    """Audit trail of all impersonation sessions. Superuser only."""
    items = crud.get_impersonation_logs(
        db=db,
        superuser_id=superuser_id,
        target_user_id=target_user_id,
        skip=skip,
        limit=limit,
    )
    return [schemas.ImpersonationLogRead(**item) for item in items]


# --- Global Audit Logs (superuser only) ---

@router.get("/audit-logs", response_model=List[schemas.AuditLogRead])
@limiter.limit("60/minute")
async def get_audit_logs(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
    action_type: Optional[str] = None,
    tenant_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 300,
):
    """Master list of sensitive actions: password changes, data exports, tenant deletions."""
    logs = crud.get_audit_logs(db=db, action_type=action_type, tenant_id=tenant_id, skip=skip, limit=limit)
    return [schemas.AuditLogRead.model_validate(log) for log in logs]


# --- Global Banners (superuser create; all users see active) ---

@router.post("/banner", response_model=schemas.GlobalBannerRead)
@limiter.limit("20/minute")
async def create_banner(
    request: Request,
    body: schemas.GlobalBannerCreate,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """Create a global banner visible to all users (e.g. roadmap announcement)."""
    banner = crud.create_global_banner(
        db, message=body.message, created_by_id=current_user.id,
        starts_at=body.starts_at, ends_at=body.ends_at,
    )
    return schemas.GlobalBannerRead.model_validate(banner)


@router.post("/banner/{banner_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def dismiss_banner(
    request: Request,
    banner_id: int,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """Deactivate a global banner (stop showing to users)."""
    updated = crud.set_global_banner_inactive(db, banner_id=banner_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found")
    return None


# --- Tenant Health / Churn (superuser only) ---

@router.get("/super/tenant-health", response_model=List[schemas.TenantHealthItem])
@limiter.limit("60/minute")
async def get_tenant_health(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """Tenant health and churn risk: last login, hours this week vs previous 4 weeks. High risk if usually active but 0 hours this week."""
    items = crud.get_tenant_health_churn(db=db)
    return [schemas.TenantHealthItem(**item) for item in items]
