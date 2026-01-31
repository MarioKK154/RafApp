# backend/app/routers/customers.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/customers",
    tags=["Customers (CRM)"],
    dependencies=[Depends(security.require_role(["admin"]))] 
)

DbDependency = Annotated[Session, Depends(get_db)]
AdminOnlyDependency = Annotated[models.User, Depends(security.require_role(["admin"]))]

def get_customer_for_user(customer_id: int, db: DbDependency, current_user: AdminOnlyDependency) -> models.Customer:
    """
    Helper function to retrieve a customer while enforcing tenant isolation.
    Superusers bypass the tenant check.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_customer = crud.get_customer(db, customer_id=customer_id, tenant_id=effective_tenant_id)
    
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found or access denied.")
    return db_customer

@router.post("/", response_model=schemas.CustomerRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("50/minute")
def create_new_customer(
    request: Request,
    customer: schemas.CustomerCreate,
    db: DbDependency,
    current_user: AdminOnlyDependency
):
    """
    Creates a new customer.
    Regular admins are locked to their own tenant.
    Superadmins can specify a tenant_id in the request body.
    """
    # 1. Determine target tenant
    if current_user.is_superuser:
        # Use provided tenant_id, default to System Tenant (1) if missing
        target_tenant_id = customer.tenant_id if customer.tenant_id is not None else 1
    else:
        target_tenant_id = current_user.tenant_id

    # 2. Verify target tenant exists
    if not crud.get_tenant(db, tenant_id=target_tenant_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target tenant not found.")

    # 3. Create the customer
    try:
        return crud.create_customer(db=db, customer=customer, tenant_id=target_tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"Error creating customer: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

@router.get("/", response_model=List[schemas.CustomerRead])
@limiter.limit("100/minute")
def read_all_customers(
    request: Request,
    db: DbDependency,
    current_user: AdminOnlyDependency,
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieves a list of customers.
    Superadmins see all customers across all tenants; regular admins see only their own.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_customers(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=schemas.CustomerRead)
@limiter.limit("100/minute")
def read_single_customer(
    request: Request,
    customer_id: int,
    db: DbDependency,
    current_user: AdminOnlyDependency
):
    """Retrieves details for a specific customer."""
    return get_customer_for_user(customer_id, db, current_user)

@router.put("/{customer_id}", response_model=schemas.CustomerRead)
@limiter.limit("50/minute")
def update_existing_customer(
    request: Request,
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    db: DbDependency,
    current_user: AdminOnlyDependency
):
    """Updates a customer's contact details or notes."""
    db_customer = get_customer_for_user(customer_id, db, current_user)
    try:
        return crud.update_customer(db=db, db_customer=db_customer, customer_update=customer_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"Error updating customer: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("50/minute")
def delete_existing_customer(
    request: Request,
    customer_id: int,
    db: DbDependency,
    current_user: AdminOnlyDependency
):
    """Removes a customer record from the system."""
    db_customer = get_customer_for_user(customer_id, db, current_user)
    crud.delete_customer(db, db_customer=db_customer)
    return None