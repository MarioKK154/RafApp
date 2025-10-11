# backend/app/routers/admin_tools.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, Dict, Any

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/admin-tools",
    tags=["Admin Tools"],
    dependencies=[Depends(security.require_superuser)]
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]


@router.post("/perform-clean-slate", response_model=schemas.CleanSlateResponse)
async def perform_clean_slate_operation(
    request_data: schemas.CleanSlateRequest,
    db: DbDependency,
    current_super_user: SuperUserDependency
):
    main_admin_user_to_keep = crud.get_user_by_email(db, email=request_data.main_admin_email)

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
        summary_details = await crud.reassign_and_deactivate_other_users(
            db=db, main_admin_user_to_keep=main_admin_user_to_keep
        )
        return schemas.CleanSlateResponse(
            message="Clean slate operation completed successfully.", 
            summary=summary_details
        )
    except Exception as e:
        print(f"Error during clean slate operation endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during the clean slate operation: {str(e)}"
        )