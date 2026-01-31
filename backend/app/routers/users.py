# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Request, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any, Union
import csv
import io
import uuid
import aiofiles
from pathlib import Path
import os
from datetime import date

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

APP_DIR = Path(__file__).resolve().parent.parent
LICENSE_UPLOAD_DIR = APP_DIR / "static" / "user_licenses"
LICENSE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_PIC_UPLOAD_DIR = APP_DIR / "static" / "profile_pics"
PROFILE_PIC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Helper function to verify user access based on role and tenant
def get_user_and_verify_access(user_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.User:
    db_user = crud.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_self = current_user.id == db_user.id
    # Superadmins have global access; Admins only within their tenant
    is_admin_in_tenant = (current_user.role == 'admin' and current_user.tenant_id == db_user.tenant_id)
    
    if not (is_self or is_admin_in_tenant or current_user.is_superuser):
         raise HTTPException(status_code=403, detail="Not authorized to access this user's data")
    return db_user

# --- Authentication & Profile Endpoints ---

@router.get("/me", response_model=schemas.UserRead)
@limiter.limit("100/minute")
async def read_users_me(request: Request, current_user: CurrentUserDependency):
    return current_user

@router.post("/me/profile-picture", response_model=schemas.UserReadAdmin)
@limiter.limit("10/minute")
async def upload_profile_picture(request: Request, db: DbDependency, current_user: CurrentUserDependency, file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type.")
    
    file_extension = Path(file.filename).suffix
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path_on_disk = PROFILE_PIC_UPLOAD_DIR / unique_filename
    
    try:
        async with aiofiles.open(file_path_on_disk, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error uploading file: {e}")
    
    db_file_path = f"static/profile_pics/{unique_filename}"
    updated_user = crud.update_user_profile_picture_path(db, user_id=current_user.id, path=db_file_path)
    
    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found after upload.")
    return updated_user

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def change_current_user_password(request: Request, password_data: schemas.UserChangePassword, db: DbDependency, current_user: CurrentUserDependency):
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    
    crud.update_user_password(db=db, user=current_user, new_password=password_data.new_password)
    return None

# --- User Management Endpoints ---

@router.get("/", response_model=List[Union[schemas.UserReadAdmin, schemas.UserRead]])
@limiter.limit("1000/minute")
async def read_users(
    request: Request,
    db: DbDependency,
    current_user_requesting: CurrentUserDependency,
    filter_tenant_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    if not current_user_requesting.is_superuser and current_user_requesting.role not in ['admin', 'project manager']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    
    # Logic: Superusers can filter by any tenant; Regular Admins are locked to their own.
    target_tenant_id = current_user_requesting.tenant_id
    if current_user_requesting.is_superuser:
        target_tenant_id = filter_tenant_id
        
    return crud.get_users(db=db, tenant_id=target_tenant_id, is_active=is_active, skip=skip, limit=limit)

@router.post("/", response_model=schemas.UserReadAdmin, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_new_user_by_admin(request: Request, user_create_data: schemas.UserCreateAdmin, db: DbDependency, current_admin: CurrentUserDependency):
    
    # 1. Permission Check
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")

    # 2. Logic for Regular Admins: Force their own tenant and prevent Superuser creation
    if not current_admin.is_superuser:
        user_create_data.tenant_id = current_admin.tenant_id
        user_create_data.is_superuser = False 

    # 3. Logic for Superadmins:
    if user_create_data.is_superuser:
        if not current_admin.is_superuser:
            raise HTTPException(status_code=403, detail="Only superusers can create other superusers.")
        user_create_data.tenant_id = 1 # Assigned to System Tenant
    else:
        # If creating a regular user, a tenant ID is required
        if user_create_data.tenant_id is None:
            raise HTTPException(status_code=400, detail="A tenant_id is required for non-superusers.")
        
        # Verify the target tenant exists
        if not crud.get_tenant(db, tenant_id=user_create_data.tenant_id):
            raise HTTPException(status_code=404, detail=f"Tenant ID {user_create_data.tenant_id} not found.")

    return crud.create_user_by_admin(db=db, user_data=user_create_data)

@router.get("/{user_id_to_view}", response_model=Union[schemas.UserReadAdmin, schemas.UserRead])
@limiter.limit("100/minute")
async def read_single_user(request: Request, user_id_to_view: int, db: DbDependency, current_user_requesting: CurrentUserDependency):
    db_user = crud.get_user(db, user_id=user_id_to_view)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not current_user_requesting.is_superuser and db_user.tenant_id != current_user_requesting.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view users in other tenants.")
    
    return db_user

@router.put("/{user_id_to_update}", response_model=schemas.UserReadAdmin)
@limiter.limit("100/minute")
async def update_user_details_by_admin(request: Request, user_id_to_update: int, user_update_data: schemas.UserUpdateAdmin, db: DbDependency, current_admin: CurrentUserDependency):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    
    db_user_to_update = crud.get_user(db, user_id=user_id_to_update)
    if not db_user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to update not found")
    
    if not current_admin.is_superuser and db_user_to_update.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins can only update users in their own tenant.")
    
    if db_user_to_update.is_superuser and user_update_data.is_active is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A superuser account cannot be deactivated.")
    
    return crud.update_user_by_admin(db=db, user_to_update=db_user_to_update, user_data=user_update_data)

@router.post("/{user_id_to_update}/set-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def set_user_password_by_admin_endpoint(request: Request, user_id_to_update: int, password_data: schemas.UserSetPasswordByAdmin, db: DbDependency, current_admin: CurrentUserDependency):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    
    user_to_update = crud.get_user(db, user_id=user_id_to_update)
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not current_admin.is_superuser and user_to_update.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot set password for user in another tenant.")
    
    crud.set_user_password_by_admin(db=db, user=user_to_update, new_password=password_data.new_password)
    return None

@router.delete("/{user_id_to_delete}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_user_by_admin_endpoint(request: Request, user_id_to_delete: int, db: DbDependency, current_admin: CurrentUserDependency):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    
    user_to_delete = crud.get_user(db, user_id=user_id_to_delete)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not current_admin.is_superuser and user_to_delete.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete user in another tenant.")
    
    if current_admin.id == user_to_delete.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot delete their own account.")
    
    crud.delete_user_by_admin(db, user_id=user_id_to_delete)
    return None

@router.post("/import-csv", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def import_users_from_csv(request: Request, db: DbDependency, current_admin: CurrentUserDependency, file: UploadFile = File(...)):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    
    target_tenant_id = current_admin.tenant_id
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")
    
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8-sig'))
        csv_reader = csv.DictReader(csv_file)
        users_to_create: List[schemas.UserImportCSVRow] = [schemas.UserImportCSVRow.model_validate(row) for row in csv_reader]
        
        DEFAULT_PASSWORD = "testpassword123"
        DEFAULT_ROLE = "electrician"
        
        results = crud.bulk_create_users_from_csv(db=db, users_data=users_to_create, tenant_id=target_tenant_id, default_password=DEFAULT_PASSWORD, default_role=DEFAULT_ROLE)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {e}")
    finally:
        await file.close()

# --- User License Endpoints ---

@router.post("/{user_id}/licenses/", response_model=schemas.UserLicenseRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_license_for_user(
    request: Request,
    user_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    description: str = Form(...),
    issue_date: Optional[date] = Form(None),
    expiry_date: Optional[date] = Form(None),
    file: UploadFile = File(...)
):
    user_to_modify = get_user_and_verify_access(user_id, db, current_user)
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is allowed.")

    file_extension = ".pdf"
    unique_filename = f"user_{user_id}_license_{uuid.uuid4()}{file_extension}"
    save_path_on_disk = LICENSE_UPLOAD_DIR / unique_filename
    
    try:
        async with aiofiles.open(save_path_on_disk, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving license file: {e}")

    license_data = schemas.UserLicenseCreate(
        description=description,
        issue_date=issue_date,
        expiry_date=expiry_date
    )

    db_license = crud.create_user_license(
        db=db,
        license_data=license_data,
        user_id=user_to_modify.id,
        file_path=str(save_path_on_disk), 
        filename=file.filename 
    )
    return db_license

@router.get("/{user_id}/licenses/", response_model=List[schemas.UserLicenseRead])
@limiter.limit("100/minute")
def get_user_licenses_list(
    request: Request,
    user_id: int,
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    user_to_view = get_user_and_verify_access(user_id, db, current_user)
    return crud.get_licenses_for_user(db=db, user_id=user_to_view.id)

@router.get("/licenses/{license_id}/download", response_class=FileResponse)
@limiter.limit("30/minute")
async def download_user_license_file(
    request: Request,
    license_id: int,
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    db_license = crud.get_user_license(db, license_id=license_id)
    if not db_license:
        raise HTTPException(status_code=404, detail="License not found")
        
    get_user_and_verify_access(db_license.user_id, db, current_user)
    
    file_disk_path = Path(db_license.file_path)
    if not file_disk_path.is_file():
         raise HTTPException(status_code=404, detail="License file not found on server.")
         
    return FileResponse(path=file_disk_path, filename=db_license.filename, media_type="application/pdf")

@router.delete("/licenses/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_user_license_record(
    request: Request,
    license_id: int,
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    db_license = crud.get_user_license(db, license_id=license_id)
    if not db_license:
        raise HTTPException(status_code=404, detail="License not found")
        
    get_user_and_verify_access(db_license.user_id, db, current_user)
    
    file_disk_path = Path(db_license.file_path)
    crud.delete_user_license(db=db, db_license=db_license)
    
    try:
        if file_disk_path.is_file():
            os.remove(file_disk_path)
    except OSError as e:
        print(f"Error deleting license file {file_disk_path}: {e}") 
        
    return None