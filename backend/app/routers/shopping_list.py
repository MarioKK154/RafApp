# backend/app/routers/shopping_list.py
# Uncondensed Version
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Union

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/shopping-list",
    tags=["Shopping List"],
    # Require Admin or PM to view the shopping list
    dependencies=[Depends(security.require_manager)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.require_manager)] # Use require_manager here

@router.get("/", response_model=List[Union[schemas.InventoryItemReadWithURLs, schemas.InventoryItemRead]])
async def read_shopping_list(
    db: DbDependency,
    current_user: CurrentUserDependency # Inject user to check role for response model
):
    """
    Retrieves items where quantity needed exceeds quantity in stock.
    Requires Admin or Project Manager role.
    URLs are only included for Admin/PM roles.
    """
    shopping_list_items = crud.get_shopping_list_items(db=db)

    # Check role and return appropriate schema (including/excluding URLs)
    if current_user.role in ["admin", "project manager"]:
        # Validate/convert using the schema WITH URLs
        return [schemas.InventoryItemReadWithURLs.model_validate(item) for item in shopping_list_items]
    else:
        # This branch currently won't be reached due to router dependency,
        # but keeping it demonstrates the logic if permissions change.
         return [schemas.InventoryItemRead.model_validate(item) for item in shopping_list_items]