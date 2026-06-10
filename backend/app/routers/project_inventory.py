# backend/app/routers/project_inventory.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/project-inventory",
    tags=["Project Inventory"],
    dependencies=[Depends(security.get_current_active_user)],
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]


def _effective_tenant_id(user: models.User) -> Optional[int]:
    return None if user.is_superuser else user.tenant_id


def _resolve_project(db: DbDependency, project_id: int, user: models.User) -> models.Project:
    project = crud.get_project(db, project_id=project_id, tenant_id=_effective_tenant_id(user))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")
    return project


def _map_movement_error(exc: ValueError) -> None:
    code = str(exc)
    if code == "inventory_not_found":
        raise HTTPException(status_code=404, detail="Inventory catalog item not found.")
    if code == "insufficient_warehouse":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough quantity in the central warehouse.",
        )
    if code in ("insufficient_project_stock", "no_project_line", "no_source_line"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough quantity at the source project site.",
        )
    if code == "same_project":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose two different projects.")
    if code == "quantity must be positive":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than zero.")
    raise HTTPException(status_code=500, detail=f"Movement failed: {code}")


@router.get("/project/{project_id}", response_model=List[schemas.ProjectInventoryItemRead])
@limiter.limit("100/minute")
def get_inventory_for_a_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    """Inventory lines allocated to a project (on-site stock)."""
    _resolve_project(db, project_id, current_user)
    return crud.get_project_inventory_for_project(db, project_id=project_id)


@router.post("/", response_model=schemas.ProjectInventoryItemRead)
@limiter.limit("100/minute")
def add_item_to_project(
    request: Request,
    item_data: schemas.ProjectInventoryItemCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    """
    Add quantity on the project site without deducting central warehouse (physical intake or correction).
    To move stock from warehouse, use POST /issue-from-warehouse instead.
    """
    _resolve_project(db, item_data.project_id, current_user)

    inventory_item = crud.get_inventory_item(db, item_id=item_data.inventory_item_id)
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory catalog item not found.")

    return crud.add_or_update_item_in_project_inventory(db, item_data=item_data)


@router.post("/issue-from-warehouse", response_model=schemas.ProjectInventoryItemRead)
@limiter.limit("100/minute")
def issue_from_warehouse(
    request: Request,
    body: schemas.IssueFromWarehouseToProjectBody,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    """Deduct central warehouse stock and add it to the project's on-site inventory."""
    _resolve_project(db, body.project_id, current_user)
    try:
        row = crud.issue_from_warehouse_to_project(
            db,
            project_id=body.project_id,
            inventory_item_id=body.inventory_item_id,
            quantity=body.quantity,
            location=body.location,
        )
    except ValueError as e:
        _map_movement_error(e)
    return row


@router.post("/return-to-warehouse", response_model=schemas.ReturnToWarehouseResult)
@limiter.limit("100/minute")
def return_to_warehouse(
    request: Request,
    body: schemas.ReturnFromProjectToWarehouseBody,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    """Move quantity from project site stock back to the central warehouse."""
    _resolve_project(db, body.project_id, current_user)
    try:
        result = crud.return_from_project_to_warehouse(
            db,
            project_id=body.project_id,
            inventory_item_id=body.inventory_item_id,
            quantity=body.quantity,
        )
    except ValueError as e:
        _map_movement_error(e)
    pi = result["project_inventory"]
    return schemas.ReturnToWarehouseResult(
        warehouse_quantity=result["warehouse_quantity"],
        project_inventory=schemas.ProjectInventoryItemRead.model_validate(pi) if pi else None,
    )


@router.post("/transfer-between-projects", response_model=schemas.ProjectInventoryItemRead)
@limiter.limit("100/minute")
def transfer_between_projects(
    request: Request,
    body: schemas.TransferInventoryBetweenProjectsBody,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    """Move quantity from one project's site stock to another (warehouse is untouched)."""
    p_from = _resolve_project(db, body.from_project_id, current_user)
    p_to = _resolve_project(db, body.to_project_id, current_user)
    if p_from.tenant_id != p_to.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer stock between different organizations.",
        )
    try:
        row = crud.transfer_inventory_between_projects(
            db,
            from_project_id=body.from_project_id,
            to_project_id=body.to_project_id,
            inventory_item_id=body.inventory_item_id,
            quantity=body.quantity,
            location=body.location,
        )
    except ValueError as e:
        _map_movement_error(e)
    return row


@router.delete("/{project_inventory_item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def remove_item_from_project(
    request: Request,
    project_inventory_item_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    """
    Removes a project inventory row entirely (does not return quantity to warehouse).
    Prefer POST /return-to-warehouse for normal returns.
    """
    item_to_delete = db.query(models.ProjectInventoryItem).filter(
        models.ProjectInventoryItem.id == project_inventory_item_id
    ).first()

    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Project inventory item not found.")

    _resolve_project(db, item_to_delete.project_id, current_user)

    crud.remove_item_from_project_inventory(db, project_inventory_item_id=project_inventory_item_id)
    return None

