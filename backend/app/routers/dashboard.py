# backend/app/routers/dashboard.py
# New router for the main user dashboard.

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

@router.get("/", response_model=schemas.DashboardData)
@limiter.limit("60/minute")
def get_dashboard(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Retrieves all relevant data for the current user's dashboard view.
    """
    dashboard_data = crud.get_dashboard_data(db, user=current_user)
    return dashboard_data