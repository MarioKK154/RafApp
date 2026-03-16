from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, or_, and_, text
from sqlalchemy.exc import OperationalError
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timezone, timedelta
import json
from . import models, schemas
from .security import get_password_hash

# --- Tenant CRUD Operations ---

def get_tenant(db: Session, tenant_id: int) -> Optional[models.Tenant]:
    return db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()

def get_tenant_by_name(db: Session, name: str) -> Optional[models.Tenant]:
    return db.query(models.Tenant).filter(models.Tenant.name == name).first()

def get_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[models.Tenant]:
    return db.query(models.Tenant).order_by(models.Tenant.name).offset(skip).limit(limit).all()

def create_tenant(db: Session, tenant: schemas.TenantCreate) -> models.Tenant:
    bg_urls = tenant.background_image_urls if tenant.background_image_urls else None
    db_tenant = models.Tenant(
        name=tenant.name,
        logo_url=str(tenant.logo_url) if tenant.logo_url else None,
        background_image_url=str(tenant.background_image_url) if tenant.background_image_url else None,
        background_image_urls=json.dumps(bg_urls) if bg_urls else None
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def update_tenant(db: Session, db_tenant: models.Tenant, tenant_update: schemas.TenantUpdate) -> models.Tenant:
    update_data = tenant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ['logo_url', 'background_image_url'] and value:
            setattr(db_tenant, key, str(value))
        elif key == 'background_image_urls':
            setattr(db_tenant, key, json.dumps(value) if value else None)
        else:
            setattr(db_tenant, key, value)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def delete_tenant(db: Session, tenant_id: int) -> Optional[models.Tenant]:
    db_tenant = get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        return None
    db.delete(db_tenant)
    db.commit()
    return db_tenant


# --- User CRUD Operations ---

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User)\
             .options(
                 joinedload(models.User.assigned_projects),
                 joinedload(models.User.tenant)
             )\
             .filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User)\
             .options(
                 joinedload(models.User.assigned_projects),
                 joinedload(models.User.tenant)
             )\
             .filter(models.User.email == email).first()

def get_users(
    db: Session,
    tenant_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.User]:
    query = db.query(models.User).options(
        joinedload(models.User.assigned_projects),
        joinedload(models.User.tenant)
    )
    if tenant_id is not None:
        query = query.filter(models.User.tenant_id == tenant_id)
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)
    return query.order_by(models.User.id).offset(skip).limit(limit).all()

def update_user_by_admin(db: Session, user_to_update: models.User, user_data: schemas.UserUpdateAdmin) -> models.User:
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "extra_permissions":
            # Store as JSON string in DB
            setattr(user_to_update, "extra_permissions", json.dumps(value) if value is not None else None)
        elif hasattr(user_to_update, key):
            setattr(user_to_update, key, value)
    
    # ROADMAP #3: Fix the "Not Specified" location bug
    # Ensure that if the frontend sends 'city', it also updates the database 'location' field
    if 'city' in update_data:
        user_to_update.location = update_data['city']
    elif 'location' in update_data:
        user_to_update.city = update_data['location']

    db.add(user_to_update)
    db.commit()
    db.refresh(user_to_update)
    return user_to_update

def create_user_by_admin(db: Session, user_data: schemas.UserCreateAdmin) -> models.User:
    hashed_password = get_password_hash(user_data.password)
    
    # ROADMAP #3: Normalize Location/City on creation
    loc = user_data.city or user_data.location

    db_user = models.User(
        email=user_data.email, 
        hashed_password=hashed_password, 
        full_name=user_data.full_name,
        employee_id=user_data.employee_id, 
        kennitala=user_data.kennitala,
        phone_number=user_data.phone_number, 
        city=loc,
        location=loc,
        role=user_data.role, 
        tenant_id=user_data.tenant_id,
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_superuser=user_data.is_superuser if user_data.is_superuser is not None else False,
        hourly_rate=user_data.hourly_rate,
        extra_permissions=json.dumps(user_data.extra_permissions) if user_data.extra_permissions else None,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
    
def update_user_profile_picture_path(db: Session, user_id: int, path: str) -> Optional[models.User]:
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.profile_picture_path = path
        db.commit()
        db_user.refresh(db_user)
    return db_user

def delete_user_by_admin(db: Session, user_id: int) -> Optional[models.User]:
    db_user = get_user(db, user_id=user_id)
    if db_user: 
        db.delete(db_user)
        db.commit()
    return db_user
        
def update_user_password(db: Session, user: models.User, new_password: str) -> models.User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def set_user_password_by_admin(db: Session, user: models.User, new_password: str) -> models.User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_employee_id(db: Session, employee_id: str) -> Optional[models.User]:
    if not employee_id: return None
    return db.query(models.User).filter(models.User.employee_id == employee_id).first()

async def reassign_and_deactivate_other_users(db: Session, main_admin_user_to_keep: models.User) -> schemas.CleanSlateSummary:
    users_to_process = db.query(models.User).filter(models.User.id != main_admin_user_to_keep.id, models.User.tenant_id == main_admin_user_to_keep.tenant_id).all()
    processed_users_count = 0; projects_reassigned_creator_count = 0; projects_cleared_pm_count = 0; tasks_unassigned_count = 0
    if not users_to_process: return schemas.CleanSlateSummary(users_deactivated=0, projects_creator_reassigned=0, projects_pm_cleared=0, tasks_unassigned=0, message="No other users found in this tenant to process.")
    try:
        for user_to_deactivate in users_to_process:
            projects_created = db.query(models.Project).filter(models.Project.creator_id == user_to_deactivate.id, models.Project.tenant_id == main_admin_user_to_keep.tenant_id).all()
            for project in projects_created: project.creator_id = main_admin_user_to_keep.id; db.add(project); projects_reassigned_creator_count += 1
            projects_managed = db.query(models.Project).filter(models.Project.project_manager_id == user_to_deactivate.id, models.Project.tenant_id == main_admin_user_to_keep.tenant_id).all()
            for project in projects_managed: project.project_manager_id = None; db.add(project); projects_cleared_pm_count += 1
            tasks_assigned = db.query(models.Task).join(models.Project).filter(models.Task.assignee_id == user_to_deactivate.id, models.Project.tenant_id == main_admin_user_to_keep.tenant_id).all()
            for task in tasks_assigned: task.assignee_id = None; db.add(task); tasks_unassigned_count += 1
            user_to_deactivate.is_active = False; db.add(user_to_deactivate); processed_users_count += 1
        db.commit()
    except Exception as e: 
        db.rollback()
        print(f"ERROR during reassign_and_deactivate_other_users: {str(e)}")
        raise e
    return schemas.CleanSlateSummary(users_deactivated=processed_users_count, projects_creator_reassigned=projects_reassigned_creator_count, projects_pm_cleared=projects_cleared_pm_count, tasks_unassigned=tasks_unassigned_count, message=f"{processed_users_count} user(s) in tenant processed.")

def bulk_create_users_from_csv(db: Session, users_data: List[schemas.UserImportCSVRow], tenant_id: int, default_password: str, default_role: str, default_is_active: bool = True, default_is_superuser: bool = False, skip_employee_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    created_count = 0; skipped_count = 0; errors = []; created_users_emails = []
    if skip_employee_ids is None: skip_employee_ids = []
    hashed_default_password = get_password_hash(default_password)
    for index, user_row_data in enumerate(users_data):
        row_num = index + 2
        existing_by_email = db.query(models.User).filter(models.User.email == user_row_data.Email, models.User.tenant_id == tenant_id).first()
        if existing_by_email: errors.append(f"Row {row_num}: Email '{user_row_data.Email}' exists in tenant. Skipped."); skipped_count += 1; continue
        if user_row_data.Employee_ID:
            if user_row_data.Employee_ID in skip_employee_ids: errors.append(f"Row {row_num}: Employee ID '{user_row_data.Employee_ID}' in skip list. Skipped."); skipped_count +=1; continue
            existing_by_emp_id = db.query(models.User).filter(models.User.employee_id == user_row_data.Employee_ID, models.User.tenant_id == tenant_id).first()
            if existing_by_emp_id: errors.append(f"Row {row_num}: Employee ID '{user_row_data.Employee_ID}' exists in tenant for '{existing_by_emp_id.email}'. Skipped."); skipped_count += 1; continue
        if user_row_data.Kennitala:
            existing_by_kennitala = db.query(models.User).filter(models.User.kennitala == user_row_data.Kennitala, models.User.tenant_id == tenant_id).first()
            if existing_by_kennitala: errors.append(f"Row {row_num}: Kennitala '{user_row_data.Kennitala}' exists in tenant for '{existing_by_kennitala.email}'. Skipped."); skipped_count +=1; continue
        try:
            # ROADMAP #3 Fix: Map CSV City to both fields
            csv_loc = user_row_data.City or user_row_data.Location
            db_user = models.User(email=user_row_data.Email, hashed_password=hashed_default_password, full_name=user_row_data.Name, employee_id=user_row_data.Employee_ID, kennitala=user_row_data.Kennitala, phone_number=user_row_data.Phone, city=csv_loc, location=csv_loc, role=default_role, tenant_id=tenant_id, is_active=default_is_active, is_superuser=default_is_superuser)
            db.add(db_user); db.commit(); db.refresh(db_user); created_count += 1; created_users_emails.append(db_user.email)
        except Exception as e: 
            db.rollback()
            errors.append(f"Row {row_num}: Error for '{user_row_data.Email}': {str(e)}. Skipped.")
            skipped_count += 1
    return {"created_count": created_count, "skipped_count": skipped_count, "errors": errors, "created_users_emails": created_users_emails }


# --- Project CRUD ---

def get_next_project_number(db: Session, tenant_id: int, parent_id: Optional[int] = None) -> str:
    """ROADMAP #6: Logic for 256 and 256-1 serialization."""
    if parent_id:
        parent = db.query(models.Project).filter(models.Project.id == parent_id).first()
        if not parent: return "ERR"
        child_count = db.query(models.Project).filter(models.Project.parent_id == parent_id).count()
        return f"{parent.project_number or parent.id}-{child_count + 1}"
    
    latest = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id, 
        models.Project.parent_id == None
    ).order_by(desc(models.Project.id)).first()
    
    if not latest or not latest.project_number or not latest.project_number.isdigit():
        return str((latest.id + 100) if latest else 100)
    return str(int(latest.project_number) + 1)

def get_project(db: Session, project_id: int, tenant_id: Optional[int] = None) -> Optional[models.Project]:
    query = db.query(models.Project).options(
        joinedload(models.Project.members),
        joinedload(models.Project.project_manager),
        joinedload(models.Project.tenant),
        joinedload(models.Project.boq).joinedload(models.BoQ.items).joinedload(models.BoQItem.inventory_item),
        joinedload(models.Project.project_inventory).joinedload(models.ProjectInventoryItem.inventory_item)
    ).filter(models.Project.id == project_id)
    
    if tenant_id is not None:
        query = query.filter(models.Project.tenant_id == tenant_id)
        
    return query.first()

def get_projects(
    db: Session,
    tenant_id: Optional[int],
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = 'name',
    sort_dir: str = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Project]:
    query = db.query(models.Project).options(
        joinedload(models.Project.project_manager),
        joinedload(models.Project.tenant)
    )
    if tenant_id is not None:
        query = query.filter(models.Project.tenant_id == tenant_id)
    if status:
        query = query.filter(models.Project.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            models.Project.name.ilike(search_term),
            models.Project.project_number.ilike(search_term)
        ))

    sort_column = getattr(models.Project, sort_by, models.Project.name)
    if sort_dir == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, tenant_id: int, creator_id: int):
    project_data = project.model_dump()
    project_data.pop("tenant_id", None)
    project_data.pop("creator_id", None) 

    # ROADMAP #6: Auto-Serialization
    if not project_data.get("project_number"):
        project_data["project_number"] = get_next_project_number(db, tenant_id, project_data.get("parent_id"))

    db_project = models.Project(
        **project_data,
        tenant_id=tenant_id,
        creator_id=creator_id
    )
    
    db.add(db_project)
    
    try:
        db.flush() 
        new_boq = models.BoQ(
            project_id=db_project.id,
            name=f"BoQ for {db_project.name}"
        )
        db.add(new_boq)
        db.commit()
        db.refresh(db_project)
        return db_project
    except Exception as e:
        db.rollback()
        print(f"Error creating project: {e}")
        raise e

