from app.database import get_db
from app.models import TenantLaborPrice, LaborCatalogItem, LaborCatalogItemCondition, Tenant

db = next(get_db())
prices = db.query(TenantLaborPrice).all()
c = 0
for tp in prices:
    item = db.query(LaborCatalogItem).filter(LaborCatalogItem.id == tp.labor_item_id).first()
    uph = item.units_per_hour if item else None
    if uph is None:
        cond = db.query(LaborCatalogItemCondition).filter(LaborCatalogItemCondition.labor_catalog_item_id == tp.labor_item_id).first()
        uph = cond.units_per_hour if cond else 0.0
    if uph is None:
        uph = 0.0
        
    tenant = db.query(Tenant).filter(Tenant.id == tp.tenant_id).first()
    if tenant and tenant.base_hourly_rate:
        tp.price = float(tenant.base_hourly_rate) * float(uph)
        c += 1
db.commit()
print(f'Updated {c} prices')
