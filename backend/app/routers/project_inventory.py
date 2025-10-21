# backend/app/routers/project_inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/project-inventory",
    tags=["Project Inventory"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

@router.get("/project/{project_id}", response_model=List[schemas.ProjectInventoryItemRead])
@limiter.limit("100/minute")
def get_inventory_for_a_project(request: Request, project_id: int, db: DbDependency, current_user: CurrentUserDependency):
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud.get_project_inventory_for_project(db, project_id=project_id)

@router.post("/", response_model=schemas.ProjectInventoryItemRead)
@limiter.limit("100/minute")
def add_item_to_project(request: Request, item_data: schemas.ProjectInventoryItemCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    project = crud.get_project(db, project_id=item_data.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    inventory_item = crud.get_inventory_item(db, item_id=item_data.inventory_item_id)
    if not inventory_item:
         raise HTTPException(status_code=404, detail="Inventory catalog item not found.")

    return crud.add_or_update_item_in_project_inventory(db, item_data=item_data)

@router.delete("/{project_inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def remove_item_from_project(request: Request, project_inventory_item_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    item_to_delete = db.query(models.ProjectInventoryItem).get(project_inventory_item_id)
    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Project inventory item not found.")
    
    project = crud.get_project(db, project_id=item_to_delete.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=403, detail="Not authorized to modify this project's inventory.")
        
    crud.remove_item_from_project_inventory(db, project_inventory_item_id=project_inventory_item_id)
    return None