def update_project(
    db: Session, project_id: int, project_update: schemas.ProjectUpdate, tenant_id: Optional[int] = None
) -> Optional[models.Project]:
    db_project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not db_project:
        return None
    
    update_data = project_update.model_dump(exclude_unset=True)
    
    # ROADMAP #1: Commissioning Trigger
    if update_data.get("status") == "Commissioned":
        db_project.commissioned_at = datetime.now(timezone.utc)

    new_pm_id = update_data.pop('project_manager_id', 'UNCHANGED')
    
    if new_pm_id != 'UNCHANGED':
        if new_pm_id is not None:
            potential_new_pm = get_user(db, user_id=new_pm_id)
            if potential_new_pm:
                db_project.project_manager_id = new_pm_id
                if potential_new_pm not in db_project.members:
                    db_project.members.append(potential_new_pm)
        else:
            db_project.project_manager_id = None

    for key, value in update_data.items(): setattr(db_project, key, value)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    db.refresh(db_project, attribute_names=['project_manager', 'members', 'tenant'])
    return db_project

def update_project_status(db: Session, db_project: models.Project, status: str) -> models.Project:
    """ROADMAP #1: Formalized status transitions."""
    db_project.status = status
    if status == "Completed":
        db_project.verified_by_admin = True
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int, tenant_id: Optional[int] = None) -> Optional[models.Project]:
    db_project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not db_project:
        return None
    db.delete(db_project)
    db.commit()
    return db_project


# --- Project Membership CRUD ---

def add_member_to_project(db: Session, project: models.Project, user: models.User) -> bool:
    if project.tenant_id != user.tenant_id and not user.is_superuser:
        return False
    if 'members' not in project.__dict__: db.refresh(project, attribute_names=['members'])
    if user not in project.members: project.members.append(user); db.commit(); return True
    return False

def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:
    if 'members' not in project.__dict__: db.refresh(project, attribute_names=['members'])
    if user in project.members: project.members.remove(user); db.commit(); return True
    return False

def get_project_members(db: Session, project_id: int, tenant_id: Optional[int]) -> List[models.User]:
    project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    return project.members if project else []

def is_user_member_of_project(db: Session, project_id: int, user_id: int, tenant_id: Optional[int]) -> bool:
    project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not project: return False
    return user_id in {member.id for member in project.members}


# --- Task CRUD ---

def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.query(models.Task).options(
        joinedload(models.Task.comments).joinedload(models.TaskComment.author),
        joinedload(models.Task.photos).joinedload(models.TaskPhoto.uploader),
        joinedload(models.Task.assignee).options(joinedload(models.User.assigned_projects)),
        joinedload(models.Task.project).joinedload(models.Project.tenant),
        joinedload(models.Task.predecessors)
    ).filter(models.Task.id == task_id).first()

def get_tasks(
    db: Session,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = 'id',
    sort_dir: str = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Task]:
    query = db.query(models.Task).options(
        joinedload(models.Task.project),
        joinedload(models.Task.assignee)
    )
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    if assignee_id is not None:
        query = query.filter(models.Task.assignee_id == assignee_id)
    if status:
        query = query.filter(models.Task.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(models.Task.title.ilike(search_term))

    sort_column = getattr(models.Task, sort_by, models.Task.id)
    if sort_dir == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    return query.offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate, project_tenant_id: int) -> models.Task:
    assignee_id = task.assignee_id
    if assignee_id:
        assignee = get_user(db, user_id=assignee_id)
        if not assignee or (assignee.tenant_id != project_tenant_id and not assignee.is_superuser):
             print(f"Warning: Assignee {assignee_id} not in project tenant {project_tenant_id}")
    task_data = task.model_dump()
    popped_assignee_id = task_data.pop('assignee_id', None)
    if popped_assignee_id == '': popped_assignee_id = None
    start_date = task_data.pop('start_date', None)
    db_task = models.Task(**task_data, assignee_id=assignee_id, start_date=start_date)
    db.add(db_task); db.commit(); db.refresh(db_task)
    
    # ROADMAP #2: Send Assignment Notification
    if db_task.assignee_id:
        create_notification(db, db_task.assignee_id, f"Node Update: You have been assigned task '{db_task.title}'.", f"/tasks/{db_task.id}")
    
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, project_tenant_id: int) -> Optional[models.Task]:
    db_task = get_task(db, task_id=task_id)
    if not db_task or (db_task.project.tenant_id != project_tenant_id and project_tenant_id is not None): return None
    
    update_data = task_update.model_dump(exclude_unset=True)
    update_data.pop("predecessors", None)
    
    old_assignee = db_task.assignee_id

    if 'assignee_id' in update_data and update_data['assignee_id'] is not None:
        assignee = get_user(db, user_id=update_data['assignee_id'])
        if not assignee or (assignee.tenant_id != project_tenant_id and not assignee.is_superuser):
             update_data.pop('assignee_id')
             
    for key, value in update_data.items():
        if key == 'assignee_id' and (value == '' or value is None): setattr(db_task, key, None)
        elif key in ['start_date', 'due_date'] and value == '': setattr(db_task, key, None)
        else: setattr(db_task, key, value)
        
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # ROADMAP #2: Notification on re-assignment
    if db_task.assignee_id and db_task.assignee_id != old_assignee:
        create_notification(db, db_task.assignee_id, f"Deployment Change: Task '{db_task.title}' assigned to you.", f"/tasks/{db_task.id}")

    return db_task

def commission_task(db: Session, task_to_commission: models.Task) -> models.Task:
    if task_to_commission.status != "Done": return task_to_commission
    task_to_commission.is_commissioned = True; task_to_commission.status = "Commissioned"
    db.add(task_to_commission); db.commit(); db.refresh(task_to_commission)
    return task_to_commission

def delete_task(db: Session, task_id: int) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task: return None
    db.delete(db_task); db.commit(); return db_task

def add_task_dependency(db: Session, task: models.Task, predecessor: models.Task) -> models.Task:
    if task in predecessor.successors: return None
    if predecessor not in task.predecessors:
        task.predecessors.append(predecessor)
        db.commit(); db.refresh(task)
    return task

def remove_task_dependency(db: Session, task: models.Task, predecessor: models.Task) -> models.Task:
    if predecessor in task.predecessors:
        task.predecessors.remove(predecessor)
        db.commit(); db.refresh(task)
    return task


# --- Task Comments & Photos ---

def get_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    return db.query(models.TaskComment)\
             .options(joinedload(models.TaskComment.author), joinedload(models.TaskComment.task).joinedload(models.Task.project).joinedload(models.Project.tenant))\
             .filter(models.TaskComment.id == comment_id).first()

def get_comments_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskComment]:
    return db.query(models.TaskComment).filter(models.TaskComment.task_id == task_id).order_by(models.TaskComment.created_at.asc()).options(joinedload(models.TaskComment.author)).offset(skip).limit(limit).all()

def create_task_comment(db: Session, comment: schemas.TaskCommentCreate, task_id: int, author_id: int) -> models.TaskComment:
    db_comment = models.TaskComment(**comment.model_dump(), task_id=task_id, author_id=author_id)
    db.add(db_comment); db.commit(); db.refresh(db_comment); return db_comment

def delete_comment(db: Session, comment_id: int) -> Optional[models.TaskComment]:
    db_comment = get_comment(db, comment_id=comment_id)
    if db_comment: db.delete(db_comment); db.commit()
    return db_comment

def get_task_photo(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:
    return db.query(models.TaskPhoto).options(joinedload(models.TaskPhoto.uploader)).filter(models.TaskPhoto.id == photo_id).first()

def get_photos_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskPhoto]:
    return db.query(models.TaskPhoto).filter(models.TaskPhoto.task_id == task_id).order_by(models.TaskPhoto.uploaded_at.desc()).options(joinedload(models.TaskPhoto.uploader)).offset(skip).limit(limit).all()

def create_task_photo_metadata(db: Session, photo_data: schemas.TaskPhotoCreate) -> models.TaskPhoto:
    db_photo = models.TaskPhoto(**photo_data.model_dump())
    db.add(db_photo); db.commit(); db.refresh(db_photo); return db_photo

def delete_task_photo_metadata(db: Session, photo_id: int) -> Optional[models.TaskPhoto]:
    db_photo = get_task_photo(db, photo_id)
    if db_photo: db.delete(db_photo); db.commit()
    return db_photo


# --- Inventory & BoQ ---

def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
    return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(
    db: Session, 
    search: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 100
) -> List[models.InventoryItem]:
    query = db.query(models.InventoryItem)
    if search:
        search_term = f"%{search}%"
        query = query.filter(models.InventoryItem.name.ilike(search_term))
    
    return query.order_by(models.InventoryItem.name).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item); db.commit(); db.refresh(db_item); return db_item

def update_inventory_item(db: Session, db_item: models.InventoryItem, item_update: schemas.InventoryItemUpdate) -> models.InventoryItem:
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_item, key, value)
    db.add(db_item); db.commit(); db.refresh(db_item); return db_item

def delete_inventory_item(db: Session, db_item: models.InventoryItem) -> models.InventoryItem:
    db.delete(db_item); db.commit(); return db_item

def get_project_inventory_for_project(db: Session, project_id: int) -> List[models.ProjectInventoryItem]:
    return db.query(models.ProjectInventoryItem).options(joinedload(models.ProjectInventoryItem.inventory_item)).filter(models.ProjectInventoryItem.project_id == project_id).all()

def add_or_update_item_in_project_inventory(db: Session, item_data: schemas.ProjectInventoryItemCreate) -> models.ProjectInventoryItem:
    existing_item = db.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.project_id == item_data.project_id, models.ProjectInventoryItem.inventory_item_id == item_data.inventory_item_id).first()
    if existing_item:
        existing_item.quantity += item_data.quantity
        db_item = existing_item
    else:
        db_item = models.ProjectInventoryItem(**item_data.model_dump())
        db.add(db_item)
    db.commit(); db.refresh(db_item); return db_item

def remove_item_from_project_inventory(db: Session, project_inventory_item_id: int) -> Optional[models.ProjectInventoryItem]:
    db_item = db.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.id == project_inventory_item_id).first()
    if db_item: db.delete(db_item); db.commit()
    return db_item

def get_global_inventory_summary(db: Session) -> List[Dict[str, Any]]:
    summary = db.query(models.InventoryItem, func.sum(models.ProjectInventoryItem.quantity).label('total_quantity')).join(models.ProjectInventoryItem, models.InventoryItem.id == models.ProjectInventoryItem.inventory_item_id).group_by(models.InventoryItem.id).all()
    results = []
    for item, total_quantity in summary: results.append({"inventory_item": item, "total_quantity": total_quantity})
    return results

def get_boq_by_project_id(db: Session, project_id: int) -> Optional[models.BoQ]:
    return db.query(models.BoQ).options(joinedload(models.BoQ.items).joinedload(models.BoQItem.inventory_item)).filter(models.BoQ.project_id == project_id).first()

def get_or_create_boq_for_project(db: Session, project_id: int, project_name: str) -> models.BoQ:
    db_boq = get_boq_by_project_id(db, project_id=project_id)
    if not db_boq:
        db_boq = models.BoQ(project_id=project_id, name=f"BoQ for {project_name}")
        db.add(db_boq); db.commit(); db.refresh(db_boq)
    return db_boq

def get_boq_item(db: Session, boq_item_id: int) -> Optional[models.BoQItem]:
    return db.query(models.BoQItem).filter(models.BoQItem.id == boq_item_id).first()

