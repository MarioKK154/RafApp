from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models
from ..database import get_db

# CHANGE THIS LINE: Import from security, not auth
from ..security import get_current_user 

from pydantic import BaseModel
import logging

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

logger = logging.getLogger(__name__)

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return {"count": count}

@router.get("/", response_model=List[schemas.NotificationRead])
def read_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_notifications(db, user_id=current_user.id, unread_only=unread_only)

@router.put("/{notification_id}/read", response_model=schemas.NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_note = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Notification node not found.")
        
    db_note.is_read = True
    db.commit()
    db.refresh(db_note)
    return db_note

@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    
    db.commit()
    return {"message": "All alerts cleared from registry."}

@router.post("/subscribe", status_code=201)
def subscribe_to_push(
    subscription: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Register a browser push subscription for the current user."""
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.endpoint == subscription.endpoint
    ).first()
    
    if existing:
        if existing.user_id != current_user.id:
            existing.user_id = current_user.id
            existing.p256dh = subscription.p256dh
            existing.auth = subscription.auth
            db.commit()
        return {"status": "ok", "message": "Subscription already exists"}
        
    new_sub = models.PushSubscription(
        user_id=current_user.id,
        endpoint=subscription.endpoint,
        p256dh=subscription.p256dh,
        auth=subscription.auth
    )
    db.add(new_sub)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save push subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to save subscription")
        
    return {"status": "ok"}
