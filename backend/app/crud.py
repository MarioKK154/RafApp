# backend/app/crud.py
from sqlalchemy.orm import Session, joinedload # Import joinedload for eager loading if needed
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas
from .security import get_password_hash

# --- User CRUD ---
# ... (existing User CRUD functions) ...
def get_user(db: Session, user_id: int) -> Optional[models.User]: # ... existing ...
    return db.query(models.User).filter(models.User.id == user_id).first()
def get_user_by_email(db: Session, email: str) -> Optional[models.User]: # ... existing ...
    return db.query(models.User).filter(models.User.email == email).first()
def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]: # ... existing ...
    return db.query(models.User).offset(skip).limit(limit).all()
def create_user(db: Session, user: schemas.UserCreate) -> models.User: # ... existing ...
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user

# --- Project CRUD ---
# ... (existing Project CRUD functions) ...
def get_project(db: Session, project_id: int) -> Optional[models.Project]: # ... existing ...
    # Option to eager load members if needed often, but adds overhead
    # return db.query(models.Project).options(joinedload(models.Project.members)).filter(models.Project.id == project_id).first()
    return db.query(models.Project).filter(models.Project.id == project_id).first()
def get_projects(db: Session, skip: int = 0, limit: int = 100) -> List[models.Project]: # ... existing ...
    return db.query(models.Project).offset(skip).limit(limit).all()
def create_project(db: Session, project: schemas.ProjectCreate, creator_id: int) -> models.Project: # ... existing ...
    db_project = models.Project(**project.model_dump(), creator_id=creator_id)
    db.add(db_project); db.commit(); db.refresh(db_project)
    return db_project
def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate) -> Optional[models.Project]: # ... existing ...
    db_project = get_project(db, project_id)
    if not db_project: return None
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_project, key, value)
    db.add(db_project); db.commit(); db.refresh(db_project)
    return db_project
def delete_project(db: Session, project_id: int) -> Optional[models.Project]: # ... existing ...
    db_project = get_project(db, project_id)
    if not db_project: return None
    db.delete(db_project); db.commit()
    return db_project

# --- Task CRUD ---
# ... (existing Task CRUD functions) ...
def get_task(db: Session, task_id: int) -> Optional[models.Task]: # ... existing ...
     return db.query(models.Task).filter(models.Task.id == task_id).first()
def get_tasks(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Task]: # ... existing ...
    query = db.query(models.Task);
    if project_id is not None: query = query.filter(models.Task.project_id == project_id)
    return query.offset(skip).limit(limit).all()
def create_task(db: Session, task: schemas.TaskCreate) -> models.Task: # ... existing ...
    db_task = models.Task(**task.model_dump()); db.add(db_task); db.commit(); db.refresh(db_task); return db_task
def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate) -> Optional[models.Task]: # ... existing ...
    db_task = get_task(db, task_id);
    if not db_task: return None;
    update_data = task_update.model_dump(exclude_unset=True);
    for key, value in update_data.items(): setattr(db_task, key, value);
    db.add(db_task); db.commit(); db.refresh(db_task); return db_task
def delete_task(db: Session, task_id: int) -> Optional[models.Task]: # ... existing ...
    db_task = get_task(db, task_id);
    if not db_task: return None;
    db.delete(db_task); db.commit(); return db_task

# --- Inventory CRUD ---
# ... (existing Inventory CRUD functions) ...
def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]: # ... existing ...
     return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
def get_inventory_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.InventoryItem]: # ... existing ...
     return db.query(models.InventoryItem).offset(skip).limit(limit).all()
def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem: # ... existing ...
     db_item = models.InventoryItem(**item.model_dump()); db.add(db_item); db.commit(); db.refresh(db_item); return db_item
def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]: # ... existing ...
    db_item = get_inventory_item(db, item_id);
    if not db_item: return None;
    update_data = item_update.model_dump(exclude_unset=True);
    for key, value in update_data.items(): setattr(db_item, key, value);
    db.add(db_item); db.commit(); db.refresh(db_item); return db_item
