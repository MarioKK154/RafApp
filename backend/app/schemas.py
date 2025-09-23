# backend/app/schemas.py
# Based on the user-provided version, with only the profile picture feature added.

from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime, date, time, timedelta
from os import environ # --- ADDED FOR PROFILE PICTURE ---
from pydantic import computed_field # This was in your version, so we keep it
from .models import UserRole, ProjectStatus, TaskStatus, ToolStatus, ToolLogAction
# --- ADDED FOR PROFILE PICTURE ---
# Base URL for static assets. Ensure this is set in your environment for production.
STATIC_BASE_URL = environ.get("STATIC_BASE_URL", "http://localhost:8000")
# --- END ADDITION ---


# --- Base Config ---
class OrmConfig:
    from_attributes = True

# --- Basic/Forward Declarations ---
class TenantReadBasic(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    background_image_url: Optional[str] = None

    class Config(OrmConfig):
        pass

class ProjectReadBasic(BaseModel):
    id: int
    name: str
    class Config(OrmConfig):
        pass

class TaskReadBasic(BaseModel):
    id: int
    title: str
    class Config(OrmConfig):
        pass

class UserReadBasic(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    # --- ADDED FOR PROFILE PICTURE ---
    # We will need the path to construct the URL later
    profile_picture_path: Optional[str] = None 
    
    @computed_field
    @property
    def profile_picture_url(self) -> Optional[str]:
        if self.profile_picture_path:
            return f"{STATIC_BASE_URL}/{self.profile_picture_path}"
        return None
    # --- END ADDITION ---
    class Config(OrmConfig):
        pass

class TaskCommentReadBasic(BaseModel):
    id: int
    content: str
    created_at: datetime
    task_id: int 
    author_id: int
    author: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

class TaskPhotoReadBasic(BaseModel):
    id: int
    filename: str
    description: Optional[str] = None
    uploaded_at: datetime
    uploader_id: int
    uploader: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Tenant Schemas ---
class TenantBase(BaseModel):
    name: str = Field(..., min_length=1)
    logo_url: Optional[HttpUrl | str] = None
    background_image_url: Optional[HttpUrl | str] = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    logo_url: Optional[HttpUrl | str | None] = None
    background_image_url: Optional[HttpUrl | str | None] = None

class TenantRead(TenantBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config(OrmConfig):
        pass

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None

class UserCreateAdmin(UserBase):
    password: str
    role: str
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    hourly_rate: Optional[float] = None

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
    tenant_id: Optional[int] = None
    tenant: Optional[TenantReadBasic] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assigned_projects: List[ProjectReadBasic] = []
    
    # --- ADDED FOR PROFILE PICTURE ---
    profile_picture_path: Optional[str] = None # The direct path from the DB model

    @computed_field
    @property
    def profile_picture_url(self) -> Optional[str]:
        if self.profile_picture_path:
            return f"{STATIC_BASE_URL}/{self.profile_picture_path}"
        return None
    # --- END ADDITION ---

    class Config(OrmConfig):
        pass

class UserReadAdmin(UserRead):
    hourly_rate: Optional[float] = None

class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    hourly_rate: Optional[float] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role: Optional[str] = None
    tenant_id: Optional[int] = None

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserSetPasswordByAdmin(BaseModel):
    new_password: str = Field(..., min_length=8)

class UserImportCSVRow(BaseModel):
    Name: Optional[str] = None
    Email: EmailStr
    Employee_ID: Optional[str] = Field(None, alias='Employee ID')
    Kennitala: Optional[str] = None
    Phone: Optional[str] = None
    Location: Optional[str] = None
    class Config(OrmConfig):
        populate_by_name = True


# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    project_manager_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    project_manager_id: Optional[int] = None

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    tenant_id: int
    tenant: Optional[TenantReadBasic] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_manager: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

class ProjectAssignMember(BaseModel):
    user_id: int

# --- Task Schemas ---
TaskStatusLiteral = Literal["To Do", "In Progress", "Done", "Blocked", "Commissioned"]
TaskPriorityLiteral = Literal["Low", "Medium", "High"]

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[TaskStatusLiteral] = "To Do"
    priority: Optional[TaskPriorityLiteral] = "Medium"
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    project_id: int
    assignee_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatusLiteral] = None
    priority: Optional[TaskPriorityLiteral] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    assignee_id: Optional[int] = None

class TaskRead(TaskBase):
    id: int
    is_commissioned: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    @computed_field
    @property
    def predecessor_ids(self) -> List[int]:
        if hasattr(self, 'predecessors'):
            return [p.id for p in self.predecessors]
        return []
    class Config(OrmConfig):
        pass

class TaskAssignUser(BaseModel):
    user_id: int

class TaskDependencyCreate(BaseModel):
    predecessor_id: int

# --- Task Comment Schemas ---
class TaskCommentBase(BaseModel):
    content: str = Field(..., min_length=1)

class TaskCommentCreate(TaskCommentBase):
    pass

class TaskCommentRead(TaskCommentBase):
    id: int
    created_at: datetime
    task_id: int
    author_id: int
    author: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

# --- Task Photo Schemas ---
class TaskPhotoBase(BaseModel):
    description: Optional[str] = None

class TaskPhotoCreate(TaskPhotoBase):
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int
    task_id: int

class TaskPhotoRead(TaskPhotoBase):
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploaded_at: datetime
    uploader_id: int
    task_id: int
    uploader: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

# --- Inventory Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: Optional[float] = 0.0
    quantity_needed: Optional[float] = 0.0
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None
    local_image_path: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    quantity_needed: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str | None] = None
    shop_url_2: Optional[HttpUrl | str | None] = None
    shop_url_3: Optional[HttpUrl | str | None] = None
    local_image_path: Optional[str] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    shop_url_1: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_2: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_3: Optional[HttpUrl | str] = Field(None, exclude=True)
    class Config(OrmConfig):
        pass

class InventoryItemReadWithURLs(InventoryItemRead):
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None

class InventoryItemUpdateNeededQty(BaseModel):
    quantity_needed: float = Field(..., ge=0)


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

    class Config(OrmConfig):
        pass

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
    class Config(OrmConfig):
        pass

class TimeLogStatus(BaseModel):
    is_clocked_in: bool
    current_log: Optional[TimeLogRead] = None

# --- Schemas for Admin Tools ---
class CleanSlateRequest(BaseModel):
    main_admin_email: EmailStr

class CleanSlateSummary(BaseModel):
    users_deactivated: int
    projects_creator_reassigned: int = 0
    projects_pm_cleared: int = 0
    tasks_unassigned: int = 0
    message: Optional[str] = None

class CleanSlateResponse(BaseModel):
    message: str
    summary: CleanSlateSummary

# --- NEW: Tool Schemas ---
class ToolLogRead(BaseModel):
    id: int
    timestamp: datetime
    action: ToolLogAction
    notes: Optional[str] = None
    user: UserReadBasic # Nest basic user info for the log entry

    class Config(OrmConfig):
        pass
        
class ToolBase(BaseModel):
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    status: ToolStatus = ToolStatus.Available
    purchase_date: Optional[date] = None
    last_service_date: Optional[date] = None
    image_path: Optional[str] = None # This will be set by the server on upload

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[ToolStatus] = None
    purchase_date: Optional[date] = None
    last_service_date: Optional[date] = None

class ToolRead(ToolBase):
    id: int
    tenant_id: int
    current_user_id: Optional[int] = None
    current_user: Optional[UserReadBasic] = None
    history_logs: List[ToolLogRead] = []

    @computed_field
    @property
    def image_url(self) -> Optional[str]:
        if self.image_path:
            return f"{STATIC_BASE_URL}/{self.image_path}"
        return None

    class Config(OrmConfig):
        pass
# --- END NEW SCHEMAS ---

