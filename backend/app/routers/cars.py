# backend/app/routers/cars.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import Annotated, List
import uuid
import aiofiles
from pathlib import Path

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/cars",
    tags=["Car Fleet"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = APP_DIR / "static" / "car_images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_car_for_user(car_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Car:
    """Helper to fetch a car and verify it belongs to the user's tenant or they are superadmin."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_car = crud.get_car(db, car_id=car_id, tenant_id=effective_tenant_id)
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found or access denied.")
    return db_car

@router.post("/", response_model=schemas.CarRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_car(request: Request, car: schemas.CarCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Creates a new car. Superadmins can specify a tenant_id."""
    # 1. Determine target tenant
    if current_user.is_superuser:
        target_tenant_id = car.tenant_id if car.tenant_id is not None else 1
    else:
        target_tenant_id = current_user.tenant_id

    # 2. Verify target tenant exists if we are assigning manually
    if not crud.get_tenant(db, tenant_id=target_tenant_id):
        raise HTTPException(status_code=404, detail="Target tenant not found.")

    # 3. Create the car
    db_car = crud.create_car(db=db, car=car, tenant_id=target_tenant_id)
    
    # 4. Log the creation
    crud.create_car_log(
        db, 
        car_id=db_car.id, 
        user_id=current_user.id, 
        action=models.CarLogAction.Created, 
        notes=f"Car '{db_car.make} {db_car.model}' added to fleet for tenant ID {target_tenant_id}."
    )
    
    db.refresh(db_car)
    return db_car

@router.get("/", response_model=List[schemas.CarRead])
@limiter.limit("100/minute")
def read_all_cars(request: Request, db: DbDependency, current_user: CurrentUserDependency, skip: int = 0, limit: int = 100):
    """Retrieves all cars for the user's tenant. Superadmins see all."""
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_cars(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{car_id}", response_model=schemas.CarRead)
@limiter.limit("100/minute")
def read_single_car(request: Request, car_id: int, db: DbDependency, current_user: CurrentUserDependency):
    """Retrieves details of a specific car."""
    return get_car_for_user(car_id, db, current_user)

@router.put("/{car_id}", response_model=schemas.CarRead)
@limiter.limit("100/minute")
def update_existing_car(request: Request, car_id: int, car_update: schemas.CarUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Updates car details."""
    db_car = get_car_for_user(car_id, db, current_user)
    return crud.update_car(db=db, db_car=db_car, car_update=car_update)

@router.put("/{car_id}/service-status", response_model=schemas.CarRead)
@limiter.limit("100/minute")
def update_car_service_status(request: Request, car_id: int, service_update: schemas.CarServiceStatusUpdate, db: DbDependency, current_user: CurrentUserDependency):
    """Fast update for service status and notes."""
    db_car = get_car_for_user(car_id, db, current_user)
    limited_update_schema = schemas.CarUpdate(
        service_needed=service_update.service_needed, 
        service_notes=service_update.service_notes
    )
    return crud.update_car(db=db, db_car=db_car, car_update=limited_update_schema)

@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_existing_car(request: Request, car_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Removes a car from the fleet."""
    db_car = get_car_for_user(car_id, db, current_user)
    crud.delete_car(db=db, db_car=db_car)
    return None

@router.post("/{car_id}/image", response_model=schemas.CarRead)
@limiter.limit("10/minute")
async def upload_car_image(request: Request, car_id: int, db: DbDependency, current_user: ManagerOrAdminDependency, file: UploadFile = File(...)):
    """Uploads and associates an image with a car."""
    db_car = get_car_for_user(car_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"car_{car_id}_{uuid.uuid4()}{file_extension}"
    save_path = UPLOAD_DIR / unique_filename
    
    try:
        async with aiofiles.open(save_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error saving image file.")
    
    db_image_path = f"static/car_images/{unique_filename}"
    return crud.update_car_image_path(db=db, db_car=db_car, image_path=db_image_path)

@router.post("/{car_id}/checkout", response_model=schemas.CarRead)
@limiter.limit("100/minute")
def checkout_car_to_user(request: Request, car_id: int, details: schemas.CarCheckout, db: DbDependency, current_user: CurrentUserDependency):
    """Assigns a car to the current user."""
    db_car = get_car_for_user(car_id, db, current_user)
    if db_car.status != models.CarStatus.Available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Car is not available. Current status: {db_car.status.value}")
    
    return crud.checkout_car(db=db, db_car=db_car, user_id=current_user.id, details=details)

@router.post("/{car_id}/checkin", response_model=schemas.CarRead)
@limiter.limit("100/minute")
def checkin_car_from_user(request: Request, car_id: int, details: schemas.CarCheckout, db: DbDependency, current_user: CurrentUserDependency):
    """Returns a car to available status."""
    db_car = get_car_for_user(car_id, db, current_user)
    if db_car.current_user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot check in a car that is not assigned to you.")
    
    return crud.checkin_car(db=db, db_car=db_car, user_id=current_user.id, details=details)

@router.post("/{car_id}/tyres", response_model=schemas.TyreSetRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def add_tyre_set_to_car(request: Request, car_id: int, tyre_set: schemas.TyreSetCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Adds a set of tyres (Summer/Winter) to a car's records."""
    get_car_for_user(car_id, db, current_user)
    return crud.create_tyre_set(db, tyre_set=tyre_set, car_id=car_id)

@router.delete("/tyres/{tyre_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_tyre_set_from_car(request: Request, tyre_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    """Removes a tyre set record."""
    db_tyre_set = crud.get_tyre_set(db, tyre_id=tyre_id)
    if not db_tyre_set:
        raise HTTPException(status_code=404, detail="Tyre set not found.")
    
    # Verify access to the parent car
    get_car_for_user(db_tyre_set.car_id, db, current_user)
    crud.delete_tyre_set(db, db_tyre_set=db_tyre_set)
    return None