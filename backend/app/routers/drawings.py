# backend/app/routers/drawings.py
import os
import shutil
from fastapi import ( APIRouter, Depends, HTTPException, status, UploadFile, File, Form )
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import uuid # For generating unique filenames

from .. import crud, models, schemas, security
from ..database import get_db

# Define the base directory for uploads relative to the backend directory
UPLOAD_DIR_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

router = APIRouter(
    # No prefix here, set in main.py
    tags=["Drawings"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

# Helper function to create project upload directory if it doesn't exist
def ensure_project_upload_dir(project_id: int):
    project_upload_dir = os.path.join(UPLOAD_DIR_BASE, str(project_id))
    if not os.path.exists(project_upload_dir):
        os.makedirs(project_upload_dir)
        print(f"Created upload directory: {project_upload_dir}") # Log directory creation
    return project_upload_dir

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
async def upload_drawing_for_project(
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    description: Optional[str] = Form(None), # Get description from form data
    file: UploadFile = File(...) # Get file upload
):
    """Uploads a drawing file for a specific project."""
    # Check if project exists
    db_project = crud.get_project(db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # TODO: Authorization check - can current_user upload to this project?

    # Ensure the base upload directory exists
    if not os.path.exists(UPLOAD_DIR_BASE):
        os.makedirs(UPLOAD_DIR_BASE)
        print(f"Created base upload directory: {UPLOAD_DIR_BASE}")

    # Ensure project-specific directory exists
    project_upload_dir = ensure_project_upload_dir(project_id)

    try:
        # Sanitize filename (optional but recommended)
        original_filename = file.filename
        # Generate a unique filename to prevent overwrites and handle special chars
        file_extension = os.path.splitext(original_filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_location = os.path.join(project_upload_dir, unique_filename)
        relative_filepath = os.path.join(str(project_id), unique_filename) # Path relative to UPLOAD_DIR_BASE

        # Save the file
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        # Get file size after saving
        file_size = os.path.getsize(file_location)

        # Create metadata entry in DB
        drawing_metadata = schemas.DrawingCreate(
            filename=original_filename,
            filepath=relative_filepath, # Store relative path
            description=description,
            content_type=file.content_type,
            size_bytes=file_size,
            project_id=project_id,
            uploader_id=current_user.id
        )
        db_drawing = crud.create_drawing_metadata(db=db, drawing=drawing_metadata)
        return db_drawing

    except Exception as e:
        print(f"Error uploading file: {e}") # Log the error
        # Clean up potentially partially saved file if error occurred during save/db entry
        if 'file_location' in locals() and os.path.exists(file_location):
             os.remove(file_location)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not upload file.")
    finally:
        # Ensure file handle is closed
        await file.close()


@router.get("/project/{project_id}", response_model=List[schemas.DrawingRead])
async def list_drawings_for_project(
    project_id: int,
    db: DbDependency,
    skip: int = 0,
    limit: int = 100
    # current_user: CurrentUserDependency - Applied at router level
):
    """Lists all drawing metadata for a specific project."""
     # Check if project exists
    db_project = crud.get_project(db, project_id=project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    # TODO: Authorization check - can current_user view drawings for this project?

    drawings = crud.get_drawings_for_project(db=db, project_id=project_id, skip=skip, limit=limit)
    return drawings

@router.get("/download/{drawing_id}")
async def download_drawing_file(
    drawing_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency
):
    """Downloads the actual drawing file."""
    db_drawing = crud.get_drawing(db=db, drawing_id=drawing_id)
    if db_drawing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found")

    # TODO: Authorization check - can current_user download this drawing?

    file_path_on_disk = os.path.join(UPLOAD_DIR_BASE, db_drawing.filepath)

    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing file not found on server")

    # Use FileResponse to stream the file
    return FileResponse(path=file_path_on_disk, filename=db_drawing.filename, media_type=db_drawing.content_type)


@router.delete("/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drawing(
    drawing_id: int,
    db: DbDependency
    # current_user: CurrentUserDependency
):
    """Deletes a drawing (metadata and file)."""
    db_drawing = crud.get_drawing(db=db, drawing_id=drawing_id)
    if db_drawing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found")

    # TODO: Authorization check - can current_user delete this drawing?

    file_path_on_disk = os.path.join(UPLOAD_DIR_BASE, db_drawing.filepath)

    # Attempt to delete metadata first
    deleted_meta = crud.delete_drawing_metadata(db=db, drawing_id=drawing_id)
    if deleted_meta is None:
         # Should not happen if get_drawing succeeded, but check anyway
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found during delete")

    # If metadata deletion was successful, attempt to delete the file
    try:
        if os.path.exists(file_path_on_disk):
            os.remove(file_path_on_disk)
            # Check if project directory is empty and remove if desired
            project_dir = os.path.dirname(file_path_on_disk)
            if not os.listdir(project_dir):
                os.rmdir(project_dir)
        else:
            print(f"Warning: File not found for deleted drawing metadata: {file_path_on_disk}")

    except OSError as e:
        # Log error but don't fail request if metadata was deleted
        print(f"Error deleting file {file_path_on_disk}: {e}")
        # Consider how to handle orphaned files or DB entries if file deletion fails

    return None # Return No Content