# backend/app/routers/users.py
# Full Uncondensed Version - Verified Order for /me and /{user_id}
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any
import csv
import io

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Users"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_manager)]
AdminOnlyDependency = Annotated[models.User, Depends(security.require_admin)]


# --- /users/me MUST be defined BEFORE /users/{user_id} ---
@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(
    current_user: CurrentUserDependency
):
    """
    Fetches the profile of the currently authenticated user.
    """
    return current_user

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    password_data: schemas.UserChangePassword,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Allows the currently authenticated user to change their own password."""
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password."
        )
    crud.update_user_password(db=db, user=current_user, new_password=password_data.new_password)
    return None # For 204 No Content

# --- Generic user ID routes AFTER specific string routes like /me ---
@router.get("/{user_id}", response_model=schemas.UserRead)
async def read_single_user(
    user_id: int, # Path parameter user_id is an integer
    db: DbDependency,
    current_viewer: ManagerOrAdminDependency
):
    """
    Retrieves details for a specific user by ID.
    (Requires Manager or Admin role).
    """
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

@router.get("/", response_model=List[schemas.UserRead])
async def read_users(
    db: DbDependency,
    current_admin_or_manager: ManagerOrAdminDependency,
    is_active: Optional[bool] = Query(None, description="Filter users by active status (true or false)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """Retrieves a list of users, optionally filtered by active status (Requires Manager or Admin role)."""
    users = crud.get_users(db=db, is_active=is_active, skip=skip, limit=limit)
    return users

@router.post("/", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user_by_admin(
    user_create_data: schemas.UserCreateAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency
):
    """Creates a new user (Requires Admin role). Allows setting role etc."""
    existing_user = crud.get_user_by_email(db, email=user_create_data.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    new_user = crud.create_user_by_admin(db=db, user_data=user_create_data)
    return new_user

@router.put("/{user_id}", response_model=schemas.UserRead)
async def update_user_details_by_admin(
    user_id: int,
    user_update_data: schemas.UserUpdateAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency
):
    """Updates a user's details (role, active status, etc.) by an administrator (Requires Admin role)."""
    db_user_to_update = crud.get_user(db, user_id=user_id)
    if not db_user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to update not found")
    
    updated_user = crud.update_user_by_admin(db=db, user_to_update=db_user_to_update, user_data=user_update_data)
    return updated_user

@router.post("/{user_id}/set-password", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_password_by_admin_endpoint(
    user_id: int,
    password_data: schemas.UserSetPasswordByAdmin,
    db: DbDependency,
    current_admin: AdminOnlyDependency
):
    """Allows an administrator to set/reset a user's password."""
    if current_admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot use this endpoint to change their own password. Use /users/me/change-password."
        )
    user_to_update = crud.get_user(db, user_id=user_id)
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    crud.set_user_password_by_admin(db=db, user=user_to_update, new_password=password_data.new_password)
    return None

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_by_admin_endpoint(
    user_id: int,
    db: DbDependency,
    current_admin: AdminOnlyDependency
):
    """Deletes a user by ID (Requires Admin role)."""
    if current_admin.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot delete their own account.")
    deleted_user = crud.delete_user_by_admin(db=db, user_id=user_id)
    if deleted_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None

@router.post("/import-csv", response_model=Dict[str, Any], tags=["Users"])
async def import_users_from_csv(
    db: DbDependency,
    current_admin: AdminOnlyDependency,
    file: UploadFile = File(...)
):
    """
    Allows an administrator to bulk import users from a CSV file.
    Expected CSV Columns: Name,Email,Employee ID,Kennitala,Phone,Location
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8-sig'))
        csv_reader = csv.DictReader(csv_file)
        users_to_create: List[schemas.UserImportCSVRow] = []
        parse_errors = []
        for row_num, row_dict in enumerate(csv_reader, start=2):
            try:
                user_data = schemas.UserImportCSVRow.model_validate(row_dict)
                users_to_create.append(user_data)
            except Exception as e:
                parse_errors.append(f"Row {row_num}: Invalid data - {str(e)}")
        DEFAULT_PASSWORD = "testpassword123"
        DEFAULT_ROLE = "electrician"
        SKIP_EMPLOYEE_IDS = ["252", "276", "323"]
        results = crud.bulk_create_users_from_csv(
            db=db, users_data=users_to_create, default_password=DEFAULT_PASSWORD,
            default_role=DEFAULT_ROLE, default_is_active=True,
            default_is_superuser=False, skip_employee_ids=SKIP_EMPLOYEE_IDS
        )
        if parse_errors:
            results["parse_errors"] = results.get("parse_errors", []) + parse_errors
            results["skipped_count"] = results.get("skipped_count", 0) + len(parse_errors)
        if results["created_count"] == 0 and results["skipped_count"] > 0 and not results.get("errors"):
             if not users_to_create and not parse_errors :
                 return {"message": "No valid user data found in CSV.", "created_count":0, "skipped_count":0, "errors": ["CSV empty or all rows had parsing issues."]}
        return results
    except Exception as e:
        print(f"Unexpected error processing CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: An unexpected error occurred.")
    finally:
        await file.close()