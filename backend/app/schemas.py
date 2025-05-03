# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
from datetime import datetime, timedelta

# --- Base Config for Relationship Loading ---
class OrmConfig:
    from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Forward declarations ---
class ProjectReadBasic(BaseModel):
    id: int
    name: str

    class Config(OrmConfig): pass

class TaskReadBasic(BaseModel):
    id: int
    title: str

    class Config(OrmConfig): pass

class UserReadBasic(BaseModel): # Basic user info for project members list perhaps
    id: int
    email: EmailStr
    full_name: Optional[str] = None

    class Config(OrmConfig): pass


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str # Password required only on creation

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool # Included for completeness
    role: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: assigned_projects: List[ProjectReadBasic] = []
    # Optional: assigned_tasks: List[TaskReadBasic] = [] # Added optional tasks list

    class Config(OrmConfig): pass # Use OrmConfig

# --- Schema for Admin updating User ---
class UserUpdateAdmin(BaseModel):
    # Fields an admin might change. All optional.
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role: Optional[str] = None # e.g., "admin", "project manager", "team leader", "electrician"
    # Note: Password is NOT updated here. Use a separate process for password changes.


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

# Schema for reading project details
class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: members: List[UserReadBasic] = [] # Use basic schema to avoid deep nesting

    class Config(OrmConfig): pass # Use OrmConfig

# Schema for Assigning Member
class ProjectAssignMember(BaseModel):
    user_id: int


# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    due_date: Optional[datetime] = None
    project_id: int
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
    assignee_id: Optional[int] = None # Can be set to null to unassign

class TaskRead(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: Include assignee details
    # assignee: Optional[UserReadBasic] = None

    class Config(OrmConfig): pass

# Schema for Assigning User to Task
class TaskAssignUser(BaseModel):
    user_id: int


# --- Inventory Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: Optional[float] = 0.0
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str | None] = None
    shop_url_2: Optional[HttpUrl | str | None] = None
    shop_url_3: Optional[HttpUrl | str | None] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Exclude URLs from this base read schema using exclude=True on the fields themselves
    shop_url_1: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_2: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_3: Optional[HttpUrl | str] = Field(None, exclude=True)

    class Config(OrmConfig): pass

class InventoryItemReadWithURLs(InventoryItemRead):
    # Redeclare fields here to make them included (overriding exclude=True from parent)
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None

    # Inherits Config from parent


# --- Drawing Schemas ---
class DrawingBase(BaseModel):
    description: Optional[str] = None
    project_id: int

class DrawingCreate(DrawingBase):
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int

class DrawingRead(DrawingBase):
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploaded_at: datetime
    uploader_id: int

    class Config(OrmConfig): pass


# --- TimeLog Schemas ---
class TimeLogBase(BaseModel):
    notes: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class TimeLogCreate(BaseModel):
    notes: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class TimeLogRead(TimeLogBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[timedelta] = None
    user_id: int

    class Config(OrmConfig): pass

class TimeLogStatus(BaseModel):
    is_clocked_in: bool
    current_log: Optional[TimeLogRead] = None

# Optional: Update Forward References if relationships are uncommented and cause issues
# UserRead.model_rebuild() # Pydantic v2 method
# ProjectRead.model_rebuild()
# TaskRead.model_rebuild()