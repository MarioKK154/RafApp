from typing import List, Optional
from sqlalchemy.orm import Session
from app import models, schemas
from sqlalchemy import or_

def create_thread(db: Session, thread_in: schemas.ChatThreadCreate, tenant_id: int) -> models.ChatThread:
    db_thread = models.ChatThread(
        tenant_id=tenant_id,
        project_id=thread_in.project_id,
        name=thread_in.name,
        is_group=thread_in.is_group
    )
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)

    for uid in thread_in.participant_user_ids:
        db_participant = models.ThreadParticipant(
            thread_id=db_thread.id,
            user_id=uid
        )
        db.add(db_participant)
    db.commit()
    db.refresh(db_thread)
    return db_thread

def get_user_threads(db: Session, user_id: int, tenant_id: int) -> List[models.ChatThread]:
    # Find all threads where user is a participant
    participant_threads = db.query(models.ThreadParticipant.thread_id).filter(
        models.ThreadParticipant.user_id == user_id
    ).subquery()

    threads = db.query(models.ChatThread).filter(
        models.ChatThread.tenant_id == tenant_id,
        models.ChatThread.id.in_(participant_threads)
    ).all()
    return threads

def get_thread(db: Session, thread_id: int) -> Optional[models.ChatThread]:
    return db.query(models.ChatThread).filter(models.ChatThread.id == thread_id).first()

def get_thread_messages(db: Session, thread_id: int, limit: int = 50, offset: int = 0) -> List[models.ChatMessage]:
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.thread_id == thread_id
    ).order_by(models.ChatMessage.created_at.desc()).offset(offset).limit(limit).all()

def create_message(db: Session, message_in: schemas.ChatMessageCreate, author_id: int) -> models.ChatMessage:
    db_msg = models.ChatMessage(
        thread_id=message_in.thread_id,
        author_id=author_id,
        content=message_in.content,
        attachment_url=message_in.attachment_url
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    
    # Update thread's updated_at
    db_thread = db.query(models.ChatThread).filter(models.ChatThread.id == message_in.thread_id).first()
    if db_thread:
        # Just triggering onupdate
        db_thread.name = db_thread.name 
        db.add(db_thread)
        db.commit()

    return db_msg
