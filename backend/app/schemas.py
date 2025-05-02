# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta # Import timedelta

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    due_date: Optional[datetime] = None
    project_id: int

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None

class TaskRead(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Inventory Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: Optional[float] = 0.0
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Drawing Schemas ---
class DrawingBase(BaseModel):
    description: Optional[str] = None
    project_id: int

class DrawingCreate(DrawingBase):
    # Fields populated during upload/saving metadata
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int

class DrawingRead(DrawingBase):
    id: int
    filename: str
    # filepath might be sensitive or internal, decide if needed in response
    # filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploaded_at: datetime
    uploader_id: int
    # Optional: Include uploader details
    # uploader: UserRead # Requires relationship loading

    class Config:
        from_attributes = True


# --- TimeLog Schemas ---
class TimeLogBase(BaseModel):
    notes: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None

# Used when clocking in (most fields set automatically)
class TimeLogCreate(BaseModel):
    notes: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None

# Read schema includes calculated duration etc.
class TimeLogRead(TimeLogBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[timedelta] = None # Duration as timedelta
    user_id: int
    # Optional: include user details
    # user: UserRead

    class Config:
        from_attributes = True

# Schema to represent current clock-in status
class TimeLogStatus(BaseModel):
    is_clocked_in: bool
    current_log: Optional[TimeLogRead] = None # The currently open log, if any