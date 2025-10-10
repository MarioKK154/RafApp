# backend/app/routers/boq.py
# New router for the Bill of Quantities module.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/boq",
    tags=["Bill of Quantities"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

@router.get("/project/{project_id}", response_model=schemas.BoQRead)
def get_project_boq(
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Retrieves the Bill of Quantities for a specific project.
    If a BoQ does not exist for the project, it will be created automatically.
    """
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    
    boq = crud.get_or_create_boq_for_project(db, project_id=project.id, project_name=project.name)
    return boq

@router.post("/project/{project_id}/items", response_model=schemas.BoQRead)
def add_boq_item(
    project_id: int,
    item: schemas.BoQItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Adds an inventory item to a project's BoQ. Updates quantity if item already exists."""
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    
    inventory_item = crud.get_inventory_item(db, item_id=item.inventory_item_id)
    if not inventory_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")
        
    boq = crud.get_or_create_boq_for_project(db, project_id=project.id, project_name=project.name)
    updated_boq = crud.add_item_to_boq(db, boq=boq, item_data=item)
    return updated_boq

@router.put("/items/{boq_item_id}", response_model=schemas.BoQItemRead)
def update_boq_item_quantity(
    boq_item_id: int,
    item_update: schemas.BoQItemUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Updates the required quantity for a specific item in a BoQ."""
    db_item = crud.get_boq_item(db, boq_item_id=boq_item_id)
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BoQ item not found.")
    
    # Verify user has access to the project this item belongs to
    project = crud.get_project(db, project_id=db_item.boq.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this BoQ item.")
        
    return crud.update_boq_item(db, db_boq_item=db_item, item_update=item_update)

@router.delete("/items/{boq_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_boq_item(
    boq_item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """Removes an item from a BoQ."""
    db_item = crud.get_boq_item(db, boq_item_id=boq_item_id)
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BoQ item not found.")

    project = crud.get_project(db, project_id=db_item.boq.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this BoQ item.")
        
    crud.remove_item_from_boq(db, db_boq_item=db_item)
    return None