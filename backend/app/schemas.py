# backend/app/schemas.py
# ABSOLUTELY FINAL METICULOUSLY CHECKED UNCONDENSED VERSION
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime, timedelta

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
    class Config(OrmConfig):
        pass

class TaskCommentReadBasic(BaseModel):
    id: int
    content: str
    created_at: datetime
    task_id: int # Added task_id for context
    author_id: int
    author: Optional[UserReadBasic] = None
    class Config(OrmConfig):
        pass

class TaskPhotoReadBasic(BaseModel): # For nesting in TaskRead if needed
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

class TenantUpdate(BaseModel): # All fields optional for update
    name: Optional[str] = Field(None, min_length=1)
    logo_url: Optional[HttpUrl | str | None] = None # Allow explicitly setting to null
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
    tenant_id: int
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
    tenant_id: int
    tenant: Optional[TenantReadBasic] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assigned_projects: List[ProjectReadBasic] = []
    class Config(OrmConfig):
        pass

class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
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
    class Config(OrmConfig):
        pass

class TaskAssignUser(BaseModel):
    user_id: int

# --- Task Comment Schemas ---
class TaskCommentBase(BaseModel):
    content: str = Field(..., min_length=1)

class TaskCommentCreate(TaskCommentBase):
    pass

class TaskCommentRead(TaskCommentBase): # This is the schema routers/tasks.py expects
    id: int
    created_at: datetime
    task_id: int
    author_id: int
    author: Optional[UserReadBasic] = None # Nested basic author info
    class Config(OrmConfig):
        pass

# TaskCommentRead is defined in Basic/Forward Declarations

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

class TaskPhotoRead(TaskPhotoBase): # This is the schema routers/tasks.py might expect for photo lists
    id: int
    filename: str
    # description: Optional[str] = None # Inherited from TaskPhotoBase
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploaded_at: datetime
    uploader_id: int
    task_id: int
    uploader: Optional[UserReadBasic] = None # Nested basic uploader info
    class Config(OrmConfig):
        pass

# TaskPhotoRead is defined in Basic/Forward Declarations

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
    local_image_path: Optional[str] = None # Allow updating this

class InventoryItemRead(InventoryItemBase): # Corrected formatting
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    shop_url_1: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_2: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_3: Optional[HttpUrl | str] = Field(None, exclude=True)
    # local_image_path is inherited from InventoryItemBase and will be included

    class Config(OrmConfig):
        pass

class InventoryItemReadWithURLs(InventoryItemRead):
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None
    # Inherits Config & local_image_path

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
    user_id: int # Consider UserReadBasic for user here

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