# backend/app/crud.py
# Uncondensed Version: Multi-Tenancy updates (Tenant CRUD, User/Project tenant linking)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta # Added timedelta import
from . import models, schemas
from .security import get_password_hash, verify_password

# --- Tenant CRUD Operations (NEW) ---

def get_tenant(db: Session, tenant_id: int) -> Optional[models.Tenant]:
    return db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()

def get_tenant_by_name(db: Session, name: str) -> Optional[models.Tenant]:
    return db.query(models.Tenant).filter(models.Tenant.name == name).first()

def get_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[models.Tenant]:
    return db.query(models.Tenant).order_by(models.Tenant.name).offset(skip).limit(limit).all()

def create_tenant(db: Session, tenant: schemas.TenantCreate) -> models.Tenant:
    db_tenant = models.Tenant(
        name=tenant.name,
        logo_url=tenant.logo_url,
        background_image_url=tenant.background_image_url
        # primary_color can be added here if included in TenantCreate
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def update_tenant(db: Session, db_tenant: models.Tenant, tenant_update: schemas.TenantUpdate) -> models.Tenant:
    """Updates a tenant's details from a schema."""
    update_data = tenant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tenant, key, value)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

def delete_tenant(db: Session, tenant_id: int) -> Optional[models.Tenant]:
    db_tenant = get_tenant(db, tenant_id=tenant_id)
    if not db_tenant:
        return None
    # Consider implications: what happens to users/projects in this tenant?
    # Current model setup for User.tenant and Project.tenant does not have ON DELETE CASCADE
    # from Tenant, so this delete will fail if users or projects reference this tenant.
    # This requires manual cleanup or schema changes for cascade behavior.
    db.delete(db_tenant)
    db.commit()
    return db_tenant


# --- User CRUD Operations (Updated for Tenant) ---

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
        tenant_id=user_data.tenant_id,
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_superuser=user_data.is_superuser if user_data.is_superuser is not None else False,
        # --- THIS IS THE FIX ---
        hourly_rate=user_data.hourly_rate
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
    
def update_user_profile_picture_path(db: Session, user_id: int, path: str) -> Optional[models.User]:
    """Updates the profile picture path for a specific user."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.profile_picture_path = path
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user_by_admin(db: Session, user_id: int) -> Optional[models.User]:
    db_user = get_user(db, user_id=user_id)
    if db_user: db.delete(db_user); db.commit()
    return db_user
        
def update_user_password(db: Session, user: models.User, new_password: str) -> models.User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user); db.commit(); db.refresh(user)
    return user

def set_user_password_by_admin(db: Session, user: models.User, new_password: str) -> models.User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user); db.commit(); db.refresh(user)
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
    except Exception as e: db.rollback(); print(f"ERROR during reassign_and_deactivate_other_users: {str(e)}"); raise e
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
            db_user = models.User(email=user_row_data.Email, hashed_password=hashed_default_password, full_name=user_row_data.Name, employee_id=user_row_data.Employee_ID, kennitala=user_row_data.Kennitala, phone_number=user_row_data.Phone, location=user_row_data.Location, role=default_role, tenant_id=tenant_id, is_active=default_is_active, is_superuser=default_is_superuser)
            db.add(db_user); db.commit(); db.refresh(db_user); created_count += 1; created_users_emails.append(db_user.email)
        except Exception as e: db.rollback(); errors.append(f"Row {row_num}: Error for '{user_row_data.Email}': {str(e)}. Skipped."); skipped_count += 1
    return {"created_count": created_count, "skipped_count": skipped_count, "errors": errors, "created_users_emails": created_users_emails }


# --- Project CRUD (Updated for Tenant) ---
def get_project(db: Session, project_id: int, tenant_id: int) -> Optional[models.Project]: # Require tenant_id
    return db.query(models.Project)\
             .options(
                 joinedload(models.Project.members),
                 joinedload(models.Project.project_manager).options(joinedload(models.User.tenant)),
                 joinedload(models.Project.tenant)
              )\
             .filter(models.Project.id == project_id, models.Project.tenant_id == tenant_id).first()

def get_projects(
    db: Session,
    tenant_id: Optional[int],
    status: Optional[str] = None,
    search: Optional[str] = None, # <-- Add search parameter
    sort_by: str = 'name',
    sort_dir: str = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Project]:
    query = db.query(models.Project).options(
        joinedload(models.Project.project_manager),
        joinedload(models.Project.tenant) # Eager load tenant if needed elsewhere
    )
    if tenant_id is not None:
        query = query.filter(models.Project.tenant_id == tenant_id)
    if status:
        query = query.filter(models.Project.status == status)
    # --- NEW SEARCH LOGIC ---
    if search:
        search_term = f"%{search}%"
        query = query.filter(models.Project.name.ilike(search_term)) # Case-insensitive search
    # --- END NEW SEARCH LOGIC ---

    # Sorting logic (remains the same)
    sort_column = getattr(models.Project, sort_by, models.Project.name)
    if sort_dir == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    return query.offset(skip).limit(limit).all()

def create_project(
    db: Session,
    project: schemas.ProjectCreate,
    creator_id: int,
    tenant_id: int # Project must belong to the creator's tenant
) -> models.Project:
    project_data = project.model_dump()
    project_manager_id_from_schema = project_data.pop('project_manager_id', None)
    project_manager_instance = None
    actual_project_manager_id = None

    if project_manager_id_from_schema is not None:
        project_manager_instance = get_user(db, user_id=project_manager_id_from_schema)
        # Ensure PM is in the same tenant
        if project_manager_instance and project_manager_instance.role == 'project manager' and project_manager_instance.tenant_id == tenant_id:
            actual_project_manager_id = project_manager_id_from_schema
        else:
            project_manager_instance = None
            # Consider raising an error if an invalid PM from another tenant is specified

    db_project = models.Project(
        **project_data,
        creator_id=creator_id,
        project_manager_id=actual_project_manager_id,
        tenant_id=tenant_id # Set tenant_id
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

    db.refresh(db_project, attribute_names=['project_manager', 'members', 'tenant'])
    return db_project

def update_project(
    db: Session, project_id: int, project_update: schemas.ProjectUpdate, tenant_id: int
) -> Optional[models.Project]:
    db_project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not db_project:
        return None
    # ... (rest of update logic as in Response #105, ensure PM checks tenant_id) ...
    # Ensure any new PM assigned is also from the same tenant_id
    update_data = project_update.model_dump(exclude_unset=True)
    new_project_manager_id_field = update_data.pop('project_manager_id', 'UNCHANGED_SENTINEL')
    new_pm_instance_for_membership = None
    if new_project_manager_id_field != 'UNCHANGED_SENTINEL':
        if new_project_manager_id_field is not None:
            potential_new_pm = get_user(db, user_id=new_project_manager_id_field)
            if potential_new_pm and potential_new_pm.role == 'project manager' and potential_new_pm.tenant_id == tenant_id:
                db_project.project_manager_id = new_project_manager_id_field
                new_pm_instance_for_membership = potential_new_pm
            else: print(f"Warning: New PM ID {new_project_manager_id_field} invalid or not in tenant. PM not changed.")
        else: db_project.project_manager_id = None
    for key, value in update_data.items(): setattr(db_project, key, value)
    db.add(db_project)
    if new_pm_instance_for_membership:
        if 'members' not in db_project.__dict__ or (new_pm_instance_for_membership not in db_project.members and new_pm_instance_for_membership.id not in [m.id for m in db_project.members]):
            db_project.members.append(new_pm_instance_for_membership)
    db.commit(); db.refresh(db_project); db.refresh(db_project, attribute_names=['project_manager', 'members', 'tenant'])
    return db_project


def delete_project(db: Session, project_id: int, tenant_id: int) -> Optional[models.Project]:
    db_project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not db_project:
        return None
    db.delete(db_project)
    db.commit()
    return db_project


# --- Project Membership CRUD ---
def add_member_to_project(db: Session, project: models.Project, user: models.User) -> bool:
    # Ensure user belongs to the same tenant as the project
    if project.tenant_id != user.tenant_id:
        print(f"Warning: User {user.id} from tenant {user.tenant_id} cannot be added to project {project.id} from tenant {project.tenant_id}")
        return False # Or raise HTTPException
    if 'members' not in project.__dict__: db.refresh(project, attribute_names=['members'])
    if user not in project.members: project.members.append(user); db.commit(); return True
    return False

def remove_member_from_project(db: Session, project: models.Project, user: models.User) -> bool:
    # No explicit tenant check needed here if project object is already correctly scoped
    if 'members' not in project.__dict__: db.refresh(project, attribute_names=['members'])
    if user in project.members: project.members.remove(user); db.commit(); return True
    return False

def get_project_members(db: Session, project_id: int, tenant_id: int) -> List[models.User]: # Add tenant_id for safety
    project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    return project.members if project else []

def is_user_member_of_project(db: Session, project_id: int, user_id: int, tenant_id: int) -> bool: # Add tenant_id
    project = get_project(db, project_id=project_id, tenant_id=tenant_id)
    if not project: return False
    return user_id in {member.id for member in project.members}

# --- Task CRUD & Assignment ---
# (Task CRUD will be tenant-aware via project_id. No direct tenant_id needed in function signatures)
def get_task(db: Session, task_id: int # Potentially add tenant_id via project lookup for direct task access
            ) -> Optional[models.Task]:
    # If accessing task directly, ensure it belongs to an accessible project (tenant-scoped)
    return db.query(models.Task).options(joinedload(models.Task.comments).joinedload(models.TaskComment.author), joinedload(models.Task.photos).joinedload(models.TaskPhoto.uploader), joinedload(models.Task.assignee).options(joinedload(models.User.assigned_projects)), joinedload(models.Task.project).joinedload(models.Project.tenant)).filter(models.Task.id == task_id).first()

def get_tasks(
    db: Session,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None, # <-- Add search parameter
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
    # --- NEW SEARCH LOGIC ---
    if search:
        search_term = f"%{search}%"
        query = query.filter(models.Task.title.ilike(search_term)) # Case-insensitive search by title
    # --- END NEW SEARCH LOGIC ---

    # Sorting logic
    sort_column = getattr(models.Task, sort_by, models.Task.id)
    if sort_dir == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    return query.offset(skip).limit(limit).all()

def create_task(db: Session, task: schemas.TaskCreate, project_tenant_id: int) -> models.Task:
    # Here, project_tenant_id is the tenant_id of the project this task belongs to.
    # We should verify if assignee_id (if any) belongs to the same tenant.
    assignee_id = task.assignee_id
    if assignee_id:
        assignee = get_user(db, user_id=assignee_id)
        if not assignee or assignee.tenant_id != project_tenant_id:
            # Handle error: assignee not found or not in the same tenant
            # For now, we'll allow it but this is a point of refinement
            print(f"Warning: Assignee {assignee_id} not in project tenant {project_tenant_id}")
            # assignee_id = None # Or raise error
    task_data = task.model_dump(); popped_assignee_id = task_data.pop('assignee_id', None);
    if popped_assignee_id == '': popped_assignee_id = None;
    start_date = task_data.pop('start_date', None);
    db_task = models.Task(**task_data, assignee_id=assignee_id, start_date=start_date); # Use validated assignee_id
    db.add(db_task); db.commit(); db.refresh(db_task); return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, project_tenant_id: int) -> Optional[models.Task]:
    db_task = get_task(db, task_id=task_id)
    if not db_task or db_task.project.tenant_id != project_tenant_id: return None # Ensure task belongs to tenant
    # Further check if new assignee_id belongs to the same tenant
    # ... (rest of update logic)
    update_data = task_update.model_dump(exclude_unset=True)
    if 'assignee_id' in update_data and update_data['assignee_id'] is not None:
        assignee = get_user(db, user_id=update_data['assignee_id'])
        if not assignee or assignee.tenant_id != project_tenant_id:
            # Handle error
            print(f"Warning: New assignee {update_data['assignee_id']} not in project tenant {project_tenant_id}")
            update_data.pop('assignee_id') # Do not update assignee
    for key, value in update_data.items():
        if key == 'assignee_id' and (value == '' or value is None): setattr(db_task, key, None)
        elif key in ['start_date', 'due_date'] and value == '': setattr(db_task, key, None)
        else: setattr(db_task, key, value)
    db.add(db_task); db.commit(); db.refresh(db_task); return db_task

def commission_task(db: Session, task_to_commission: models.Task) -> models.Task:
    if task_to_commission.status != "Done": return task_to_commission
    task_to_commission.is_commissioned = True; task_to_commission.status = "Commissioned"
    db.add(task_to_commission); db.commit(); db.refresh(task_to_commission)
    return task_to_commission

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
    return db.query(models.TaskComment)\
             .options(
                 joinedload(models.TaskComment.author),
                 joinedload(models.TaskComment.task).joinedload(models.Task.project).joinedload(models.Project.tenant) # Eager load path to tenant
              )\
             .filter(models.TaskComment.id == comment_id).first()

def get_comments_for_task(db: Session, task_id: int, skip: int = 0, limit: int = 100) -> List[models.TaskComment]:
    # This function is fine as is, tenant check happens when fetching the task first in the router
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
    # The comment object passed here should already be verified for tenant ownership by the router
    db_comment = get_comment(db, comment_id=comment_id) # Fetches with necessary loads
    if db_comment:
        db.delete(db_comment)
        db.commit()
    return db_comment

# --- NEW: Task Dependency CRUD ---

def add_task_dependency(db: Session, task: models.Task, predecessor: models.Task) -> models.Task:
    """Adds a predecessor dependency to a task."""
    # Check for circular dependency: if the new predecessor already depends on the current task
    if task in predecessor.successors:
        return None # Or raise an exception indicating a circular dependency
    
    # Check if the dependency already exists
    if predecessor not in task.predecessors:
        task.predecessors.append(predecessor)
        db.commit()
        db.refresh(task)
    return task

def remove_task_dependency(db: Session, task: models.Task, predecessor: models.Task) -> models.Task:
    """Removes a predecessor dependency from a task."""
    if predecessor in task.predecessors:
        task.predecessors.remove(predecessor)
        db.commit()
        db.refresh(task)
    return task

# --- END NEW ---

# --- MODIFIED: Inventory Catalog CRUD ---
def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
    return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(db: Session, skip: int, limit: int) -> List[models.InventoryItem]:
    return db.query(models.InventoryItem).order_by(models.InventoryItem.name).offset(skip).limit(limit).all()

def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_inventory_item(db: Session, db_item: models.InventoryItem, item_update: schemas.InventoryItemUpdate) -> models.InventoryItem:
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_inventory_item(db: Session, db_item: models.InventoryItem) -> models.InventoryItem:
    db.delete(db_item)
    db.commit()
    return db_item

# --- NEW: Project-Specific Inventory CRUD ---
def get_project_inventory_for_project(db: Session, project_id: int) -> List[models.ProjectInventoryItem]:
    return db.query(models.ProjectInventoryItem).options(
        joinedload(models.ProjectInventoryItem.inventory_item)
    ).filter(models.ProjectInventoryItem.project_id == project_id).all()

def add_or_update_item_in_project_inventory(db: Session, item_data: schemas.ProjectInventoryItemCreate) -> models.ProjectInventoryItem:
    existing_item = db.query(models.ProjectInventoryItem).filter(
        models.ProjectInventoryItem.project_id == item_data.project_id,
        models.ProjectInventoryItem.inventory_item_id == item_data.inventory_item_id
    ).first()

    if existing_item:
        existing_item.quantity += item_data.quantity
        db_item = existing_item
    else:
        db_item = models.ProjectInventoryItem(**item_data.model_dump())
        db.add(db_item)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def remove_item_from_project_inventory(db: Session, project_inventory_item_id: int) -> Optional[models.ProjectInventoryItem]:
    db_item = db.query(models.ProjectInventoryItem).filter(models.ProjectInventoryItem.id == project_inventory_item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

# --- NEW: Global Inventory Summary Function ---
def get_global_inventory_summary(db: Session) -> List[Dict[str, Any]]:
    """Calculates the total quantity of each inventory item across all projects."""
    summary = db.query(
        models.InventoryItem,
        func.sum(models.ProjectInventoryItem.quantity).label('total_quantity')
    ).join(
        models.ProjectInventoryItem, 
        models.InventoryItem.id == models.ProjectInventoryItem.inventory_item_id
    ).group_by(
        models.InventoryItem.id
    ).all()
    
    results = []
    for item, total_quantity in summary:
        results.append({
            "inventory_item": item,
            "total_quantity": total_quantity
        })
    return results

# --- Shopping List Function ---
def get_shopping_list_for_project(db: Session, project_id: int) -> List[Dict[str, Any]]:
    """
    Generates a shopping list for a specific project by comparing
    the Bill of Quantities (BoQ) with the Project's specific inventory.
    """
    
    # 1. Get all required items from the project's BoQ
    boq = db.query(models.BoQ).options(
        joinedload(models.BoQ.items).joinedload(models.BoQItem.inventory_item)
    ).filter(models.BoQ.project_id == project_id).first()

    # 2. Get all items in the project's on-site inventory
    project_inventory = db.query(models.ProjectInventoryItem).filter(
        models.ProjectInventoryItem.project_id == project_id
    ).all()
    
    # Create a simple lookup map for in-stock quantities
    stock_map = {item.inventory_item_id: item.quantity for item in project_inventory}

    shopping_list = []
    
    if not boq:
        # If there's no BoQ, the shopping list is empty
        return shopping_list

    # 3. Calculate the shortfall
    for boq_item in boq.items:
        quantity_in_stock = stock_map.get(boq_item.inventory_item_id, 0.0)
        quantity_required = boq_item.quantity_required
        
        shortfall = quantity_required - quantity_in_stock
        
        if shortfall > 0:
            shopping_list.append({
                "inventory_item": boq_item.inventory_item,
                "quantity_required": quantity_required,
                "quantity_in_stock": quantity_in_stock,
                "quantity_to_order": shortfall,
                "unit": boq_item.inventory_item.unit
            })
            
    return shopping_list

# --- Drawing Metadata CRUD ---

# --- NEW: Drawing Metadata Update ---

def update_drawing_metadata(db: Session, db_drawing: models.Drawing, drawing_update: schemas.DrawingUpdate) -> models.Drawing:
    """Updates the metadata fields of an existing drawing."""
    update_data = drawing_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(db_drawing, key):
            setattr(db_drawing, key, value)
    db.add(db_drawing)
    db.commit()
    db.refresh(db_drawing)
    return db_drawing
    
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
def create_timelog_entry(db: Session, timelog_data: schemas.TimeLogCreate, user_id: int) -> models.TimeLog:
    db_timelog = models.TimeLog(
        **timelog_data.model_dump(),
        user_id=user_id,
        start_time=datetime.now(timezone.utc)
    )
    db.add(db_timelog)
    db.commit()
    db.refresh(db_timelog)
    return db_timelog

def update_timelog_entry(db: Session, timelog_id: int) -> models.TimeLog:
    db_timelog = db.query(models.TimeLog).get(timelog_id)
    if db_timelog and not db_timelog.end_time:
        db_timelog.end_time = datetime.now(timezone.utc)
        db_timelog.duration = db_timelog.end_time - db_timelog.start_time
        db.commit()
        db.refresh(db_timelog)
    return db_timelog

def get_open_timelog_for_user(db: Session, user_id: int) -> Optional[models.TimeLog]:
    return db.query(models.TimeLog).options(
        joinedload(models.TimeLog.project)
    ).filter(
        models.TimeLog.user_id == user_id,
        models.TimeLog.end_time == None
    ).first()

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
    query = db.query(models.TimeLog).options(
        joinedload(models.TimeLog.user),
        joinedload(models.TimeLog.project),
        joinedload(models.TimeLog.task)
    )

    # --- THIS IS THE CORRECTED LOGIC ---

    # Join User model for tenant and search filtering
    # We use outerjoin in case user is deleted but logs remain
    query = query.outerjoin(models.User, models.TimeLog.user_id == models.User.id)

    if user_id is not None:
        query = query.filter(models.TimeLog.user_id == user_id)
    if project_id is not None:
        query = query.filter(models.TimeLog.project_id == project_id)
    if tenant_id is not None:
        # Filter by the tenant ID from the joined User table
        query = query.filter(models.User.tenant_id == tenant_id)
    
    if start_date:
        query = query.filter(models.TimeLog.start_time >= start_date)
    if end_date:
        # Add one day to end_date to be inclusive
        end_date_inclusive = end_date + timedelta(days=1)
        query = query.filter(models.TimeLog.start_time < end_date_inclusive)
    
    if search:
        search_term = f"%{search}%"
        # We need outerjoin because a log might not have a project
        query = query.outerjoin(models.Project, models.TimeLog.project_id == models.Project.id)
        query = query.filter(
            (models.TimeLog.notes.ilike(search_term)) |
            (models.Project.name.ilike(search_term)) |
            (models.User.full_name.ilike(search_term))
        )
    # --- END CORRECTION ---

    # Sorting
    sort_column = getattr(models.TimeLog, sort_by, models.TimeLog.start_time)
    if sort_dir == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    return query.offset(skip).limit(limit).all()

def get_active_timelogs_for_project(db: Session, project_id: int) -> List[models.TimeLog]:
    """Retrieves all currently open time logs for a specific project."""
    return db.query(models.TimeLog).options(
        joinedload(models.TimeLog.user)
    ).filter(
        models.TimeLog.project_id == project_id,
        models.TimeLog.end_time == None
    ).order_by(models.TimeLog.start_time.asc()).all()
# --- END MISSING FUNCTION ---
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

# --- NEW: Tool CRUD Operations ---

def create_tool(db: Session, tool: schemas.ToolCreate, tenant_id: int) -> models.Tool:
    """Creates a new tool for a specific tenant."""
    db_tool = models.Tool(**tool.model_dump(), tenant_id=tenant_id)
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

# --- NEW FUNCTION ---
def create_tool_log(db: Session, tool_id: int, user_id: int, action: models.ToolLogAction, notes: Optional[str] = None):
    """Creates a history log entry for a tool."""
    db_log = models.ToolLog(
        tool_id=tool_id,
        user_id=user_id,
        action=action,
        notes=notes
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
# --- END NEW FUNCTION ---

def get_tool(db: Session, tool_id: int, tenant_id: int) -> Optional[models.Tool]:
    """Gets a single tool by ID, scoped to a tenant."""
    return db.query(models.Tool).options(
        joinedload(models.Tool.current_user),
        joinedload(models.Tool.history_logs).joinedload(models.ToolLog.user)
    ).filter(models.Tool.id == tool_id, models.Tool.tenant_id == tenant_id).first()

def get_tools(db: Session, tenant_id: int, skip: int, limit: int) -> List[models.Tool]:
    """Gets a list of all tools for a tenant."""
    return db.query(models.Tool).options(joinedload(models.Tool.current_user)).filter(models.Tool.tenant_id == tenant_id).order_by(models.Tool.name).offset(skip).limit(limit).all()

def update_tool(db: Session, db_tool: models.Tool, tool_update: schemas.ToolUpdate) -> models.Tool:
    """Updates a tool's details."""
    update_data = tool_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tool, key, value)
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

def delete_tool(db: Session, db_tool: models.Tool) -> models.Tool:
    """Deletes a tool."""
    db.delete(db_tool)
    db.commit()
    return db_tool

def update_tool_image_path(db: Session, db_tool: models.Tool, image_path: str) -> models.Tool:
    """Updates the image_path for a specific tool."""
    db_tool.image_path = image_path
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

def checkout_tool(db: Session, db_tool: models.Tool, user_id: int) -> models.Tool:
    """Assigns a tool to a user and creates a log."""
    db_tool.current_user_id = user_id
    db_tool.status = models.ToolStatus.In_Use
    create_tool_log(db, tool_id=db_tool.id, user_id=user_id, action=models.ToolLogAction.Checked_Out)
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

def checkin_tool(db: Session, db_tool: models.Tool) -> models.Tool:
    """Returns a tool to the inventory and creates a log."""
    user_id = db_tool.current_user_id # Get user ID before clearing it
    db_tool.current_user_id = None
    db_tool.status = models.ToolStatus.Available
    create_tool_log(db, tool_id=db_tool.id, user_id=user_id, action=models.ToolLogAction.Checked_In)
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

# --- NEW: Car Fleet CRUD Operations ---

# Car CRUD
def create_car(db: Session, car: schemas.CarCreate, tenant_id: int) -> models.Car:
    db_car = models.Car(**car.model_dump(), tenant_id=tenant_id)
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def get_car(db: Session, car_id: int, tenant_id: int) -> Optional[models.Car]:
    return db.query(models.Car).options(
        joinedload(models.Car.current_user),
        joinedload(models.Car.history_logs).joinedload(models.CarLog.user),
        joinedload(models.Car.tyre_sets)
    ).filter(models.Car.id == car_id, models.Car.tenant_id == tenant_id).first()

def get_cars(db: Session, tenant_id: int, skip: int, limit: int) -> List[models.Car]:
    return db.query(models.Car).options(joinedload(models.Car.current_user)).filter(models.Car.tenant_id == tenant_id).order_by(models.Car.make, models.Car.model).offset(skip).limit(limit).all()

def update_car(db: Session, db_car: models.Car, car_update: schemas.CarUpdate) -> models.Car:
    update_data = car_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_car, key, value)
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def delete_car(db: Session, db_car: models.Car) -> models.Car:
    db.delete(db_car)
    db.commit()
    return db_car

def update_car_image_path(db: Session, db_car: models.Car, image_path: str) -> models.Car:
    db_car.image_path = image_path
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

# CarLog CRUD
def create_car_log(db: Session, car_id: int, user_id: int, action: models.CarLogAction, odometer_reading: Optional[int] = None, notes: Optional[str] = None):
    db_log = models.CarLog(
        car_id=car_id,
        user_id=user_id,
        action=action,
        odometer_reading=odometer_reading,
        notes=notes
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# TyreSet CRUD
def create_tyre_set(db: Session, tyre_set: schemas.TyreSetCreate, car_id: int) -> models.TyreSet:
    db_tyre_set = models.TyreSet(**tyre_set.model_dump(), car_id=car_id)
    db.add(db_tyre_set)
    db.commit()
    db.refresh(db_tyre_set)
    return db_tyre_set

def get_tyre_set(db: Session, tyre_id: int) -> Optional[models.TyreSet]:
    return db.query(models.TyreSet).filter(models.TyreSet.id == tyre_id).first()

def delete_tyre_set(db: Session, db_tyre_set: models.TyreSet) -> models.TyreSet:
    db.delete(db_tyre_set)
    db.commit()
    return db_tyre_set

# Check-in / Check-out Logic
def checkout_car(db: Session, db_car: models.Car, user_id: int, details: schemas.CarCheckout) -> models.Car:
    db_car.current_user_id = user_id
    db_car.status = models.CarStatus.Checked_Out
    create_car_log(
        db, car_id=db_car.id, user_id=user_id, action=models.CarLogAction.Checked_Out,
        odometer_reading=details.odometer_reading, notes=details.notes
    )
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def checkin_car(db: Session, db_car: models.Car, user_id: int, details: schemas.CarCheckout) -> models.Car:
    db_car.current_user_id = None
    db_car.status = models.CarStatus.Available
    create_car_log(
        db, car_id=db_car.id, user_id=user_id, action=models.CarLogAction.Checked_In,
        odometer_reading=details.odometer_reading, notes=details.notes
    )
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car

def create_shop(db: Session, shop: schemas.ShopCreate, tenant_id: int) -> models.Shop:
    """Creates a new shop for a specific tenant."""
    db_shop = models.Shop(**shop.model_dump(), tenant_id=tenant_id)
    db.add(db_shop)
    db.commit()
    db.refresh(db_shop)
    return db_shop

def get_shop(db: Session, shop_id: int, tenant_id: int) -> Optional[models.Shop]:
    """Gets a single shop by ID, scoped to a tenant."""
    return db.query(models.Shop).filter(models.Shop.id == shop_id, models.Shop.tenant_id == tenant_id).first()

def get_shops(db: Session, tenant_id: int, skip: int, limit: int) -> List[models.Shop]:
    """Gets a list of all shops for a tenant."""
    return db.query(models.Shop).filter(models.Shop.tenant_id == tenant_id).order_by(models.Shop.name).offset(skip).limit(limit).all()

def update_shop(db: Session, db_shop: models.Shop, shop_update: schemas.ShopUpdate) -> models.Shop:
    """Updates a shop's details."""
    update_data = shop_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_shop, key, value)
    db.add(db_shop)
    db.commit()
    db.refresh(db_shop)
    return db_shop

def delete_shop(db: Session, db_shop: models.Shop) -> models.Shop:
    """Deletes a shop."""
    db.delete(db_shop)
    db.commit()
    return db_shop

# --- NEW: Bill of Quantities (BoQ) CRUD Operations ---

def get_boq_by_project_id(db: Session, project_id: int) -> Optional[models.BoQ]:
    """Retrieves the BoQ for a given project, including its items and their inventory details."""
    return db.query(models.BoQ).options(
        joinedload(models.BoQ.items).joinedload(models.BoQItem.inventory_item)
    ).filter(models.BoQ.project_id == project_id).first()

def get_or_create_boq_for_project(db: Session, project_id: int, project_name: str) -> models.BoQ:
    """Gets the BoQ for a project, creating one if it doesn't exist."""
    db_boq = get_boq_by_project_id(db, project_id=project_id)
    if not db_boq:
        db_boq = models.BoQ(project_id=project_id, name=f"BoQ for {project_name}")
        db.add(db_boq)
        db.commit()
        db.refresh(db_boq)
    return db_boq

def get_boq_item(db: Session, boq_item_id: int) -> Optional[models.BoQItem]:
    """Retrieves a single BoQ item by its ID."""
    return db.query(models.BoQItem).filter(models.BoQItem.id == boq_item_id).first()

def add_item_to_boq(db: Session, boq: models.BoQ, item_data: schemas.BoQItemCreate) -> models.BoQ:
    """Adds an inventory item to a BoQ. If it already exists, it updates the quantity."""
    existing_item = db.query(models.BoQItem).filter(
        models.BoQItem.boq_id == boq.id,
        models.BoQItem.inventory_item_id == item_data.inventory_item_id
    ).first()
    
    if existing_item:
        # Item already in BoQ, update quantity
        existing_item.quantity_required = item_data.quantity_required
        db.add(existing_item)
    else:
        # New item for this BoQ
        db_boq_item = models.BoQItem(
            boq_id=boq.id,
            inventory_item_id=item_data.inventory_item_id,
            quantity_required=item_data.quantity_required
        )
        db.add(db_boq_item)
    
    db.commit()
    db.refresh(boq)
    # Eagerly load items again after commit
    db_boq_reloaded = get_boq_by_project_id(db, project_id=boq.project_id)
    return db_boq_reloaded

def update_boq_item(db: Session, db_boq_item: models.BoQItem, item_update: schemas.BoQItemUpdate) -> models.BoQItem:
    """Updates the quantity of a BoQ item."""
    db_boq_item.quantity_required = item_update.quantity_required
    db.add(db_boq_item)
    db.commit()
    db.refresh(db_boq_item)
    return db_boq_item

def remove_item_from_boq(db: Session, db_boq_item: models.BoQItem):
    """Removes an item from a BoQ."""
    db.delete(db_boq_item)
    db.commit()

# --- NEW: Reporting CRUD Operations ---

def get_project_cost_summary(db: Session, project: models.Project) -> Dict[str, Any]:
    """Calculates the total hours and cost for a given project."""
    
    # Eagerly load the user for each time log to get their hourly rate
    time_logs = db.query(models.TimeLog).options(
        joinedload(models.TimeLog.user)
    ).filter(models.TimeLog.project_id == project.id).all()
    
    total_hours = 0.0
    calculated_cost = 0.0
    detailed_logs = []

    for log in time_logs:
        if log.duration and log.user and log.user.hourly_rate is not None:
            # Duration is a timedelta object, get total seconds
            duration_hours = log.duration.total_seconds() / 3600.0
            cost = duration_hours * log.user.hourly_rate
            
            total_hours += duration_hours
            calculated_cost += cost
            
            detailed_logs.append({
                "user_name": log.user.full_name or log.user.email,
                "duration_hours": round(duration_hours, 2),
                "hourly_rate": log.user.hourly_rate,
                "cost": round(cost, 2)
            })

    variance = None
    if project.budget is not None:
        variance = project.budget - calculated_cost

    return {
        "project_id": project.id,
        "project_name": project.name,
        "budget": project.budget,
        "total_hours": round(total_hours, 2),
        "calculated_cost": round(calculated_cost, 2),
        "variance": round(variance, 2) if variance is not None else None,
        "detailed_logs": detailed_logs
    }

# --- END NEW ---

# --- NEW: Dashboard CRUD Operation ---

def get_dashboard_data(db: Session, user: models.User) -> Dict[str, Any]:
    """Gathers all necessary data for a user's dashboard."""
    
    # 1. Get user's open tasks (not Done or Commissioned)
    my_open_tasks = db.query(models.Task).filter(
        models.Task.assignee_id == user.id,
        models.Task.status.notin_(['Done', 'Commissioned', 'Cancelled'])
    ).order_by(models.Task.due_date.asc().nulls_last()).all()

    # 2. Get user's checked-out tools
    my_checked_out_tools = db.query(models.Tool).filter(
        models.Tool.current_user_id == user.id,
        models.Tool.status == models.ToolStatus.In_Use
    ).all()

    # 3. Get user's checked-out car
    my_checked_out_car = db.query(models.Car).filter(
        models.Car.current_user_id == user.id,
        models.Car.status == models.CarStatus.Checked_Out
    ).first()

    # 4. Get managed projects for Admins and PMs
    managed_projects = None
    if user.is_superuser or user.role == 'admin':
        # Superusers and Admins see all projects in their tenant (or all if superuser)
        tenant_id = None if user.is_superuser else user.tenant_id
        managed_projects = get_projects(db, tenant_id=tenant_id, limit=100) # Re-use existing function
    elif user.role == 'project manager':
        # Project Managers see projects they are assigned to
        managed_projects = db.query(models.Project).filter(
            models.Project.project_manager_id == user.id
        ).all()

    return {
        "my_open_tasks": my_open_tasks,
        "my_checked_out_tools": my_checked_out_tools,
        "my_checked_out_car": my_checked_out_car,
        "managed_projects": managed_projects,
    }

# --- NEW: Offer CRUD Operations ---

def get_next_offer_number(db: Session, tenant_id: int) -> str:
    """Generates the next sequential offer number for a tenant (e.g., OFFER-2025-001)."""
    current_year = datetime.now().year
    prefix = f"OFFER-{current_year}-"
    
    # Find the highest existing number for the current year and tenant
    last_offer = db.query(models.Offer).filter(
        models.Offer.tenant_id == tenant_id,
        models.Offer.offer_number.like(f"{prefix}%")
    ).order_by(models.Offer.offer_number.desc()).first()

    next_num = 1
    if last_offer and last_offer.offer_number.startswith(prefix):
        try:
            last_num_str = last_offer.offer_number.split('-')[-1]
            next_num = int(last_num_str) + 1
        except (IndexError, ValueError):
            pass # Keep next_num as 1 if parsing fails

    return f"{prefix}{next_num:03d}" # Pad with zeros (e.g., 001, 002)

def calculate_offer_total(db: Session, offer_id: int) -> float:
    """Calculates the sum of all line item total prices for an offer."""
    total = db.query(func.sum(models.OfferLineItem.total_price)).filter(
        models.OfferLineItem.offer_id == offer_id
    ).scalar()
    return total or 0.0

def create_offer(db: Session, offer_data: schemas.OfferCreate, user: models.User) -> models.Offer:
    """Creates a new offer for a project."""
    offer_number = get_next_offer_number(db, tenant_id=user.tenant_id)
    db_offer = models.Offer(
        **offer_data.model_dump(exclude={"project_id"}), # Exclude project_id as it's a direct arg
        offer_number=offer_number,
        project_id=offer_data.project_id,
        tenant_id=user.tenant_id,
        created_by_user_id=user.id,
        total_amount=0.0 # Initial total
    )
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

def get_offer(db: Session, offer_id: int, tenant_id: Optional[int]) -> Optional[models.Offer]:
    """Gets a single offer by ID, including line items and creator info."""
    query = db.query(models.Offer).options(
        joinedload(models.Offer.line_items).joinedload(models.OfferLineItem.inventory_item),
        joinedload(models.Offer.creator)
    ).filter(models.Offer.id == offer_id)
    if tenant_id is not None:
        query = query.filter(models.Offer.tenant_id == tenant_id)
    return query.first()

def get_offers_for_project(db: Session, project_id: int) -> List[models.Offer]:
    """Gets all offers associated with a specific project."""
    return db.query(models.Offer).filter(models.Offer.project_id == project_id).order_by(models.Offer.issue_date.desc()).all()

def update_offer(db: Session, db_offer: models.Offer, offer_update: schemas.OfferUpdate) -> models.Offer:
    """Updates the details of an offer (excluding line items)."""
    update_data = offer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_offer, key, value)
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer

def delete_offer(db: Session, db_offer: models.Offer):
    """Deletes an offer and its associated line items."""
    db.delete(db_offer)
    db.commit()

# --- Offer Line Item CRUD ---

def add_line_item_to_offer(db: Session, offer: models.Offer, item_data: schemas.OfferLineItemCreate) -> models.OfferLineItem:
    """Adds a new line item to an offer and updates the offer total."""
    total_price = item_data.quantity * item_data.unit_price
    db_item = models.OfferLineItem(
        **item_data.model_dump(),
        offer_id=offer.id,
        total_price=total_price
    )
    db.add(db_item)
    db.flush() # Assign an ID to db_item
    
    # Update offer total
    offer.total_amount = calculate_offer_total(db, offer_id=offer.id)
    db.add(offer)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def get_offer_line_item(db: Session, line_item_id: int) -> Optional[models.OfferLineItem]:
    """Gets a single offer line item by its ID."""
    return db.query(models.OfferLineItem).filter(models.OfferLineItem.id == line_item_id).first()

def update_offer_line_item(db: Session, db_item: models.OfferLineItem, item_update: schemas.OfferLineItemUpdate) -> models.OfferLineItem:
    """Updates a line item and recalculates offer total."""
    update_data = item_update.model_dump(exclude_unset=True)
    needs_recalculation = False
    
    for key, value in update_data.items():
        setattr(db_item, key, value)
        if key in ['quantity', 'unit_price']:
            needs_recalculation = True

    if needs_recalculation:
        db_item.total_price = db_item.quantity * db_item.unit_price
        
    db.add(db_item)
    db.flush() # Apply changes before recalculating total
    
    # Update offer total
    offer = db_item.offer # Assumes relationship is loaded or accessible
    offer.total_amount = calculate_offer_total(db, offer_id=offer.id)
    db.add(offer)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def remove_line_item_from_offer(db: Session, db_item: models.OfferLineItem):
    """Removes a line item from an offer and updates the offer total."""
    offer = db_item.offer
    db.delete(db_item)
    db.flush() # Apply deletion before recalculating
    
    # Update offer total
    offer.total_amount = calculate_offer_total(db, offer_id=offer.id)
    db.add(offer)
    
    db.commit()

# --- NEW: User License CRUD Operations ---

def create_user_license(db: Session, license_data: schemas.UserLicenseCreate, user_id: int, file_path: str, filename: str) -> models.UserLicense:
    """Creates a new license record for a user."""
    db_license = models.UserLicense(
        **license_data.model_dump(),
        user_id=user_id,
        file_path=file_path,
        filename=filename
    )
    db.add(db_license)
    db.commit()
    db.refresh(db_license)
    return db_license

def get_licenses_for_user(db: Session, user_id: int) -> List[models.UserLicense]:
    """Gets all license records for a specific user."""
    return db.query(models.UserLicense).filter(models.UserLicense.user_id == user_id).order_by(models.UserLicense.issue_date.desc()).all()

def get_user_license(db: Session, license_id: int) -> Optional[models.UserLicense]:
    """Gets a single license record by its ID."""
    return db.query(models.UserLicense).filter(models.UserLicense.id == license_id).first()

def delete_user_license(db: Session, db_license: models.UserLicense):
    """Deletes a license record."""
    db.delete(db_license)
    db.commit()

# --- NEW: Event CRUD Operations ---

def create_event(db: Session, event_data: schemas.EventCreate, user: models.User) -> models.Event:
    """Creates a new event and assigns attendees."""
    attendee_ids = event_data.attendee_ids
    # Ensure creator is always an attendee
    if user.id not in attendee_ids:
        attendee_ids.append(user.id)
        
    attendees = db.query(models.User).filter(
        models.User.id.in_(attendee_ids),
        models.User.tenant_id == user.tenant_id # Ensure attendees are in the same tenant
    ).all()
    
    db_event = models.Event(
        title=event_data.title,
        description=event_data.description,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        location=event_data.location,
        project_id=event_data.project_id,
        creator_id=user.id,
        tenant_id=user.tenant_id,
        attendees=attendees
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_event(db: Session, event_id: int, tenant_id: Optional[int]) -> Optional[models.Event]:
    """Gets a single event by ID, including attendees and creator."""
    query = db.query(models.Event).options(
        joinedload(models.Event.attendees),
        joinedload(models.Event.creator)
    ).filter(models.Event.id == event_id)
    if tenant_id is not None:
        query = query.filter(models.Event.tenant_id == tenant_id)
    return query.first()

def get_events_for_tenant(db: Session, tenant_id: int, start: datetime, end: datetime) -> List[models.Event]:
    """Gets events within a date range for a specific tenant."""
    return db.query(models.Event).options(joinedload(models.Event.attendees)).filter(
        models.Event.tenant_id == tenant_id,
        models.Event.start_time < end, # Event starts before the range ends
        models.Event.end_time > start   # Event ends after the range starts
    ).order_by(models.Event.start_time).all()

def update_event(db: Session, db_event: models.Event, event_update: schemas.EventUpdate, tenant_id: int) -> models.Event:
    """Updates an event's details and attendees."""
    update_data = event_update.model_dump(exclude_unset=True, exclude={'attendee_ids'})
    
    for key, value in update_data.items():
        setattr(db_event, key, value)
        
    if event_update.attendee_ids is not None:
        # Ensure creator remains an attendee if they created it
        attendee_ids = set(event_update.attendee_ids)
        if db_event.creator_id == event_update.creator_id: # Assuming creator_id is part of update or check db_event
             attendee_ids.add(db_event.creator_id)
             
        # Fetch valid attendees from the database within the correct tenant
        attendees = db.query(models.User).filter(
            models.User.id.in_(list(attendee_ids)),
            models.User.tenant_id == tenant_id
        ).all()
        db_event.attendees = attendees # Replace attendees

    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def delete_event(db: Session, db_event: models.Event):
    """Deletes an event."""
    db.delete(db_event)
    db.commit()

# --- NEW: Customer CRUD Operations ---

def get_customer(db: Session, customer_id: int, tenant_id: int) -> Optional[models.Customer]:
    """Gets a single customer by ID, scoped to a tenant."""
    return db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.tenant_id == tenant_id
    ).first()

def get_customers(
    db: Session, 
    tenant_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[models.Customer]:
    """Gets a list of all customers for a tenant."""
    return db.query(models.Customer).filter(
        models.Customer.tenant_id == tenant_id
    ).order_by(models.Customer.name).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate, tenant_id: int) -> models.Customer:
    """Creates a new customer for a specific tenant."""
    # Check for duplicates explicitly to give better error messages
    if customer.kennitala:
        existing_kt = db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id, 
            models.Customer.kennitala == customer.kennitala
        ).first()
        if existing_kt:
            raise ValueError(f"Customer with Kennitala {customer.kennitala} already exists.")
            
    if customer.email:
        existing_email = db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id, 
            models.Customer.email == customer.email
        ).first()
        if existing_email:
            raise ValueError(f"Customer with email {customer.email} already exists.")

    existing_name = db.query(models.Customer).filter(
        models.Customer.tenant_id == tenant_id, 
        models.Customer.name == customer.name
    ).first()
    if existing_name:
        raise ValueError(f"Customer with name '{customer.name}' already exists.")

    db_customer = models.Customer(
        **customer.model_dump(exclude_unset=True),
        tenant_id=tenant_id
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(
    db: Session, 
    db_customer: models.Customer, 
    customer_update: schemas.CustomerUpdate
) -> models.Customer:
    """Updates a customer's details."""
    update_data = customer_update.model_dump(exclude_unset=True)
    
    tenant_id = db_customer.tenant_id
    
    # Check for duplicates on update
    if 'kennitala' in update_data and update_data['kennitala']:
        existing_kt = db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id, 
            models.Customer.kennitala == update_data['kennitala'],
            models.Customer.id != db_customer.id
        ).first()
        if existing_kt:
            raise ValueError(f"Customer with Kennitala {update_data['kennitala']} already exists.")
            
    if 'email' in update_data and update_data['email']:
        existing_email = db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id, 
            models.Customer.email == update_data['email'],
            models.Customer.id != db_customer.id
        ).first()
        if existing_email:
            raise ValueError(f"Customer with email {update_data['email']} already exists.")

    if 'name' in update_data and update_data['name']:
        existing_name = db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id, 
            models.Customer.name == update_data['name'],
            models.Customer.id != db_customer.id
        ).first()
        if existing_name:
            raise ValueError(f"Customer with name '{update_data['name']}' already exists.")

    for key, value in update_data.items():
        setattr(db_customer, key, value)
        
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, db_customer: models.Customer):
    """Deletes a customer."""
    # Note: You may want to check for dependencies (like projects) first
    db.delete(db_customer)
    db.commit()

# --- END NEW ---

# --- NEW: Labor Catalog CRUD Operations ---

def create_labor_catalog_item(db: Session, item_data: schemas.LaborCatalogItemCreate, tenant_id: int) -> models.LaborCatalogItem:
    """Creates a new labor item in the catalog for a specific tenant."""
    db_item = models.LaborCatalogItem(**item_data.model_dump(), tenant_id=tenant_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_labor_catalog_item(db: Session, item_id: int, tenant_id: int) -> Optional[models.LaborCatalogItem]:
    """Gets a single labor catalog item by ID, scoped to a tenant."""
    return db.query(models.LaborCatalogItem).filter(
        models.LaborCatalogItem.id == item_id,
        models.LaborCatalogItem.tenant_id == tenant_id
    ).first()

def get_labor_catalog_items(db: Session, tenant_id: int, skip: int, limit: int) -> List[models.LaborCatalogItem]:
    """Gets a list of all labor catalog items for a tenant."""
    return db.query(models.LaborCatalogItem).filter(
        models.LaborCatalogItem.tenant_id == tenant_id
    ).order_by(models.LaborCatalogItem.description).offset(skip).limit(limit).all()

def update_labor_catalog_item(db: Session, db_item: models.LaborCatalogItem, item_update: schemas.LaborCatalogItemUpdate) -> models.LaborCatalogItem:
    """Updates a labor catalog item's details."""
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_labor_catalog_item(db: Session, db_item: models.LaborCatalogItem):
    """Deletes a labor catalog item."""
    db.delete(db_item)
    db.commit()

# --- END NEW ---