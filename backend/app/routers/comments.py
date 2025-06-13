# backend/app/routers/comments.py
# Uncondensed Version: Tenant Isolation for Comment Deletion
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Task Comments"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Define who can moderate/delete comments (e.g., author, or TL/PM/Admin of the project)
CommentModeratorDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"])) ]


# Helper function to get comment and verify tenant ownership via its task/project
async def get_comment_and_verify_tenant(
    comment_id: int, db: DbDependency, current_user: CurrentUserDependency
) -> models.TaskComment:
    db_comment = crud.get_comment(db, comment_id=comment_id) # crud.get_comment now loads task.project.tenant
    if not db_comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    # Verify task, project, and tenant exist
    if not db_comment.task or not db_comment.task.project or not db_comment.task.project.tenant:
        # This indicates a data integrity issue or incomplete loading in CRUD
        # crud.get_comment should ensure these are loaded.
        db.refresh(db_comment.task, attribute_names=['project'])
        if db_comment.task.project:
             db.refresh(db_comment.task.project, attribute_names=['tenant'])
        if not db_comment.task or not db_comment.task.project or not db_comment.task.project.tenant:
              raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Comment's task, project, or tenant link is broken.")

    if not current_user.is_superuser and db_comment.task.project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this comment")
    return db_comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_comment(
    comment_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency # Any logged-in user can attempt, further checks below
):
    """
    Deletes a task comment.
    Allowed if user is the author, or an Admin/PM/TL of the project's tenant, or a Superuser.
    """
    db_comment = await get_comment_and_verify_tenant(comment_id, db, current_user) # Verifies tenant

    # Permission check: Author or Admin/PM/TL of the project's tenant or Superuser
    is_author = db_comment.author_id == current_user.id
    is_project_moderator = current_user.role in ["admin", "project manager", "team leader"] and \
                           db_comment.task.project.tenant_id == current_user.tenant_id

    can_delete = is_author or is_project_moderator or current_user.is_superuser

    if not can_delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")

    deleted_comment = crud.delete_comment(db=db, comment_id=db_comment.id)
    if deleted_comment is None: # Should have been caught by get_comment_and_verify_tenant
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found during delete attempt.")

    return None