# backend/app/routers/offers.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/offers",
    tags=["Offers"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

# Helper to get offer and check permissions
def get_offer_and_check_auth(offer_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Offer:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_offer = crud.get_offer(db, offer_id=offer_id, tenant_id=effective_tenant_id)
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found.")
    return db_offer

# Helper to get line item and check permissions via its offer
def get_line_item_and_check_auth(line_item_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.OfferLineItem:
    db_item = crud.get_offer_line_item(db, line_item_id=line_item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Offer line item not found.")
    # Check permission via the parent offer
    get_offer_and_check_auth(db_item.offer_id, db, current_user)
    return db_item

# --- Offer Endpoints ---

@router.post("/", response_model=schemas.OfferRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_offer(
    request: Request,
    offer_data: schemas.OfferCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    # Verify project exists and belongs to the user's tenant
    project = crud.get_project(db, project_id=offer_data.project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    return crud.create_offer(db, offer_data=offer_data, user=current_user)

@router.get("/project/{project_id}", response_model=List[schemas.OfferRead])
@limiter.limit("100/minute")
def get_offers_for_a_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    # Verify project exists and belongs to the user's tenant
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    return crud.get_offers_for_project(db, project_id=project_id)

@router.get("/{offer_id}", response_model=schemas.OfferRead)
@limiter.limit("100/minute")
def get_single_offer(
    request: Request,
    offer_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    return get_offer_and_check_auth(offer_id, db, current_user)

@router.put("/{offer_id}", response_model=schemas.OfferRead)
@limiter.limit("100/minute")
def update_offer_details(
    request: Request,
    offer_id: int,
    offer_update: schemas.OfferUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_offer = get_offer_and_check_auth(offer_id, db, current_user)
    return crud.update_offer(db, db_offer=db_offer, offer_update=offer_update)

@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_an_offer(
    request: Request,
    offer_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_offer = get_offer_and_check_auth(offer_id, db, current_user)
    crud.delete_offer(db, db_offer=db_offer)
    return None

# --- Offer Line Item Endpoints ---

@router.post("/{offer_id}/items", response_model=schemas.OfferLineItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def add_item_to_an_offer(
    request: Request,
    offer_id: int,
    item_data: schemas.OfferLineItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_offer = get_offer_and_check_auth(offer_id, db, current_user)
    if db_offer.status != models.OfferStatus.Draft:
        raise HTTPException(status_code=400, detail="Can only add items to offers in Draft status.")
    
    # If it's a material item, check if the inventory item exists
    if item_data.item_type == models.OfferLineItemType.Material:
        if not item_data.inventory_item_id:
            raise HTTPException(status_code=400, detail="inventory_item_id is required for Material type items.")
        inv_item = crud.get_inventory_item(db, item_id=item_data.inventory_item_id)
        if not inv_item:
            raise HTTPException(status_code=404, detail="Inventory item not found.")
            
    return crud.add_line_item_to_offer(db, offer=db_offer, item_data=item_data)

@router.put("/items/{line_item_id}", response_model=schemas.OfferLineItemRead)
@limiter.limit("100/minute")
def update_an_offer_item(
    request: Request,
    line_item_id: int,
    item_update: schemas.OfferLineItemUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_item = get_line_item_and_check_auth(line_item_id, db, current_user)
    if db_item.offer.status != models.OfferStatus.Draft:
        raise HTTPException(status_code=400, detail="Can only update items on offers in Draft status.")

    # Prevent changing type or material link via update for simplicity, force delete/re-add
    if item_update.inventory_item_id and item_update.inventory_item_id != db_item.inventory_item_id:
         raise HTTPException(status_code=400, detail="Cannot change linked inventory item via update.")
            
    return crud.update_offer_line_item(db, db_item=db_item, item_update=item_update)

@router.delete("/items/{line_item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def remove_item_from_an_offer(
    request: Request,
    line_item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    db_item = get_line_item_and_check_auth(line_item_id, db, current_user)
    if db_item.offer.status != models.OfferStatus.Draft:
        raise HTTPException(status_code=400, detail="Can only remove items from offers in Draft status.")
        
    crud.remove_line_item_from_offer(db, db_item=db_item)
    return None