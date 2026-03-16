from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, Optional

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter


router = APIRouter(
    prefix="/system",
    tags=["System"],
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]


@router.get("/status", response_model=schemas.SystemStatus)
@limiter.limit("120/minute")
async def get_system_status(
    request: Request,
    db: DbDependency,
):
    data = crud.get_maintenance_status(db=db)
    return schemas.SystemStatus(**data)


@router.post("/maintenance", response_model=schemas.SystemStatus)
@limiter.limit("30/minute")
async def set_maintenance_mode(
    request: Request,
    payload: schemas.SystemStatus,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    mode_value = "on" if payload.maintenance else "off"
    crud.set_system_setting(db, "maintenance_mode", mode_value)
    crud.set_system_setting(db, "maintenance_message", payload.message or "")
    data = crud.get_maintenance_status(db=db)
    return schemas.SystemStatus(**data)


@router.get("/banner", response_model=Optional[schemas.GlobalBannerRead])
@limiter.limit("120/minute")
async def get_active_banner(
    request: Request,
    db: DbDependency,
):
    """Current active global banner (e.g. roadmap announcement). Shown to all authenticated users."""
    banner = crud.get_active_global_banner(db=db)
    if not banner:
        return None
    return schemas.GlobalBannerRead.model_validate(banner)

