from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime

from app import crud_chat, schemas, models
from app.database import get_db
from app.security import get_current_active_user, get_current_user_tenant_id

router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

# In-memory store for active websocket connections per user
# user_id -> List[WebSocket]
active_connections: Dict[int, List[WebSocket]] = {}

def get_current_user_id(current_user: models.User = Depends(get_current_active_user)) -> int:
    return current_user.id

@router.post("/threads", response_model=schemas.ChatThreadRead)
def create_thread(
    thread_in: schemas.ChatThreadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    tenant_id: int = Depends(get_current_user_tenant_id)
):
    if current_user.id not in thread_in.participant_user_ids:
        thread_in.participant_user_ids.append(current_user.id)
    return crud_chat.create_thread(db=db, thread_in=thread_in, tenant_id=tenant_id)


@router.get("/unread-count")
def get_unread_chat_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # A thread has unread messages if there is a message created after the user's last_read_at
    # We join ThreadParticipant and ChatMessage
    count = db.query(models.ChatThread).join(
        models.ThreadParticipant, models.ChatThread.id == models.ThreadParticipant.thread_id
    ).join(
        models.ChatMessage, models.ChatThread.id == models.ChatMessage.thread_id
    ).filter(
        models.ThreadParticipant.user_id == current_user.id,
        models.ChatMessage.author_id != current_user.id,
        (models.ThreadParticipant.last_read_at == None) | (models.ChatMessage.created_at > models.ThreadParticipant.last_read_at)
    ).distinct().count()
    
    return {"count": count}

@router.get("/threads", response_model=List[schemas.ChatThreadRead])
def read_user_threads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    tenant_id: int = Depends(get_current_user_tenant_id)
):
    threads = crud_chat.get_user_threads(db=db, user_id=current_user.id, tenant_id=tenant_id)
    return threads

@router.get("/threads/{thread_id}/messages", response_model=List[schemas.ChatMessageRead])
def read_thread_messages(
    thread_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    thread = crud_chat.get_thread(db=db, thread_id=thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if user is participant
    participant = next((p for p in thread.participants if p.user_id == current_user.id), None)
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to view this thread")

    # Update last_read_at
    from sqlalchemy.sql import func
    participant.last_read_at = func.now()
    db.commit()

    messages = crud_chat.get_thread_messages(db=db, thread_id=thread_id, limit=limit, offset=offset)
    return messages

@router.post("/messages", response_model=schemas.ChatMessageRead)
async def create_message(
    message_in: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    thread = crud_chat.get_thread(db=db, thread_id=message_in.thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if current_user.id not in [p.user_id for p in thread.participants]:
        raise HTTPException(status_code=403, detail="Not authorized to post in this thread")

    new_msg = crud_chat.create_message(db=db, message_in=message_in, author_id=current_user.id)
    
    # Simple WebSocket broadcast to active participants
    for participant in thread.participants:
        p_id = participant.user_id
        if p_id in active_connections:
            for connection in active_connections[p_id]:
                try:
                    await connection.send_text(json.dumps({
                        "event": "new_message",
                        "thread_id": new_msg.thread_id,
                        "message_id": new_msg.id,
                        "content": new_msg.content,
                        "author_id": new_msg.author_id
                    }))
                except:
                    pass

    return new_msg


# WebSocket endpoint for real-time updates
@router.websocket("/ws/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: int):
    # In a production environment, you must secure the WS connection with a token.
    # For now, we accept by user_id for simplicity in this implementation phase.
    await websocket.accept()
    if user_id not in active_connections:
        active_connections[user_id] = []
    active_connections[user_id].append(websocket)
    try:
        while True:
            # Keep connection open, waiting for client messages if necessary
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections[user_id].remove(websocket)
        if not active_connections[user_id]:
            del active_connections[user_id]
