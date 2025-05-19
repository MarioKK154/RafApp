# backend/app/routers/admin_tools.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, Dict

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Admin Tools"],
    dependencies=[Depends(security.require_superuser)] # Protect all routes in this file
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]

@router.post("/perform-clean-slate", response_model=schemas.CleanSlateResponse)
async def perform_clean_slate_operation(
    request_data: schemas.CleanSlateRequest,
    db: DbDependency,
    current_super_user: SuperUserDependency # Ensures only a superuser can call this
):
    """
    Reassigns data from other users to the specified main admin and deactivates other users.
    This is a sensitive operation.
    """
    main_admin_user = crud.get_user_by_email(db, email=request_data.main_admin_email)
    if not main_admin_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Main admin user specified not found.")
    if not main_admin_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The specified user to keep must be a superuser.")

    # Call the complex CRUD function here (we'll define it next)
    try:
        result_summary = await crud.reassign_and_deactivate_other_users(db=db, main_admin_user_to_keep=main_admin_user)
        return {"message": "Clean slate operation completed.", "summary": result_summary}
    except Exception as e:
        # Log the full error for server admin
        print(f"Error during clean slate operation: {str(e)}")
        # Depending on the error, parts might have committed. A transaction rollback in CRUD is important.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred during the clean slate operation: {str(e)}")