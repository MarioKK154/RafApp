from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/approvals",
    tags=["Invoice Approvals"],
)

@router.get("/", response_model=List[schemas.InvoiceApprovalRead])
def read_invoice_approvals(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.get_invoice_approvals(db=db, tenant_id=current_user.tenant_id, status=status_filter)

@router.post("/", response_model=schemas.InvoiceApprovalRead, status_code=status.HTTP_201_CREATED)
def create_invoice_approval(
    approval: schemas.InvoiceApprovalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_invoice_approval(db=db, approval=approval, tenant_id=current_user.tenant_id)

@router.patch("/{approval_id}", response_model=schemas.InvoiceApprovalRead)
def update_invoice_approval(
    approval_id: int,
    update: schemas.InvoiceApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role not in ['admin', 'accountant', 'project manager'] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Insufficient permissions for invoice approval review.")
    
    updated = crud.update_invoice_approval(db=db, approval_id=approval_id, update=update, tenant_id=current_user.tenant_id, reviewer_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice approval record not found")
    return updated
