# backend/app/crud.py
# Uncondensed Version: Added start_date to Task CRUD
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func as sqlfunc
from typing import Optional, List
from datetime import datetime, timezone
from . import models, schemas
from .security import get_password_hash

# --- User CRUD --- (Existing Verified)
def get_user(db: Session, user_id: int) -> Optional[models.User]:#...
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:#...
def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:#...
def create_user(db: Session, user: schemas.UserCreate) -> models.User:#...
def update_user_by_admin(db: Session, user_to_update: models.User, user_data: schemas.UserUpdateAdmin) -> models.User:#...
def create_user_by_admin(db: Session, user_data: schemas.UserCreateAdmin) -> models.User:#...

# --- Project CRUD --- (Existing Verified)
def get_project(db: Session, project_id: int) -> Optional[models.Project]:#...
def get_projects(db: Session, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[models.Project]:#...
def create_project(db: Session, project: schemas.ProjectCreate, creator_id: int) -> models.Project:#...
def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate) -> Optional[models.Project]:#...
def delete_project(db: Session, project_id: int) -> Optional[models.Project]:#...

# --- Project Membership CRUD --- (Existing Verified)
def add_member_to_project(db: Session, project: models.Project, user: models.User) -> bool:#...
def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:#...
def get_project_members(db: Session, project_id: int) -> List[models.User]:#...
def is_user_member_of_project(db: Session, project_id: int, user_id: int) -> bool:#...

# --- Task CRUD & Assignment --- (Updated)
def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    # Eager load relationships
    return db.query(models.Task)\
             .options(
                 joinedload(models.Task.comments).joinedload(models.TaskComment.author),
                 joinedload(models.Task.photos).joinedload(models.TaskPhoto.uploader),
                 joinedload(models.Task.assignee),
                 joinedload(models.Task.project)
             )\
             .filter(models.Task.id == task_id).first()

def get_tasks(db: Session, project_id: Optional[int] = None, assignee_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Task]:
    query = db.query(models.Task)
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    if assignee_id is not None:
        query = query.filter(models.Task.assignee_id == assignee_id)
    return query.order_by(models.Task.id).offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    # Extract data, ensuring start_date is handled (it's already optional in TaskCreate)
    task_data = task.model_dump()
    # Ensure assignee_id is None if explicitly passed as None or empty string from schema
    assignee_id = task_data.pop('assignee_id', None)
    if assignee_id == '':
         assignee_id = None

    db_task = models.Task(**task_data, assignee_id=assignee_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        # Handle unsetting assignee_id
        if key == 'assignee_id' and (value == '' or value is None):
            setattr(db_task, key, None)
        # Handle potential empty string for dates if needed (usually Pydantic handles None)
        elif key in ['start_date', 'due_date'] and value == '':
             setattr(db_task, key, None)
        else:
            setattr(db_task, key, value)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    db.delete(db_task)
    db.commit()
    return db_task

def assign_user_to_task(db: Session, task: models.Task, user: models.User) -> models.Task:
    task.assignee_id = user.id
    db.commit()
    db.refresh(task)
    return task

def unassign_user_from_task(db: Session, task: models.Task) -> models.Task:
    task.assignee_id = None
    db.commit()
    db.refresh(task)
    return task

def get_tasks_assigned_to_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Task]:
    return get_tasks(db=db, assignee_id=user_id, skip=skip, limit=limit)

# --- Task Comment CRUD --- (Existing Verified)
def get_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:#...
def get_comments_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskComment]:#...
def create_task_comment(db: Session, comment: schemas.TaskCommentCreate, task_id: int, author_id: int) -> models.TaskComment:#...
def delete_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:#...

# --- Inventory CRUD --- (Existing Verified)
def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:#...
def get_inventory_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.InventoryItem]:#...
def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:#...
def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]:#...
def update_inventory_item_needed_quantity(db: Session, item_id: int, quantity_needed: float) -> Optional[models.InventoryItem]:#...
def delete_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:#...
def get_shopping_list_items(db: Session) -> List[models.InventoryItem]:#...

# --- Drawing Metadata CRUD --- (Existing Verified)
def get_drawing(db: Session, drawing_id: int) -> Optional[models.Drawing]:#...
def get_drawings_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.Drawing]:#...
def create_drawing_metadata(db: Session, drawing: schemas.DrawingCreate) -> models.Drawing:#...
def delete_drawing_metadata(db: Session, drawing_id: int) -> Optional[models.Drawing]:#...

# --- TimeLog CRUD --- (Existing Verified)
def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]:#...
def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog:#...
def update_timelog_entry(db: Session, timelog_id: int) -> Optional[models.TimeLog]:#...
def get_timelogs_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:#...
def get_timelogs_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:#...

# --- Task Photo Metadata CRUD --- (Existing Verified)
def get_task_photo(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:#...
def get_photos_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskPhoto]:#...
def create_task_photo_metadata(db: Session, photo_data: schemas.TaskPhotoCreate) -> models.TaskPhoto:#...
def delete_task_photo_metadata(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:#...

# --- Copy/Paste Placeholders (Ensure these are removed) ---