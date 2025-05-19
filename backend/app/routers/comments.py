# backend/app/routers/comments.py
# Re-verified version
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    tags=["Comments"],
    dependencies=[Depends(security.get_current_active_user)]
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
# Roles allowed to delete comments besides the author
CommentModeratorRoles = ["admin", "project manager", "team leader"]

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_comment(
    comment_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """Deletes a task comment (Author or Moderator)."""
    db_comment = crud.get_comment(db, comment_id=comment_id)
    if not db_comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    # Authorization Check
    is_author = (db_comment.author_id == current_user.id)
    is_moderator = (current_user.role in CommentModeratorRoles)

    if not is_author and not is_moderator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")

    crud.delete_comment(db=db, comment_id=comment_id)
    return None # Return No Content