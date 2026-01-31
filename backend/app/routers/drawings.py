# backend/app/routers/drawings.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid
from pathlib import Path
from datetime import date

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

# --- Helper functions ---

async def get_project_from_tenant(project_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Project:
    """
    Retrieves a project while verifying tenant access.
    Superadmins bypass the tenant restriction.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or access denied.")
    return project

async def get_drawing_from_tenant(drawing_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Drawing:
    """
    Retrieves a drawing record and verifies user access via the parent project.
    """
    db_drawing = crud.get_drawing(db, drawing_id=drawing_id)
    if not db_drawing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing not found")
    
    # Validation logic is delegated to the project helper
    await get_project_from_tenant(db_drawing.project_id, db, current_user)
    return db_drawing

# --- Endpoints ---

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_drawing_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency,
    description: Optional[str] = Form(None),
    revision: Optional[str] = Form(None),
    discipline: Optional[str] = Form(None),
    status: Optional[schemas.DrawingStatus] = Form(schemas.DrawingStatus.Draft),
    drawing_date: Optional[date] = Form(None),
    author: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Uploads a drawing file (PDF/Image/CAD) to a specific project.
    Metadata is stored in the database, and the file is saved to disk.
    """
    # 1. Verify project exists and access is allowed
    project = await get_project_from_tenant(project_id, db, current_user)
    
    # 2. Generate unique filename to prevent collisions
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_DRAWINGS / unique_filename
    
    # 3. Store relative path for database consistency
    db_filepath_relative = f"static/project_drawings/{unique_filename}"

    try:
        # 4. Save the file to the server filesystem
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        file_size = file_location_on_disk.stat().st_size
    except Exception as e:
        # Cleanup if saving fails
        if file_location_on_disk.exists():
            os.remove(file_location_on_disk)
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        await file.close()

    # 5. Record metadata in database
    drawing_data = schemas.DrawingCreate(
        filename=file.filename,
        filepath=str(db_filepath_relative),
        description=description,
        content_type=file.content_type,
        size_bytes=file_size,
        project_id=project.id,
        uploader_id=current_user.id,
        revision=revision,
        discipline=discipline,
        status=status,
        drawing_date=drawing_date,
        author=author
    )
    
    db_drawing = crud.create_drawing_metadata(db=db, drawing=drawing_data)
    return db_drawing

@router.put("/{drawing_id}", response_model=schemas.DrawingRead)
@limiter.limit("100/minute")
async def update_drawing_details(
    request: Request,
    drawing_id: int,
    drawing_update: schemas.DrawingUpdate,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    """
    Updates metadata for an existing drawing (revision number, status, etc.).
    """
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    return crud.update_drawing_metadata(db=db, db_drawing=db_drawing, drawing_update=drawing_update)

@router.get("/project/{project_id}", response_model=List[schemas.DrawingRead])
@limiter.limit("100/minute")
async def get_drawings_for_project_endpoint(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Lists all drawings associated with a specific project.
    """
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
    """
    Downloads the physical drawing file from the server disk.
    """
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    
    # Reconstruct full disk path
    full_disk_path = APP_DIR / db_drawing.filepath
    
    if not full_disk_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing file not found on server disk.")
    
    return FileResponse(
        path=full_disk_path, 
        filename=db_drawing.filename, 
        media_type=db_drawing.content_type
    )

@router.delete("/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_drawing_metadata_endpoint(
    request: Request,
    drawing_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    """
    Deletes the drawing metadata record and removes the file from the server disk.
    """
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    full_disk_path = APP_DIR / db_drawing.filepath 

    deleted_drawing_meta = crud.delete_drawing_metadata(db=db, drawing_id=db_drawing.id)
    
    if deleted_drawing_meta:
        # File removal attempt
        try:
            if full_disk_path.is_file():
                os.remove(full_disk_path)
        except OSError as e:
            # We don't fail the request if the file deletion fails (metadata is already gone)
            print(f"Error deleting file from disk {full_disk_path}: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata could not be deleted.")
    
    return None