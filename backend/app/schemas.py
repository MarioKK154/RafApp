# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta

# Base Config
class OrmConfig: from_attributes = True

# Token Schemas
class Token(BaseModel): access_token: str; token_type: str
class TokenData(BaseModel): email: Optional[str] = None

# Forward declaration
class ProjectReadBasic(BaseModel): id: int; name: str; class Config(OrmConfig): pass
class TaskReadBasic(BaseModel): id: int; title: str; class Config(OrmConfig): pass # New

# User Schemas
class UserBase(BaseModel): email: EmailStr; full_name: Optional[str] = None
class UserCreate(UserBase): password: str
class UserRead(UserBase):
    id: int; is_active: bool; is_superuser: bool; role: str
    created_at: Optional[datetime] = None; updated_at: Optional[datetime] = None
    # Optional: assigned_projects: List[ProjectReadBasic] = []
    # Optional: assigned_tasks: List[TaskReadBasic] = [] # Added optional tasks list
    class Config(OrmConfig): pass

# Project Schemas
class ProjectBase(BaseModel):
    name: str; description: Optional[str] = None; address: Optional[str] = None
    status: Optional[str] = "Planning"; start_date: Optional[datetime] = None; end_date: Optional[datetime] = None
class ProjectCreate(ProjectBase): pass
class ProjectUpdate(ProjectBase):
    name: Optional[str] = None; description: Optional[str] = None; address: Optional[str] = None
    status: Optional[str] = None; start_date: Optional[datetime] = None; end_date: Optional[datetime] = None
class ProjectRead(ProjectBase):
    id: int; creator_id: int; created_at: Optional[datetime] = None; updated_at: Optional[datetime] = None
    # Optional: members: List[UserRead] = []
    class Config(OrmConfig): pass
class ProjectAssignMember(BaseModel): user_id: int


# --- Task Schemas (Updated) ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    due_date: Optional[datetime] = None
    project_id: int
    # --- NEW: Assignee ID ---
    assignee_id: Optional[int] = None # Assignee is optional

class TaskCreate(TaskBase):
    pass # Inherits assignee_id (optional on create)

class TaskUpdate(BaseModel):
    # Allow updating these fields, all optional
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None # Allow moving tasks
    # --- NEW: Allow updating assignee ---
    assignee_id: Optional[int] = None # Can be set to null to unassign

class TaskRead(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: Include assignee details
    # assignee: Optional[UserRead] = None # Needs UserRead defined first/imported carefully

    class Config(OrmConfig): pass

# --- NEW: Schema for Assigning User to Task ---
class TaskAssignUser(BaseModel):
    user_id: int


# --- Inventory Schemas ---
# (Keep existing Inventory schemas here)
class InventoryItemBase(BaseModel): name: str; description: Optional[str] = None; quantity: Optional[float] = 0.0; unit: Optional[str] = None; location: Optional[str] = None; low_stock_threshold: Optional[float] = None
class InventoryItemCreate(InventoryItemBase): pass
class InventoryItemUpdate(InventoryItemBase): name: Optional[str] = None; description: Optional[str] = None; quantity: Optional[float] = None; unit: Optional[str] = None; location: Optional[str] = None; low_stock_threshold: Optional[float] = None
class InventoryItemRead(InventoryItemBase): id: int; created_at: Optional[datetime] = None; updated_at: Optional[datetime] = None; class Config(OrmConfig): pass

# --- Drawing Schemas ---
# (Keep existing Drawing schemas here)
class DrawingBase(BaseModel): description: Optional[str] = None; project_id: int
class DrawingCreate(DrawingBase): filename: str; filepath: str; content_type: Optional[str] = None; size_bytes: Optional[int] = None; uploader_id: int
class DrawingRead(DrawingBase): id: int; filename: str; content_type: Optional[str] = None; size_bytes: Optional[int] = None; uploaded_at: datetime; uploader_id: int; class Config(OrmConfig): pass

# --- TimeLog Schemas ---
# (Keep existing TimeLog schemas here)
class TimeLogBase(BaseModel): notes: Optional[str] = None; project_id: Optional[int] = None; task_id: Optional[int] = None
class TimeLogCreate(BaseModel): notes: Optional[str] = None; project_id: Optional[int] = None; task_id: Optional[int] = None
class TimeLogRead(TimeLogBase): id: int; start_time: datetime; end_time: Optional[datetime] = None; duration: Optional[timedelta] = None; user_id: int; class Config(OrmConfig): pass
class TimeLogStatus(BaseModel): is_clocked_in: bool; current_log: Optional[TimeLogRead] = None

# Optional: Update Forward References if needed later for nested schemas
# UserRead.update_forward_refs()
# ProjectRead.update_forward_refs()
# TaskRead.update_forward_refs()