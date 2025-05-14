# backend/app/crud.py
# STRICTLY UNCONDENSED AND MANUALLY RE-VERIFIED AND RE-CONSTRUCTED
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func as sqlfunc
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas
from .security import get_password_hash, verify_password

# --- User CRUD Operations ---

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User)\
             .options(joinedload(models.User.assigned_projects))\
             .filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User)\
             .options(joinedload(models.User.assigned_projects))\
             .filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User)\
             .options(joinedload(models.User.assigned_projects))\
             .order_by(models.User.id)\
             .offset(skip)\
             .limit(limit)\
             .all()

# create_user (for public registration) was REMOVED.

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
        employee_id=user_data.employee_id,
        kennitala=user_data.kennitala,
        phone_number=user_data.phone_number,
        location=user_data.location,
        role=user_data.role, 
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_superuser=user_data.is_superuser if user_data.is_superuser is not None else False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user_by_admin(db: Session, user_id: int) -> Optional[models.User]:
    db_user = get_user(db, user_id=user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

def update_user_password(db: Session, user: models.User, new_password: str) -> models.User:
    """Hashes and updates the password for the given user object."""
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# --- Project CRUD ---

def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return db.query(models.Project)\
             .options(
                 joinedload(models.Project.members),
                 joinedload(models.Project.project_manager)
              )\
             .filter(models.Project.id == project_id).first()

def get_projects(
    db: Session,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Project]:
    query = db.query(models.Project).options(joinedload(models.Project.project_manager))
    if status:
        query = query.filter(models.Project.status == status)

    order_column = models.Project.name 
    if sort_by == 'name':
        order_column = models.Project.name
    elif sort_by == 'status':
        order_column = models.Project.status
    elif sort_by == 'start_date':
        order_column = models.Project.start_date
    elif sort_by == 'end_date':
        order_column = models.Project.end_date
    elif sort_by == 'created_at':
        order_column = models.Project.created_at

    if sort_dir == 'desc':
        query = query.order_by(desc(order_column).nullslast())
    else:
        query = query.order_by(asc(order_column).nullsfirst())

    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, creator_id: int) -> models.Project:
    project_data = project.model_dump()
    project_manager_id_from_schema = project_data.pop('project_manager_id', None)
    
    project_manager_instance = None
    actual_project_manager_id = None

    if project_manager_id_from_schema is not None:
        project_manager_instance = get_user(db, user_id=project_manager_id_from_schema)
        if project_manager_instance and project_manager_instance.role == 'project manager':
            actual_project_manager_id = project_manager_id_from_schema
        else:
            project_manager_instance = None 

    db_project = models.Project(
        **project_data,
        creator_id=creator_id,
        project_manager_id=actual_project_manager_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    if project_manager_instance and actual_project_manager_id is not None:
        if 'members' not in db_project.__dict__ or \
           (project_manager_instance not in db_project.members and \
            project_manager_instance.id not in [m.id for m in db_project.members]):
            db_project.members.append(project_manager_instance)
            db.commit()
            db.refresh(db_project) 

    db.refresh(db_project, attribute_names=['project_manager', 'members'])
    return db_project

def update_project(
    db: Session, project_id: int, project_update: schemas.ProjectUpdate
) -> Optional[models.Project]:
    db_project = get_project(db, project_id)
    if not db_project:
        return None

    update_data = project_update.model_dump(exclude_unset=True)
    
    new_project_manager_id_field = update_data.pop('project_manager_id', 'UNCHANGED_SENTINEL')
    new_pm_instance_for_membership = None

    if new_project_manager_id_field != 'UNCHANGED_SENTINEL':
        if new_project_manager_id_field is not None:
            potential_new_pm = get_user(db, user_id=new_project_manager_id_field)
            if potential_new_pm and potential_new_pm.role == 'project manager':
                db_project.project_manager_id = new_project_manager_id_field
                new_pm_instance_for_membership = potential_new_pm
            else:
                pass # Invalid PM ID, PM not changed
        else: 
            db_project.project_manager_id = None
            
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    db.add(db_project)
    
    if new_pm_instance_for_membership:
        if 'members' not in db_project.__dict__ or \
           (new_pm_instance_for_membership not in db_project.members and \
            new_pm_instance_for_membership.id not in [m.id for m in db_project.members]):
            db_project.members.append(new_pm_instance_for_membership)
            
    db.commit()
    db.refresh(db_project)
    db.refresh(db_project, attribute_names=['project_manager', 'members'])
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
    if 'members' not in project.__dict__:
         db.refresh(project, attribute_names=['members'])
    if user not in project.members:
        project.members.append(user)
        db.commit()
        return True
    return False

def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:
    if 'members' not in project.__dict__:
         db.refresh(project, attribute_names=['members'])
    if user in project.members:
        project.members.remove(user)
        db.commit()
        return True
    return False

def get_project_members(db: Session, project_id: int) -> List[models.User]:
    project = db.query(models.Project).options(joinedload(models.Project.members).joinedload(models.User.assigned_projects)).filter(models.Project.id == project_id).first()
    return project.members if project else []

def is_user_member_of_project(db: Session, project_id: int, user_id: int) -> bool:
    project = db.query(models.Project).options(joinedload(models.Project.members)).filter(models.Project.id == project_id).first()
    if not project:
        return False
    return user_id in {member.id for member in project.members}

# --- Task CRUD & Assignment ---
def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.query(models.Task).options(joinedload(models.Task.comments).joinedload(models.TaskComment.author), joinedload(models.Task.photos).joinedload(models.TaskPhoto.uploader), joinedload(models.Task.assignee).options(joinedload(models.User.assigned_projects)), joinedload(models.Task.project)).filter(models.Task.id == task_id).first()

def get_tasks(
    db: Session,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Task]:
    query = db.query(models.Task)
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    if assignee_id is not None:
        query = query.filter(models.Task.assignee_id == assignee_id)

    order_column = models.Task.id
    if sort_by == 'title': order_column = models.Task.title
    elif sort_by == 'status': order_column = models.Task.status
    elif sort_by == 'priority': order_column = models.Task.priority
    elif sort_by == 'start_date': order_column = models.Task.start_date
    elif sort_by == 'due_date': order_column = models.Task.due_date
    elif sort_by == 'created_at': order_column = models.Task.created_at

    if sort_dir == 'desc':
        query = query.order_by(desc(order_column).nullslast())
    else:
        query = query.order_by(asc(order_column).nullsfirst())

    return query.offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    task_data = task.model_dump()
    assignee_id = task_data.pop('assignee_id', None)
    if assignee_id == '': assignee_id = None
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
    db_comment = models.TaskComment(**comment.model_dump(), task_id=task_id, author_id=author_id)
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
    if 'quantity' in update_data and update_data['quantity'] is not None:
        update_data['quantity'] = float(update_data['quantity'])
    else:
        update_data.pop('quantity', None)
    if 'quantity_needed' in update_data and update_data['quantity_needed'] is not None:
        update_data['quantity_needed'] = float(update_data['quantity_needed'])
    else:
        update_data.pop('quantity_needed', None)
    if 'low_stock_threshold' in update_data and update_data['low_stock_threshold'] is not None:
        update_data['low_stock_threshold'] = float(update_data['low_stock_threshold'])
    elif 'low_stock_threshold' in update_data and update_data['low_stock_threshold'] is None:
        pass
    else:
        update_data.pop('low_stock_threshold', None)
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
    duration = None
    if start_time:
        if start_time.tzinfo is None and end_time.tzinfo is not None: start_time = start_time.replace(tzinfo=timezone.utc)
        elif start_time.tzinfo is not None and end_time.tzinfo is None: end_time = end_time.replace(tzinfo=start_time.tzinfo)
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
    return db_photo

def delete_task_photo_metadata(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:
    db_photo = get_task_photo(db, photo_id)
    if db_photo:
        db.delete(db_photo)
        db.commit()
    return db_photo