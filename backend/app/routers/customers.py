# backend/app/routers/customers.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/customers",
    tags=["Customers (CRM)"],
    # --- 1. SET THE DEPENDENCY FOR THE *ENTIRE* ROUTER ---
    dependencies=[Depends(security.require_role(["admin"]))] 
)

DbDependency = Annotated[Session, Depends(get_db)]
# 2. This is now our new default dependency for this module
AdminOnlyDependency = Annotated[models.User, Depends(security.require_role(["admin"]))]

def get_customer_for_user(customer_id: int, db: DbDependency, current_user: AdminOnlyDependency) -> models.Customer:
    """Helper to get a customer and verify tenant ownership."""
    # Superuser can see all, Admin is scoped to their tenant
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    
    # Superusers must pass a tenant_id, or we check the admin's tenant
    if effective_tenant_id is None:
         # This part is tricky. For a superuser to get a customer, they *must* know the tenant.
         # For an admin, we just use their tenant. Let's adjust.
         db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
         if not db_customer:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
         # If the user is a superuser, they can see it.
         # If they are a tenant admin, it must match their tenant.
         if not current_user.is_superuser and db_customer.tenant_id != current_user.tenant_id:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this customer.")
         return db_customer
    else:
        # This is for the tenant admin
        db_customer = crud.get_customer(db, customer_id=customer_id, tenant_id=effective_tenant_id)
        if not db_customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found in your tenant.")
        return db_customer


@router.post("/", response_model=schemas.CustomerRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("50/minute")
def create_new_customer(
    request: Request,
    customer: schemas.CustomerCreate,
    db: DbDependency,
    current_user: AdminOnlyDependency # <-- 3. USE STRICT DEPENDENCY
):
    """Creates a new customer for the user's tenant."""
    if current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Superuser cannot create objects. Log in as a tenant admin.")

    try:
        return crud.create_customer(db=db, customer=customer, tenant_id=current_user.tenant_id)
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
    current_user: AdminOnlyDependency, # <-- 3. USE STRICT DEPENDENCY
    skip: int = 0,
    limit: int = 100
):
    """Retrieves all customers for the user's tenant."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    if effective_tenant_id is None:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Superusers must provide a tenant_id query parameter (not yet implemented).")
    
    return crud.get_customers(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=schemas.CustomerRead)
@limiter.limit("100/minute")
def read_single_customer(
    request: Request,
    customer_id: int,
    db: DbDependency,
    current_user: AdminOnlyDependency # <-- 3. USE STRICT DEPENDENCY
):
    """Retrieves a single customer by ID."""
    return get_customer_for_user(customer_id, db, current_user)

@router.put("/{customer_id}", response_model=schemas.CustomerRead)
@limiter.limit("50/minute")
def update_existing_customer(
    request: Request,
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    db: DbDependency,
    current_user: AdminOnlyDependency # <-- 3. USE STRICT DEPENDENCY
):
    """Updates a customer's details."""
    db_customer = get_customer_for_user(customer_id, db, current_user) # Helper handles auth
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
    current_user: AdminOnlyDependency # <-- 3. USE STRICT DEPENDENCY
):
    """Deletes a customer."""
    db_customer = get_customer_for_user(customer_id, db, current_user)
        
    crud.delete_customer(db, db_customer=db_customer)
    return None