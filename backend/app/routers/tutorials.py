from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas, crud 
from app.database import get_db
from app.security import get_current_user # Updated to your file name
import shutil
import os
import uuid
from pathlib import Path

router = APIRouter(prefix="/tutorials", tags=["tutorials"])

# Ensure the upload directory exists
UPLOAD_DIR = Path("static/tutorials")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/", response_model=List[schemas.WiringDiagramRead])
def read_tutorials(
    category: Optional[models.TutorialCategory] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Fetch tutorials that are either GLOBAL (tenant_id is null) 
    # OR belong to the user's specific company.
    query = db.query(models.Tutorial).filter(
        (models.Tutorial.tenant_id == current_user.tenant_id) | 
        (models.Tutorial.tenant_id == None)
    )
    
    if category:
        query = query.filter(models.Tutorial.category == category)
    
    return query.all()

@router.post("/", response_model=schemas.WiringDiagramRead)
async def create_tutorial(
    title: str = Form(...),
    category: models.TutorialCategory = Form(...),
    description: Optional[str] = Form(None),
    tutorial_text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    pdf_file: Optional[UploadFile] = File(None),
    is_global: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Creates a new knowledge base entry with an optional diagram image"""
    image_path = None
    file_path = None
    if image:
        file_ext = Path(image.filename).suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        image_path = f"static/tutorials/{file_name}"
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    
    if pdf_file:
        ext = Path(pdf_file.filename).suffix
        name = f"manual_{uuid.uuid4()}{ext}"
        file_path = f"static/tutorials/{name}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(pdf_file.file, buffer)

    new_tutorial = models.Tutorial(
        title=title,
        category=category,
        description=description,
        tutorial_text=tutorial_text,
        image_path=image_path,
        file_path=file_path,
        tenant_id=None if (current_user.is_superuser and is_global) else current_user.tenant_id,
        author_id=current_user.id
    )
    db.add(new_tutorial)
    db.commit()
    db.refresh(new_tutorial)
    return new_tutorial