# backend/app/routers/task_photos.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid

from .. import crud, models, schemas, security
from ..database import get_db
from pathlib import Path

# Define upload directory relative to the backend root
APP_DIR = Path(__file__).resolve().parent
UPLOAD_DIRECTORY_TASK_PHOTOS = APP_DIR / "static" / "task_photos"
UPLOAD_DIRECTORY_TASK_PHOTOS.mkdir(parents=True, exist_ok=True)

router = APIRouter(
    tags=["Task Photos"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Users who can upload/delete photos for tasks (typically project members or those with task edit rights)
TaskContentContributorDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader", "electrician"]))]


# Helper function to get a task and verify tenant ownership via its project
async def get_task_and_verify_tenant_from_photos_router(
    task_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.Task:
    db_task = crud.get_task(db, task_id=task_id) # crud.get_task should eager load project.tenant
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not db_task.project or not db_task.project.tenant:
        # This indicates a data integrity issue or incomplete loading in CRUD
        db.refresh(db_task.project, attribute_names=['tenant'])
        if not db_task.project or not db_task.project.tenant:
              raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Task's project or tenant link is broken.")

    if not current_user.is_superuser and db_task.project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task's photos")
    return db_task

# Helper function to get task photo and verify tenant ownership via its task/project
async def get_photo_and_verify_tenant(
    photo_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.TaskPhoto:
    db_photo = crud.get_task_photo(db, photo_id=photo_id) # crud.get_task_photo should load task.project.tenant
    if not db_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    if not db_photo.task or not db_photo.task.project or not db_photo.task.project.tenant:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Photo is not correctly associated with a task, project, or tenant.")

    if not current_user.is_superuser and db_photo.task.project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this photo")
    return db_photo


@router.post("/upload/{task_id}", response_model=schemas.TaskPhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo_for_task(
    task_id: int,
    db: DbDependency,
    current_user: TaskContentContributorDependency,
    description: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Uploads a photo for a specific task, ensuring the task belongs to the user's tenant.
    """
    db_task = await get_task_and_verify_tenant_from_photos_router(task_id, db, current_user) # Verifies tenant

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = os.path.join(UPLOAD_DIRECTORY_TASK_PHOTOS, unique_filename)
    db_filepath = unique_filename # Store relative path

    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        print(f"Error saving task photo file: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save photo file.")
    finally:
        await file.close()

    photo_data = schemas.TaskPhotoCreate(
        filename=file.filename,
        filepath=db_filepath,
        description=description,
        content_type=file.content_type,
        size_bytes=getattr(file, 'size', None),
        task_id=db_task.id,
        uploader_id=current_user.id
    )
    db_photo = crud.create_task_photo_metadata(db=db, photo_data=photo_data)
    return db_photo


@router.get("/task/{task_id}", response_model=List[schemas.TaskPhotoRead])
async def get_photos_for_task_endpoint(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Lists all photos for a specific task, if the task belongs to the user's tenant.
    """
    await get_task_and_verify_tenant_from_photos_router(task_id, db, current_user) # Verifies tenant access
    photos = crud.get_photos_for_task(db, task_id=task_id)
    return photos


@router.get("/download/{photo_id}", response_class=FileResponse)
async def download_task_photo_file(
    photo_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Downloads a specific photo file, if it belongs to a task in the user's tenant.
    """
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)
    
    file_path_on_disk = os.path.join(UPLOAD_DIRECTORY_TASK_PHOTOS, db_photo.filepath)
    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on server.")
    
    return FileResponse(
        path=file_path_on_disk,
        filename=db_photo.filename,
        media_type=db_photo.content_type or 'application/octet-stream'
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_photo_metadata_endpoint(
    photo_id: int,
    db: DbDependency,
    current_user: TaskContentContributorDependency
):
    """
    Deletes a photo and its metadata, if the photo belongs to a task in the user's tenant
    and the user has permission (is uploader or moderator).
    """
    db_photo = await get_photo_and_verify_tenant(photo_id, db, current_user)

    # Permission check: Uploader or PM/Admin/TL of the project
    can_delete = current_user.is_superuser or \
                 (current_user.id == db_photo.uploader_id) or \
                 (current_user.role in ["admin", "project manager", "team leader"])

    if not can_delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this photo.")

    file_path_on_disk = os.path.join(UPLOAD_DIRECTORY_TASK_PHOTOS, db_photo.filepath)
    
    deleted_photo_meta = crud.delete_task_photo_metadata(db=db, photo_id=db_photo.id)
    if deleted_photo_meta:
        try:
            if os.path.exists(file_path_on_disk):
                os.remove(file_path_on_disk)
        except OSError as e:
            print(f"Error deleting photo file {file_path_on_disk}: {e}")
    else:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata not found.")
    
    return None