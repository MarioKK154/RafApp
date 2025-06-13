# backend/app/routers/admin_tools.py
# Uncondensed and Manually Checked
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, Dict, Any

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Admin Tools"],
    # ALL endpoints in this file require SUPERUSER privileges
    dependencies=[Depends(security.require_superuser)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
# We use current_super_user to make it explicit what kind of user can access these endpoints
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]


@router.post("/perform-clean-slate", response_model=schemas.CleanSlateResponse)
async def perform_clean_slate_operation(
    request_data: schemas.CleanSlateRequest,
    db: DbDependency,
    current_super_user: SuperUserDependency # Ensures only a superuser can call this
):
    """
    Reassigns data from other users to the specified main admin (who must be a superuser)
    and deactivates those other users.

    This operation is tenant-scoped to the tenant of the 'main_admin_email' provided.
    This is a sensitive and potentially destructive operation.
    """
    main_admin_user_to_keep = crud.get_user_by_email(db, email=request_data.main_admin_email)

    # Validation checks
    if not main_admin_user_to_keep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The main admin user specified by email was not found."
        )
    if not main_admin_user_to_keep.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user account to keep must be a superuser."
        )

    try:
        # The CRUD function contains the core logic
        summary_details = await crud.reassign_and_deactivate_other_users(
            db=db, main_admin_user_to_keep=main_admin_user_to_keep
        )
        return schemas.CleanSlateResponse(
            message="Clean slate operation completed successfully.", 
            summary=summary_details
        )
    except Exception as e:
        # Catch any unexpected errors from the CRUD operation
        print(f"Error during clean slate operation endpoint: {str(e)}")
        # The CRUD function will have rolled back the transaction, but we return a server error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during the clean slate operation: {str(e)}"
        )