# backend/app/routers/tasks.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal
import os # For file operations if needed by sub-components
import shutil # For file operations if needed by sub-components

from .. import crud, models, schemas, security
from ..database import get_db
# Assuming UPLOAD_DIRECTORY_TASK_PHOTOS is defined if you handle file saving directly here
# from ..config import UPLOAD_DIRECTORY_TASK_PHOTOS

router = APIRouter(
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigherTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))] # For commissioning

AllowedTaskSortFields = Literal["title", "status", "priority", "start_date", "due_date", "created_at", "id"]
AllowedSortDirections = Literal["asc", "desc"]

# Helper function to check if a project belongs to the current user's tenant
# or if the user is a superuser (who can access any tenant's project if specified)
def get_project_for_tenant_or_superuser(db: Session, project_id: int, current_user: models.User) -> Optional[models.Project]:
    if current_user.is_superuser:
        # Superuser can access any project by ID, tenant_id check is bypassed in crud for them if tenant_id is None
        project = crud.get_project(db, project_id=project_id, tenant_id=None) # Or pass project.tenant_id if known
    else:
        project = crud.get_project(db, project_id=project_id, tenant_id=current_user.tenant_id)
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible in your tenant.")
    # If superuser and project has a different tenant, this is allowed for them
    # If not superuser, crud.get_project would have returned None if tenant_id didn't match
    return project

# Helper function to get a task and verify tenant ownership via its project
async def get_task_and_verify_tenant(task_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Task:
    db_task = crud.get_task(db, task_id=task_id) # get_task eager loads project.tenant
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not current_user.is_superuser and db_task.project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task")
    return db_task


@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task_data: schemas.TaskCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency # Role check includes tenant context implicitly
):
    project = get_project_for_tenant_or_superuser(db, project_id=task_data.project_id, current_user=current_user)
    # Project now confirmed to be accessible by current_user (either in their tenant or they are superuser)
    # crud.create_task was updated to accept project_tenant_id to check assignee
    
    if task_data.assignee_id:
        assignee = crud.get_user(db, user_id=task_data.assignee_id)
        if not assignee or assignee.tenant_id != current_user.tenant_id: # Assignee must be in the same tenant
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee not found or not in your tenant.")

    return crud.create_task(db=db, task=task_data, project_tenant_id=project.tenant_id)


