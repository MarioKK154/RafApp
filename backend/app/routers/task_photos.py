# backend/app/routers/task_photos.py
# Uncondensed Version
import os
import shutil
import uuid # For unique filenames
from fastapi import (
    APIRouter, Depends, HTTPException, status, UploadFile, File, Form
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional

from .. import crud, models, schemas, security
from ..database import get_db

# Define base directory for task photo uploads
UPLOAD_DIR_BASE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), # -> app/
    "uploads",
    "tasks"
)

router = APIRouter(
    prefix="/task_photos", # Use a distinct prefix
    tags=["Task Photos"],
    dependencies=[Depends(security.get_current_active_user)] # Must be logged in
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Roles allowed to delete photos (besides uploader)
PhotoModeratorRoles = ["admin", "project manager", "team leader"]

# Helper to ensure task-specific upload dir exists
def ensure_task_upload_dir(task_id: int):
    task_upload_dir = os.path.join(UPLOAD_DIR_BASE, str(task_id))
    # Create directory if it doesn't exist, handle potential race conditions if needed
    os.makedirs(task_upload_dir, exist_ok=True)
    print(f" Ensured task upload directory exists: {task_upload_dir}") # Log directory check/creation
    return task_upload_dir

@router.post("/upload/{task_id}", response_model=schemas.TaskPhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo_for_task(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    description: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Uploads a photo file for a specific task."""
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # TODO: Add authorization check - can user upload photo to this task/project?

    # Ensure base and task directories exist
    if not os.path.exists(os.path.dirname(UPLOAD_DIR_BASE)): # Ensure 'uploads' exists
         os.makedirs(os.path.dirname(UPLOAD_DIR_BASE), exist_ok=True)
    task_upload_dir = ensure_task_upload_dir(task_id)

    # Basic check for image types using content_type (more robust checks are possible)
    if not file.content_type or not file.content_type.startswith("image/"):
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"Invalid file type ({file.content_type}). Only images allowed."
        )

    file_location = "" # Define outside try for cleanup scope
    try:
        original_filename = file.filename or "unknown_file"
        # Sanitize or create unique filename
        file_extension = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_location = os.path.join(task_upload_dir, unique_filename)
        relative_filepath = os.path.join(str(task_id), unique_filename) # Relative to UPLOAD_DIR_BASE

        # Save file chunk by chunk for potentially large files
        with open(file_location, "wb") as file_object:
            while chunk := await file.read(8192): # Read in chunks (e.g., 8KB)
                file_object.write(chunk)

        file_size = os.path.getsize(file_location)

        # Create DB metadata
        photo_metadata = schemas.TaskPhotoCreate(
            filename=original_filename,
            filepath=relative_filepath,
            description=description,
            content_type=file.content_type,
            size_bytes=file_size,
            task_id=task_id,
            uploader_id=current_user.id
        )
        db_photo = crud.create_task_photo_metadata(db=db, photo_data=photo_metadata)
        return db_photo

    except HTTPException as http_exc:
        # Re-raise known HTTP exceptions
        raise http_exc
    except Exception as e:
        print(f"Error uploading task photo: {e}")
        # Clean up partially saved file if error occurred
        if file_location and os.path.exists(file_location):
             os.remove(file_location)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not upload photo due to server error."
        )
    finally:
        # Ensure the UploadFile resource is closed
        await file.close()


@router.get("/task/{task_id}", response_model=List[schemas.TaskPhotoRead])
async def list_photos_for_task(
    task_id: int,
    db: DbDependency,
    skip: int = 0,
    limit: int = 100
    # current_user: CurrentUserDependency - Applied at router level
):
    """Lists all photo metadata for a specific task."""
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    # TODO: Authorization check

    photos = crud.get_photos_for_task(db=db, task_id=task_id, skip=skip, limit=limit)
    return photos


@router.get("/download/{photo_id}")
async def download_task_photo_file(
    photo_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency - Applied at router level
):
    """Downloads the actual task photo file."""
    db_photo = crud.get_task_photo(db=db, photo_id=photo_id)
    if not db_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata not found")

    # TODO: Authorization check

    file_path_on_disk = os.path.join(UPLOAD_DIR_BASE, db_photo.filepath)
    if not os.path.exists(file_path_on_disk) or not os.path.isfile(file_path_on_disk):
         print(f"Error: File not found at {file_path_on_disk} for photo ID {photo_id}")
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on server")

    return FileResponse(
        path=file_path_on_disk,
        filename=db_photo.filename, # Suggests filename for download dialog
        media_type=db_photo.content_type # Sets Content-Type header
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_photo(
    photo_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Deletes a task photo (metadata and file). Requires uploader or moderator role."""
    db_photo = crud.get_task_photo(db=db, photo_id=photo_id)
    if not db_photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata not found")

    # Authorization Check
    is_uploader = (db_photo.uploader_id == current_user.id)
    is_moderator = (current_user.role in PhotoModeratorRoles)

    if not is_uploader and not is_moderator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this photo")

    file_path_on_disk = os.path.join(UPLOAD_DIR_BASE, db_photo.filepath)

    # Delete metadata first
    deleted_meta = crud.delete_task_photo_metadata(db=db, photo_id=photo_id)
    if deleted_meta is None:
        # This case should ideally not be reached if get_task_photo succeeded
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo metadata not found during delete attempt")

    # Then delete file from disk
    try:
        if os.path.exists(file_path_on_disk) and os.path.isfile(file_path_on_disk):
            os.remove(file_path_on_disk)
            # Optional: Clean up empty task directory
            try:
                task_dir = os.path.dirname(file_path_on_disk)
                if not os.listdir(task_dir):
                    os.rmdir(task_dir)
            except OSError as dir_err:
                 print(f"Notice: Could not remove empty directory {task_dir}: {dir_err}")
        else:
            print(f"Warning: File not found for deleted photo metadata: {file_path_on_disk}")
    except OSError as e:
        # Log error but don't fail request if metadata was deleted
        print(f"Error deleting file {file_path_on_disk}: {e}")
        # Consider implications if file deletion fails but DB entry is gone

    return None # Return No Content on successful deletion