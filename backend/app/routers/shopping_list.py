# backend/app/routers/shopping_list.py
# Uncondensed Version: Tenant RBAC Implemented
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Shopping List"],
    # Base dependency for all routes in this router
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
# This dependency ensures the user is an Admin or Project Manager within their tenant
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]


@router.get("/", response_model=List[schemas.InventoryItemReadWithURLs])
async def read_shopping_list(
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency # This dependency enforces permission
):
    """
    Retrieves a list of all inventory items where quantity needed is greater than
    the quantity in stock.

    Currently, this is a GLOBAL list across all tenants.
    Access is restricted to users with 'admin' or 'project manager' roles.
    """
    # The crud function itself gets all items that are needed, globally.
    # Tenant isolation for the data itself would require data model changes.
    shopping_list_items = crud.get_shopping_list_items(db)
    return shopping_list_items