@router.get("/", response_model=List[schemas.TaskRead])
async def read_all_tasks(
    db: DbDependency,
    current_user: CurrentUserDependency,
    project_id: Optional[int] = Query(None, description="Filter tasks by project ID"),
    assignee_id: Optional[int] = Query(None, description="Filter tasks by assignee ID"),
    status: Optional[schemas.TaskStatusLiteral] = Query(None, description="Filter tasks by status"),
    sort_by: Optional[AllowedTaskSortFields] = Query('id', description="Field to sort tasks by"),
    sort_dir: Optional[AllowedSortDirections] = Query('asc', description="Sort direction (asc or desc)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    effective_project_id = project_id
    if project_id:
        # Verify the provided project_id belongs to the user's tenant if not superuser
        project = get_project_for_tenant_or_superuser(db, project_id=project_id, current_user=current_user)
        # If it passed, project_id is valid for this user's context
    elif not current_user.is_superuser:
        # If not superuser and no project_id specified, list tasks only from projects in their tenant
        # This requires modifying crud.get_tasks to accept tenant_id and join with projects table
        # For now, crud.get_tasks doesn't filter by tenant directly if project_id is None.
        # This means non-superusers without a project_id filter would see tasks from all projects if API is hit directly.
        # Frontend UI should always provide project_id for non-superusers or rely on assignee_id.
        # Or, we fetch all projects for the tenant and then all tasks for those projects.
        # For simplicity now, if project_id is None, no tenant filter is applied at CRUD level,
        # but a superuser could see all, while others would typically use frontend filters.
        # A stricter approach for non-superusers:
        # projects_in_tenant = crud.get_projects(db, tenant_id=current_user.tenant_id, limit=1000) # Get all projects in tenant
        # project_ids_in_tenant = [p.id for p in projects_in_tenant]
        # query = query.filter(models.Task.project_id.in_(project_ids_in_tenant)) # This logic belongs in CRUD
        # For now, let's assume crud.get_tasks will be enhanced or this listing is mainly for specific projects/assignees
        pass


    # If assignee_id is specified, ensure the assignee is in the current_user's tenant (unless superuser)
    if assignee_id and not current_user.is_superuser:
        assignee = crud.get_user(db, user_id=assignee_id)
        if not assignee or assignee.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view tasks for assignee in another tenant.")

    tasks = crud.get_tasks(
        db=db, project_id=effective_project_id, assignee_id=assignee_id,
        status=status, sort_by=sort_by, sort_dir=sort_dir,
        skip=skip, limit=limit
    )
    # Further filter tasks if current_user is not superuser and project_id was not specified
    # to ensure only tasks from their tenant are returned.
    if not project_id and not current_user.is_superuser:
        tasks = [task for task in tasks if task.project.tenant_id == current_user.tenant_id]
        
    return tasks


@router.get("/{task_id}", response_model=schemas.TaskRead)
async def read_single_task(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    return db_task


@router.put("/{task_id}", response_model=schemas.TaskRead)
async def update_existing_task(
    task_id: int,
    task_update_data: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user) # Verifies tenant

    if task_update_data.project_id and task_update_data.project_id != db_task.project_id:
        # If project is being changed, verify new project is in tenant
        new_project = get_project_for_tenant_or_superuser(db, project_id=task_update_data.project_id, current_user=current_user)
        # new_project will raise 404 if not found/accessible
    
    if task_update_data.assignee_id is not None:
        if task_update_data.assignee_id == "" or task_update_data.assignee_id == 0: # Allow unassigning
            pass
        else:
            assignee = crud.get_user(db, user_id=task_update_data.assignee_id)
            if not assignee or assignee.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New assignee not found or not in your tenant.")

    updated_task = crud.update_task(db=db, task_id=task_id, task_update=task_update_data, project_tenant_id=db_task.project.tenant_id)
    # crud.update_task needs project_tenant_id to re-verify assignee if it's changed within the schema
    return updated_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_task(
    task_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user) # Verifies tenant
    crud.delete_task(db=db, task_id=db_task.id) # crud.delete_task uses get_task which might not re-verify tenant
    return None


@router.post("/{task_id}/commission", response_model=schemas.TaskRead)
async def commission_task_endpoint(
    task_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user) # Verifies tenant
    if db_task.status != "Done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Task must be 'Done'. Current status: {db_task.status}")
    if db_task.is_commissioned:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task already commissioned.")
    commissioned_task = crud.commission_task(db=db, task_to_commission=db_task)
    return commissioned_task

# --- Task Assignment Endpoints ---
@router.post("/{task_id}/assign", response_model=schemas.TaskRead)
async def assign_task_to_user(
    task_id: int,
    assignment: schemas.TaskAssignUser,
    db: DbDependency,
    assigner: TeamLeaderOrHigherTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=assigner) # Verify assigner can access task
    
    user_to_assign = crud.get_user(db, user_id=assignment.user_id)
    if not user_to_assign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to assign not found.")
    if user_to_assign.tenant_id != assigner.tenant_id and not assigner.is_superuser: # Check tenant of user being assigned
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign user from a different tenant.")
        
    return crud.assign_user_to_task(db=db, task=db_task, user=user_to_assign)

@router.delete("/{task_id}/assign", response_model=schemas.TaskRead)
async def unassign_task_from_user(
    task_id: int,
    db: DbDependency,
    assigner: TeamLeaderOrHigherTenantDependency
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=assigner)
    if db_task.assignee_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is not currently assigned.")
    return crud.unassign_user_from_task(db=db, task=db_task)

@router.get("/assigned/me", response_model=List[schemas.TaskRead])
async def read_my_assigned_tasks(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    # crud.get_tasks_assigned_to_user was updated in crud.py to accept tenant_id
    tasks = crud.get_tasks_assigned_to_user(db=db, user_id=current_user.id, tenant_id=current_user.tenant_id, skip=skip, limit=limit)
    return tasks

# --- Task Comment Endpoints ---
@router.post("/{task_id}/comments/", response_model=schemas.TaskCommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment_for_task(
    task_id: int,
    comment: schemas.TaskCommentCreate,
    db: DbDependency,
    current_user: CurrentUserDependency # Any authenticated user in the tenant can comment on tasks in their tenant
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    new_comment = crud.create_task_comment(db=db, comment=comment, task_id=db_task.id, author_id=current_user.id)
    return new_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.TaskCommentRead])
async def read_comments_for_task(
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    comments = crud.get_comments_for_task(db=db, task_id=db_task.id, skip=skip, limit=limit)
    return comments

# Note: DELETE /comments/{comment_id} is in routers/comments.py and will also need tenant check
# Note: Task Photo endpoints are in routers/task_photos.py and will need tenant check via task_id

# --- NEW: Task Dependency Endpoints ---

@router.post("/{task_id}/dependencies", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
async def add_dependency_to_task(
    task_id: int,
    dependency: schemas.TaskDependencyCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """
    Adds a predecessor dependency to a task.
    A task can only depend on another task within the same project.
    """
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(dependency.predecessor_id, db, current_user)

    # Validation checks
    if task.id == predecessor_task.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A task cannot depend on itself.")
    
    if task.project_id != predecessor_task.project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tasks must be in the same project to have dependencies.")

    updated_task = crud.add_task_dependency(db=db, task=task, predecessor=predecessor_task)
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Circular dependency detected.")
        
    return updated_task


@router.delete("/{task_id}/dependencies/{predecessor_id}", response_model=schemas.TaskRead)
async def remove_dependency_from_task(
    task_id: int,
    predecessor_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Removes a predecessor dependency from a task."""
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(predecessor_id, db, current_user)

    updated_task = crud.remove_task_dependency(db=db, task=task, predecessor=predecessor_task)
    return updated_task

# --- END NEW ---