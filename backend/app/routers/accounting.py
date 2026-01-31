# backend/app/routers/accounting.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid
from pathlib import Path
from datetime import date

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/accounting",
    tags=["Accounting & HR"],
    dependencies=[Depends(security.get_current_active_user)]
)

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR_PAYSLIPS = APP_DIR / "static" / "payslips"
UPLOAD_DIR_PAYSLIPS.mkdir(parents=True, exist_ok=True)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Define who can manage financial/HR data
AccountantOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "accountant"]))]

# --- Payslips ---

@router.post("/payslips", response_model=schemas.PayslipRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def upload_payslip(
    request: Request,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
    user_id: int = Form(...),
    issue_date: date = Form(...),
    amount_brutto: float = Form(...),
    amount_netto: float = Form(...),
    file: UploadFile = File(...)
):
    """
    Uploads a PDF payslip for a specific user.
    Only Admins or Accountants can perform this action.
    """
    # 1. Verify target user exists and belongs to same tenant
    target_user = crud.get_user(db, user_id=user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target employee not found.")
    
    if not current_user.is_superuser and target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot upload payslips for users in other tenants.")

    # 2. File Handling
    file_extension = Path(file.filename).suffix
    if file_extension.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed for payslips.")
        
    unique_filename = f"payslip_{user_id}_{uuid.uuid4()}{file_extension}"
    file_path_on_disk = UPLOAD_DIR_PAYSLIPS / unique_filename
    
    try:
        with open(file_path_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        await file.close()

    # 3. Create Database Record
    payslip_data = schemas.PayslipCreate(
        user_id=user_id,
        issue_date=issue_date,
        amount_brutto=amount_brutto,
        amount_netto=amount_netto
    )
    
    db_payslip = crud.create_payslip(
        db=db, 
        payslip=payslip_data, 
        tenant_id=target_user.tenant_id, 
        file_path=f"static/payslips/{unique_filename}",
        filename=file.filename
    )
    return db_payslip

@router.get("/payslips/me", response_model=List[schemas.PayslipRead])
@limiter.limit("50/minute")
async def get_my_payslips(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    """Allows an employee to retrieve all of their own payslips."""
    return crud.get_payslips_for_user(db, user_id=current_user.id)

@router.get("/payslips/download/{payslip_id}", response_class=FileResponse)
@limiter.limit("10/minute")
async def download_payslip(
    request: Request, 
    payslip_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    """Downloads a specific payslip. Verified by ownership or HR role."""
    db_payslip = crud.get_payslip(db, payslip_id=payslip_id)
    if not db_payslip:
        raise HTTPException(status_code=404, detail="Payslip not found.")

    # Permission check: Own payslip OR Accountant/Admin of same tenant
    is_owner = db_payslip.user_id == current_user.id
    is_hr = (current_user.role in ["admin", "accountant"]) and (db_payslip.tenant_id == current_user.tenant_id)
    
    if not (is_owner or is_hr or current_user.is_superuser):
        raise HTTPException(status_code=403, detail="Not authorized to access this payslip.")

    full_path = APP_DIR / db_payslip.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File missing on server.")

    return FileResponse(path=full_path, filename=db_payslip.filename, media_type="application/pdf")

# --- Leave Requests ---

@router.post("/leave-requests", response_model=schemas.LeaveRequestRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_leave_request(
    request: Request,
    leave_data: schemas.LeaveRequestCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Employees can submit a request for time off (vacation, sick leave, etc.)."""
    return crud.create_leave_request(db=db, leave_data=leave_data, user_id=current_user.id, tenant_id=current_user.tenant_id)

@router.get("/leave-requests/me", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_my_leave_requests(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    """Employees view their own request history and statuses."""
    return crud.get_leave_requests_for_user(db, user_id=current_user.id)

@router.get("/leave-requests/pending", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_pending_leave_requests(
    request: Request, 
    db: DbDependency, 
    current_user: AccountantOrAdminDependency
):
    """Managers/Accountants view all pending requests for their tenant."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_all_leave_requests(db, tenant_id=effective_tenant_id, status=models.LeaveStatus.Pending)

@router.put("/leave-requests/{request_id}/review", response_model=schemas.LeaveRequestRead)
@limiter.limit("50/minute")
async def review_leave_request(
    request: Request,
    request_id: int,
    review_data: schemas.LeaveRequestReview,
    db: DbDependency,
    current_user: AccountantOrAdminDependency
):
    """Approve or Reject a leave request."""
    db_request = crud.get_leave_request(db, request_id=request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if not current_user.is_superuser and db_request.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this request.")

    return crud.update_leave_request_status(db, db_request=db_request, review_data=review_data)