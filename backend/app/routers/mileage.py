from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/mileage",
    tags=["Mileage & Driving Logs"],
)

@router.get("/", response_model=List[schemas.DrivingLogRead])
def read_driving_logs(
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    target_user_id = user_id if (current_user.role in ['admin', 'project manager'] or current_user.is_superuser) else current_user.id
    return crud.get_driving_logs(db=db, tenant_id=current_user.tenant_id, user_id=target_user_id, project_id=project_id)

@router.post("/", response_model=schemas.DrivingLogRead, status_code=status.HTTP_201_CREATED)
def create_driving_log(
    log: schemas.DrivingLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_driving_log(db=db, log=log, tenant_id=current_user.tenant_id, user_id=current_user.id)
