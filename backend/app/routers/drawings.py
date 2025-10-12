# backend/app/routers/drawings.py
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
    await get_project_from_tenant(db_drawing.project_id, db, current_user)
    return db_drawing

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_drawing_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency,
    description: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    project = await get_project_from_tenant(project_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_DRAWINGS / unique_filename
    db_filepath = f"static/project_drawings/{unique_filename}"

    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    finally:
        await file.close()

    drawing_data = schemas.DrawingCreate(
        filename=file.filename, filepath=str(file_location_on_disk), description=description,
        content_type=file.content_type, size_bytes=file.size,
        project_id=project.id, uploader_id=current_user.id
    )
    db_drawing = crud.create_drawing_metadata(db=db, drawing=drawing_data)
    return db_drawing

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
    if not os.path.exists(db_drawing.filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing file not found on server.")
    return FileResponse(path=db_drawing.filepath, filename=db_drawing.filename, media_type=db_drawing.content_type)

@router.delete("/{drawing_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_drawing_metadata_endpoint(
    request: Request,
    drawing_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    
    deleted_drawing_meta = crud.delete_drawing_metadata(db=db, drawing_id=db_drawing.id)
    if deleted_drawing_meta:
        if os.path.exists(deleted_drawing_meta.filepath):
            os.remove(deleted_drawing_meta.filepath)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing metadata not found.")
    return None