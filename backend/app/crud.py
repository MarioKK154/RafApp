# backend/app/crud.py
from sqlalchemy.orm import Session
from sqlalchemy import desc # To order timelogs
from typing import Optional, List
from datetime import datetime, timezone # Import timezone

# Import models and schemas
from . import models, schemas
# Import password hashing utility
from .security import get_password_hash

# --- User CRUD Operations ---
# (Keep existing User, Project, Task, InventoryItem CRUD functions here)
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Project CRUD Operations ---
def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100) -> List[models.Project]:
    return db.query(models.Project).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, creator_id: int) -> models.Project:
    db_project = models.Project(**project.model_dump(), creator_id=creator_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if not db_project: return None
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_project, key, value)
    db.add(db_project); db.commit(); db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if not db_project: return None
    db.delete(db_project); db.commit()
    return db_project

# --- Task CRUD Operations ---
def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.query(models.Task).filter(models.Task.id == task_id).first()

def get_tasks(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Task]:
    query = db.query(models.Task)
    if project_id is not None: query = query.filter(models.Task.project_id == project_id)
    return query.offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    db_task = models.Task(**task.model_dump())
    db.add(db_task); db.commit(); db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task: return None
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_task, key, value)
    db.add(db_task); db.commit(); db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task: return None
    db.delete(db_task); db.commit()
    return db_task

# --- Inventory Item CRUD Operations ---
def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
    return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.InventoryItem]:
    return db.query(models.InventoryItem).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item); db.commit(); db.refresh(db_item)
    return db_item

def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item: return None
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_item, key, value)
    db.add(db_item); db.commit(); db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item: return None
    db.delete(db_item); db.commit()
    return db_item

# --- Drawing Metadata CRUD Operations ---

def get_drawing(db: Session, drawing_id: int) -> Optional[models.Drawing]:
    """Gets a single drawing metadata entry by ID."""
    return db.query(models.Drawing).filter(models.Drawing.id == drawing_id).first()

def get_drawings_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.Drawing]:
    """Gets all drawing metadata entries for a specific project."""
    return db.query(models.Drawing).filter(models.Drawing.project_id == project_id).offset(skip).limit(limit).all()

def create_drawing_metadata(db: Session, drawing: schemas.DrawingCreate) -> models.Drawing:
    """Creates a database entry for drawing metadata."""
    # Note: This does NOT save the actual file, only its info.
    # File saving should happen in the router before calling this.
    db_drawing = models.Drawing(**drawing.model_dump())
    db.add(db_drawing)
    db.commit()
    db.refresh(db_drawing)
    return db_drawing

def delete_drawing_metadata(db: Session, drawing_id: int) -> Optional[models.Drawing]:
    """Deletes a drawing metadata entry."""
    # Note: This does NOT delete the actual file from storage.
    # File deletion should happen in the router alongside calling this.
    db_drawing = get_drawing(db, drawing_id)
    if not db_drawing:
        return None
    db.delete(db_drawing)
    db.commit()
    return db_drawing


# --- TimeLog CRUD Operations ---

def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]:
    """Finds the most recent timelog for a user that hasn't been closed (end_time is NULL)."""
    return db.query(models.TimeLog)\
             .filter(models.TimeLog.user_id == user_id, models.TimeLog.end_time == None)\
             .order_by(desc(models.TimeLog.start_time))\
             .first()

def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog:
    """Creates a new timelog entry (clock-in). Sets start_time automatically."""
    db_timelog = models.TimeLog(
        **timelog_data.model_dump(),
        user_id=user_id,
        start_time=datetime.now(timezone.utc) # Set start time on creation
    )
    db.add(db_timelog)
    db.commit()
    db.refresh(db_timelog)
    return db_timelog

def update_timelog_entry(db: Session, timelog_id: int) -> Optional[models.TimeLog]:
    """Updates a timelog entry (clock-out). Sets end_time and calculates duration."""
    db_timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if not db_timelog or db_timelog.end_time is not None: # Ensure it exists and is not already closed
        return None

    end_time = datetime.now(timezone.utc)
    duration = end_time - db_timelog.start_time

    db_timelog.end_time = end_time
    db_timelog.duration = duration

    db.add(db_timelog)
    db.commit()
    db.refresh(db_timelog)
    return db_timelog

def get_timelogs_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:
    """Gets all timelogs for a specific user, most recent first."""
    return db.query(models.TimeLog)\
             .filter(models.TimeLog.user_id == user_id)\
             .order_by(desc(models.TimeLog.start_time))\
             .offset(skip)\
             .limit(limit)\
             .all()

# Optional: Get timelogs for a project
def get_timelogs_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:
    """Gets all timelogs for a specific project, most recent first."""
    return db.query(models.TimeLog)\
             .filter(models.TimeLog.project_id == project_id)\
             .order_by(desc(models.TimeLog.start_time))\
             .offset(skip)\
             .limit(limit)\
             .all()