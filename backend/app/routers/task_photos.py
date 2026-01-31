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
    """
    Helper to fetch a task and verify tenant access. 
    Superusers bypass the tenant check.
    """
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # Verify tenant ownership
    effective_tenant_id = db_task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task's photos")
    
    return db_task

async def get_photo_and_verify_tenant(
    photo_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.TaskPhoto:
    """
    Helper to fetch a photo record and verify access via its parent task.
    """
    db_photo = crud.get_task_photo(db, photo_id=photo_id)
    if not db_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    
    # Authorization logic is nested in the task verification helper
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
    """
    Uploads a photo for a specific task. 
    The file is saved to disk and metadata is stored in the database.
    """
    # 1. Verify task existence and tenant access
    db_task = await get_task_and_verify_tenant_from_photos_router(task_id, db, current_user)
    
    # 2. Prepare file paths
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_TASK_PHOTOS / unique_filename
    
    # 3. Save file to static directory
    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file: {str(e)}")
    finally:
        await file.close()

    # 4. Save metadata to Database
    photo_data = schemas.TaskPhotoCreate(
        filename=file.filename, 
        filepath=str(file_location_on_disk), 
        description=description,
        content_type=file.content_type, 
        size_bytes=file.size if file.size else 0,
        task_id=db_task.id, 
        uploader_id=current_user.id
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
    """
    Lists all photos associated with a specific task.
    """
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
    """
    Downloads the actual photo file from the server.
    """
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)
    
    if not os.path.exists(db_photo.filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on server disk.")
    
    return FileResponse(
        path=db_photo.filepath, 
        filename=db_photo.filename, 
        media_type=db_photo.content_type
    )

@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_task_photo_metadata_endpoint(
    request: Request,
    photo_id: int,
    db: DbDependency,
    current_user: TaskContentContributorDependency
):
    """
    Deletes a photo record and removes the file from disk. 
    Authorized users: Uploader, Superadmin, or Tenant Management (Admin/PM/TL).
    """
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)
    
    # Ownership Check: Only uploader, superuser, or managers can delete
    can_delete = (
        current_user.is_superuser or 
        (current_user.id == db_photo.uploader_id) or 
        (current_user.role in ["admin", "project manager", "team leader"])
    )
    
    if not can_delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this photo.")
    
    # Store path for disk cleanup before DB deletion
    file_path_on_disk = db_photo.filepath
    
    deleted_photo_meta = crud.delete_task_photo_metadata(db=db, photo_id=db_photo.id)
    
    if deleted_photo_meta:
        # Cleanup disk file
        if os.path.exists(file_path_on_disk):
            try:
                os.remove(file_path_on_disk)
            except OSError as e:
                # Log error but don't fail request since DB entry is already gone
                print(f"Error removing file from disk: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata could not be removed.")
    
    return None