def delete_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]: # ... existing ...
    db_item = get_inventory_item(db, item_id);
    if not db_item: return None;
    db.delete(db_item); db.commit(); return db_item

# --- Drawing Metadata CRUD ---
# ... (existing Drawing CRUD functions) ...
def get_drawing(db: Session, drawing_id: int) -> Optional[models.Drawing]: # ... existing ...
     return db.query(models.Drawing).filter(models.Drawing.id == drawing_id).first()
def get_drawings_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.Drawing]: # ... existing ...
     return db.query(models.Drawing).filter(models.Drawing.project_id == project_id).offset(skip).limit(limit).all()
def create_drawing_metadata(db: Session, drawing: schemas.DrawingCreate) -> models.Drawing: # ... existing ...
     db_drawing = models.Drawing(**drawing.model_dump()); db.add(db_drawing); db.commit(); db.refresh(db_drawing); return db_drawing
def delete_drawing_metadata(db: Session, drawing_id: int) -> Optional[models.Drawing]: # ... existing ...
    db_drawing = get_drawing(db, drawing_id);
    if not db_drawing: return None;
    db.delete(db_drawing); db.commit(); return db_drawing

# --- TimeLog CRUD ---
# ... (existing TimeLog CRUD functions) ...
def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]: # ... existing ...
     return db.query(models.TimeLog).filter(models.TimeLog.user_id == user_id, models.TimeLog.end_time == None).order_by(desc(models.TimeLog.start_time)).first()
def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog: # ... existing ...
     db_timelog = models.TimeLog(**timelog_data.model_dump(), user_id=user_id, start_time=datetime.now(timezone.utc)); db.add(db_timelog); db.commit(); db.refresh(db_timelog); return db_timelog
def update_timelog_entry(db: Session, timelog_id: int) -> Optional[models.TimeLog]: # ... existing ...
    db_timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first();
    if not db_timelog or db_timelog.end_time is not None: return None;
    end_time = datetime.now(timezone.utc); duration = end_time - db_timelog.start_time;
    db_timelog.end_time = end_time; db_timelog.duration = duration;
    db.add(db_timelog); db.commit(); db.refresh(db_timelog); return db_timelog
def get_timelogs_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]: # ... existing ...
     return db.query(models.TimeLog).filter(models.TimeLog.user_id == user_id).order_by(desc(models.TimeLog.start_time)).offset(skip).limit(limit).all()
def get_timelogs_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]: # ... existing ...
     return db.query(models.TimeLog).filter(models.TimeLog.project_id == project_id).order_by(desc(models.TimeLog.start_time)).offset(skip).limit(limit).all()

# --- NEW: Project Membership CRUD Operations ---

def add_member_to_project(db: Session, project: models.Project, user: models.User) -> bool:
    """Adds a user to a project's members list if not already present."""
    if user not in project.members:
        project.members.append(user)
        db.commit()
        return True
    return False # Already a member

def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:
    """Removes a user from a project's members list if present."""
    if user in project.members:
        project.members.remove(user)
        db.commit()
        return True
    return False # Was not a member

def get_project_members(db: Session, project_id: int) -> List[models.User]:
    """Gets a list of users who are members of a specific project."""
    project = get_project(db, project_id) # Use existing function to get project
    if not project:
        return [] # Or raise HTTPException? Return empty list for now.
    return project.members # Access the loaded members relationship

def is_user_member_of_project(db: Session, project_id: int, user_id: int) -> bool:
    """Checks if a user is a member of a specific project."""
    project = get_project(db, project_id)
    if not project:
        return False
    # Check if user_id exists in the IDs of the members
    member_ids = {member.id for member in project.members}
    return user_id in member_ids
    # Alternative way (might be less efficient if members aren't loaded):
    # return db.query(models.project_members_table)\
    #          .filter(models.project_members_table.c.project_id == project_id)\
    #          .filter(models.project_members_table.c.user_id == user_id)\
    #          .count() > 0