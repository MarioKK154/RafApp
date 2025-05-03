# backend/app/crud.py
# FINAL Corrected Version (Indentation and Syntax)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas
from .security import get_password_hash

# --- User CRUD Operations ---

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role="employee",
        is_active=True,
        is_superuser=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_by_admin(db: Session, user_to_update: models.User, user_data: schemas.UserUpdateAdmin) -> models.User:
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(user_to_update, key):
            setattr(user_to_update, key, value)
    db.add(user_to_update)
    db.commit()
    db.refresh(user_to_update)
    return user_to_update

def create_user_by_admin(db: Session, user_data: schemas.UserCreateAdmin) -> models.User:
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role or "employee",
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_superuser=user_data.is_superuser if user_data.is_superuser is not None else False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Project CRUD ---

def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[models.Project]:
    query = db.query(models.Project)
    if status:
        query = query.filter(models.Project.status == status)
    return query.order_by(models.Project.name).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, creator_id: int) -> models.Project:
    db_project = models.Project(**project.model_dump(), creator_id=creator_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    db.delete(db_project)
    db.commit()
    return db_project

# --- Project Membership CRUD ---

def add_member_to_project(db: Session, project: models.Project, user: models.User) -> bool:
    if user not in project.members:
        project.members.append(user)
        db.commit()
        return True
    return False

def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:
    if user in project.members:
        project.members.remove(user)
        db.commit()
        return True
    return False

def get_project_members(db: Session, project_id: int) -> List[models.User]:
    project = get_project(db, project_id)
    # Use relationship - assumes SQLAlchemy handles loading or configure eager loading if needed
    return project.members if project else []

def is_user_member_of_project(db: Session, project_id: int, user_id: int) -> bool:
    project = get_project(db, project_id)
    if not project:
        return False
    # Check if user_id exists in the IDs of the members
    # This might require members to be loaded first if using lazy loading (default)
    member_ids = {member.id for member in project.members}
    return user_id in member_ids


# --- Task CRUD & Assignment ---

def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.query(models.Task)\
             .options(joinedload(models.Task.comments).joinedload(models.TaskComment.author))\
             .filter(models.Task.id == task_id).first()

def get_tasks(db: Session, project_id: Optional[int] = None, assignee_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Task]:
    query = db.query(models.Task)
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    if assignee_id is not None:
        query = query.filter(models.Task.assignee_id == assignee_id)
    return query.order_by(models.Task.id).offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    assignee_id = task.assignee_id if task.assignee_id else None
    db_task = models.Task(**task.model_dump(exclude={'assignee_id'}), assignee_id=assignee_id)
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
        if key == 'assignee_id' and value == '':
            value = None
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


# --- Inventory CRUD ---

def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
     return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.InventoryItem]:
     return db.query(models.InventoryItem).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
     db_item = models.InventoryItem(**item.model_dump())
     db.add(db_item)
     db.commit()
     db.refresh(db_item)
     return db_item

def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    db.delete(db_item)
    db.commit()
    return db_item


# --- Drawing Metadata CRUD ---

def get_drawing(db: Session, drawing_id: int) -> Optional[models.Drawing]:
     return db.query(models.Drawing).filter(models.Drawing.id == drawing_id).first()

def get_drawings_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.Drawing]:
     return db.query(models.Drawing).filter(models.Drawing.project_id == project_id).offset(skip).limit(limit).all()

def create_drawing_metadata(db: Session, drawing: schemas.DrawingCreate) -> models.Drawing:
     db_drawing = models.Drawing(**drawing.model_dump())
     db.add(db_drawing)
     db.commit()
     db.refresh(db_drawing)
     return db_drawing

def delete_drawing_metadata(db: Session, drawing_id: int) -> Optional[models.Drawing]:
    db_drawing = get_drawing(db, drawing_id)
    if not db_drawing:
        return None
    db.delete(db_drawing)
    db.commit()
    return db_drawing


# --- TimeLog CRUD ---

def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]:
     return db.query(models.TimeLog).filter(models.TimeLog.user_id == user_id, models.TimeLog.end_time == None).order_by(desc(models.TimeLog.start_time)).first()

def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog:
     db_timelog = models.TimeLog(**timelog_data.model_dump(), user_id=user_id, start_time=datetime.now(timezone.utc))
     db.add(db_timelog)
     db.commit()
     db.refresh(db_timelog)
     return db_timelog

def update_timelog_entry(db: Session, timelog_id: int) -> Optional[models.TimeLog]:
    db_timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if not db_timelog or db_timelog.end_time is not None:
        return None
    end_time = datetime.now(timezone.utc)
    start_time = db_timelog.start_time
    # Ensure start_time is timezone-aware if end_time is
    if start_time.tzinfo is None and end_time.tzinfo is not None:
         start_time = start_time.replace(tzinfo=timezone.utc) # Or adjust as needed
    duration = end_time - start_time
    db_timelog.end_time = end_time
    db_timelog.duration = duration
    db.add(db_timelog)
    db.commit()
    db.refresh(db_timelog)
    return db_timelog

def get_timelogs_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:
     return db.query(models.TimeLog).filter(models.TimeLog.user_id == user_id).order_by(desc(models.TimeLog.start_time)).offset(skip).limit(limit).all()

def get_timelogs_for_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.TimeLog]:
     return db.query(models.TimeLog).filter(models.TimeLog.project_id == project_id).order_by(desc(models.TimeLog.start_time)).offset(skip).limit(limit).all()


# --- Task Comment CRUD ---

def get_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    return db.query(models.TaskComment).options(joinedload(models.TaskComment.author)).filter(models.TaskComment.id == comment_id).first()

def get_comments_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskComment]:
    return db.query(models.TaskComment).filter(models.TaskComment.task_id == task_id).order_by(models.TaskComment.created_at.asc()).options(joinedload(models.TaskComment.author)).offset(skip).limit(limit).all()

def create_task_comment(db: Session, comment: schemas.TaskCommentCreate, task_id: int, author_id: int) -> models.TaskComment:
    db_comment = models.TaskComment(**comment.model_dump(), task_id=task_id, author_id=author_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    # Eager load author might be needed if not handled by relationship defaults/schema
    # db.refresh(db_comment, attribute_names=['author'])
    return db_comment

def delete_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    db_comment = get_comment(db, comment_id)
    if db_comment:
        db.delete(db_comment)
        db.commit()
    return db_comment