# backend/app/routers/users.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Dict, Any
import csv
import io

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Users"],
    # Base dependency for all routes in this router can be get_current_active_user
    # Specific permission dependencies will be added per endpoint
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# AdminOnlyDependency is now more nuanced: a tenant admin or a superuser
# SuperUserDependency will be used for actions that cross tenant boundaries or manage tenants.

@router.get("/me", response_model=schemas.UserRead)
async def read_users_me(
    current_user: CurrentUserDependency # This user object now has tenant_id and tenant relationship loaded
):
    """Fetches the profile of the currently authenticated user."""
    return current_user

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    password_data: schemas.UserChangePassword,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    # ... (logic from Response #131) ...
    if not security.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    if password_data.current_password == password_data.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be the same as current.")
    crud.update_user_password(db=db, user=current_user, new_password=password_data.new_password)
    return None


@router.get("/", response_model=List[schemas.UserRead])
async def read_users(
    db: DbDependency,
    current_user_requesting: CurrentUserDependency,
    # For superusers to optionally filter by tenant:
    filter_tenant_id: Optional[int] = Query(None, description="Superuser: Filter users by a specific tenant ID"),
    is_active: Optional[bool] = Query(None, description="Filter users by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """
    Retrieves a list of users.
    - Regular admins/managers see users within their own tenant.
    - Superusers can see users across all tenants or filter by a specific tenant_id.
    """
    if not current_user_requesting.is_superuser and current_user_requesting.role != 'admin':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to list all users for the tenant.")

    target_tenant_id = current_user_requesting.tenant_id
    if current_user_requesting.is_superuser and filter_tenant_id is not None:
        target_tenant_id = filter_tenant_id
    elif current_user_requesting.is_superuser and filter_tenant_id is None:
        target_tenant_id = None # Superuser gets all users if no tenant_id filter specified

    users = crud.get_users(db=db, tenant_id=target_tenant_id, is_active=is_active, skip=skip, limit=limit)
    return users


@router.post("/", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user_by_admin(
    user_create_data: schemas.UserCreateAdmin, # This schema now requires tenant_id
    db: DbDependency,
    current_admin: CurrentUserDependency # User performing action
):
    """
    Creates a new user.
    - Superusers can create users in any tenant specified in user_create_data.tenant_id.
    - Tenant admins can only create users within their own tenant.
    """
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to create users.")

    if not current_admin.is_superuser and user_create_data.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant admins can only create users within their own tenant.")

    # Check if tenant exists (if superuser specified a different one)
    if current_admin.is_superuser and user_create_data.tenant_id:
        target_tenant = crud.get_tenant(db, tenant_id=user_create_data.tenant_id)
        if not target_tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {user_create_data.tenant_id} not found.")
    elif not current_admin.is_superuser: # For tenant admin, ensure their own tenant_id is used.
         if user_create_data.tenant_id != current_admin.tenant_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign user to a different tenant.")


    existing_user_email = crud.get_user_by_email(db, email=user_create_data.email)
    if existing_user_email and existing_user_email.tenant_id == user_create_data.tenant_id: # Check email uniqueness within the target tenant
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered in this tenant.")
    
    if user_create_data.employee_id:
        existing_user_emp_id = crud.get_user_by_employee_id(db, employee_id=user_create_data.employee_id)
        if existing_user_emp_id and existing_user_emp_id.tenant_id == user_create_data.tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists in this tenant.")

    new_user = crud.create_user_by_admin(db=db, user_data=user_create_data)
    return new_user


@router.get("/{user_id_to_view}", response_model=schemas.UserRead) # Renamed path parameter
async def read_single_user(
    user_id_to_view: int,
    db: DbDependency,
    current_user_requesting: CurrentUserDependency
):
    """
    Retrieves details for a specific user by ID.
    - Regular admins/managers see users within their own tenant.
    - Superusers can view any user.
    """
    db_user = crud.get_user(db, user_id=user_id_to_view)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not current_user_requesting.is_superuser and db_user.tenant_id != current_user_requesting.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to view this user.")
    
    if not current_user_requesting.is_superuser and current_user_requesting.role != 'admin' and current_user_requesting.role != 'project manager':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough general permissions to view users.")

    return db_user


@router.put("/{user_id_to_update}", response_model=schemas.UserRead) # Renamed path parameter
async def update_user_details_by_admin(
    user_id_to_update: int,
    user_update_data: schemas.UserUpdateAdmin,
    db: DbDependency,
    current_admin: CurrentUserDependency # User performing action
):
    """
    Updates a user's details.
    - Superusers can update users in any tenant (if user_update_data.tenant_id is provided and valid).
    - Tenant admins can only update users within their own tenant.
    """
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to update users.")

    db_user_to_update = crud.get_user(db, user_id=user_id_to_update)
    if not db_user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to update not found")

    if not current_admin.is_superuser and db_user_to_update.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant admins can only update users within their own tenant.")

    # If tenant_id is part of update_data (from UserUpdateAdmin schema)
    if user_update_data.tenant_id is not None:
        if not current_admin.is_superuser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only superusers can change a user's tenant.")
        target_tenant = crud.get_tenant(db, tenant_id=user_update_data.tenant_id)
        if not target_tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Target tenant ID {user_update_data.tenant_id} not found.")
        # If valid, tenant_id will be updated by crud.update_user_by_admin

    updated_user = crud.update_user_by_admin(db=db, user_to_update=db_user_to_update, user_data=user_update_data)
    return updated_user


@router.post("/{user_id_to_update}/set-password", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_password_by_admin_endpoint(
    user_id_to_update: int,
    password_data: schemas.UserSetPasswordByAdmin,
    db: DbDependency,
    current_admin: CurrentUserDependency # User performing action
):
    """Allows an administrator to set/reset a user's password."""
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")

    user_to_update = crud.get_user(db, user_id=user_id_to_update)
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not current_admin.is_superuser and user_to_update.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot set password for user in another tenant.")
    
    if current_admin.id == user_id_to_update: # Admin trying to reset own password via this endpoint
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use /users/me/change-password for own password.")

    crud.set_user_password_by_admin(db=db, user=user_to_update, new_password=password_data.new_password)
    return None


@router.delete("/{user_id_to_delete}", status_code=status.HTTP_204_NO_CONTENT) # Renamed path parameter
async def delete_user_by_admin_endpoint(
    user_id_to_delete: int,
    db: DbDependency,
    current_admin: CurrentUserDependency # User performing action
):
    """Deletes a user by ID (Hard Delete)."""
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions.")

    user_to_delete = crud.get_user(db, user_id=user_id_to_delete)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not current_admin.is_superuser and user_to_delete.tenant_id != current_admin.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete user in another tenant.")
    
    if current_admin.id == user_id_to_delete:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot delete their own account.")
    
    # Consider foreign key constraints here before actual deletion
    # The crud.delete_user_by_admin will attempt a hard delete.
    # If FKs restrict, it will fail at the DB level.
    deleted_user = crud.delete_user_by_admin(db=db, user_id=user_id_to_delete)
    # deleted_user will be None if not found, already handled by get_user check
    return None


@router.post("/import-csv", response_model=Dict[str, Any], tags=["Users"])
async def import_users_from_csv(
    db: DbDependency,
    current_admin: CurrentUserDependency, # User performing import
    file: UploadFile = File(...)
):
    if not current_admin.is_superuser and current_admin.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to import users.")
    
    # Users will be imported into the tenant of the admin performing the import
    target_tenant_id = current_admin.tenant_id

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
        SKIP_EMPLOYEE_IDS = ["252", "276", "323"] # These are global, or should be tenant specific? For now global.

        results = await crud.bulk_create_users_from_csv( # Make crud function async or call it sync
            db=db, users_data=users_to_create,
            tenant_id=target_tenant_id, # Pass the admin's tenant_id
            default_password=DEFAULT_PASSWORD, default_role=DEFAULT_ROLE,
            default_is_active=True, default_is_superuser=False,
            skip_employee_ids=SKIP_EMPLOYEE_IDS
        )
        if parse_errors:
            results["parse_errors"] = results.get("parse_errors", []) + parse_errors
            results["skipped_count"] = results.get("skipped_count", 0) + len(parse_errors)
        # ... (rest of result handling)
        return results
    except Exception as e:
        print(f"Unexpected error processing CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: An unexpected error occurred.")
    finally:
        await file.close()