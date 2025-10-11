# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any, Union
import csv
import io
import uuid
import aiofiles
from pathlib import Path

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = APP_DIR / "static" / "profile_pics"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(current_user: CurrentUserDependency):
    return current_user

@router.post("/me/profile-picture", response_model=schemas.UserReadAdmin)
async def upload_profile_picture(db: DbDependency, current_user: CurrentUserDependency, file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type.")
    
    file_extension = Path(file.filename).suffix
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path_on_disk = UPLOAD_DIR / unique_filename
    
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
async def change_current_user_password(password_data: schemas.UserChangePassword, db: DbDependency, current_user: CurrentUserDependency):
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    crud.update_user_password(db=db, user=current_user, new_password=password_data.new_password)
    return None

@router.get("/", response_model=List[Union[schemas.UserReadAdmin, schemas.UserRead]])
async def read_users(
    db: DbDependency,
    current_user_requesting: CurrentUserDependency,
    filter_tenant_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    if not current_user_requesting.is_superuser and current_user_requesting.role not in ['admin', 'project manager']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")

    target_tenant_id = current_user_requesting.tenant_id
    if current_user_requesting.is_superuser:
        target_tenant_id = filter_tenant_id

    return crud.get_users(db=db, tenant_id=target_tenant_id, is_active=is_active, skip=skip, limit=limit)

@router.post("/", response_model=schemas.UserReadAdmin, status_code=status.HTTP_201_CREATED)
async def create_new_user_by_admin(user_create_data: schemas.UserCreateAdmin, db: DbDependency, current_admin: CurrentUserDependency):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    if not current_admin.is_superuser:
        user_create_data.tenant_id = current_admin.tenant_id
    
    if user_create_data.is_superuser:
        if not current_admin.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only superusers can create other superusers.")
        if user_create_data.tenant_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Superusers cannot be assigned to a tenant.")
    else:
        if user_create_data.tenant_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A tenant_id is required for non-superusers.")
        if not crud.get_tenant(db, tenant_id=user_create_data.tenant_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {user_create_data.tenant_id} not found.")

    return crud.create_user_by_admin(db=db, user_data=user_create_data)

@router.get("/{user_id_to_view}", response_model=Union[schemas.UserReadAdmin, schemas.UserRead])
async def read_single_user(user_id_to_view: int, db: DbDependency, current_user_requesting: CurrentUserDependency):
    db_user = crud.get_user(db, user_id=user_id_to_view)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not current_user_requesting.is_superuser and db_user.tenant_id != current_user_requesting.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    return db_user

@router.put("/{user_id_to_update}", response_model=schemas.UserReadAdmin)
async def update_user_details_by_admin(user_id_to_update: int, user_update_data: schemas.UserUpdateAdmin, db: DbDependency, current_admin: CurrentUserDependency):
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
async def set_user_password_by_admin_endpoint(user_id_to_update: int, password_data: schemas.UserSetPasswordByAdmin, db: DbDependency, current_admin: CurrentUserDependency):
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
async def delete_user_by_admin_endpoint(user_id_to_delete: int, db: DbDependency, current_admin: CurrentUserDependency):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")
    user_to_delete = crud.get_user(db, user_id=user_id_to_delete)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not current_admin.is_superuser and user_to_delete.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete user in another tenant.")
    if current_admin.id == user_to_delete.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot delete their own account.")
    crud.delete_user_by_admin(db=db, user_id=user_id_to_delete)
    return None

@router.post("/import-csv", response_model=Dict[str, Any])
async def import_users_from_csv(db: DbDependency, current_admin: CurrentUserDependency, file: UploadFile = File(...)):
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