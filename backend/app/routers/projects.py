# backend/app/routers/projects.py
# Uncondensed Version: Tenant Isolation Implemented
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Projects"],
    # All routes in this router require an active authenticated user
    dependencies=[Depends(security.get_current_active_user)]
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# For actions like create, update, delete project, and managing members
ManagerOrAdminOfTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]


AllowedProjectSortFields = Literal["name", "status", "start_date", "end_date", "created_at"]
AllowedSortDirections = Literal["asc", "desc"]

@router.post("/", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project_data: schemas.ProjectCreate, # Includes optional project_manager_id
    db: DbDependency,
    current_user: ManagerOrAdminOfTenantDependency # User creating the project
):
    """
    Creates a new project within the current user's tenant.
    If project_manager_id is provided, that user must also belong to the current user's tenant.
    The selected Project Manager is automatically added as a member of the project.
    (Requires Manager or Admin role in the current user's tenant).
    """
    if project_data.project_manager_id:
        pm_user = crud.get_user(db, user_id=project_data.project_manager_id)
        if not pm_user or pm_user.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Project Manager is invalid or does not belong to your tenant."
            )
        if pm_user.role != 'project manager': # And optionally check if they are 'admin'
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User ID {pm_user.id} is not a Project Manager."
            )

    # The crud.create_project function now takes tenant_id
    new_project = crud.create_project(
        db=db,
        project=project_data,
        creator_id=current_user.id,
        tenant_id=current_user.tenant_id # Project belongs to creator's tenant
    )
    return new_project


@router.get("/", response_model=List[schemas.ProjectRead])
async def read_all_projects_for_tenant( # Renamed for clarity
    db: DbDependency,
    current_user: CurrentUserDependency, # Any logged-in user can list projects in their tenant
    status_filter: Optional[str] = Query(None, alias="status", description="Filter projects by status"),
    sort_by: Optional[AllowedProjectSortFields] = Query('name', description="Field to sort by"),
    sort_dir: Optional[AllowedSortDirections] = Query('asc', description="Sort direction (asc or desc)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """
    Retrieves a list of all projects for the current user's tenant,
    optionally filtered by status and sorted.
    """
    # crud.get_projects now requires tenant_id
    projects = crud.get_projects(
        db=db,
        tenant_id=current_user.tenant_id,
        status=status_filter,
        sort_by=sort_by,
        sort_dir=sort_dir,
        skip=skip,
        limit=limit
    )
    return projects


@router.get("/{project_id}", response_model=schemas.ProjectRead)
async def read_single_project_for_tenant( # Renamed for clarity
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency # Any logged-in user can attempt to get a project in their tenant
):
    """
    Retrieves a single project by its ID, if it belongs to the current user's tenant.
    """
    # crud.get_project now requires tenant_id
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=current_user.tenant_id)
    if db_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant or does not exist.")
    return db_project


@router.put("/{project_id}", response_model=schemas.ProjectRead)
async def update_existing_project_for_tenant( # Renamed for clarity
    project_id: int,
    project_update_data: schemas.ProjectUpdate, # Includes optional project_manager_id
    db: DbDependency,
    current_user: ManagerOrAdminOfTenantDependency # User updating the project
):
    """
    Updates an existing project within the current user's tenant.
    If project_manager_id is being updated, that user must belong to the current user's tenant.
    (Requires Manager or Admin role in the current user's tenant).
    """
    if project_update_data.project_manager_id is not None: # If PM is being set or changed
        pm_user = crud.get_user(db, user_id=project_update_data.project_manager_id)
        if not pm_user or pm_user.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected Project Manager is invalid or does not belong to your tenant."
            )
        if pm_user.role != 'project manager':
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User ID {pm_user.id} is not a Project Manager."
            )
    
    # crud.update_project now requires tenant_id
    updated_project = crud.update_project(
        db=db,
        project_id=project_id,
        project_update=project_update_data,
        tenant_id=current_user.tenant_id
    )
    if updated_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant or does not exist.")
    return updated_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project_for_tenant( # Renamed for clarity
    project_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminOfTenantDependency # User deleting the project
):
    """
    Deletes an existing project within the current user's tenant.
    (Requires Manager or Admin role in the current user's tenant).
    """
    # crud.delete_project now requires tenant_id
    deleted_project = crud.delete_project(db=db, project_id=project_id, tenant_id=current_user.tenant_id)
    if deleted_project is None: # crud.delete_project already calls get_project which checks tenant
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant or does not exist.")
    return None


# --- Project Membership Endpoints (Now Tenant-Aware) ---

@router.get("/{project_id}/members", response_model=List[schemas.UserReadBasic]) # Use UserReadBasic for member list
async def get_project_member_list_for_tenant( # Renamed for clarity
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency # Any member of the tenant can view members of a project in that tenant
):
    """Gets the list of members for a specific project within the current user's tenant."""
    # First, ensure the project itself belongs to the user's tenant
    project = crud.get_project(db=db, project_id=project_id, tenant_id=current_user.tenant_id)
    if not project:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    
    # crud.get_project_members also now requires tenant_id
    members = crud.get_project_members(db=db, project_id=project_id, tenant_id=current_user.tenant_id)
    return members


@router.post("/{project_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def assign_member_to_project_for_tenant( # Renamed for clarity
    project_id: int,
    assignment: schemas.ProjectAssignMember,
    db: DbDependency,
    current_user_assigning: ManagerOrAdminOfTenantDependency # User assigning member
):
    """
    Assigns a user to a project within the current user's tenant.
    The user being assigned must also belong to the same tenant.
    (Requires Manager or Admin role in the current user's tenant).
    """
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=current_user_assigning.tenant_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    
    user_to_assign = crud.get_user(db=db, user_id=assignment.user_id)
    if not user_to_assign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to assign not found.")
    
    if user_to_assign.tenant_id != current_user_assigning.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign users from a different tenant.")

    # crud.add_member_to_project already checks if user and project are in same tenant
    success = crud.add_member_to_project(db=db, project=db_project, user=user_to_assign)
    if not success:
        # This might happen if user is already a member, or if tenant check in CRUD failed (redundant here but safe)
        # For now, we don't distinguish, but a 204 is still okay if already member.
        # If crud.add_member_to_project raised an error for tenant mismatch, it would be caught.
        pass
    return None


@router.delete("/{project_id}/members/{user_id_to_remove}", status_code=status.HTTP_204_NO_CONTENT) # Renamed param
async def remove_member_from_project_for_tenant( # Renamed for clarity
    project_id: int,
    user_id_to_remove: int, # Renamed from user_id to avoid conflict with current_user.id
    db: DbDependency,
    current_user_removing: ManagerOrAdminOfTenantDependency # User removing member
):
    """
    Removes a user from a project within the current user's tenant.
    (Requires Manager or Admin role in the current user's tenant).
    """
    db_project = crud.get_project(db=db, project_id=project_id, tenant_id=current_user_removing.tenant_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in your tenant.")
    
    user_to_remove = crud.get_user(db=db, user_id=user_id_to_remove)
    if not user_to_remove:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to remove not found.")
    
    # No need to check tenant_id of user_to_remove here if db_project is already scoped.
    # The crud.remove_member_from_project will operate on the given objects.

    success = crud.remove_member_from_project(db=db, project=db_project, user=user_to_remove)
    if not success:
        # This could mean the user was not a member of the project
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a member of this project or removal failed.")
    return None