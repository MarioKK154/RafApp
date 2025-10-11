# backend/app/routers/cars.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Annotated, List
import uuid
import aiofiles
from pathlib import Path

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/cars",
    tags=["Car Fleet"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

APP_DIR = Path(__file__).resolve().parent.parent # Adjusted path
UPLOAD_DIR = APP_DIR / "static" / "car_images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_car_for_user(car_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Car:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_car = crud.get_car(db, car_id=car_id, tenant_id=effective_tenant_id)
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found.")
    return db_car

@router.post("/", response_model=schemas.CarRead, status_code=status.HTTP_201_CREATED)
def create_new_car(car: schemas.CarCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_car = crud.create_car(db=db, car=car, tenant_id=current_user.tenant_id)
    crud.create_car_log(db, car_id=db_car.id, user_id=current_user.id, action=models.CarLogAction.Created, notes=f"Car '{db_car.make} {db_car.model}' added to fleet.")
    db.refresh(db_car)
    return db_car

@router.get("/", response_model=List[schemas.CarRead])
def read_all_cars(db: DbDependency, current_user: CurrentUserDependency, skip: int = 0, limit: int = 100):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_cars(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{car_id}", response_model=schemas.CarRead)
def read_single_car(car_id: int, db: DbDependency, current_user: CurrentUserDependency):
    return get_car_for_user(car_id, db, current_user)

@router.put("/{car_id}", response_model=schemas.CarRead)
def update_existing_car(car_id: int, car_update: schemas.CarUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_car = get_car_for_user(car_id, db, current_user)
    return crud.update_car(db=db, db_car=db_car, car_update=car_update)

@router.put("/{car_id}/service-status", response_model=schemas.CarRead)
def update_car_service_status(
    car_id: int, 
    service_update: schemas.CarServiceStatusUpdate, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    db_car = get_car_for_user(car_id, db, current_user)
    limited_update_schema = schemas.CarUpdate(
        service_needed=service_update.service_needed,
        service_notes=service_update.service_notes
    )
    return crud.update_car(db=db, db_car=db_car, car_update=limited_update_schema)

@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_car(car_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_car = get_car_for_user(car_id, db, current_user)
    crud.delete_car(db=db, db_car=db_car)
    return None

@router.post("/{car_id}/image", response_model=schemas.CarRead)
async def upload_car_image(car_id: int, db: DbDependency, current_user: ManagerOrAdminDependency, file: UploadFile = File(...)):
    db_car = get_car_for_user(car_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"{car_id}_{uuid.uuid4()}{file_extension}"
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
def checkout_car_to_user(car_id: int, details: schemas.CarCheckout, db: DbDependency, current_user: CurrentUserDependency):
    db_car = get_car_for_user(car_id, db, current_user)
    if db_car.status != models.CarStatus.Available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Car is not available. Current status: {db_car.status.value}")
    return crud.checkout_car(db=db, db_car=db_car, user_id=current_user.id, details=details)

@router.post("/{car_id}/checkin", response_model=schemas.CarRead)
def checkin_car_from_user(car_id: int, details: schemas.CarCheckout, db: DbDependency, current_user: CurrentUserDependency):
    db_car = get_car_for_user(car_id, db, current_user)
    if db_car.current_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot check in a car that is not assigned to you.")
    return crud.checkin_car(db=db, db_car=db_car, user_id=current_user.id, details=details)

@router.post("/{car_id}/tyres", response_model=schemas.TyreSetRead, status_code=status.HTTP_201_CREATED)
def add_tyre_set_to_car(car_id: int, tyre_set: schemas.TyreSetCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    get_car_for_user(car_id, db, current_user)
    return crud.create_tyre_set(db, tyre_set=tyre_set, car_id=car_id)

@router.delete("/tyres/{tyre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tyre_set_from_car(tyre_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_tyre_set = crud.get_tyre_set(db, tyre_id=tyre_id)
    if not db_tyre_set:
        raise HTTPException(status_code=404, detail="Tyre set not found.")
    get_car_for_user(db_tyre_set.car_id, db, current_user)
    crud.delete_tyre_set(db, db_tyre_set=db_tyre_set)
    return None