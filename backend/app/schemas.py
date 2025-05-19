# backend/app/schemas.py
# ABSOLUTELY FINAL METICULOUSLY CHECKED UNCONDENSED VERSION - Indentation Focus
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime, timedelta

# --- Base Config ---
class OrmConfig:
    from_attributes = True

# --- Forward declarations ---
class ProjectReadBasic(BaseModel):
    id: int
    name: str
    class Config: # Ensure this is the simple Pydantic v1/v2 way
        from_attributes = True # Or orm_mode = True if using older Pydantic

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

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None

# UserCreate (for public registration) was REMOVED.

class UserCreateAdmin(UserBase):
    password: str
    role: str # Mandatory
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    # Other fields inherited from UserBase are optional

class UserImportCSVRow(BaseModel):
    Name: Optional[str] = None
    Email: EmailStr
    Employee_ID: Optional[str] = Field(None, alias='Employee ID')
    Kennitala: Optional[str] = None
    Phone: Optional[str] = None # Maps to phone_number
    Location: Optional[str] = None

    class Config(OrmConfig): # OrmConfig likely already has from_attributes=True
        # allow_population_by_field_name = True # OLD way
        populate_by_name = True # NEW Pydantic v2 way for alias 'Employee ID'

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
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

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserSetPasswordByAdmin(BaseModel):
    new_password: str = Field(..., min_length=8)


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

class ProjectUpdate(ProjectBase): # All fields optional for update
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_manager: Optional[UserReadBasic] = None # Nested PM info

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

class TaskUpdate(BaseModel): # All fields optional for update
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatusLiteral] = None
    priority: Optional[TaskPriorityLiteral] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    assignee_id: Optional[int] = None
    # is_commissioned is handled by a separate endpoint, not direct update

class TaskRead(TaskBase):
    id: int
    is_commissioned: bool # Added this field
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional nested details can be added if needed for specific views
    # project: Optional[ProjectReadBasic] = None
    # assignee: Optional[UserReadBasic] = None
    # comments: List[TaskCommentReadBasic] = []
    # photos: List[TaskPhotoReadBasic] = []

    class Config(OrmConfig):
        pass

class TaskAssignUser(BaseModel):
    user_id: int

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
    description: Optional[str] = None
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
    name: str # English name
    # icelandic_name: Optional[str] = None # For later
    description: Optional[str] = None
    quantity: Optional[float] = 0.0
    quantity_needed: Optional[float] = 0.0
    unit: Optional[str] = None
    location: Optional[str] = None # General location
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None # Webshop URL
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None
    local_image_path: Optional[str] = None # NEW
    # type: Optional[str] = None # For later
    # full_category_path_is: Optional[str] = None # For later
    # full_category_path_en: Optional[str] = None # For later


class InventoryItemCreate(InventoryItemBase):
    pass # Inherits local_image_path

class InventoryItemUpdate(InventoryItemBase): # All fields optional for update
    name: Optional[str] = None
    # icelandic_name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    quantity_needed: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str | None] = None
    shop_url_2: Optional[HttpUrl | str | None] = None
    shop_url_3: Optional[HttpUrl | str | None] = None
    local_image_path: Optional[str] = None # NEW, allow updating/setting to null

class InventoryItemRead(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # local_image_path is inherited
    # Exclude shop URLs by default, specific schema to include them
    shop_url_1: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_2: Optional[HttpUrl | str] = Field(None, exclude=True)
    shop_url_3: Optional[HttpUrl | str] = Field(None, exclude=True)

    class Config(OrmConfig):
        pass

class InventoryItemReadWithURLs(InventoryItemRead): # As before
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None

class InventoryItemUpdateNeededQty(BaseModel): # As before
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

class CleanSlateRequest(BaseModel):
    main_admin_email: EmailStr
    # Optionally, add a confirmation field to prevent accidental calls
    confirm_action: Literal["PERFORM CLEAN SLATE"] = "PERFORM CLEAN SLATE"

class CleanSlateSummary(BaseModel):
    users_deactivated: int
    projects_creator_reassigned: Optional[int] = 0 # Make optional if not always present
    projects_pm_cleared: Optional[int] = 0
    tasks_unassigned: Optional[int] = 0
    message: Optional[str] = None # For "No other users found..."

class CleanSlateResponse(BaseModel):
    message: str
    summary: CleanSlateSummary

# Pydantic v2 generally handles forward references well when from_attributes=True is used.
# Explicit model_rebuild calls are usually not needed unless complex circular dependencies occur.