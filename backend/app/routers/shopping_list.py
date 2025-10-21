# backend/app/routers/shopping_list.py
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/shopping-list",
    tags=["Shopping List"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]


@router.get("/project/{project_id}", response_model=List[schemas.ShoppingListItem])
@limiter.limit("100/minute")
async def read_project_shopping_list(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency # Any user can try to view
):
    """
    Retrieves the calculated shopping list for a specific project.
    """
    # Verify the user has access to this project
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible.")
        
    # Optional: Add logic here if only Admins/PMs should see this
    # if current_user.role not in ["admin", "project manager"]:
    #    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this list.")

    shopping_list_items = crud.get_shopping_list_for_project(db, project_id=project_id)
    return shopping_list_items