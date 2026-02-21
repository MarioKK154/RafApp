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
import logging

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

# Initialize Telemetry Logging
logger = logging.getLogger(__name__)

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
AccountantOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "accountant"]))]

# --- Payslip Infrastructure ---

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
    target_user = crud.get_user(db, user_id=user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target employee not found in registry.")
    
    if not current_user.is_superuser and target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Security Violation: Cross-tenant upload blocked.")

    file_extension = Path(file.filename).suffix
    if file_extension.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Protocol Error: Only PDF assets accepted for payroll.")
        
    unique_filename = f"payslip_{user_id}_{uuid.uuid4()}{file_extension}"
    file_path_on_disk = UPLOAD_DIR_PAYSLIPS / unique_filename
    
    try:
        with open(file_path_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        logger.error(f"IO Error during payslip upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Registry Error: Failed to commit file to disk.")
    finally:
        await file.close()

    payslip_data = schemas.PayslipCreate(
        user_id=user_id,
        issue_date=issue_date,
        amount_brutto=amount_brutto,
        amount_netto=amount_netto
    )
    
    return crud.create_payslip(
        db=db, 
        payslip=payslip_data, 
        tenant_id=target_user.tenant_id, 
        file_path=f"static/payslips/{unique_filename}",
        filename=file.filename
    )

@router.get("/payslips/me", response_model=List[schemas.PayslipRead])
@limiter.limit("50/minute")
async def get_my_payslips(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    return crud.get_payslips_for_user(db, user_id=current_user.id)

@router.get("/payslips/download/{payslip_id}", response_class=FileResponse)
@limiter.limit("10/minute")
async def download_payslip(
    request: Request, 
    payslip_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    db_payslip = crud.get_payslip(db, payslip_id=payslip_id)
    if not db_payslip:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_owner = db_payslip.user_id == current_user.id
    is_hr = (current_user.role in ["admin", "accountant"]) and (db_payslip.tenant_id == current_user.tenant_id)
    
    if not (is_owner or is_hr or current_user.is_superuser):
        raise HTTPException(status_code=403, detail="Clearance Denied: Unauthorized document access.")

    full_path = APP_DIR / db_payslip.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Asset lost on server storage.")

    return FileResponse(path=full_path, filename=db_payslip.filename, media_type="application/pdf")

# --- Leave Request Registry ---

@router.post("/leave-requests", response_model=schemas.LeaveRequestRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_leave_request(
    request: Request,
    leave_data: schemas.LeaveRequestCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    try:
        return crud.create_leave_request(
            db=db, 
            leave_data=leave_data, 
            user_id=current_user.id, 
            tenant_id=current_user.tenant_id
        )
    except Exception as e:
        logger.error(f"Leave Request Failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/leave-requests/me", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_my_leave_requests(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    return crud.get_leave_requests_for_user(db, user_id=current_user.id)

@router.get("/leave-requests/pending", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_pending_leave_requests(
    request: Request, 
    db: DbDependency, 
    current_user: AccountantOrAdminDependency
):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    # Accessing the Enum member directly from models
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
    db_request = crud.get_leave_request(db, request_id=request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request node not found.")

    if not current_user.is_superuser and db_request.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access Denied: Tenant mismatch.")

    # TECHNICAL SYNC:
    # review_data.status is a LeaveStatus enum member (e.g. LeaveStatus.Approved)
    # because Pydantic automatically converted the string from the frontend.
    # We pass it directly to CRUD.
    
    try:
        return crud.update_leave_request_status(
            db, 
            db_request=db_request, 
            status_enum=review_data.status, 
            comment=review_data.manager_comment
        )
    except Exception as e:
        logger.error(f"Authorization Error: {str(e)}")
        raise HTTPException(status_code=400, detail="Database rejected the status transition.")