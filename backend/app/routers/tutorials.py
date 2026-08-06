"""
Tutorials / Knowledge Base Router
==================================
Folder-based category system.
  - Folders are created dynamically by admins (no hardcoded enum).
  - Files (PDF, images) are uploaded into folders.
  - Bulk upload: multiple files → one folder in a single request.
  - Folder-upload: browser sends a whole directory via webkitdirectory;
    each file posted individually to the same endpoint.
  - External-URL entries (links to standards, manuals) are also supported.
  - Global entries (is_global=True) are visible to ALL tenants.
"""

from __future__ import annotations

import mimetypes
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/tutorials", tags=["tutorials"])

UPLOAD_DIR = Path("static/tutorials")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _can_manage(user: models.User) -> bool:
    """Admins, project managers, superusers can create/delete."""
    return user.is_superuser or user.role in ("admin", "project manager", "team_lead")


def _save_file(upload: UploadFile) -> tuple[str, str, int]:
    """Save an uploaded file to disk.
    Returns (relative_path, original_filename, size_bytes).
    """
    suffix = Path(upload.filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{suffix}"
    dest = UPLOAD_DIR / unique_name
    with dest.open("wb") as buf:
        shutil.copyfileobj(upload.file, buf)
    size = dest.stat().st_size
    return f"static/tutorials/{unique_name}", upload.filename, size


def _folder_read(folder: models.TutorialFolder, count: int = 0) -> schemas.TutorialFolderRead:
    return schemas.TutorialFolderRead(
        id=folder.id,
        name=folder.name,
        description=folder.description,
        is_global=folder.is_global,
        sort_order=folder.sort_order,
        tenant_id=folder.tenant_id,
        created_at=folder.created_at,
        tutorial_count=count,
    )


def _tut_read(tut: models.Tutorial) -> schemas.WiringDiagramRead:
    return schemas.WiringDiagramRead(
        id=tut.id,
        title=tut.title,
        folder_id=tut.folder_id,
        folder_name=tut.folder.name if tut.folder else None,
        category=tut.category,
        description=tut.description,
        tutorial_text=tut.tutorial_text,
        image_path=tut.image_path,
        file_path=tut.file_path,
        external_url=tut.external_url,
        original_filename=tut.original_filename,
        file_size_bytes=tut.file_size_bytes,
        content_type=tut.content_type,
        is_global=tut.is_global,
        created_at=tut.created_at,
        author_id=tut.author_id,
        tenant_id=tut.tenant_id,
    )


# ---------------------------------------------------------------------------
# Folder endpoints
# ---------------------------------------------------------------------------

@router.get("/folders/", response_model=List[schemas.TutorialFolderRead])
def list_folders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all folders visible to this tenant (own + global)."""
    folders = (
        db.query(models.TutorialFolder)
        .filter(
            (models.TutorialFolder.tenant_id == current_user.tenant_id)
            | (models.TutorialFolder.is_global == True)  # noqa: E712
        )
        .order_by(models.TutorialFolder.sort_order, models.TutorialFolder.name)
        .all()
    )
    result = []
    for f in folders:
        count = (
            db.query(models.Tutorial)
            .filter(models.Tutorial.folder_id == f.id)
            .count()
        )
        result.append(_folder_read(f, count))
    return result


@router.post("/folders/", response_model=schemas.TutorialFolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: schemas.TutorialFolderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    # Global folders only by superadmin
    is_global = payload.is_global and current_user.is_superuser

    folder = models.TutorialFolder(
        name=payload.name,
        description=payload.description,
        is_global=is_global,
        sort_order=payload.sort_order,
        tenant_id=None if is_global else current_user.tenant_id,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return _folder_read(folder, 0)


@router.patch("/folders/{folder_id}", response_model=schemas.TutorialFolderRead)
def rename_folder(
    folder_id: int,
    payload: schemas.TutorialFolderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    folder = db.get(models.TutorialFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    # Tenant isolation
    if not folder.is_global and folder.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not your folder.")

    folder.name = payload.name
    if payload.description is not None:
        folder.description = payload.description
    folder.sort_order = payload.sort_order

    # Update cached category string on all tutorials in this folder
    db.query(models.Tutorial).filter(models.Tutorial.folder_id == folder_id).update(
        {"category": payload.name}
    )
    db.commit()
    db.refresh(folder)
    count = db.query(models.Tutorial).filter(models.Tutorial.folder_id == folder_id).count()
    return _folder_read(folder, count)


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    folder = db.get(models.TutorialFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    if not folder.is_global and folder.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not your folder.")

    # Cascade delete also removes tutorials (set in model); clean up physical files
    for tut in folder.tutorials:
        for fpath in (tut.image_path, tut.file_path):
            if fpath and os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass

    db.delete(folder)
    db.commit()


# ---------------------------------------------------------------------------
# Tutorial (entry) endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[schemas.WiringDiagramRead])
def list_tutorials(
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return tutorials visible to this tenant.  Optionally filter by folder."""
    query = db.query(models.Tutorial).filter(
        (models.Tutorial.tenant_id == current_user.tenant_id)
        | (models.Tutorial.is_global == True)  # noqa: E712
        | (models.Tutorial.tenant_id == None)  # noqa: E711  (legacy global rows)
    )
    if folder_id is not None:
        query = query.filter(models.Tutorial.folder_id == folder_id)
    tutorials = query.order_by(models.Tutorial.created_at.desc()).all()
    return [_tut_read(t) for t in tutorials]


@router.post("/", response_model=schemas.WiringDiagramRead, status_code=status.HTTP_201_CREATED)
async def create_tutorial(
    title: str = Form(...),
    folder_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    tutorial_text: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None),
    is_global: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    pdf_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a single tutorial entry (text, image, PDF, or external URL)."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    image_path = original_image = None
    file_path = original_pdf = None
    file_size = None
    content_type = None
    folder_name = None

    if image and image.filename:
        image_path, original_image, _ = _save_file(image)

    if pdf_file and pdf_file.filename:
        file_path, original_pdf, file_size = _save_file(pdf_file)
        content_type = mimetypes.guess_type(pdf_file.filename)[0] or "application/pdf"

    # Resolve folder name for the category cache
    if folder_id:
        folder = db.get(models.TutorialFolder, folder_id)
        if folder:
            folder_name = folder.name

    global_flag = is_global and current_user.is_superuser

    tut = models.Tutorial(
        title=title,
        folder_id=folder_id,
        category=folder_name,
        description=description,
        tutorial_text=tutorial_text,
        image_path=image_path,
        file_path=file_path,
        external_url=external_url,
        original_filename=original_pdf or original_image or title,
        file_size_bytes=file_size,
        content_type=content_type,
        is_global=global_flag,
        tenant_id=None if global_flag else current_user.tenant_id,
        author_id=current_user.id,
    )
    db.add(tut)
    db.commit()
    db.refresh(tut)
    return _tut_read(tut)


@router.post("/bulk/", response_model=List[schemas.WiringDiagramRead], status_code=status.HTTP_201_CREATED)
async def bulk_upload(
    folder_id: int = Form(...),
    is_global: bool = Form(False),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload multiple files into a folder in one request.
    Each file becomes its own Tutorial entry.
    Title is derived from the original filename (without extension).
    """
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    folder = db.get(models.TutorialFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    global_flag = is_global and current_user.is_superuser
    created = []

    for upload in files:
        if not upload.filename:
            continue

        stem = Path(upload.filename).stem
        suffix = Path(upload.filename).suffix.lower()
        mime = mimetypes.guess_type(upload.filename)[0] or "application/octet-stream"

        saved_path, orig_name, size = _save_file(upload)

        is_image = mime.startswith("image/")
        tut = models.Tutorial(
            title=stem,
            folder_id=folder_id,
            category=folder.name,
            image_path=saved_path if is_image else None,
            file_path=saved_path if not is_image else None,
            original_filename=orig_name,
            file_size_bytes=size,
            content_type=mime,
            is_global=global_flag,
            tenant_id=None if global_flag else current_user.tenant_id,
            author_id=current_user.id,
        )
        db.add(tut)
        db.flush()
        created.append(tut)

    db.commit()
    for t in created:
        db.refresh(t)
    return [_tut_read(t) for t in created]


@router.delete("/{tutorial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutorial(
    tutorial_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tut = db.get(models.Tutorial, tutorial_id)
    if not tut:
        raise HTTPException(status_code=404, detail="Tutorial not found.")
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
    # Tenant isolation (superadmin can delete global entries)
    if not tut.is_global and tut.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not your tutorial.")

    # Delete physical files
    for fpath in (tut.image_path, tut.file_path):
        if fpath and os.path.exists(fpath):
            try:
                os.remove(fpath)
            except OSError:
                pass

    db.delete(tut)
    db.commit()
