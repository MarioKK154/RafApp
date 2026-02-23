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
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or access denied.")
    return project

async def get_drawing_from_tenant(drawing_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Drawing:
    """
    Retrieves a drawing record and verifies user access via tenant check.
    """
    # ROADMAP #4 FIX: Pass tenant_id to CRUD
    db_drawing = crud.get_drawing(db, drawing_id=drawing_id, tenant_id=current_user.tenant_id)
    if not db_drawing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drawing not found or access denied.")
    return db_drawing

# --- Folder Operations (Roadmap #4) ---

@router.post("/folders/", response_model=schemas.DrawingFolderRead, status_code=status.HTTP_201_CREATED)
async def create_new_directory(
    folder_data: schemas.DrawingFolderCreate,
    db: DbDependency,
    current_user: ProjectContentManagerDependency
):
    """
    Initializes a new directory node within a project's drawing registry.
    Supports nested sub-folders via parent_id.
    """
    # 1. Verify project exists and user has access to this tenant
    await get_project_from_tenant(folder_data.project_id, db, current_user)
    
    # 2. Security: Force the folder to belong to the user's tenant
    folder_data.tenant_id = current_user.tenant_id
    
    return crud.create_drawing_folder(db=db, folder_data=folder_data)

@router.get("/folders/project/{project_id}", response_model=List[schemas.DrawingFolderRead])
async def get_project_directories(
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Fetches the directory tree for a specific project.
    """
    # Verify access
    await get_project_from_tenant(project_id, db, current_user)
    
    # We fetch all folders for the project and tenant. 
    # The frontend logic we wrote will handle the tree filtering.
    return db.query(models.DrawingFolder).filter(
        models.DrawingFolder.project_id == project_id,
        models.DrawingFolder.tenant_id == current_user.tenant_id
    ).all()    

# --- Endpoints ---

@router.post("/upload/{project_id}", response_model=schemas.DrawingRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_drawing_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency,
    description: Optional[str] = Form(None),
    revision: Optional[str] = Form("A"),  # Default to 'A'
    discipline: Optional[str] = Form("General"),
    status: Optional[schemas.DrawingStatus] = Form(schemas.DrawingStatus.Draft),
    drawing_date: Optional[date] = Form(None),
    author: Optional[str] = Form(None),
    folder_id: Optional[int] = Form(None), # Crucial for directory placement
    file: UploadFile = File(...)
):
    project = await get_project_from_tenant(project_id, db, current_user)
    
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location_on_disk = UPLOAD_DIRECTORY_DRAWINGS / unique_filename
    db_filepath_relative = f"static/project_drawings/{unique_filename}"

    try:
        with open(file_location_on_disk, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        file_size = file_location_on_disk.stat().st_size
    except Exception as e:
        if file_location_on_disk.exists(): os.remove(file_location_on_disk)
        raise HTTPException(status_code=500, detail="Storage engine failure.")
    finally:
        await file.close()

    drawing_data = schemas.DrawingCreate(
        filename=file.filename,
        filepath=str(db_filepath_relative),
        description=description,
        content_type=file.content_type,
        size_bytes=file_size,
        project_id=project.id,
        uploader_id=current_user.id,
        tenant_id=current_user.tenant_id,
        folder_id=folder_id,
        revision=revision,
        discipline=discipline,
        status=status,
        drawing_date=drawing_date or date.today(),
        author=author or current_user.full_name
    )
    
    return crud.create_drawing_metadata(db=db, drawing=drawing_data)

@router.put("/{drawing_id}", response_model=schemas.DrawingRead)
@limiter.limit("100/minute")
async def update_drawing_details(
    request: Request,
    drawing_id: int,
    drawing_update: schemas.DrawingUpdate,
    db: DbDependency,
    current_user: ProjectContentManagerDependency # Ensure your role allows this
):
    """
    Updates metadata for an existing drawing node.
    Used for bumping revisions (A -> B) and changing status.
    """
    # 1. Fetch drawing and verify tenant access
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    
    # 2. Apply updates via CRUD
    return crud.update_drawing_metadata(db=db, db_drawing=db_drawing, drawing_update=drawing_update)

@router.get("/project/{project_id}", response_model=List[schemas.DrawingRead])
@limiter.limit("100/minute")
async def get_drawings_for_project_endpoint(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    # Verify project exists first
    await get_project_from_tenant(project_id, db, current_user)
    # Pass tenant_id to CRUD for filtering
    return crud.get_drawings_for_project(db, project_id=project_id, tenant_id=current_user.tenant_id)

@router.get("/download/{drawing_id}", response_class=FileResponse)
@limiter.limit("30/minute")
async def download_drawing_file(
    request: Request,
    drawing_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    full_disk_path = APP_DIR / db_drawing.filepath
    
    if not full_disk_path.is_file():
        raise HTTPException(status_code=404, detail="File missing on storage.")
    
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
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    full_disk_path = APP_DIR / db_drawing.filepath 

    # Pass tenant_id to CRUD to ensure uploader can only delete their own tenant's data
    deleted = crud.delete_drawing_metadata(db=db, drawing_id=db_drawing.id, tenant_id=current_user.tenant_id)
    
    if deleted:
        try:
            if full_disk_path.is_file():
                os.remove(full_disk_path)
        except OSError:
            pass # Metadata is gone, ignore disk errors
    return None

@router.post("/{drawing_id}/replace", response_model=schemas.DrawingRead)
async def replace_drawing_file(
    drawing_id: int,
    db: DbDependency,
    current_user: ProjectContentManagerDependency,
    file: UploadFile = File(...)
):
    """
    Replaces the physical file of an existing drawing.
    Automatically increments revision (A->B, B->C) and updates author/date.
    """
    # 1. Fetch existing record
    db_drawing = await get_drawing_from_tenant(drawing_id, db, current_user)
    
    # 2. Delete old file from disk
    old_file_path = APP_DIR / db_drawing.filepath
    if old_file_path.is_file():
        try:
            os.remove(old_file_path)
        except Exception as e:
            print(f"Warning: Could not delete old file {old_file_path}: {e}")

    # 3. Save new file
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    new_db_path = f"static/project_drawings/{unique_filename}"
    full_disk_path = UPLOAD_DIRECTORY_DRAWINGS / unique_filename

    with open(full_disk_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Logic: Bump Revision String (A -> B, etc.)
    current_rev = db_drawing.revision or "A"
    try:
        # If it's a single letter, move to next letter. Otherwise default to current + 1
        if len(current_rev) == 1 and current_rev.isalpha():
            next_rev = chr(ord(current_rev.upper()) + 1)
        else:
            next_rev = str(int(current_rev) + 1) if current_rev.isdigit() else f"{current_rev}.1"
    except:
        next_rev = "B"

    # 5. Update Database Metadata
    db_drawing.filepath = new_db_path
    db_drawing.filename = file.filename
    db_drawing.revision = next_rev
    db_drawing.author = current_user.full_name
    db_drawing.drawing_date = date.today()
    db_drawing.size_bytes = full_disk_path.stat().st_size
    db_drawing.content_type = file.content_type

    db.commit()
    db.refresh(db_drawing)
    return db_drawing