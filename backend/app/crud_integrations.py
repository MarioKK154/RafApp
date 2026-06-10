from typing import List, Optional
from sqlalchemy.orm import Session
from app import models, schemas

def get_integrations(db: Session, tenant_id: int) -> List[models.TenantIntegration]:
    return db.query(models.TenantIntegration).filter(models.TenantIntegration.tenant_id == tenant_id).all()

def get_integration_by_provider(db: Session, tenant_id: int, provider: str) -> Optional[models.TenantIntegration]:
    return db.query(models.TenantIntegration).filter(
        models.TenantIntegration.tenant_id == tenant_id,
        models.TenantIntegration.provider == provider
    ).first()

def upsert_integration(db: Session, tenant_id: int, integration_in: schemas.TenantIntegrationCreate) -> models.TenantIntegration:
    existing = get_integration_by_provider(db, tenant_id, integration_in.provider)
    if existing:
        existing.api_key = integration_in.api_key
        existing.base_url = integration_in.base_url
        existing.is_active = integration_in.is_active
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_integration = models.TenantIntegration(
            tenant_id=tenant_id,
            provider=integration_in.provider,
            api_key=integration_in.api_key,
            base_url=integration_in.base_url,
            is_active=integration_in.is_active
        )
        db.add(new_integration)
        db.commit()
        db.refresh(new_integration)
        return new_integration
