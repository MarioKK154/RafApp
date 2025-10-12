# backend/app/routers/task_photos.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid
from pathlib import Path

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/task_photos",
    tags=["Task Photos"],
    dependencies=[Depends(security.get_current_active_user)]
)

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIRECTORY_TASK_PHOTOS = APP_DIR / "static" / "task_photos"
UPLOAD_DIRECTORY_TASK_PHOTOS.mkdir(parents=True, exist_ok=True)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TaskContentContributorDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader", "electrician"]))]

async def get_task_and_verify_tenant_from_photos_router(
    task_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.Task:
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    effective_tenant_id = db_task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task's photos")
    return db_task

async def get_photo_and_verify_tenant(
    photo_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.TaskPhoto:
    db_photo = crud.get_task_photo(db, photo_id=photo_id)
    if not db_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    
    await get_task_and_verify_tenant_from_photos_router(db_photo.task_id, db, current_user)
    return db_photo

@router.post("/upload/{task_id}", response_model=schemas.TaskPhotoRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_photo_for_task(
    request: Request,
    task_id: int,
    db: DbDependency,
    current_user: TaskContentContributorDependency,
    description: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    db_task = await get_task_and_verify_tenant_from_photos_router(task_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_TASK_PHOTOS / unique_filename
    db_filepath = f"static/task_photos/{unique_filename}"

    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    finally:
        await file.close()

    photo_data = schemas.TaskPhotoCreate(
        filename=file.filename, filepath=str(file_location_on_disk), description=description,
        content_type=file.content_type, size_bytes=file.size,
        task_id=db_task.id, uploader_id=current_user.id
    )
    db_photo = crud.create_task_photo_metadata(db=db, photo_data=photo_data)
    return db_photo

@router.get("/task/{task_id}", response_model=List[schemas.TaskPhotoRead])
@limiter.limit("100/minute")
async def get_photos_for_task_endpoint(
    request: Request,
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    await get_task_and_verify_tenant_from_photos_router(task_id, db, current_user)
    return crud.get_photos_for_task(db, task_id=task_id)

@router.get("/download/{photo_id}", response_class=FileResponse)
@limiter.limit("30/minute")
async def download_task_photo_file(
    request: Request,
    photo_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)
    if not os.path.exists(db_photo.filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on server.")
    return FileResponse(path=db_photo.filepath, filename=db_photo.filename, media_type=db_photo.content_type)

@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_task_photo_metadata_endpoint(
    request: Request,
    photo_id: int,
    db: DbDependency,
    current_user: TaskContentContributorDependency
):
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)
    can_delete = current_user.is_superuser or (current_user.id == db_photo.uploader_id) or (current_user.role in ["admin", "project manager", "team leader"])
    if not can_delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this photo.")
    
    deleted_photo_meta = crud.delete_task_photo_metadata(db=db, photo_id=db_photo.id)
    if deleted_photo_meta:
        if os.path.exists(deleted_photo_meta.filepath):
            os.remove(deleted_photo_meta.filepath)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata not found.")
    return None