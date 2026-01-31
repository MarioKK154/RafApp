# backend/app/routers/comments.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/comments",
    tags=["Task Comments"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]

async def get_comment_and_verify_tenant(
    comment_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.TaskComment:
    """
    Helper to fetch a comment and verify tenant access.
    Superusers bypass the tenant check.
    """
    db_comment = crud.get_comment(db, comment_id=comment_id)
    if not db_comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    # Safety check for the relationship chain
    if not db_comment.task or not db_comment.task.project:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Comment's task or project link is missing from database."
        )

    # Verify tenant ownership unless user is Superadmin
    effective_tenant_id = db_comment.task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this comment")
    
    return db_comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_task_comment(
    request: Request,
    comment_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Deletes a specific task comment.
    Authorized users: The author, an Admin/PM/Team Lead of the tenant, or a Superadmin.
    """
    db_comment = await get_comment_and_verify_tenant(comment_id, db, current_user)

    # Permission logic
    is_author = db_comment.author_id == current_user.id
    is_project_moderator = current_user.role in ["admin", "project manager", "team_lead"] # Fixed role string consistency
    can_delete = is_author or is_project_moderator or current_user.is_superuser

    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have permission to delete this comment."
        )

    crud.delete_comment(db=db, comment_id=db_comment.id)
    return None