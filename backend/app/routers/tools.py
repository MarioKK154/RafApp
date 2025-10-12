# backend/app/routers/tools.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import Annotated, List
import uuid
import aiofiles
from pathlib import Path

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/tools",
    tags=["Tool Inventory"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
ManagerOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = APP_DIR / "static" / "tool_images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_tool_for_user(tool_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Tool:
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    db_tool = crud.get_tool(db, tool_id=tool_id, tenant_id=effective_tenant_id)
    if not db_tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found.")
    return db_tool

@router.post("/", response_model=schemas.ToolRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_new_tool(request: Request, tool: schemas.ToolCreate, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_tool = crud.create_tool(db=db, tool=tool, tenant_id=current_user.tenant_id)
    crud.create_tool_log(db, tool_id=db_tool.id, user_id=current_user.id, action=models.ToolLogAction.Created, notes=f"Tool '{db_tool.name}' created.")
    db.refresh(db_tool)
    return db_tool

@router.post("/{tool_id}/image", response_model=schemas.ToolRead)
@limiter.limit("10/minute")
async def upload_tool_image(request: Request, tool_id: int, db: DbDependency, current_user: ManagerOrAdminDependency, file: UploadFile = File(...)):
    db_tool = get_tool_for_user(tool_id, db, current_user)
    file_extension = Path(file.filename).suffix
    unique_filename = f"{tool_id}_{uuid.uuid4()}{file_extension}"
    save_path = UPLOAD_DIR / unique_filename
    try:
        async with aiofiles.open(save_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error saving image file.")
    db_image_path = f"static/tool_images/{unique_filename}"
    return crud.update_tool_image_path(db=db, db_tool=db_tool, image_path=db_image_path)

@router.get("/", response_model=List[schemas.ToolRead])
@limiter.limit("100/minute")
def read_all_tools(request: Request, db: DbDependency, current_user: CurrentUserDependency, skip: int = 0, limit: int = 100):
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    return crud.get_tools(db=db, tenant_id=effective_tenant_id, skip=skip, limit=limit)

@router.get("/{tool_id}", response_model=schemas.ToolRead)
@limiter.limit("100/minute")
def read_single_tool(request: Request, tool_id: int, db: DbDependency, current_user: CurrentUserDependency):
    return get_tool_for_user(tool_id, db, current_user)

@router.put("/{tool_id}", response_model=schemas.ToolRead)
@limiter.limit("100/minute")
def update_existing_tool(request: Request, tool_id: int, tool_update: schemas.ToolUpdate, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_tool = get_tool_for_user(tool_id, db, current_user)
    return crud.update_tool(db=db, db_tool=db_tool, tool_update=tool_update)

@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
def delete_existing_tool(request: Request, tool_id: int, db: DbDependency, current_user: ManagerOrAdminDependency):
    db_tool = get_tool_for_user(tool_id, db, current_user)
    crud.delete_tool(db=db, db_tool=db_tool)
    return None

@router.post("/{tool_id}/checkout", response_model=schemas.ToolRead)
@limiter.limit("100/minute")
def checkout_tool_to_user(request: Request, tool_id: int, db: DbDependency, current_user: CurrentUserDependency):
    db_tool = get_tool_for_user(tool_id, db, current_user)
    if db_tool.status != models.ToolStatus.Available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tool is not available. Status: {db_tool.status.value}")
    return crud.checkout_tool(db=db, db_tool=db_tool, user_id=current_user.id)

@router.post("/{tool_id}/checkin", response_model=schemas.ToolRead)
@limiter.limit("100/minute")
def checkin_tool_from_user(request: Request, tool_id: int, db: DbDependency, current_user: CurrentUserDependency):
    db_tool = get_tool_for_user(tool_id, db, current_user)
    if db_tool.current_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot check in a tool not assigned to you.")
    return crud.checkin_tool(db=db, db_tool=db_tool)