def add_item_to_boq(db: Session, boq: models.BoQ, item_data: schemas.BoQItemCreate) -> models.BoQ:
    existing_item = db.query(models.BoQItem).filter(models.BoQItem.boq_id == boq.id, models.BoQItem.inventory_item_id == item_data.inventory_item_id).first()
    if existing_item:
        existing_item.quantity_required = item_data.quantity_required
        db.add(existing_item)
    else:
        db_boq_item = models.BoQItem(boq_id=boq.id, inventory_item_id=item_data.inventory_item_id, quantity_required=item_data.quantity_required)
        db.add(db_boq_item)
    db.commit(); db.refresh(boq); return get_boq_by_project_id(db, project_id=boq.project_id)

def update_boq_item(db: Session, db_boq_item: models.BoQItem, item_update: schemas.BoQItemUpdate) -> models.BoQItem:
    db_boq_item.quantity_required = item_update.quantity_required
    db.add(db_boq_item); db.commit(); db.refresh(db_boq_item); return db_boq_item

def remove_item_from_boq(db: Session, db_boq_item: models.BoQItem):
    db.delete(db_boq_item); db.commit()

def get_shopping_list_for_project(db: Session, project_id: int) -> List[Dict[str, Any]]:
    boq = db.query(models.BoQ).options(joinedload(models.BoQ.items).joinedload(models.BoQItem.inventory_item)).filter(models.BoQ.project_id == project_id).first()
    project_inventory = db.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.project_id == project_id).all()
    stock_map = {item.inventory_item_id: item.quantity for item in project_inventory}
    shopping_list = []
    if not boq: return shopping_list
    for boq_item in boq.items:
        quantity_in_stock = stock_map.get(boq_item.inventory_item_id, 0.0)
        quantity_required = boq_item.quantity_required
        shortfall = quantity_required - quantity_in_stock
        if shortfall > 0:
            shopping_list.append({"inventory_item": boq_item.inventory_item, "quantity_required": quantity_required, "quantity_in_stock": quantity_in_stock, "quantity_to_order": shortfall, "unit": boq_item.inventory_item.unit})
    return shopping_list


# --- Risk Assessment CRUD ---

def get_risk_items_for_project(db: Session, project_id: int) -> List[models.RiskItem]:
    return (
        db.query(models.RiskItem)
        .filter(models.RiskItem.project_id == project_id)
        .order_by(models.RiskItem.created_at.asc())
        .all()
    )


def get_risk_item(db: Session, risk_item_id: int) -> Optional[models.RiskItem]:
    return db.query(models.RiskItem).filter(models.RiskItem.id == risk_item_id).first()


def create_risk_item(db: Session, item: schemas.RiskItemCreate) -> models.RiskItem:
    db_item = models.RiskItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_risk_item(db: Session, db_item: models.RiskItem, update: schemas.RiskItemUpdate) -> models.RiskItem:
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_risk_item(db: Session, db_item: models.RiskItem) -> None:
    db.delete(db_item)
    db.commit()


# --- Risk Template CRUD ---

def get_risk_templates(
    db: Session,
    category: Optional[str] = None,
) -> List[models.RiskTemplate]:
    query = db.query(models.RiskTemplate).filter(models.RiskTemplate.is_active == True)
    if category:
        query = query.filter(models.RiskTemplate.category == category)
    return query.order_by(models.RiskTemplate.category.nullsfirst(), models.RiskTemplate.title.asc()).all()


def get_risk_template(db: Session, template_id: int) -> Optional[models.RiskTemplate]:
    return db.query(models.RiskTemplate).filter(models.RiskTemplate.id == template_id).first()


def create_risk_template(db: Session, template: schemas.RiskTemplateCreate) -> models.RiskTemplate:
    db_template = models.RiskTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


def update_risk_template(
    db: Session,
    db_template: models.RiskTemplate,
    update: schemas.RiskTemplateUpdate,
) -> models.RiskTemplate:
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


def delete_risk_template(db: Session, db_template: models.RiskTemplate) -> None:
    db.delete(db_template)
    db.commit()


def create_risk_items_from_templates(
    db: Session,
    project_id: int,
    template_ids: List[int],
) -> List[models.RiskItem]:
    if not template_ids:
        return []
    templates = (
        db.query(models.RiskTemplate)
        .filter(models.RiskTemplate.id.in_(template_ids), models.RiskTemplate.is_active == True)
        .all()
    )
    created_items: List[models.RiskItem] = []
    for tmpl in templates:
        item = models.RiskItem(
            project_id=project_id,
            title=tmpl.title,
            description=tmpl.description,
            likelihood=tmpl.default_likelihood,
            impact=tmpl.default_impact,
            mitigation=tmpl.default_mitigation,
            status=tmpl.default_status,
        )
        db.add(item)
        created_items.append(item)
    db.commit()
    for item in created_items:
        db.refresh(item)
    return created_items


def create_material_request(
    db: Session,
    *,
    project_id: int,
    inventory_item_id: int,
    requested_by_id: int,
    quantity: float,
    note: Optional[str] = None,
) -> models.MaterialRequest:
    db_request = models.MaterialRequest(
        project_id=project_id,
        inventory_item_id=inventory_item_id,
        requested_by_id=requested_by_id,
        quantity=quantity,
        note=note,
        status="Pending",
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def get_material_requests_for_project(
    db: Session,
    project_id: int,
    include_resolved: bool = False,
) -> List[models.MaterialRequest]:
    query = (
        db.query(models.MaterialRequest)
        .options(
            joinedload(models.MaterialRequest.inventory_item),
            joinedload(models.MaterialRequest.requested_by),
        )
        .filter(models.MaterialRequest.project_id == project_id)
    )
    if not include_resolved:
        query = query.filter(models.MaterialRequest.status.in_(["Pending", "Approved"]))
    return query.order_by(models.MaterialRequest.created_at.desc()).all()


# --- Assets (Tools & Cars & Shops) ---

def create_tool(db: Session, tool: schemas.ToolCreate, tenant_id: int) -> models.Tool:
    db_tool = models.Tool(**tool.model_dump(exclude={'tenant_id'}), tenant_id=tenant_id)
    db.add(db_tool); db.commit(); db.refresh(db_tool); return db_tool

def create_tool_log(db: Session, tool_id: int, user_id: int, action: models.ToolLogAction, notes: Optional[str] = None):
    db_log = models.ToolLog(tool_id=tool_id, user_id=user_id, action=action, notes=notes)
    db.add(db_log); db.commit(); db.refresh(db_log); return db_log

def get_tool(db: Session, tool_id: int, tenant_id: Optional[int] = None) -> Optional[models.Tool]:
    query = db.query(models.Tool).options(joinedload(models.Tool.current_user), joinedload(models.Tool.history_logs).joinedload(models.ToolLog.user)).filter(models.Tool.id == tool_id)
    if tenant_id is not None:
        query = query.filter(models.Tool.tenant_id == tenant_id)
    return query.first()

def get_tools(db: Session, tenant_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Tool]:
    query = db.query(models.Tool).options(joinedload(models.Tool.current_user))
    if tenant_id is not None:
        query = query.filter(models.Tool.tenant_id == tenant_id)
    return query.order_by(models.Tool.name).offset(skip).limit(limit).all()

def update_tool(db: Session, db_tool: models.Tool, tool_update: schemas.ToolUpdate) -> models.Tool:
    update_data = tool_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_tool, key, value)
    db.add(db_tool); db.commit(); db.refresh(db_tool); return db_tool

def delete_tool(db: Session, db_tool: models.Tool) -> models.Tool:
    db.delete(db_tool); db.commit(); return db_tool

def update_tool_image_path(db: Session, db_tool: models.Tool, image_path: str) -> models.Tool:
    db_tool.image_path = image_path; db.add(db_tool); db.commit(); db.refresh(db_tool); return db_tool

def checkout_tool(db: Session, db_tool: models.Tool, user_id: int) -> models.Tool:
    db_tool.current_user_id = user_id; db_tool.status = models.ToolStatus.In_Use; create_tool_log(db, tool_id=db_tool.id, user_id=user_id, action=models.ToolLogAction.Checked_Out); db.add(db_tool); db.commit(); db.refresh(db_tool); return db_tool

def checkin_tool(db: Session, db_tool: models.Tool) -> models.Tool:
    user_id = db_tool.current_user_id; db_tool.current_user_id = None; db_tool.status = models.ToolStatus.Available; create_tool_log(db, tool_id=db_tool.id, user_id=user_id, action=models.ToolLogAction.Checked_In); db.add(db_tool); db.commit(); db.refresh(db_tool); return db_tool

def create_car(db: Session, car: schemas.CarCreate, tenant_id: int) -> models.Car:
    db_car = models.Car(**car.model_dump(exclude={'tenant_id'}), tenant_id=tenant_id); db.add(db_car); db.commit(); db.refresh(db_car); return db_car

def get_car(db: Session, car_id: int, tenant_id: Optional[int] = None) -> Optional[models.Car]:
    query = db.query(models.Car).options(joinedload(models.Car.current_user), joinedload(models.Car.history_logs).joinedload(models.CarLog.user), joinedload(models.Car.tyre_sets)).filter(models.Car.id == car_id)
    if tenant_id is not None:
        query = query.filter(models.Car.tenant_id == tenant_id)
    return query.first()

def get_cars(db: Session, tenant_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Car]:
    query = db.query(models.Car).options(joinedload(models.Car.current_user))
    if tenant_id is not None:
        query = query.filter(models.Car.tenant_id == tenant_id)
    return query.order_by(models.Car.make, models.Car.model).offset(skip).limit(limit).all()

def update_car(db: Session, db_car: models.Car, car_update: schemas.CarUpdate) -> models.Car:
    update_data = car_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_car, key, value)
    db.add(db_car); db.commit(); db.refresh(db_car); return db_car

def delete_car(db: Session, db_car: models.Car) -> models.Car:
    db.delete(db_car); db.commit(); return db_car

def update_car_image_path(db: Session, db_car: models.Car, image_path: str) -> models.Car:
    db_car.image_path = image_path; db.add(db_car); db.commit(); db.refresh(db_car); return db_car

def create_car_log(db: Session, car_id: int, user_id: int, action: models.CarLogAction, odometer_reading: Optional[int] = None, notes: Optional[str] = None):
    db_log = models.CarLog(car_id=car_id, user_id=user_id, action=action, odometer_reading=odometer_reading, notes=notes); db.add(db_log); db.commit(); db.refresh(db_log); return db_log

def create_tyre_set(db: Session, tyre_set: schemas.TyreSetCreate, car_id: int) -> models.TyreSet:
    db_tyre_set = models.TyreSet(**tyre_set.model_dump(), car_id=car_id); db.add(db_tyre_set); db.commit(); db.refresh(db_tyre_set); return db_tyre_set

def get_tyre_set(db: Session, tyre_id: int) -> Optional[models.TyreSet]:
    return db.query(models.TyreSet).filter(models.TyreSet.id == tyre_id).first()

def delete_tyre_set(db: Session, db_tyre_set: models.TyreSet) -> models.TyreSet:
    db.delete(db_tyre_set); db.commit(); return db_tyre_set

def checkout_car(db: Session, db_car: models.Car, user_id: int, details: schemas.CarCheckout) -> models.Car:
    db_car.current_user_id = user_id; db_car.status = models.CarStatus.Checked_Out; create_car_log(db, car_id=db_car.id, user_id=user_id, action=models.CarLogAction.Checked_Out, odometer_reading=details.odometer_reading, notes=details.notes); db.add(db_car); db.commit(); db.refresh(db_car); return db_car

def checkin_car(db: Session, db_car: models.Car, user_id: int, details: schemas.CarCheckout) -> models.Car:
    db_car.current_user_id = None; db_car.status = models.CarStatus.Available; create_car_log(db, car_id=db_car.id, user_id=user_id, action=models.CarLogAction.Checked_In, odometer_reading=details.odometer_reading, notes=details.notes); db.add(db_car); db.commit(); db.refresh(db_car); return db_car

def create_shop(db: Session, shop: schemas.ShopCreate, tenant_id: int) -> models.Shop:
    db_shop = models.Shop(**shop.model_dump(exclude={'tenant_id'}), tenant_id=tenant_id); db.add(db_shop); db.commit(); db.refresh(db_shop); return db_shop

