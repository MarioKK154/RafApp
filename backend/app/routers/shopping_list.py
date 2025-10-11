# backend/app/routers/shopping_list.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/shopping-list",
    tags=["Shopping List"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

@router.get("/", response_model=List[schemas.InventoryItemReadWithURLs])
async def read_shopping_list(
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency
):
    shopping_list_items = crud.get_shopping_list_items(db)
    return shopping_list_items