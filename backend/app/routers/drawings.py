# backend/app/routers/drawings.py
# Corrected: Parameter order in upload_drawing_for_project
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid

from .. import crud, models, schemas, security
from ..database import get_db

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIRECTORY_DRAWINGS = os.path.join(BACKEND_DIR, "uploads", "project_drawings")
os.makedirs(UPLOAD_DIRECTORY_DRAWINGS, exist_ok=True)

router = APIRouter(
    tags=["Project Drawings"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ProjectContentManagerDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]

async def get_project_from_tenant(project_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Project:
    project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id if not current_user.is_superuser else None)
    if not project:
        if current_user.is_superuser: # Check if it exists at all for superuser
            project_check = crud.get_project(db, project_id=project_id, tenant_id=None)
            if not project_check:
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        # If not superuser, or if superuser and project truly doesn't exist
        if not current_user.is_superuser or not project:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    # If superuser, project might be from another tenant, allow access.
    # If not superuser, crud.get_project already filtered by tenant_id.
    # Redundant check for non-superuser, but safe:
    if not current_user.is_superuser and project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this project's drawings.")
    return project

async def get_drawing_from_tenant(drawing_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Drawing:
    db_drawing = crud.get_drawing(db, drawing_id=drawing_id)
    if not db_drawing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing not found")
    if not db_drawing.project:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Drawing is not associated with a project.")
    if not current_user.is_superuser and db_drawing.project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this drawing")
    return db_drawing

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
async def upload_drawing_for_project(
    project_id: int,
    db: DbDependency,  # Non-defaulted parameters first
    current_user: ProjectContentManagerDependency, # Non-defaulted
    description: Optional[str] = Form(None),       # Defaulted parameter
    file: UploadFile = File(...)                 # Defaulted parameter
):
    project = await get_project_from_tenant(project_id, db, current_user)

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = os.path.join(UPLOAD_DIRECTORY_DRAWINGS, unique_filename)
    db_filepath = unique_filename

    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        print(f"Error saving file: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save drawing file.")
    finally:
        await file.close()

    drawing_data = schemas.DrawingCreate(
        filename=file.filename,
        filepath=db_filepath,
        description=description,
        content_type=file.content_type,
        size_bytes=getattr(file, 'size', None), # Access size safely
        project_id=project.id,
        uploader_id=current_user.id
    )
    db_drawing = crud.create_drawing_metadata(db=db, drawing=drawing_data)
    return db_drawing

@router.get("/project/{project_id}", response_model=List[schemas.DrawingRead])
async def get_drawings_for_project_endpoint(
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    project = await get_project_from_tenant(project_id, db, current_user)
    drawings = crud.get_drawings_for_project(db, project_id=project.id)
    return drawings

@router.get("/download/{drawing_id}", response_class=FileResponse)
async def download_drawing_file(
    drawing_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)

    file_path_on_disk = os.path.join(UPLOAD_DIRECTORY_DRAWINGS, db_drawing.filepath)
    if not os.path.exists(file_path_on_disk):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing file not found on server.")

    return FileResponse(
        path=file_path_on_disk,
        filename=db_drawing.filename,
        media_type=db_drawing.content_type or 'application/octet-stream'
    )

@router.delete("/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drawing_metadata_endpoint(
    drawing_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)

    if not current_user.is_superuser and \
       current_user.tenant_id == db_drawing.project.tenant_id and \
       current_user.id != db_drawing.uploader_id and \
       current_user.role not in ["admin", "project manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this drawing.")

    file_path_on_disk = os.path.join(UPLOAD_DIRECTORY_DRAWINGS, db_drawing.filepath)

    deleted_drawing_meta = crud.delete_drawing_metadata(db=db, drawing_id=db_drawing.id)
    if deleted_drawing_meta:
        try:
            if os.path.exists(file_path_on_disk):
                os.remove(file_path_on_disk)
        except OSError as e:
            print(f"Error deleting drawing file {file_path_on_disk}: {e}")
    else:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found.")

    return None