from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/work-orders",
    tags=["Work Orders"],
)

@router.get("/", response_model=List[schemas.WorkOrderRead])
def read_work_orders(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.get_work_orders(db=db, tenant_id=current_user.tenant_id, project_id=project_id)

@router.post("/", response_model=schemas.WorkOrderRead, status_code=status.HTTP_201_CREATED)
def create_work_order(
    wo: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_work_order(db=db, wo=wo, tenant_id=current_user.tenant_id, creator_id=current_user.id)

@router.patch("/{work_order_id}", response_model=schemas.WorkOrderRead)
def update_work_order(
    work_order_id: int,
    wo_update: schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    updated = crud.update_work_order(db=db, wo_id=work_order_id, wo_update=wo_update, tenant_id=current_user.tenant_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Work Order not found")
    return updated
