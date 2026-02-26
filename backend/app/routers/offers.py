# backend/app/routers/offers.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List
from io import BytesIO
from datetime import datetime

from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

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
    """
    Helper to fetch an offer record and verify access. 
    Superusers bypass the tenant ownership check.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_offer = crud.get_offer(db, offer_id=offer_id, tenant_id=effective_tenant_id)
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found or access denied.")
    return db_offer

# Helper to get line item and check permissions via its parent offer
def get_line_item_and_check_auth(line_item_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.OfferLineItem:
    """
    Helper to fetch a line item and verify access through its parent offer.
    """
    db_item = crud.get_offer_line_item(db, line_item_id=line_item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Offer line item not found.")
    
    # Check permission via the parent offer logic
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
    """
    Creates a new work offer for a project.
    Superadmins can create offers for any project; others are limited to their tenant.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # Verify the project exists and the user has access to it
    project = crud.get_project(db, project_id=offer_data.project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not accessible.")
        
    return crud.create_offer(db, offer_data=offer_data, user=current_user)

@router.get("/project/{project_id}", response_model=List[schemas.OfferRead])
@limiter.limit("100/minute")
def get_offers_for_a_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Lists all offers associated with a specific project.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # Verify project exists and user has access
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not accessible.")
        
    return crud.get_offers_for_project(db, project_id=project_id)

@router.get("/{offer_id}", response_model=schemas.OfferRead)
@limiter.limit("100/minute")
def get_single_offer(
    request: Request,
    offer_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Retrieves details for a specific offer.
    """
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
    """
    Updates the general details of an offer (title, status, client info).
    """
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
    """
    Deletes an offer and its associated line items.
    """
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
    """
    Adds a Material or Labor line item to an offer.
    Only allowed while the offer is in 'Draft' status.
    """
    db_offer = get_offer_and_check_auth(offer_id, db, current_user)
    
    if db_offer.status != models.OfferStatus.Draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Can only add items to offers in Draft status."
        )
    
    # Validate Material type requirements
    if item_data.item_type == models.OfferLineItemType.Material:
        if not item_data.inventory_item_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="inventory_item_id is required for Material type items."
            )
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
    """
    Updates a line item's quantity or price.
    Only allowed while the parent offer is in 'Draft' status.
    """
    db_item = get_line_item_and_check_auth(line_item_id, db, current_user)
    
    if db_item.offer.status != models.OfferStatus.Draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Can only update items on offers in Draft status."
        )

    # Restriction: Prevent changing the linked material via simple update to maintain data integrity
    if item_update.inventory_item_id and item_update.inventory_item_id != db_item.inventory_item_id:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST, 
             detail="Cannot change linked inventory item via update. Delete and re-add if necessary."
         )
            
    return crud.update_offer_line_item(db, db_item=db_item, item_update=item_update)

@router.delete("/items/{line_item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def remove_item_from_an_offer(
    request: Request,
    line_item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency
):
    """
    Removes a specific line item from an offer.
    """
    db_item = get_line_item_and_check_auth(line_item_id, db, current_user)
    
    if db_item.offer.status != models.OfferStatus.Draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Can only remove items from offers in Draft status."
        )
        
    crud.remove_line_item_from_offer(db, db_item=db_item)
    return None


@router.get("/{offer_id}/pdf")
@limiter.limit("30/minute")
def export_offer_pdf(
    request: Request,
    offer_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    """
    Export a single offer as a client-facing PDF quotation.
    """
    offer = get_offer_and_check_auth(offer_id, db, current_user)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def write_line(text: str, state: dict) -> None:
        if state["y"] < 40:
            pdf.showPage()
            state["y"] = height - 40
        pdf.drawString(40, state["y"], text)
        state["y"] -= 14

    y_state = {"y": height - 40}

    title = "Offer / Quotation"
    pdf.setFont("Helvetica-Bold", 18)
    write_line(title, y_state)

    pdf.setFont("Helvetica", 10)
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    write_line(f"Generated on {now_str} UTC", y_state)
    y_state["y"] -= 6

    pdf.setFont("Helvetica-Bold", 11)
    write_line(f"Offer: {offer.offer_number or offer.id}", y_state)
    pdf.setFont("Helvetica", 10)
    status_text = offer.status.value if isinstance(offer.status, models.OfferStatus) else offer.status or ""
    write_line(f"Status: {status_text}", y_state)
    write_line(f"Project ID: {offer.project_id}", y_state)

    y_state["y"] -= 4
    pdf.setFont("Helvetica-Bold", 11)
    write_line("Client", y_state)
    pdf.setFont("Helvetica", 10)
    if offer.client_name:
        write_line(offer.client_name, y_state)
    if offer.client_address:
        write_line(offer.client_address, y_state)
    if offer.client_email:
        write_line(offer.client_email, y_state)

    if offer.title:
        y_state["y"] -= 4
        pdf.setFont("Helvetica-Bold", 11)
        write_line("Title", y_state)
        pdf.setFont("Helvetica", 10)
        write_line(offer.title, y_state)

    y_state["y"] -= 6
    pdf.setFont("Helvetica-Bold", 11)
    write_line("Line Items", y_state)
    pdf.setFont("Helvetica", 9)

    if offer.line_items:
        write_line("#  Type   Description                    Qty   Unit   Unit price   Total", y_state)
        for idx, item in enumerate(offer.line_items, start=1):
            item_type = item.item_type.value if isinstance(item.item_type, models.OfferLineItemType) else (item.item_type or "")
            desc = (item.description or "")[:28]

            # Derive a simple unit label: for materials use inventory item's unit, for labor default to 'hour'
            unit_text = ""
            if isinstance(item.item_type, models.OfferLineItemType) and item.item_type == models.OfferLineItemType.Material:
                unit_text = item.inventory_item.unit if item.inventory_item and getattr(item.inventory_item, "unit", None) else ""
            elif isinstance(item.item_type, models.OfferLineItemType) and item.item_type == models.OfferLineItemType.Labor:
                unit_text = "hour"

            line = (
                f"{idx:<2} "
                f"{item_type[:6]:<6} "
                f"{desc:<28} "
                f"{item.quantity:>4} "
                f"{unit_text:<6} "
                f"{item.unit_price:>10.0f} "
                f"{item.total_price:>10.0f}"
            )
            write_line(line, y_state)
    else:
        write_line("No line items.", y_state)

    y_state["y"] -= 6
    pdf.setFont("Helvetica-Bold", 11)
    write_line("Summary", y_state)
    pdf.setFont("Helvetica", 10)
    write_line(f"Total amount: {offer.total_amount:.0f} kr.", y_state)

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    filename = f"offer-{offer.offer_number or offer_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )