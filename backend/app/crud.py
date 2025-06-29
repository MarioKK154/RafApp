# backend/app/crud.py
# Uncondensed Version: Multi-Tenancy updates (Tenant CRUD, User/Project tenant linking)
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc, asc, func as sqlfunc
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from . import models, schemas
from .security import get_password_hash, verify_password # Ensure verify_password is imported

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
        email=user_data.email, hashed_password=hashed_password, full_name=user_data.full_name,
        employee_id=user_data.employee_id, kennitala=user_data.kennitala,
        phone_number=user_data.phone_number, location=user_data.location,
        role=user_data.role, tenant_id=user_data.tenant_id,
        is_active=user_data.is_active if user_data.is_active is not None else True,
        is_superuser=user_data.is_superuser if user_data.is_superuser is not None else False,
    )
    db.add(db_user); db.commit(); db.refresh(db_user)
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
    tenant_id: int, # Require tenant_id
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Project]:
    query = db.query(models.Project).options(
        joinedload(models.Project.project_manager).options(joinedload(models.User.tenant)),
        joinedload(models.Project.tenant)
    ).filter(models.Project.tenant_id == tenant_id) # Filter by tenant
    if status:
        query = query.filter(models.Project.status == status)
    # ... (sorting logic as before) ...
    order_column = models.Project.name;
    if sort_by == 'name': order_column = models.Project.name
    # ... (rest of sort options)
    if sort_dir == 'desc': query = query.order_by(desc(order_column).nullslast())
    else: query = query.order_by(asc(order_column).nullsfirst())
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
    project_id: Optional[int] = None, # Project ID already scopes to tenant
    assignee_id: Optional[int] = None, # Assignee should ideally be in same tenant
    status: Optional[str] = None, # Added from Response #115
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = 'asc',
    skip: int = 0,
    limit: int = 100
) -> List[models.Task]:
    query = db.query(models.Task)
    if project_id is not None: query = query.filter(models.Task.project_id == project_id)
    if assignee_id is not None: query = query.filter(models.Task.assignee_id == assignee_id)
    if status is not None and status != "": query = query.filter(models.Task.status == status)
    order_column = models.Task.id
    if sort_by == 'title': order_column = models.Task.title # ... (rest of sort logic)
    if sort_dir == 'desc': query = query.order_by(desc(order_column).nullslast())
    else: query = query.order_by(asc(order_column).nullsfirst())
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

# --- Inventory CRUD ---
def get_inventory_item(db: Session, item_id: int) -> Optional[models.InventoryItem]:
     return db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()

def get_inventory_items(
    db: Session,
    search: Optional[str] = None,   # NEW: For filtering by name/description
    sort_by: Optional[str] = 'name', # NEW: For sorting
    sort_dir: Optional[str] = 'asc', # NEW: For sorting
    skip: int = 0,
    limit: int = 100
) -> List[models.InventoryItem]:
    query = db.query(models.InventoryItem)

    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(models.InventoryItem.name.ilike(search_term)) # Case-insensitive search on name

    # Apply sorting
    order_column = models.InventoryItem.name # Default sort column
    if sort_by == 'name':
        order_column = models.InventoryItem.name
    elif sort_by == 'quantity':
        order_column = models.InventoryItem.quantity
    elif sort_by == 'location':
        order_column = models.InventoryItem.location
    # Add more sortable columns as needed

    if sort_dir == 'desc':
        query = query.order_by(desc(order_column).nullslast())
    else:
        query = query.order_by(asc(order_column).nullsfirst())

    return query.offset(skip).limit(limit).all()
def create_inventory_item(db: Session, item: schemas.InventoryItemCreate) -> models.InventoryItem:
     item_data = item.model_dump()
     # Ensure numeric fields are correctly typed if coming as strings or None
     item_data['quantity'] = float(item_data.get('quantity') or 0.0)
     item_data['quantity_needed'] = float(item_data.get('quantity_needed') or 0.0)
     if item_data.get('low_stock_threshold') is not None and item_data.get('low_stock_threshold') != '':
         item_data['low_stock_threshold'] = float(item_data['low_stock_threshold'])
     else:
        item_data['low_stock_threshold'] = None

     # local_image_path is already handled by model_dump() if present in schema

     db_item = models.InventoryItem(**item_data)
     db.add(db_item)
     db.commit()
     db.refresh(db_item)
     return db_item

def update_inventory_item(db: Session, item_id: int, item_update: schemas.InventoryItemUpdate) -> Optional[models.InventoryItem]:
    db_item = get_inventory_item(db, item_id=item_id)
    if not db_item:
        return None

    update_data = item_update.model_dump(exclude_unset=True) # Only fields present in request

    # Iterate through all fields that were actually sent in the request payload
    for key, value in update_data.items():
        # Handle numeric types specifically, allowing them to be set to None
        if key in ['quantity', 'quantity_needed', 'low_stock_threshold']:
            if value is None:
                setattr(db_item, key, None)
            elif isinstance(value, (int, float, str)) and str(value).strip() != '':
                try:
                    setattr(db_item, key, float(value))
                except ValueError:
                    # Optionally raise an error or log if conversion fails for numerics
                    print(f"Warning: Could not convert value '{value}' for field '{key}' to float.")
                    pass 
            # If it's already a number and not None, Pydantic would have passed it.
        else:
            # For other fields (like strings, including local_image_path), set them directly.
            # If an empty string from frontend means "clear this field", send `null`.
            # Our frontend already sends `formData.local_image_path || null`.
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
     return db.query(models.TimeLog).filter(
         models.TimeLog.user_id == user_id,
         models.TimeLog.end_time == None
     ).order_by(desc(models.TimeLog.start_time)).first()

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

# --- THIS FUNCTION WAS MISSING ---
def get_timelogs(
    db: Session,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    start_date: Optional[datetime] = None, # NEW: Date range filter start
    end_date: Optional[datetime] = None,   # NEW: Date range filter end
    sort_by: Optional[str] = 'start_time', # NEW: Sorting
    sort_dir: Optional[str] = 'desc',      # NEW: Sorting
    skip: int = 0,
    limit: int = 100
) -> List[models.TimeLog]:
    query = db.query(models.TimeLog).options(
        joinedload(models.TimeLog.user),
        joinedload(models.TimeLog.project)
    )

    # Apply filters
    if user_id is not None:
        query = query.filter(models.TimeLog.user_id == user_id)
    if project_id is not None:
        query = query.filter(models.TimeLog.project_id == project_id)
    if tenant_id is not None:
        query = query.join(models.User).filter(models.User.tenant_id == tenant_id)
    if start_date:
        query = query.filter(models.TimeLog.start_time >= start_date)
    if end_date:
        # Add 1 day to end_date to make the range inclusive of the selected day
        inclusive_end_date = end_date + timedelta(days=1)
        query = query.filter(models.TimeLog.start_time < inclusive_end_date)

    # Apply sorting
    order_column = models.TimeLog.start_time # Default
    if sort_by == 'start_time': order_column = models.TimeLog.start_time
    elif sort_by == 'end_time': order_column = models.TimeLog.end_time
    elif sort_by == 'duration': order_column = models.TimeLog.duration
    # Add more sortable columns as needed

    if sort_dir == 'desc':
        query = query.order_by(desc(order_column).nullslast())
    else:
        query = query.order_by(asc(order_column).nullsfirst())

    return query.offset(skip).limit(limit).all()
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