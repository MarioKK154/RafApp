# backend/app/schemas.py
# Uncondensed Version: Added start_date to Task schemas
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
from datetime import datetime, timedelta

# --- Base Config ---
class OrmConfig:
    from_attributes = True

# --- Forward declarations ---
class ProjectReadBasic(BaseModel):
    id: int
    name: str
    class Config(OrmConfig): pass

class TaskReadBasic(BaseModel):
    id: int
    title: str
    class Config(OrmConfig): pass

class UserReadBasic(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    class Config(OrmConfig): pass

class TaskCommentReadBasic(BaseModel):
    id: int; content: str; created_at: datetime; author_id: int
    class Config(OrmConfig): pass

class TaskPhotoReadBasic(BaseModel):
    id: int; filename: str; uploaded_at: datetime
    class Config(OrmConfig): pass

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
class UserCreateAdmin(UserBase):
    password: str; role: Optional[str] = "employee"; is_active: Optional[bool] = True; is_superuser: Optional[bool] = False
class UserRead(UserBase):
    id: int; is_active: bool; is_superuser: bool; role: str
    created_at: Optional[datetime] = None; updated_at: Optional[datetime] = None
    class Config(OrmConfig): pass
class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None; full_name: Optional[str] = None
    is_active: Optional[bool] = None; is_superuser: Optional[bool] = None
    role: Optional[str] = None

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str; description: Optional[str] = None; address: Optional[str] = None
    status: Optional[str] = "Planning"; start_date: Optional[datetime] = None; end_date: Optional[datetime] = None
class ProjectCreate(ProjectBase): pass
class ProjectUpdate(ProjectBase):
    name: Optional[str] = None; description: Optional[str] = None; address: Optional[str] = None
    status: Optional[str] = None; start_date: Optional[datetime] = None; end_date: Optional[datetime] = None
class ProjectRead(ProjectBase):
    id: int; creator_id: int; created_at: Optional[datetime] = None; updated_at: Optional[datetime] = None
    class Config(OrmConfig): pass
class ProjectAssignMember(BaseModel):
    user_id: int

# --- Task Schemas (Updated) ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    # --- NEW: Added start_date ---
    start_date: Optional[datetime] = None # Optional start date for Gantt
    # --- End New Field ---
    due_date: Optional[datetime] = None
    project_id: int
    assignee_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass # Inherits start_date (optional on create)

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    # --- NEW: Added start_date ---
    start_date: Optional[datetime] = None # Allow updating start date
    # --- End New Field ---
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    assignee_id: Optional[int] = None

class TaskRead(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config(OrmConfig): pass

class TaskAssignUser(BaseModel):
    user_id: int

# --- Task Comment Schemas ---
class TaskCommentBase(BaseModel): content: str = Field(..., min_length=1)
class TaskCommentCreate(TaskCommentBase): pass
class TaskCommentRead(TaskCommentBase): id: int; created_at: datetime; task_id: int; author_id: int; author: Optional[UserReadBasic] = None; class Config(OrmConfig): pass

# --- Task Photo Schemas ---
class TaskPhotoBase(BaseModel): description: Optional[str] = None
class TaskPhotoCreate(TaskPhotoBase): filename: str; filepath: str; content_type: Optional[str] = None; size_bytes: Optional[int] = None; uploader_id: int; task_id: int
class TaskPhotoRead(TaskPhotoBase): id: int; filename: str; content_type: Optional[str] = None; size_bytes: Optional[int] = None; uploaded_at: datetime; uploader_id: int; task_id: int; uploader: Optional[UserReadBasic] = None; class Config(OrmConfig): pass

# --- Inventory Schemas ---
# ... (Inventory schemas as before) ...
class InventoryItemBase(BaseModel): name: str; description: Optional[str] = None; quantity: Optional[float] = 0.0; quantity_needed: Optional[float] = 0.0; unit: Optional[str] = None; location: Optional[str] = None; low_stock_threshold: Optional[float] = None; shop_url_1: Optional[HttpUrl | str] = None; shop_url_2: Optional[HttpUrl | str] = None; shop_url_3: Optional[HttpUrl | str] = None
class InventoryItemCreate(InventoryItemBase): pass
class InventoryItemUpdate(InventoryItemBase): name: Optional[str]=None; description: Optional[str]=None; quantity: Optional[float]=None; quantity_needed: Optional[float] = None; unit: Optional[str]=None; location: Optional[str]=None; low_stock_threshold: Optional[float]=None; shop_url_1: Optional[HttpUrl | str | None]=None; shop_url_2: Optional[HttpUrl | str | None]=None; shop_url_3: Optional[HttpUrl | str | None]=None
class InventoryItemRead(InventoryItemBase): id: int; created_at: Optional[datetime]=None; updated_at: Optional[datetime]=None; shop_url_1: Optional[HttpUrl | str]=Field(None, exclude=True); shop_url_2: Optional[HttpUrl | str]=Field(None, exclude=True); shop_url_3: Optional[HttpUrl | str]=Field(None, exclude=True); class Config(OrmConfig): pass
class InventoryItemReadWithURLs(InventoryItemRead): shop_url_1: Optional[HttpUrl | str]=None; shop_url_2: Optional[HttpUrl | str]=None; shop_url_3: Optional[HttpUrl | str]=None
class InventoryItemUpdateNeededQty(BaseModel): quantity_needed: float = Field(..., ge=0)

# --- Drawing Schemas ---
# ... (Drawing schemas as before) ...
class DrawingBase(BaseModel): description: Optional[str]=None; project_id: int
class DrawingCreate(DrawingBase): filename: str; filepath: str; content_type: Optional[str]=None; size_bytes: Optional[int]=None; uploader_id: int
class DrawingRead(DrawingBase): id: int; filename: str; content_type: Optional[str]=None; size_bytes: Optional[int]=None; uploaded_at: datetime; uploader_id: int; class Config(OrmConfig): pass

# --- TimeLog Schemas ---
# ... (TimeLog schemas as before) ...
class TimeLogBase(BaseModel): notes: Optional[str]=None; project_id: Optional[int]=None; task_id: Optional[int]=None
class TimeLogCreate(BaseModel): notes: Optional[str]=None; project_id: Optional[int]=None; task_id: Optional[int]=None
class TimeLogRead(TimeLogBase): id: int; start_time: datetime; end_time: Optional[datetime]=None; duration: Optional[timedelta]=None; user_id: int; class Config(OrmConfig): pass
class TimeLogStatus(BaseModel): is_clocked_in: bool; current_log: Optional[TimeLogRead]=None