def get_shop(db: Session, shop_id: int, tenant_id: Optional[int] = None) -> Optional[models.Shop]:
    query = db.query(models.Shop).filter(models.Shop.id == shop_id)
    if tenant_id is not None:
        query = query.filter(models.Shop.tenant_id == tenant_id)
    return query.first()

def get_shops(db: Session, tenant_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Shop]:
    query = db.query(models.Shop)
    if tenant_id is not None:
        query = query.filter(models.Shop.tenant_id == tenant_id)
    return query.order_by(models.Shop.name).offset(skip).limit(limit).all()

def update_shop(db: Session, db_shop: models.Shop, shop_update: schemas.ShopUpdate) -> models.Shop:
    update_data = shop_update.model_dump(exclude_unset=True); 
    for key, value in update_data.items(): setattr(db_shop, key, value)
    db.add(db_shop); db.commit(); db.refresh(db_shop); return db_shop

def delete_shop(db: Session, db_shop: models.Shop) -> models.Shop:
    db.delete(db_shop); db.commit(); return db_shop


# --- Updated Drawing & Folder CRUD (Roadmap #4) ---

def get_drawing(db: Session, drawing_id: int, tenant_id: int) -> Optional[models.Drawing]:
    """Fetches a specific drawing metadata entry, secured by tenant_id."""
    return db.query(models.Drawing).filter(
        models.Drawing.id == drawing_id, 
        models.Drawing.tenant_id == tenant_id
    ).first()

def get_drawings_for_project(
    db: Session, 
    project_id: int, 
    tenant_id: int,
    discipline: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[models.Drawing]:
    """Fetches drawings for a project with optional discipline (category) filtering."""
    query = db.query(models.Drawing).filter(
        models.Drawing.project_id == project_id,
        models.Drawing.tenant_id == tenant_id
    )
    if discipline:
        query = query.filter(models.Drawing.discipline == discipline)
    
    return query.order_by(models.Drawing.uploaded_at.desc()).offset(skip).limit(limit).all()

def create_drawing_metadata(db: Session, drawing: schemas.DrawingCreate) -> models.Drawing:
    """Saves drawing file metadata to the database."""
    db_drawing = models.Drawing(**drawing.model_dump())
    db.add(db_drawing)
    db.commit()
    db.refresh(db_drawing)
    return db_drawing

def update_drawing_metadata(
    db: Session, 
    db_drawing: models.Drawing, 
    drawing_update: schemas.DrawingUpdate
) -> models.Drawing:
    """Updates metadata fields like revision, status, or description."""
    update_data = drawing_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_drawing, key, value)
    db.add(db_drawing)
    db.commit()
    db.refresh(db_drawing)
    return db_drawing

def delete_drawing_metadata(db: Session, drawing_id: int, tenant_id: int) -> Optional[models.Drawing]:
    """Removes drawing metadata from DB. (Note: File cleanup happens in the router)"""
    db_drawing = get_drawing(db, drawing_id, tenant_id)
    if not db_drawing:
        return None
    db.delete(db_drawing)
    db.commit()
    return db_drawing

# --- Drawing Folders (Hierarchy Logic) ---

def create_drawing_folder(db: Session, folder_data: schemas.DrawingFolderCreate) -> models.DrawingFolder:
    """Creates a new folder or sub-folder for blueprints."""
    db_folder = models.DrawingFolder(**folder_data.model_dump())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def get_drawings_hierarchy(db: Session, project_id: int, tenant_id: int) -> List[models.DrawingFolder]:
    """
    Fetches the top-level folders for a project. 
    Frontend will use the 'sub_folders' relationship to traverse deeper.
    """
    return db.query(models.DrawingFolder).options(
        joinedload(models.DrawingFolder.drawings),
        joinedload(models.DrawingFolder.sub_folders)
    ).filter(
        models.DrawingFolder.project_id == project_id, 
        models.DrawingFolder.tenant_id == tenant_id,
        models.DrawingFolder.parent_id == None
    ).all()

# --- Time Logs ---

def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog:
    db_timelog = models.TimeLog(**timelog_data.model_dump(), user_id=user_id, start_time=datetime.now(timezone.utc))
    db.add(db_timelog); db.commit(); db.refresh(db_timelog); return db_timelog

def update_timelog_entry(db: Session, timelog_id: int, notes: Optional[str] = None) -> Optional[models.TimeLog]:
    db_timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if db_timelog and not db_timelog.end_time:
        now = datetime.now(timezone.utc)
        start_time = db_timelog.start_time
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        db_timelog.end_time = now
        db_timelog.duration = now - start_time
        if notes is not None:
            db_timelog.notes = notes
        db.add(db_timelog) 
        db.commit()
        db.refresh(db_timelog)
    return db_timelog

def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]:
    return db.query(models.TimeLog).filter(models.TimeLog.user_id == user_id, models.TimeLog.end_time == None).first()

def get_timelogs(
    db: Session,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: str = 'start_time',
    sort_dir: str = 'desc',
    skip: int = 0,
    limit: int = 100
) -> List[models.TimeLog]:
    query = db.query(models.TimeLog).options(joinedload(models.TimeLog.user), joinedload(models.TimeLog.project), joinedload(models.TimeLog.task))
    query = query.outerjoin(models.User, models.TimeLog.user_id == models.User.id)
    if user_id is not None: query = query.filter(models.TimeLog.user_id == user_id)
    if project_id is not None: query = query.filter(models.TimeLog.project_id == project_id)
    if tenant_id is not None: query = query.filter(models.User.tenant_id == tenant_id)
    if start_date: query = query.filter(models.TimeLog.start_time >= start_date)
    if end_date: end_date_inclusive = end_date + timedelta(days=1); query = query.filter(models.TimeLog.start_time < end_date_inclusive)
    if search:
        search_term = f"%{search}%"
        query = query.outerjoin(models.Project, models.TimeLog.project_id == models.Project.id)
        query = query.filter((models.TimeLog.notes.ilike(search_term)) | (models.Project.name.ilike(search_term)) | (models.User.full_name.ilike(search_term)))
    sort_column = getattr(models.TimeLog, sort_by, models.TimeLog.start_time)
    if sort_dir == 'desc': query = query.order_by(desc(sort_column))
    else: query = query.order_by(asc(sort_column))
    return query.offset(skip).limit(limit).all()

def get_active_timelogs_by_project(db: Session, project_id: int):
    return db.query(models.TimeLog).filter(
        models.TimeLog.project_id == project_id,
        models.TimeLog.end_time == None
    ).all()

def get_timelog_by_id(db: Session, timelog_id: int, tenant_id: Optional[int] = None) -> Optional[models.TimeLog]:
    q = db.query(models.TimeLog).options(
        joinedload(models.TimeLog.user), joinedload(models.TimeLog.project), joinedload(models.TimeLog.task)
    ).filter(models.TimeLog.id == timelog_id)
    if tenant_id is not None:
        q = q.join(models.User).filter(models.User.tenant_id == tenant_id)
    return q.first()

def update_timelog_by_id(
    db: Session,
    timelog_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    project_id: Optional[int] = None,
    notes: Optional[str] = None,
) -> Optional[models.TimeLog]:
    log = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if not log:
        return None
    if start_time is not None:
        log.start_time = start_time.replace(tzinfo=timezone.utc) if start_time.tzinfo is None else start_time
    if end_time is not None:
        log.end_time = end_time.replace(tzinfo=timezone.utc) if end_time.tzinfo is None else end_time
    if project_id is not None:
        log.project_id = project_id
    if notes is not None:
        log.notes = notes
    if log.end_time and log.start_time:
        st = log.start_time if log.start_time.tzinfo else log.start_time.replace(tzinfo=timezone.utc)
        et = log.end_time if log.end_time.tzinfo else log.end_time.replace(tzinfo=timezone.utc)
        log.duration = et - st
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

    
def get_project_cost_summary(db: Session, project: models.Project) -> Dict[str, Any]:
    time_logs = db.query(models.TimeLog).options(joinedload(models.TimeLog.user)).filter(models.TimeLog.project_id == project.id).all()
    total_hours = 0.0; calculated_cost = 0.0; detailed_logs = []
    for log in time_logs:
        if log.duration and log.user and log.user.hourly_rate is not None:
            duration_hours = log.duration.total_seconds() / 3600.0
            cost = duration_hours * log.user.hourly_rate
            total_hours += duration_hours; calculated_cost += cost
            detailed_logs.append({"user_name": log.user.full_name or log.user.email, "duration_hours": round(duration_hours, 2), "hourly_rate": log.user.hourly_rate, "cost": round(cost, 2)})
    variance = None
    if project.budget is not None: variance = project.budget - calculated_cost
    return {"project_id": project.id, "project_name": project.name, "budget": project.budget, "total_hours": round(total_hours, 2), "calculated_cost": round(calculated_cost, 2), "variance": round(variance, 2) if variance is not None else None, "detailed_logs": detailed_logs}

def get_dashboard_data(db: Session, user: models.User) -> Dict[str, Any]:
    my_open_tasks = db.query(models.Task).filter(models.Task.assignee_id == user.id, models.Task.status.notin_(['Done', 'Commissioned', 'Cancelled'])).order_by(models.Task.due_date.asc().nulls_last()).all()
    my_checked_out_tools = db.query(models.Tool).filter(models.Tool.current_user_id == user.id, models.Tool.status == models.ToolStatus.In_Use).all()
    my_checked_out_car = db.query(models.Car).filter(models.Car.current_user_id == user.id, models.Car.status == models.CarStatus.Checked_Out).first()
    managed_projects = None
    if user.is_superuser or user.role == 'admin':
        tenant_id = None if user.is_superuser else user.tenant_id
        managed_projects = get_projects(db, tenant_id=tenant_id, limit=100)
    elif user.role == 'project manager':
        managed_projects = db.query(models.Project).filter(models.Project.project_manager_id == user.id).all()
    return {"my_open_tasks": my_open_tasks, "my_checked_out_tools": my_checked_out_tools, "my_checked_out_car": my_checked_out_car, "managed_projects": managed_projects}


def get_tenant_heatmap_data(db: Session) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    tenants = db.query(models.Tenant).all()
    items: List[Dict[str, Any]] = []
    for tenant in tenants:
        total_users = db.query(models.User).filter(models.User.tenant_id == tenant.id).count()
        active_projects = db.query(models.Project).filter(models.Project.tenant_id == tenant.id, models.Project.status != "Archived").count()
        logs_query = (
            db.query(models.TimeLog)
            .join(models.User, models.TimeLog.user_id == models.User.id)
            .filter(
                models.User.tenant_id == tenant.id,
                models.TimeLog.start_time >= thirty_days_ago,
                models.TimeLog.end_time != None,
            )
        )
        total_seconds = 0.0
        for log in logs_query.all():
            if log.end_time and log.start_time:
                total_seconds += (log.end_time - log.start_time).total_seconds()
        hours_last_30d = round(total_seconds / 3600.0, 2)
        items.append(
            {
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "active_projects": active_projects,
                "total_users": total_users,
                "hours_last_30d": hours_last_30d,
            }
        )
    return items


def get_platform_growth_metrics(db: Session) -> Dict[str, Any]:
    now = datetime.utcnow()
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    total_tenants = db.query(models.Tenant).count()
    total_users = db.query(models.User).count()
    total_projects = db.query(models.Project).count()

    new_projects_today = (
        db.query(models.Project)
        .filter(models.Project.created_at >= today_start)
        .count()
    )

    logs_all = db.query(models.TimeLog).filter(models.TimeLog.end_time != None).all()
    total_seconds_all = 0.0
    total_seconds_30d = 0.0
    for log in logs_all:
        if not (log.start_time and log.end_time):
            continue
        duration = (log.end_time - log.start_time).total_seconds()
        total_seconds_all += duration
        if log.start_time >= thirty_days_ago:
            total_seconds_30d += duration

    return {
        "total_tenants": total_tenants,
        "total_users": total_users,
        "total_projects": total_projects,
        "new_projects_today": new_projects_today,
        "total_hours_all_time": round(total_seconds_all / 3600.0, 2),
        "total_hours_last_30d": round(total_seconds_30d / 3600.0, 2),
    }


