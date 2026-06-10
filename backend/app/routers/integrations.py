from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas, crud_integrations
from app.database import get_db
from app.security import get_current_active_user, get_current_user_tenant_id
from app.mock_gc_api import push_entity

router = APIRouter(
    prefix="/integrations",
    tags=["integrations"]
)

@router.get("", response_model=List[schemas.TenantIntegrationRead])
def get_tenant_integrations(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_user_tenant_id),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "project manager"] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to view integrations")
    return crud_integrations.get_integrations(db, tenant_id)

@router.post("", response_model=schemas.TenantIntegrationRead)
def upsert_integration(
    integration_in: schemas.TenantIntegrationCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_user_tenant_id),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "project manager"] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to manage integrations")
    return crud_integrations.upsert_integration(db, tenant_id, integration_in)

@router.post("/push")
def push_to_gc(
    payload: schemas.PushPayload,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_user_tenant_id),
    current_user: models.User = Depends(get_current_active_user)
):
    integration = crud_integrations.get_integration_by_provider(db, tenant_id, payload.provider)
    if not integration or not integration.is_active:
        raise HTTPException(status_code=400, detail=f"Integration for {payload.provider} is not active or configured.")

    # Fetch entity data from DB
    entity_data = {}
    if payload.entity_type == "task":
        task = db.query(models.Task).filter(models.Task.id == payload.entity_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        entity_data = {"title": task.title, "description": task.description}
    elif payload.entity_type == "timelog":
        timelog = db.query(models.TimeLog).filter(models.TimeLog.id == payload.entity_id).first()
        if not timelog:
            raise HTTPException(status_code=404, detail="Timelog not found")
        entity_data = {"duration_hours": timelog.duration_hours, "notes": timelog.notes, "log_date": timelog.log_date}
    elif payload.entity_type == "material":
        # Shopping List item or Project Inventory item
        item = db.query(models.ShoppingListItem).filter(models.ShoppingListItem.id == payload.entity_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Material not found")
        entity_data = {"name": item.inventory_item.name if item.inventory_item else "Custom Material", "quantity": item.quantity}
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    # Call mock service
    result = push_entity(payload.entity_type, entity_data, payload.provider, integration.api_key or "MOCK_KEY")
    return result
