# backend/app/routers/drawings.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid
from pathlib import Path
from datetime import date # Import date

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/drawings",
    tags=["Project Drawings"],
    dependencies=[Depends(security.get_current_active_user)]
)

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIRECTORY_DRAWINGS = APP_DIR / "static" / "project_drawings"
UPLOAD_DIRECTORY_DRAWINGS.mkdir(parents=True, exist_ok=True)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ProjectContentManagerDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

# --- Helper functions (get_project_from_tenant, get_drawing_from_tenant) remain the same ---
async def get_project_from_tenant(project_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Project:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    return project

async def get_drawing_from_tenant(drawing_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Drawing:
    db_drawing = crud.get_drawing(db, drawing_id=drawing_id)
    if not db_drawing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing not found")
    # Verify access via project
    await get_project_from_tenant(db_drawing.project_id, db, current_user)
    return db_drawing
# --- End Helper Functions ---

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_drawing_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency,
    # Add new optional fields to the Form data
    description: Optional[str] = Form(None),
    revision: Optional[str] = Form(None),
    discipline: Optional[str] = Form(None),
    status: Optional[schemas.DrawingStatus] = Form(schemas.DrawingStatus.Draft),
    drawing_date: Optional[date] = Form(None),
    author: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    project = await get_project_from_tenant(project_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_DRAWINGS / unique_filename
    # db_filepath is now just used for DB storage, actual path is file_location_on_disk
    db_filepath_relative = f"static/project_drawings/{unique_filename}"

    try:
        # Save the file to disk
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        file_size = file_location_on_disk.stat().st_size # Get size after saving
    except Exception as e:
        # Clean up failed upload
        if file_location_on_disk.exists():
            os.remove(file_location_on_disk)
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    finally:
        await file.close()

    # Prepare data for DB, including new fields
    drawing_data = schemas.DrawingCreate(
        filename=file.filename,
        filepath=str(db_filepath_relative), # Store relative path
        description=description,
        content_type=file.content_type,
        size_bytes=file_size,
        project_id=project.id,
        uploader_id=current_user.id,
        # Pass new fields
        revision=revision,
        discipline=discipline,
        status=status,
        drawing_date=drawing_date,
        author=author
    )
    db_drawing = crud.create_drawing_metadata(db=db, drawing=drawing_data)
    return db_drawing

# --- NEW: Endpoint to update drawing metadata ---
@router.put("/{drawing_id}", response_model=schemas.DrawingRead)
@limiter.limit("100/minute")
async def update_drawing_details(
    request: Request,
    drawing_id: int,
    drawing_update: schemas.DrawingUpdate,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    """Updates the metadata details of an existing drawing."""
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    return crud.update_drawing_metadata(db=db, db_drawing=db_drawing, drawing_update=drawing_update)
# --- END NEW ---

@router.get("/project/{project_id}", response_model=List[schemas.DrawingRead])
@limiter.limit("100/minute")
async def get_drawings_for_project_endpoint(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    await get_project_from_tenant(project_id, db, current_user)
    return crud.get_drawings_for_project(db, project_id=project_id)

@router.get("/download/{drawing_id}", response_class=FileResponse)
@limiter.limit("30/minute")
async def download_drawing_file(
    request: Request,
    drawing_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    # Construct the full path on disk from the relative path stored in DB
    full_disk_path = APP_DIR / db_drawing.filepath
    if not full_disk_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing file not found on server.")
    return FileResponse(path=full_disk_path, filename=db_drawing.filename, media_type=db_drawing.content_type)

@router.delete("/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_drawing_metadata_endpoint(
    request: Request,
    drawing_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    full_disk_path = APP_DIR / db_drawing.filepath # Get path before deleting record

    deleted_drawing_meta = crud.delete_drawing_metadata(db=db, drawing_id=db_drawing.id)
    if deleted_drawing_meta:
        # Try to delete the file from disk
        try:
            if full_disk_path.is_file():
                os.remove(full_disk_path)
        except OSError as e:
            print(f"Error deleting drawing file {full_disk_path}: {e}") # Log error but don't fail
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found.")
    return None