# --- Billing & System Settings ---

def create_billing_invoice(db: Session, invoice: schemas.BillingInvoiceCreate) -> models.BillingInvoice:
    db_invoice = models.BillingInvoice(**invoice.model_dump())
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


def get_overdue_billing_by_tenant(db: Session) -> List[Dict[str, Any]]:
    today = date.today()
    invoices = (
        db.query(models.BillingInvoice, models.Tenant)
        .join(models.Tenant, models.BillingInvoice.tenant_id == models.Tenant.id)
        .filter(
            models.BillingInvoice.status == "Overdue",
            models.BillingInvoice.due_date < today,
        )
        .all()
    )
    summary: Dict[int, Dict[str, Any]] = {}
    for inv, tenant in invoices:
        bucket = summary.setdefault(
            tenant.id,
            {"tenant_id": tenant.id, "tenant_name": tenant.name, "overdue_count": 0, "overdue_total": 0.0},
        )
        bucket["overdue_count"] += 1
        bucket["overdue_total"] += inv.amount
    return list(summary.values())


def get_system_setting(db: Session, key: str) -> Optional[models.SystemSetting]:
    return db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()


def set_system_setting(db: Session, key: str, value: Optional[str]) -> models.SystemSetting:
    setting = get_system_setting(db, key)
    if setting is None:
        setting = models.SystemSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def get_maintenance_status(db: Session) -> Dict[str, Any]:
    mode = get_system_setting(db, "maintenance_mode")
    msg = get_system_setting(db, "maintenance_message")
    maintenance = bool(mode and (mode.value or "").lower() == "on")
    message = msg.value if msg and msg.value else None
    return {"maintenance": maintenance, "message": message}


def get_tenant_discount_percent(db: Session, tenant_id: int) -> Optional[float]:
    key = f"tenant:{tenant_id}:discount_percent"
    setting = get_system_setting(db, key)
    if not setting or not setting.value:
        return None
    try:
        return float(setting.value)
    except ValueError:
        return None


# --- Impersonation audit ---

