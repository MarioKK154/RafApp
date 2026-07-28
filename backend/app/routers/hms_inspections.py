from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/hms-inspections",
    tags=["HMS Electrical Inspections"],
)

@router.get("/", response_model=List[schemas.HMSInspectionRead])
def read_hms_inspections(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.get_hms_inspections(db=db, tenant_id=current_user.tenant_id, project_id=project_id)

@router.post("/", response_model=schemas.HMSInspectionRead, status_code=status.HTTP_201_CREATED)
def create_hms_inspection(
    insp: schemas.HMSInspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_hms_inspection(db=db, insp=insp, tenant_id=current_user.tenant_id, inspector_id=current_user.id)
