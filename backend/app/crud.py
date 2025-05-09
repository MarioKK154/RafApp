# backend/app/crud.py
# ABSOLUTELY FINAL Corrected Version - Strict Multi-Line Formatting GUARANTEED
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func as sqlfunc
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
    return project.members if project else []

def is_user_member_of_project(db: Session, project_id: int, user_id: int) -> bool:
    project = db.query(models.Project).options(joinedload(models.Project.members)).filter(models.Project.id == project_id).first()
    if not project:
        return False
    member_ids = {member.id for member in project.members}
    return user_id in member_ids

# --- Task CRUD & Assignment ---

def get_task(db: Session, task_id: int) -> Optional[models.Task]:
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
    task_data = task.model_dump()
    assignee_id = task_data.pop('assignee_id', None)
    if assignee_id == '':
         assignee_id = None
    # Handle start_date explicitly
    start_date = task_data.pop('start_date', None)
    db_task = models.Task(**task_data, assignee_id=assignee_id, start_date=start_date)
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
        if key == 'assignee_id' and (value == '' or value is None):
            setattr(db_task, key, None)
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

# --- Task Comment CRUD ---

def get_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    return db.query(models.TaskComment).options(joinedload(models.TaskComment.author)).filter(models.TaskComment.id == comment_id).first()

def get_comments_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskComment]:
    return db.query(models.TaskComment)\
             .filter(models.TaskComment.task_id == task_id)\
             .order_by(models.TaskComment.created_at.asc())\
             .options(joinedload(models.TaskComment.author))\
             .offset(skip)\
             .limit(limit)\
             .all()

def create_task_comment(db: Session, comment: schemas.TaskCommentCreate, task_id: int, author_id: int) -> models.TaskComment:
    db_comment = models.TaskComment(
        **comment.model_dump(),
        task_id=task_id,
        author_id=author_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def delete_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    db_comment = get_comment(db, comment_id)
    if db_comment:
        db.delete(db_comment)
        db.commit()
    return db_comment

# --- Inventory CRUD ---

def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
     return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(db: Session, skip: int = 0, limit: int = 100) -> List[models.InventoryItem]:
     return db.query(models.InventoryItem).order_by(models.InventoryItem.name).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
     item_data = item.model_dump()
     item_data['quantity_needed'] = float(item_data.get('quantity_needed') or 0.0)
     item_data['quantity'] = float(item_data.get('quantity') or 0.0)
     db_item = models.InventoryItem(**item_data)
     db.add(db_item)
     db.commit()
     db.refresh(db_item)
     return db_item

def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    update_data = item_update.model_dump(exclude_unset=True)
    if 'quantity' in update_data: update_data['quantity'] = float(update_data.get('quantity') or 0.0)
    if 'quantity_needed' in update_data: update_data['quantity_needed'] = float(update_data.get('quantity_needed') or 0.0)
    if 'low_stock_threshold' in update_data and update_data['low_stock_threshold'] is not None: update_data['low_stock_threshold'] = float(update_data['low_stock_threshold'])
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_inventory_item_needed_quantity(db: Session, item_id: int, quantity_needed: float) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    db_item.quantity_needed = max(0.0, quantity_needed)
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

# --- Shopping List Function ---

def get_shopping_list_items(db: Session) -> List[models.InventoryItem]:
    return db.query(models.InventoryItem)\
             .filter(models.InventoryItem.quantity_needed > models.InventoryItem.quantity)\
             .order_by(models.InventoryItem.name)\
             .all()

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
    # Ensure timezone comparison consistency if needed
    if start_time.tzinfo is None and end_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    elif start_time.tzinfo is not None and end_time.tzinfo is None:
         # This case is less likely if using timezone.utc consistently
         pass # Or handle as needed
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

# --- Task Photo Metadata CRUD ---

def get_task_photo(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:
    return db.query(models.TaskPhoto).options(joinedload(models.TaskPhoto.uploader)).filter(models.TaskPhoto.id == photo_id).first()

def get_photos_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskPhoto]:
    return db.query(models.TaskPhoto).filter(models.TaskPhoto.task_id == task_id).order_by(models.TaskPhoto.uploaded_at.desc()).options(joinedload(models.TaskPhoto.uploader)).offset(skip).limit(limit).all()

def create_task_photo_metadata(db: Session, photo_data: schemas.TaskPhotoCreate) -> models.TaskPhoto:
    db_photo = models.TaskPhoto(**photo_data.model_dump())
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    # db.refresh(db_photo, attribute_names=['uploader']) # Eager load if relationship isn't loading correctly
    return db_photo

def delete_task_photo_metadata(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:
    db_photo = get_task_photo(db, photo_id)
    if db_photo:
        db.delete(db_photo)
        db.commit()
    return db_photo