def create_impersonation_log(db: Session, superuser_id: int, target_user_id: int) -> models.ImpersonationLog:
    log = models.ImpersonationLog(superuser_id=superuser_id, target_user_id=target_user_id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_impersonation_log(db: Session, log_id: int) -> Optional[models.ImpersonationLog]:
    return db.query(models.ImpersonationLog).filter(models.ImpersonationLog.id == log_id).first()


def end_impersonation_log(db: Session, log_id: int, superuser_id: int) -> Optional[models.ImpersonationLog]:
    log = db.query(models.ImpersonationLog).filter(
        models.ImpersonationLog.id == log_id,
        models.ImpersonationLog.superuser_id == superuser_id,
        models.ImpersonationLog.ended_at.is_(None),
    ).first()
    if not log:
        return None
    log.ended_at = datetime.now(timezone.utc)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_impersonation_logs(
    db: Session,
    superuser_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    q = db.query(models.ImpersonationLog).order_by(desc(models.ImpersonationLog.started_at))
    if superuser_id is not None:
        q = q.filter(models.ImpersonationLog.superuser_id == superuser_id)
    if target_user_id is not None:
        q = q.filter(models.ImpersonationLog.target_user_id == target_user_id)
    logs = q.offset(skip).limit(limit).all()
    out = []
    for log in logs:
        superuser = db.query(models.User).filter(models.User.id == log.superuser_id).first()
        target = db.query(models.User).filter(models.User.id == log.target_user_id).first()
        out.append({
            "id": log.id,
            "superuser_id": log.superuser_id,
            "target_user_id": log.target_user_id,
            "started_at": log.started_at,
            "ended_at": log.ended_at,
            "superuser_email": superuser.email if superuser else None,
            "target_user_email": target.email if target else None,
            "target_user_name": target.full_name if target else None,
        })
    return out


# --- Global Audit Logs ---

def create_audit_log(
    db: Session,
    action_type: str,
    actor_user_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    tenant_id: Optional[int] = None,
    target_ref: Optional[str] = None,
    details: Optional[str] = None,
) -> models.AuditLog:
    log = models.AuditLog(
        action_type=action_type,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        tenant_id=tenant_id,
        target_ref=target_ref,
        details=details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_audit_logs(
    db: Session,
    action_type: Optional[str] = None,
    tenant_id: Optional[int] = None,
    actor_user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 300,
) -> List[models.AuditLog]:
    q = db.query(models.AuditLog).order_by(desc(models.AuditLog.created_at))
    if action_type:
        q = q.filter(models.AuditLog.action_type == action_type)
    if tenant_id is not None:
        q = q.filter(models.AuditLog.tenant_id == tenant_id)
    if actor_user_id is not None:
        q = q.filter(models.AuditLog.actor_user_id == actor_user_id)
    return q.offset(skip).limit(limit).all()


# --- Global Banners ---

def create_global_banner(
    db: Session,
    message: str,
    created_by_id: Optional[int] = None,
    starts_at: Optional[datetime] = None,
    ends_at: Optional[datetime] = None,
) -> models.GlobalBanner:
    banner = models.GlobalBanner(
        message=message,
        is_active=True,
        created_by_id=created_by_id,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


def get_active_global_banner(db: Session) -> Optional[models.GlobalBanner]:
    now = datetime.now(timezone.utc)
    q = (
        db.query(models.GlobalBanner)
        .filter(models.GlobalBanner.is_active == True)
        .filter(
            or_(
                models.GlobalBanner.starts_at.is_(None),
                models.GlobalBanner.starts_at <= now,
            )
        )
        .filter(
            or_(
                models.GlobalBanner.ends_at.is_(None),
                models.GlobalBanner.ends_at >= now,
            )
        )
        .order_by(desc(models.GlobalBanner.created_at))
    )
    return q.first()


def set_global_banner_inactive(db: Session, banner_id: int) -> Optional[models.GlobalBanner]:
    banner = db.query(models.GlobalBanner).filter(models.GlobalBanner.id == banner_id).first()
    if not banner:
        return None
    banner.is_active = False
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


# --- User last login (for churn) ---

def update_user_last_login(db: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
    try:
        user.last_login_at = now
        db.add(user)
        db.commit()
    except OperationalError as e:
        msg = str(e.orig) if getattr(e, "orig", None) else str(e)
        if "last_login_at" in msg or "no such column" in msg.lower():
            try:
                db.rollback()
                db.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
                db.commit()
                user.last_login_at = now
                db.add(user)
                db.commit()
            except Exception:
                db.rollback()
        else:
            raise


def get_tenant_health_churn(db: Session) -> List[Dict[str, Any]]:
    """Tenant health for superadmin: last login, hours this week, avg hours previous 4 weeks, churn_risk."""
    from datetime import timedelta
    tenants = db.query(models.Tenant).all()
    now = datetime.now(timezone.utc)
    this_week_start = now - timedelta(days=now.weekday())
    this_week_start = this_week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    four_weeks_ago = this_week_start - timedelta(weeks=4)
    out = []
    for t in tenants:
        users_in_tenant = db.query(models.User).filter(models.User.tenant_id == t.id).all()
        user_ids = [u.id for u in users_in_tenant]
        last_login = None
        for u in users_in_tenant:
            lo = getattr(u, "last_login_at", None)
            if lo and (last_login is None or lo > last_login):
                last_login = lo
        hours_this_week = 0.0
        hours_prev_4_weeks = 0.0
        if user_ids:
            logs_this_week = (
                db.query(models.TimeLog)
                .filter(models.TimeLog.user_id.in_(user_ids))
                .filter(models.TimeLog.start_time >= this_week_start)
                .filter(models.TimeLog.end_time.isnot(None))
                .all()
            )
            for log in logs_this_week:
                if log.end_time:
                    delta = log.end_time - log.start_time
                    hours_this_week += delta.total_seconds() / 3600.0
            logs_prev = (
                db.query(models.TimeLog)
                .filter(models.TimeLog.user_id.in_(user_ids))
                .filter(models.TimeLog.start_time >= four_weeks_ago)
                .filter(models.TimeLog.start_time < this_week_start)
                .filter(models.TimeLog.end_time.isnot(None))
                .all()
            )
            for log in logs_prev:
                if log.end_time:
                    delta = log.end_time - log.start_time
                    hours_prev_4_weeks += delta.total_seconds() / 3600.0
        avg_prev_4 = hours_prev_4_weeks / 4.0 if hours_prev_4_weeks else 0.0
        churn_risk = "none"
        if avg_prev_4 >= 10 and hours_this_week == 0 and user_ids:
            churn_risk = "high"
        elif avg_prev_4 >= 5 and hours_this_week < 1 and user_ids:
            churn_risk = "medium"
        elif last_login:
            # Normalize naive datetimes from SQLite to timezone-aware for comparison
            if last_login.tzinfo is None:
                last_login_norm = last_login.replace(tzinfo=timezone.utc)
            else:
                last_login_norm = last_login
            if (now - last_login_norm).days > 14 and (avg_prev_4 >= 5 or hours_this_week == 0):
                churn_risk = "medium" if churn_risk == "none" else churn_risk
        out.append({
            "tenant_id": t.id,
            "tenant_name": t.name,
            "last_login_at": last_login.isoformat() if last_login else None,
            "hours_this_week": round(hours_this_week, 1),
            "hours_avg_previous_4_weeks": round(avg_prev_4, 1),
            "churn_risk": churn_risk,
        })
    return out


# --- ROADMAP #2: Notification Hub ---

def create_notification(db: Session, user_id: int, message: str, link: Optional[str] = None) -> models.Notification:
    db_note = models.Notification(user_id=user_id, message=message, link=link)
    db.add(db_note); db.commit(); db.refresh(db_note); return db_note

def get_notifications(db: Session, user_id: int, unread_only: bool = True) -> List[models.Notification]:
    query = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if unread_only: query = query.filter(models.Notification.is_read == False)
    return query.order_by(desc(models.Notification.created_at)).limit(50).all()


# --- ROADMAP: Labor Catalog & Private Tenant Pricing ---

def create_labor_catalog_item(
    db: Session,
    item_data: schemas.LaborCatalogItemCreate,
    tenant_id: Optional[int] = None,
) -> models.LaborCatalogItem:
    data = item_data.model_dump()
    default_price = data.pop("default_unit_price", 0.0)
    if default_price is None:
        default_price = 0.0
    data["default_unit_price"] = float(default_price)
    # Global catalog items (e.g. ar.is import) use tenant_id=1 when no tenant specified
    data["tenant_id"] = tenant_id if tenant_id is not None else 1
    db_item = models.LaborCatalogItem(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    if tenant_id is not None and default_price >= 0:
        update_tenant_labor_price(db, tenant_id=tenant_id, labor_item_id=db_item.id, price=float(default_price))
    return db_item

def get_labor_catalog_item(db: Session, item_id: int) -> Optional[models.LaborCatalogItem]:
    return db.query(models.LaborCatalogItem).filter(models.LaborCatalogItem.id == item_id).first()

def get_labor_catalog_categories(db: Session) -> List[Dict[str, Any]]:
    """Returns category tree: list of { main_category, sub_categories: [ { sub_category, count } ] }."""
    try:
        q = db.query(
            models.LaborCatalogItem.main_category,
            models.LaborCatalogItem.sub_category,
            func.count(models.LaborCatalogItem.id).label("count"),
        ).group_by(models.LaborCatalogItem.main_category, models.LaborCatalogItem.sub_category)
        rows = q.all()
    except OperationalError:
        return []
    tree: Dict[str, Dict[str, int]] = {}
    for main, sub, count in rows:
        main_key = main or ""
        sub_key = sub or ""
        if main_key not in tree:
            tree[main_key] = {}
        tree[main_key][sub_key] = count
    result = []
    for main in sorted(tree.keys(), key=lambda x: (x == "", x)):
        result.append({
            "main_category": main or None,
            "sub_categories": [{"sub_category": sub or None, "count": c} for sub, c in sorted(tree[main].items(), key=lambda x: (x[0] == "", x[0]))],
        })
    return result


def get_labor_catalog_items(
    db: Session,
    tenant_id: Optional[int],
    skip: int = 0,
    limit: int = 100,
    main_category: Optional[str] = None,
    sub_category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    # Fetches global catalog items and injects the requesting tenant's private price (None for superuser)
    # Apply filter() before offset/limit (SQLAlchemy requirement)
    limit = min(limit, 5000)
    try:
        q = db.query(models.LaborCatalogItem)
        if main_category is not None:
            if main_category == "":
                q = q.filter(models.LaborCatalogItem.main_category.is_(None))
            else:
                q = q.filter(models.LaborCatalogItem.main_category == main_category)
        if sub_category is not None:
            if sub_category == "":
                q = q.filter(models.LaborCatalogItem.sub_category.is_(None))
            else:
                q = q.filter(models.LaborCatalogItem.sub_category == sub_category)
        q = q.order_by(models.LaborCatalogItem.description).offset(skip).limit(limit)
        items = q.all()
    except OperationalError as e:
        msg = str(e.orig) if getattr(e, "orig", None) else str(e)
        if "no such column: labor_catalog_items.category" in msg:
            db.execute(text("ALTER TABLE labor_catalog_items ADD COLUMN category TEXT"))
            db.execute(text("ALTER TABLE labor_catalog_items ADD COLUMN recommended_item_ids TEXT"))
            db.commit()
            q = db.query(models.LaborCatalogItem)
            if main_category is not None:
                q = q.filter(models.LaborCatalogItem.main_category.is_(None)) if main_category == "" else q.filter(models.LaborCatalogItem.main_category == main_category)
            if sub_category is not None:
                q = q.filter(models.LaborCatalogItem.sub_category.is_(None)) if sub_category == "" else q.filter(models.LaborCatalogItem.sub_category == sub_category)
            q = q.order_by(models.LaborCatalogItem.description).offset(skip).limit(limit)
            items = q.all()
        else:
            raise
    tenant_prices = {}
    if tenant_id is not None:
        tenant_prices = {tp.labor_item_id: tp.price for tp in db.query(models.TenantLaborPrice).filter(models.TenantLaborPrice.tenant_id == tenant_id).all()}

    # First variant's units_per_hour per item (for display when item.units_per_hour is None)
    variant_uph = {}
    for item in items:
        if item.units_per_hour is not None:
            continue
        first = db.query(models.LaborCatalogItemCondition).filter(
            models.LaborCatalogItemCondition.labor_catalog_item_id == item.id
        ).order_by(models.LaborCatalogItemCondition.code).first()
        if first is not None:
            variant_uph[item.id] = first.units_per_hour

    results = []
    for item in items:
        res = item.__dict__.copy()
        res["tenant_price"] = tenant_prices.get(item.id)
        if res.get("units_per_hour") is None and item.id in variant_uph:
            res["units_per_hour"] = variant_uph[item.id]
        results.append(res)
    return results

def update_tenant_labor_price(db: Session, tenant_id: int, labor_item_id: int, price: float):
    existing = db.query(models.TenantLaborPrice).filter(
        models.TenantLaborPrice.tenant_id == tenant_id,
        models.TenantLaborPrice.labor_item_id == labor_item_id
    ).first()
    if existing:
        existing.price = price
    else:
        new_price = models.TenantLaborPrice(tenant_id=tenant_id, labor_item_id=labor_item_id, price=price)
        db.add(new_price)
    db.commit()


def get_non_hourly_labor_item_ids(db: Session) -> List[int]:
    """Item ids that are not purely hourly-rate: unit != 'hour' (or null) or units_per_hour set and not 0."""
    q = db.query(models.LaborCatalogItem.id).filter(
        or_(
            models.LaborCatalogItem.unit.is_(None),
            models.LaborCatalogItem.unit != "hour",
            and_(
                models.LaborCatalogItem.units_per_hour.isnot(None),
                models.LaborCatalogItem.units_per_hour != 0,
            ),
        )
    )
    return [r[0] for r in q.all()]


def apply_tenant_base_price_to_non_hourly(db: Session, tenant_id: int, price: float) -> Dict[str, int]:
    """Set TenantLaborPrice to `price` for all non-hourly catalog items for this tenant. Returns count updated."""
    item_ids = get_non_hourly_labor_item_ids(db)
    updated = 0
    for labor_item_id in item_ids:
        existing = db.query(models.TenantLaborPrice).filter(
            models.TenantLaborPrice.tenant_id == tenant_id,
            models.TenantLaborPrice.labor_item_id == labor_item_id,
        ).first()
        if existing:
            existing.price = price
        else:
            db.add(models.TenantLaborPrice(tenant_id=tenant_id, labor_item_id=labor_item_id, price=price))
        updated += 1
    db.commit()
    return {"updated": updated}

def update_labor_catalog_item(
    db: Session,
    db_item: models.LaborCatalogItem,
    item_update: schemas.LaborCatalogItemUpdate,
    tenant_id: Optional[int] = None,
) -> models.LaborCatalogItem:
    data = item_update.model_dump(exclude_unset=True, exclude={"default_unit_price"})
    for k, v in data.items():
        setattr(db_item, k, v)
    default_price = item_update.default_unit_price
    if default_price is not None and default_price >= 0:
        if tenant_id is not None:
            update_tenant_labor_price(db, tenant_id=tenant_id, labor_item_id=db_item.id, price=float(default_price))
        else:
            db_item.default_unit_price = float(default_price)
            db_item.reference_price = float(default_price)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_labor_catalog_item(db: Session, db_item: models.LaborCatalogItem):
    db.delete(db_item); db.commit()


def get_labor_catalog_item_conditions(db: Session, labor_catalog_item_id: int) -> List[models.LaborCatalogItemCondition]:
    """List all condition variants (ar.is drill-down Eining values) for one catalog item."""
    return db.query(models.LaborCatalogItemCondition).filter(
        models.LaborCatalogItemCondition.labor_catalog_item_id == labor_catalog_item_id
    ).order_by(models.LaborCatalogItemCondition.code).all()


def upsert_labor_catalog_item_condition(
    db: Session,
    labor_catalog_item_id: int,
    code: str,
    condition_description: str,
    units_per_hour: Optional[float] = None,
    effective_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> models.LaborCatalogItemCondition:
    """Create or update one condition variant by (labor_catalog_item_id, code)."""
    existing = db.query(models.LaborCatalogItemCondition).filter(
        models.LaborCatalogItemCondition.labor_catalog_item_id == labor_catalog_item_id,
        models.LaborCatalogItemCondition.code == code,
    ).first()
    if existing:
        existing.condition_description = condition_description
        existing.units_per_hour = units_per_hour
        existing.effective_date = effective_date
        existing.end_date = end_date
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    new_row = models.LaborCatalogItemCondition(
        labor_catalog_item_id=labor_catalog_item_id,
        code=code,
        condition_description=condition_description,
        units_per_hour=units_per_hour,
        effective_date=effective_date,
        end_date=end_date,
    )
    db.add(new_row)
    db.commit()
    db.refresh(new_row)
    return new_row


def import_labor_catalog_item_conditions(
    db: Session,
    labor_catalog_item_id: int,
    rows: List[Dict[str, Any]],
) -> Dict[str, int]:
    """Import condition variants from ar.is detail export. Each row: code, condition_description, units_per_hour, effective_date, end_date."""
    created, updated = 0, 0
    for row in rows:
        code = str(row.get("code") or "").strip()
        if not code:
            continue
        cond_desc = str(row.get("condition_description") or "").strip() or code
        uph = row.get("units_per_hour")
        if uph is not None and not isinstance(uph, (int, float)):
            try:
                uph = float(uph)
            except (ValueError, TypeError):
                uph = None
        eff = str(row.get("effective_date") or "").strip() or None
        end = str(row.get("end_date") or "").strip() or None
        existing = db.query(models.LaborCatalogItemCondition).filter(
            models.LaborCatalogItemCondition.labor_catalog_item_id == labor_catalog_item_id,
            models.LaborCatalogItemCondition.code == code,
        ).first()
        if existing:
            existing.condition_description = cond_desc
            existing.units_per_hour = uph
            existing.effective_date = eff
            existing.end_date = end
            db.add(existing)
            updated += 1
        else:
            db.add(models.LaborCatalogItemCondition(
                labor_catalog_item_id=labor_catalog_item_id,
                code=code,
                condition_description=cond_desc,
                units_per_hour=uph,
                effective_date=eff,
                end_date=end,
            ))
            created += 1
    db.commit()
    return {"created": created, "updated": updated}


def get_labor_catalog_item_by_ar_is(
    db: Session,
    description: str,
    main_category: Optional[str] = None,
    sub_category: Optional[str] = None,
    conditions: Optional[str] = None,
) -> Optional[models.LaborCatalogItem]:
    """Find catalog item matching ar.is key (description + main/sub category + conditions)."""
    q = db.query(models.LaborCatalogItem).filter(models.LaborCatalogItem.description == description)
    if main_category is not None:
        q = q.filter(models.LaborCatalogItem.main_category == main_category)
    else:
        q = q.filter(models.LaborCatalogItem.main_category.is_(None))
    if sub_category is not None:
        q = q.filter(models.LaborCatalogItem.sub_category == sub_category)
    else:
        q = q.filter(models.LaborCatalogItem.sub_category.is_(None))
    if conditions is not None:
        q = q.filter(models.LaborCatalogItem.conditions == conditions)
    else:
        q = q.filter(models.LaborCatalogItem.conditions.is_(None))
    return q.first()


def _norm_cat(s: Optional[str]) -> Optional[str]:
    """Normalize category for grouping: '' -> None."""
    return (s or "").strip() or None


def get_labor_catalog_item_by_description_and_category(
    db: Session,
    description: str,
    main_category: Optional[str] = None,
    sub_category: Optional[str] = None,
) -> Optional[models.LaborCatalogItem]:
    """Find one catalog item by (description, main_category, sub_category). Ignores conditions."""
    main_cat = _norm_cat(main_category)
    sub_cat = _norm_cat(sub_category)
    q = db.query(models.LaborCatalogItem).filter(models.LaborCatalogItem.description == description)
    if main_cat is not None:
        q = q.filter(models.LaborCatalogItem.main_category == main_cat)
    else:
        q = q.filter(models.LaborCatalogItem.main_category.is_(None))
    if sub_cat is not None:
        q = q.filter(models.LaborCatalogItem.sub_category == sub_cat)
    else:
        q = q.filter(models.LaborCatalogItem.sub_category.is_(None))
    return q.first()


def consolidate_labor_catalog(db: Session) -> Dict[str, int]:
    """
    Merge duplicate catalog items: one row per (description, main_category, sub_category).
    Moves each row's (conditions, units_per_hour) into LaborCatalogItemCondition under the kept item.
    Keeps the lowest id per group; reassigns tenant price to that item; deletes duplicates.
    Returns {"merged_groups": N, "deleted_items": M, "variants_created": K}.
    """
    all_items = db.query(models.LaborCatalogItem).order_by(models.LaborCatalogItem.id).all()
    key_to_items: Dict[tuple, List[models.LaborCatalogItem]] = {}
    for item in all_items:
        key = (item.description or "", _norm_cat(item.main_category), _norm_cat(item.sub_category))
        key_to_items.setdefault(key, []).append(item)

    merged_groups = 0
    deleted_items = 0
    variants_created = 0

    for key, group in key_to_items.items():
        if len(group) <= 1:
            continue
        group.sort(key=lambda x: x.id)
        canonical = group[0]
        duplicates = group[1:]

        # Ensure canonical has at least one condition variant from its own data
        if (canonical.conditions or canonical.units_per_hour is not None) and not db.query(
            models.LaborCatalogItemCondition
        ).filter(models.LaborCatalogItemCondition.labor_catalog_item_id == canonical.id).first():
            code = "01"
            db.add(models.LaborCatalogItemCondition(
                labor_catalog_item_id=canonical.id,
                code=code,
                condition_description=canonical.conditions or "Default",
                units_per_hour=canonical.units_per_hour,
            ))
            variants_created += 1

        existing_codes = {c.code for c in db.query(models.LaborCatalogItemCondition).filter(
            models.LaborCatalogItemCondition.labor_catalog_item_id == canonical.id
        ).all()}
        next_code = 1
        while str(next_code).zfill(2) in existing_codes:
            next_code += 1

        for dup in duplicates:
            code = str(next_code).zfill(2)
            next_code += 1
            db.add(models.LaborCatalogItemCondition(
                labor_catalog_item_id=canonical.id,
                code=code,
                condition_description=dup.conditions or "Variant",
                units_per_hour=dup.units_per_hour,
            ))
            variants_created += 1
            # Remove tenant prices for duplicate so we don't have two for same tenant
            db.query(models.TenantLaborPrice).filter(
                models.TenantLaborPrice.labor_item_id == dup.id
            ).delete(synchronize_session=False)
            db.delete(dup)
            deleted_items += 1

        canonical.conditions = None
        canonical.units_per_hour = None
        db.add(canonical)
        merged_groups += 1

    if merged_groups or deleted_items or variants_created:
        db.commit()
    return {"merged_groups": merged_groups, "deleted_items": deleted_items, "variants_created": variants_created}


def import_labor_catalog_from_ar_is_csv(
    db: Session,
    csv_content: str,
    tenant_id: Optional[int] = None,
    *,
    skip_duplicates: bool = True,
    global_only: bool = False,
) -> Dict[str, Any]:
    """
    Import ar.is labor export. One catalog item per (Item, Main_category, Sub_category).
    Each row's (Conditions, Unit_cost) becomes a condition variant for that item.
    CSV columns: Main_category, Sub_category, Item, Conditions, Effective_date, Unit_cost.
    """
    import csv as csv_module
    from io import StringIO
    result = {"created": 0, "skipped": 0, "updated": 0, "variants_added": 0, "errors": [], "error_count": 0}
    set_tenant_price = not global_only and tenant_id is not None
    reader = csv_module.DictReader(StringIO(csv_content))
    if not reader.fieldnames:
        result["errors"].append("Empty or invalid CSV")
        return result
    for row in reader:
        try:
            main_cat = _norm_cat(row.get("Main_category"))
            sub_cat = _norm_cat(row.get("Sub_category"))
            item_desc = (row.get("Item") or "").strip()
            conditions = (row.get("Conditions") or "").strip() or None
            unit_cost_raw = row.get("Unit_cost", "0")
            try:
                unit_cost = float(unit_cost_raw) if unit_cost_raw else 0.0
            except (ValueError, TypeError):
                unit_cost = 0.0
            if not item_desc:
                continue
            units_per_hour_val = unit_cost if unit_cost >= 0 else None
            unit = "hour" if unit_cost == 0 else "unit"

            item = get_labor_catalog_item_by_description_and_category(
                db, description=item_desc, main_category=main_cat, sub_category=sub_cat
            )
            if item is None:
                create_data = schemas.LaborCatalogItemCreate(
                    description=item_desc,
                    category=f"{main_cat or ''} | {sub_cat or ''}".strip(" |") or None,
                    unit=unit,
                    main_category=main_cat,
                    sub_category=sub_cat,
                    conditions=None,
                    reference_price=unit_cost if unit_cost > 0 else None,
                    units_per_hour=None,
                    default_unit_price=unit_cost,
                )
                item = create_labor_catalog_item(db, item_data=create_data, tenant_id=tenant_id if set_tenant_price else None)
                result["created"] += 1
                if set_tenant_price:
                    update_tenant_labor_price(db, tenant_id=tenant_id, labor_item_id=item.id, price=unit_cost)
            else:
                if set_tenant_price:
                    update_tenant_labor_price(db, tenant_id=tenant_id, labor_item_id=item.id, price=unit_cost)

            # Add or update condition variant for this row (Conditions + Eining)
            cond_desc = conditions or "Default"
            existing_var = db.query(models.LaborCatalogItemCondition).filter(
                models.LaborCatalogItemCondition.labor_catalog_item_id == item.id,
                models.LaborCatalogItemCondition.condition_description == cond_desc,
            ).first()
            if existing_var:
                existing_var.units_per_hour = units_per_hour_val
                db.add(existing_var)
            else:
                existing_codes = [c.code for c in db.query(models.LaborCatalogItemCondition).filter(
                    models.LaborCatalogItemCondition.labor_catalog_item_id == item.id
                ).all()]
                next_code = 1
                while str(next_code).zfill(2) in existing_codes:
                    next_code += 1
                db.add(models.LaborCatalogItemCondition(
                    labor_catalog_item_id=item.id,
                    code=str(next_code).zfill(2),
                    condition_description=cond_desc,
                    units_per_hour=units_per_hour_val,
                ))
                result["variants_added"] += 1
        except Exception as e:
            db.rollback()
            err_msg = f"Row {row}: {str(e)}"
            result["error_count"] += 1
            if len(result["errors"]) < 30:
                result["errors"].append(err_msg)
    result["error_sample"] = result["errors"][:5]
    if result["created"] or result["updated"] or result["variants_added"]:
        db.commit()
    return result


# --- Work load ratios (ar.is location/condition multipliers) ---

def get_work_load_ratios(db: Session, active_only: bool = True) -> List[models.WorkLoadRatio]:
    q = db.query(models.WorkLoadRatio).order_by(models.WorkLoadRatio.code)
    if active_only:
        q = q.filter(models.WorkLoadRatio.is_active == True)
    return q.all()


def upsert_work_load_ratio(db: Session, code: str, description: str, ratio: float, ratio_type: Optional[int] = None, is_active: bool = True) -> models.WorkLoadRatio:
    existing = db.query(models.WorkLoadRatio).filter(models.WorkLoadRatio.code == code).first()
    if existing:
        existing.description = description
        existing.ratio = ratio
        existing.ratio_type = ratio_type
        existing.is_active = is_active
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    row = models.WorkLoadRatio(code=code, description=description, ratio=ratio, ratio_type=ratio_type, is_active=is_active)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def import_work_load_ratios(db: Session, rows: List[Dict[str, Any]]) -> Dict[str, int]:
    """Rows: list of dicts with keys code, description, ratio, ratio_type, is_active."""
    created, updated = 0, 0
    for r in rows:
        code = (r.get("code") or "").strip()
        if not code:
            continue
        desc = (r.get("description") or "").strip()
        try:
            ratio = float(r.get("ratio") or 0)
        except (ValueError, TypeError):
            ratio = 0.0
        rt = r.get("ratio_type")
        if rt is not None and not isinstance(rt, int):
            try:
                rt = int(rt)
            except (ValueError, TypeError):
                rt = None
        active = r.get("is_active", True)
        if isinstance(active, str):
            active = active.lower() in ("true", "1", "yes", "já", "j")
        existing = db.query(models.WorkLoadRatio).filter(models.WorkLoadRatio.code == code).first()
        if existing:
            existing.description = desc
            existing.ratio = ratio
            existing.ratio_type = rt
            existing.is_active = active
            db.add(existing)
            updated += 1
        else:
            db.add(models.WorkLoadRatio(code=code, description=desc or code, ratio=ratio, ratio_type=rt, is_active=active))
            created += 1
    db.commit()
    return {"created": created, "updated": updated}


# --- Labor main category reference (provisional basis) ---

def get_labor_main_category_refs(db: Session) -> List[models.LaborMainCategoryRef]:
    return db.query(models.LaborMainCategoryRef).order_by(models.LaborMainCategoryRef.code).all()


def upsert_labor_main_category_ref(db: Session, code: str, name: str) -> models.LaborMainCategoryRef:
    existing = db.query(models.LaborMainCategoryRef).filter(models.LaborMainCategoryRef.code == code).first()
    if existing:
        existing.name = name
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    row = models.LaborMainCategoryRef(code=code, name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def import_labor_main_category_refs(db: Session, rows: List[Dict[str, Any]]) -> Dict[str, int]:
    """Rows: list of dicts with keys code, name."""
    created, updated = 0, 0
    for r in rows:
        code = (r.get("code") or "").strip()
        if not code:
            continue
        name = (r.get("name") or "").strip() or code
        existing = db.query(models.LaborMainCategoryRef).filter(models.LaborMainCategoryRef.code == code).first()
        if existing:
            existing.name = name
            db.add(existing)
            updated += 1
        else:
            db.add(models.LaborMainCategoryRef(code=code, name=name))
            created += 1
    db.commit()
    return {"created": created, "updated": updated}


# --- Offers, Licenses & Events ---

def get_next_offer_number(db: Session, tenant_id: int) -> str:
    current_year = datetime.now().year; prefix = f"OFFER-{current_year}-"
    last_offer = db.query(models.Offer).filter(models.Offer.tenant_id == tenant_id, models.Offer.offer_number.like(f"{prefix}%")).order_by(models.Offer.offer_number.desc()).first()
    next_num = 1
    if last_offer and last_offer.offer_number.startswith(prefix):
        try: last_num_str = last_offer.offer_number.split('-')[-1]; next_num = int(last_num_str) + 1
        except (IndexError, ValueError): pass
    return f"{prefix}{next_num:03d}"

def calculate_offer_total(db: Session, offer_id: int) -> float:
    total = db.query(func.sum(models.OfferLineItem.total_price)).filter(models.OfferLineItem.offer_id == offer_id).scalar()
    return total or 0.0

def create_offer(db: Session, offer_data: schemas.OfferCreate, user: models.User) -> models.Offer:
    offer_number = get_next_offer_number(db, tenant_id=user.tenant_id)
    db_offer = models.Offer(**offer_data.model_dump(exclude={"project_id"}), offer_number=offer_number, project_id=offer_data.project_id, tenant_id=user.tenant_id, created_by_user_id=user.id, total_amount=0.0)
    db.add(db_offer); db.commit(); db.refresh(db_offer); return db_offer

def get_offer(db: Session, offer_id: int, tenant_id: Optional[int]) -> Optional[models.Offer]:
    query = db.query(models.Offer).options(joinedload(models.Offer.line_items).joinedload(models.OfferLineItem.inventory_item), joinedload(models.Offer.creator)).filter(models.Offer.id == offer_id)
    if tenant_id is not None: query = query.filter(models.Offer.tenant_id == tenant_id)
    return query.first()

def get_offers_for_project(db: Session, project_id: int) -> List[models.Offer]:
    return db.query(models.Offer).filter(models.Offer.project_id == project_id).order_by(models.Offer.issue_date.desc()).all()

def update_offer(db: Session, db_offer: models.Offer, offer_update: schemas.OfferUpdate) -> models.Offer:
    update_data = offer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_offer, key, value)
    db.add(db_offer); db.commit(); db.refresh(db_offer); return db_offer

def delete_offer(db: Session, db_offer: models.Offer):
    db.delete(db_offer); db.commit()

def add_line_item_to_offer(db: Session, offer: models.Offer, item_data: schemas.OfferLineItemCreate) -> models.OfferLineItem:
    total_price = item_data.quantity * item_data.unit_price
    db_item = models.OfferLineItem(**item_data.model_dump(), offer_id=offer.id, total_price=total_price)
    db.add(db_item); db.flush()
    offer.total_amount = calculate_offer_total(db, offer_id=offer.id); db.add(offer); db.commit(); db.refresh(db_item); return db_item

def get_offer_line_item(db: Session, line_item_id: int) -> Optional[models.OfferLineItem]:
    return db.query(models.OfferLineItem).filter(models.OfferLineItem.id == line_item_id).first()

def update_offer_line_item(db: Session, db_item: models.OfferLineItem, item_update: schemas.OfferLineItemUpdate) -> models.OfferLineItem:
    update_data = item_update.model_dump(exclude_unset=True); needs_recalculation = False
    for key, value in update_data.items():
        setattr(db_item, key, value)
        if key in ['quantity', 'unit_price']: needs_recalculation = True
    if needs_recalculation: db_item.total_price = db_item.quantity * db_item.unit_price
    db.add(db_item); db.flush()
    offer = db_item.offer; offer.total_amount = calculate_offer_total(db, offer_id=offer.id); db.add(offer); db.commit(); db.refresh(db_item); return db_item

def remove_line_item_from_offer(db: Session, db_item: models.OfferLineItem):
    offer = db_item.offer; db.delete(db_item); db.flush(); offer.total_amount = calculate_offer_total(db, offer_id=offer.id); db.add(offer); db.commit()

def create_user_license(db: Session, license_data: schemas.UserLicenseCreate, user_id: int, file_path: str, filename: str) -> models.UserLicense:
    db_license = models.UserLicense(**license_data.model_dump(), user_id=user_id, file_path=file_path, filename=filename)
    db.add(db_license); db.commit(); db.refresh(db_license); return db_license

def get_licenses_for_user(db: Session, user_id: int) -> List[models.UserLicense]:
    return db.query(models.UserLicense).filter(models.UserLicense.user_id == user_id).order_by(models.UserLicense.issue_date.desc()).all()

def get_user_license(db: Session, license_id: int) -> Optional[models.UserLicense]:
    return db.query(models.UserLicense).filter(models.UserLicense.id == license_id).first()

def delete_user_license(db: Session, db_license: models.UserLicense):
    db.delete(db_license); db.commit()

def create_event(db: Session, event_data: schemas.EventCreate, user: models.User) -> models.Event:
    attendee_ids = event_data.attendee_ids if event_data.attendee_ids else []
    if user.id not in attendee_ids: 
        attendee_ids.append(user.id)
    attendees = db.query(models.User).filter(models.User.id.in_(attendee_ids), models.User.tenant_id == user.tenant_id).all()
    db_event = models.Event(title=event_data.title, description=event_data.description, event_type=event_data.event_type, start_time=event_data.start_time, end_time=event_data.end_time, location=event_data.location, project_id=event_data.project_id, creator_id=user.id, tenant_id=user.tenant_id, attendees=attendees)
    db.add(db_event); db.commit(); db.refresh(db_event)
    
    # ROADMAP #2: Notify attendees
    for attendee in attendees:
        if attendee.id != user.id:
            create_notification(db, attendee.id, f"Meeting Invite: {db_event.title} at {db_event.start_time.strftime('%H:%M')}", f"/calendar")
    
    return db_event

def get_event(db: Session, event_id: int, tenant_id: Optional[int]) -> Optional[models.Event]:
    query = db.query(models.Event).options(joinedload(models.Event.attendees), joinedload(models.Event.creator)).filter(models.Event.id == event_id)
    if tenant_id is not None: query = query.filter(models.Event.tenant_id == tenant_id)
    return query.first()

def get_events_for_tenant(db: Session, tenant_id: int, start: datetime, end: datetime) -> List[models.Event]:
    return db.query(models.Event).options(joinedload(models.Event.attendees)).filter(models.Event.tenant_id == tenant_id, models.Event.start_time < end, models.Event.end_time > start).order_by(models.Event.start_time).all()

def update_event(db: Session, db_event: models.Event, event_update: schemas.EventUpdate, tenant_id: int) -> models.Event:
    update_data = event_update.model_dump(exclude_unset=True, exclude={'attendee_ids'})
    for key, value in update_data.items(): setattr(db_event, key, value)
    if event_update.attendee_ids is not None:
        attendees = db.query(models.User).filter(models.User.id.in_(event_update.attendee_ids), models.User.tenant_id == tenant_id).all()
        db_event.attendees = attendees
    db.add(db_event); db.commit(); db.refresh(db_event); return db_event

def delete_event(db: Session, db_event: models.Event):
    db.delete(db_event); db.commit()


# --- Customer CRUD Operations ---

def get_customer(db: Session, customer_id: int, tenant_id: Optional[int] = None) -> Optional[models.Customer]:
    query = db.query(models.Customer).filter(models.Customer.id == customer_id)
    if tenant_id is not None:
        query = query.filter(models.Customer.tenant_id == tenant_id)
    return query.first()

def get_customers(db: Session, tenant_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.Customer]:
    query = db.query(models.Customer)
    if tenant_id is not None:
        query = query.filter(models.Customer.tenant_id == tenant_id)
    return query.order_by(models.Customer.name).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate, tenant_id: int) -> models.Customer:
    if customer.kennitala:
        existing_kt = db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id, models.Customer.kennitala == customer.kennitala).first()
        if existing_kt: raise ValueError(f"Customer with Kennitala {customer.kennitala} already exists.")
    if customer.email:
        existing_email = db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id, models.Customer.email == customer.email).first()
        if existing_email: raise ValueError(f"Customer with email {customer.email} already exists.")
    db_customer = models.Customer(**customer.model_dump(exclude_unset=True), tenant_id=tenant_id)
    db.add(db_customer); db.commit(); db.refresh(db_customer); return db_customer

def update_customer(db: Session, db_customer: models.Customer, customer_update: schemas.CustomerUpdate) -> models.Customer:
    update_data = customer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_customer, key, value)
    db.add(db_customer); db.commit(); db.refresh(db_customer); return db_customer

def delete_customer(db: Session, db_customer: models.Customer):
    db.delete(db_customer); db.commit()


# --- Accounting, Payslips & Leave Requests ---

def create_payslip(db: Session, payslip: schemas.PayslipCreate, tenant_id: int, file_path: str, filename: str):
    db_payslip = models.Payslip(**payslip.model_dump(), tenant_id=tenant_id, file_path=file_path, filename=filename)
    db.add(db_payslip); db.commit(); db.refresh(db_payslip); return db_payslip

def get_payslip(db: Session, payslip_id: int):
    return db.query(models.Payslip).filter(models.Payslip.id == payslip_id).first()

def get_payslips_for_user(db: Session, user_id: int):
    return db.query(models.Payslip).filter(models.Payslip.user_id == user_id).order_by(models.Payslip.issue_date.desc()).all()

def create_leave_request(db: Session, leave_data: schemas.LeaveRequestCreate, user_id: int, tenant_id: int):
    data = leave_data.model_dump(); data.pop("status", None) 
    db_leave = models.LeaveRequest(**data, user_id=user_id, tenant_id=tenant_id, status=models.LeaveStatus.Pending)
    db.add(db_leave); db.commit(); db.refresh(db_leave); return db_leave

def get_leave_request(db: Session, request_id: int):
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()

def get_leave_requests_for_user(db: Session, user_id: int):
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.user_id == user_id).order_by(models.LeaveRequest.start_date.desc()).all()

def get_all_leave_requests(db: Session, tenant_id: int = None, status: Optional[models.LeaveStatus] = None):
    query = db.query(models.LeaveRequest).options(joinedload(models.LeaveRequest.user))
    if tenant_id is not None: query = query.filter(models.LeaveRequest.tenant_id == tenant_id)
    if status: query = query.filter(models.LeaveRequest.status == status)
    return query.order_by(models.LeaveRequest.start_date.asc()).all()

def _create_leave_events_for_approved_request(db: Session, db_request: models.LeaveRequest) -> None:
    """
    Internal helper:
    When a leave request is approved, generate calendar events covering each day
    of the approved interval for the requesting user.
    """
    # Ensure we have the user instance loaded
    user = db_request.user
    if user is None:
        user = db.query(models.User).filter(models.User.id == db_request.user_id).first()
        if user is None:
            return

    current = db_request.start_date
    while current <= db_request.end_date:
        # Full-day style block for this date
        start_dt = datetime.combine(current, datetime.min.time())
        end_dt = datetime.combine(current, datetime.max.time())

        title = f"Leave – {db_request.leave_type}"
        description_parts = []
        if db_request.reason:
            description_parts.append(db_request.reason)
        description_parts.append("Auto-generated from approved leave request")
        description = " | ".join(description_parts)

        event = models.Event(
            title=title,
            description=description,
            event_type=models.EventType.custom,
            start_time=start_dt,
            end_time=end_dt,
            location=None,
            project_id=None,
            creator_id=user.id,
            tenant_id=db_request.tenant_id,
        )
        # Ensure the employee is an attendee of their own leave block
        event.attendees.append(user)

        db.add(event)

        current += timedelta(days=1)


def update_leave_request_status(db: Session, db_request: models.LeaveRequest, status_enum: models.LeaveStatus, comment: Optional[str] = None):
    previous_status = db_request.status
    db_request.status = status_enum
    db_request.manager_comment = comment

    # When transitioning into Approved, create calendar events for the employee
    if previous_status != models.LeaveStatus.Approved and status_enum == models.LeaveStatus.Approved:
        _create_leave_events_for_approved_request(db, db_request)

    db.commit()
    db.refresh(db_request)
    return db_request


# --- Expenses & Money Overview ---

def create_expense(db: Session, tenant_id: int, expense: schemas.ExpenseCreate) -> models.Expense:
    data = expense.model_dump()
    db_expense = models.Expense(tenant_id=tenant_id, **data)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def get_expenses_for_tenant(
    db: Session,
    tenant_id: int,
    year: Optional[int] = None,
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    flow_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
) -> List[models.Expense]:
    query = db.query(models.Expense).filter(models.Expense.tenant_id == tenant_id)
    if year is not None:
        query = query.filter(func.extract("year", models.Expense.date) == year)
    if from_date is not None:
        query = query.filter(models.Expense.date >= from_date)
    if to_date is not None:
        query = query.filter(models.Expense.date <= to_date)
    if project_id is not None:
        query = query.filter(models.Expense.project_id == project_id)
    if category is not None:
        query = query.filter(models.Expense.category == category)
    if flow_type is not None:
        query = query.filter(models.Expense.flow_type == flow_type)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Expense.description.ilike(like),
                models.Expense.reference.ilike(like),
            )
        )
    return query.order_by(models.Expense.date.desc(), models.Expense.id.desc()).all()


def get_yearly_money_overview(
    db: Session,
    tenant_id: int,
    year: int,
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    flow_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
) -> schemas.YearlyMoneyOverview:
    expenses = get_expenses_for_tenant(
        db,
        tenant_id=tenant_id,
        year=year,
        project_id=project_id,
        category=category,
        flow_type=flow_type,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )

    total_in = sum(e.amount for e in expenses if e.flow_type == "in")
    total_out = sum(e.amount for e in expenses if e.flow_type == "out")

    by_month_map: Dict[int, Dict[str, float]] = {}
    by_category_map: Dict[str, Dict[str, float]] = {}

    for e in expenses:
        month = e.date.month
        month_bucket = by_month_map.setdefault(month, {"in": 0.0, "out": 0.0})
        cat_key = e.category or "other"
        cat_bucket = by_category_map.setdefault(cat_key, {"in": 0.0, "out": 0.0})

        if e.flow_type == "in":
            month_bucket["in"] += e.amount
            cat_bucket["in"] += e.amount
        else:
            month_bucket["out"] += e.amount
            cat_bucket["out"] += e.amount

    by_month = [
        schemas.MonthlyMoneySummary(month=m, total_in=b["in"], total_out=b["out"])
        for m, b in sorted(by_month_map.items(), key=lambda kv: kv[0])
    ]

    by_category = [
        schemas.CategoryMoneySummary(category=c, total_in=b["in"], total_out=b["out"])
        for c, b in sorted(by_category_map.items(), key=lambda kv: kv[0])
    ]

    return schemas.YearlyMoneyOverview(
        year=year,
        total_in=total_in,
        total_out=total_out,
        net=total_in - total_out,
        by_month=by_month,
        by_category=by_category,
    )

# --- Project Assignment Logic (ROADMAP #3) ---

def get_assignments(db: Session, start: date, end: date):
    """Fetches all bookings within a specific date window."""
    return db.query(models.ProjectAssignment).filter(
        models.ProjectAssignment.start_date <= end,
        models.ProjectAssignment.end_date >= start
    ).all()

def create_assignment(db: Session, assignment: schemas.AssignmentCreate):
    # Optional: Conflict check logic can be added here
    db_assignment = models.ProjectAssignment(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def delete_assignment(db: Session, assignment_id: int):
    db.query(models.ProjectAssignment).filter(models.ProjectAssignment.id == assignment_id).delete()
    db.commit()
    return True