# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, date, timedelta
from os import environ
from pydantic import computed_field

from .models import (UserRole, ProjectStatus, TaskStatus, ToolStatus, 
                     ToolLogAction, CarStatus, CarLogAction, TyreType)

STATIC_BASE_URL = environ.get("STATIC_BASE_URL", "http://localhost:8000")

class TenantReadBasic(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    background_image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectReadBasic(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class TaskReadBasic(BaseModel):
    id: int
    title: str
    model_config = ConfigDict(from_attributes=True)

class UserReadBasic(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    profile_picture_path: Optional[str] = None 
    
    @computed_field
    @property
    def profile_picture_url(self) -> Optional[str]:
        if self.profile_picture_path:
            return f"{STATIC_BASE_URL}/{self.profile_picture_path}"
        return None
    model_config = ConfigDict(from_attributes=True)

class TaskCommentReadBasic(BaseModel):
    id: int
    content: str
    created_at: datetime
    task_id: int 
    author_id: int
    author: Optional[UserReadBasic] = None
    model_config = ConfigDict(from_attributes=True)

class TaskPhotoReadBasic(BaseModel):
    id: int
    filename: str
    description: Optional[str] = None
    uploaded_at: datetime
    uploader_id: int
    uploader: Optional[UserReadBasic] = None
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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
    model_config = ConfigDict(from_attributes=True)

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
    profile_picture_path: Optional[str] = None
    @computed_field
    @property
    def profile_picture_url(self) -> Optional[str]:
        if self.profile_picture_path:
            return f"{STATIC_BASE_URL}/{self.profile_picture_path}"
        return None
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    project_manager_id: Optional[int] = None
    budget: Optional[float] = Field(None, ge=0)

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
    budget: Optional[float] = Field(None, ge=0)

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    tenant_id: int
    tenant: Optional[TenantReadBasic] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_manager: Optional[UserReadBasic] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectAssignMember(BaseModel):
    user_id: int

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
    model_config = ConfigDict(from_attributes=True)

class TaskAssignUser(BaseModel):
    user_id: int

class TaskDependencyCreate(BaseModel):
    predecessor_id: int

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    # quantity, quantity_needed, and location are REMOVED
    unit: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None
    local_image_path: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- NEW: ProjectInventoryItem Schemas ---

class ProjectInventoryItemBase(BaseModel):
    quantity: float = Field(..., ge=0)
    location: Optional[str] = None

class ProjectInventoryItemCreate(ProjectInventoryItemBase):
    inventory_item_id: int
    project_id: int

class ProjectInventoryItemUpdate(ProjectInventoryItemBase):
    pass

class ProjectInventoryItemRead(ProjectInventoryItemBase):
    id: int
    project_id: int
    inventory_item: InventoryItemRead # Nested inventory item details

    model_config = ConfigDict(from_attributes=True)
    
class InventoryItemReadWithURLs(InventoryItemRead):
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None

class InventoryItemUpdateNeededQty(BaseModel):
    quantity_needed: float = Field(..., ge=0)

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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

class TimeLogStatus(BaseModel):
    is_clocked_in: bool
    current_log: Optional[TimeLogRead] = None

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

class ToolLogRead(BaseModel):
    id: int
    timestamp: datetime
    action: ToolLogAction
    notes: Optional[str] = None
    user: UserReadBasic
    model_config = ConfigDict(from_attributes=True)

class ToolBase(BaseModel):
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    status: ToolStatus = ToolStatus.Available
    purchase_date: Optional[date] = None
    last_service_date: Optional[date] = None
    image_path: Optional[str] = None

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
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
    model_config = ConfigDict(from_attributes=True)

class TyreSetBase(BaseModel):
    type: TyreType
    purchase_date: Optional[date] = None
    brand: Optional[str] = None
    notes: Optional[str] = None
    is_on_car: bool = False

class TyreSetCreate(TyreSetBase):
    pass

class TyreSetRead(TyreSetBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CarLogRead(BaseModel):
    id: int
    timestamp: datetime
    action: CarLogAction
    odometer_reading: Optional[int] = None
    notes: Optional[str] = None
    user: UserReadBasic
    model_config = ConfigDict(from_attributes=True)

class CarBase(BaseModel):
    make: str
    model: str
    year: Optional[int] = None
    purchase_date: Optional[date] = None
    license_plate: str
    status: CarStatus = CarStatus.Available
    last_oil_change_km: Optional[int] = None
    next_oil_change_due_km: Optional[int] = None
    service_needed: bool = False
    service_notes: Optional[str] = None
    image_path: Optional[str] = None
    vin: Optional[str] = None

class CarCreate(CarBase):
    pass

class CarUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    purchase_date: Optional[date] = None
    license_plate: Optional[str] = None
    status: Optional[CarStatus] = None
    last_oil_change_km: Optional[int] = None
    next_oil_change_due_km: Optional[int] = None
    service_needed: Optional[bool] = None
    service_notes: Optional[str] = None
    vin: Optional[str] = None

class CarServiceStatusUpdate(BaseModel):
    service_needed: bool
    service_notes: Optional[str] = None

class CarRead(CarBase):
    id: int
    tenant_id: int
    current_user_id: Optional[int] = None
    current_user: Optional[UserReadBasic] = None
    history_logs: List[CarLogRead] = []
    tyre_sets: List[TyreSetRead] = []
    @computed_field
    @property
    def image_url(self) -> Optional[str]:
        if self.image_path:
            return f"{STATIC_BASE_URL}/{self.image_path}"
        return None
    model_config = ConfigDict(from_attributes=True)

class CarCheckout(BaseModel):
    odometer_reading: Optional[int] = None
    notes: Optional[str] = None

class ShopBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl | str] = None
    notes: Optional[str] = None

class ShopCreate(ShopBase):
    pass

class ShopUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl | str] = None
    notes: Optional[str] = None

class ShopRead(ShopBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)

class InventoryItemReadForBoQ(BaseModel):
    id: int
    name: str
    unit: Optional[str] = None
    quantity: float
    model_config = ConfigDict(from_attributes=True)

class BoQItemBase(BaseModel):
    inventory_item_id: int
    quantity_required: float = Field(..., gt=0)

class BoQItemCreate(BoQItemBase):
    pass

class BoQItemUpdate(BaseModel):
    quantity_required: float = Field(..., gt=0)

class BoQItemRead(BoQItemBase):
    id: int
    inventory_item: InventoryItemReadForBoQ
    model_config = ConfigDict(from_attributes=True)

class BoQBase(BaseModel):
    name: Optional[str] = "Main Bill of Quantities"

class BoQCreate(BoQBase):
    pass

class BoQRead(BoQBase):
    id: int
    project_id: int
    items: List[BoQItemRead] = []
    model_config = ConfigDict(from_attributes=True)

class ReportTimeLogEntry(BaseModel):
    user_name: str
    duration_hours: float
    hourly_rate: Optional[float] = None
    cost: float

class ReportProjectSummary(BaseModel):
    project_id: int
    project_name: str
    budget: Optional[float] = None
    total_hours: float
    calculated_cost: float
    variance: Optional[float] = None
    detailed_logs: List[ReportTimeLogEntry]

class ToolReadBasic(ToolBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CarReadBasic(CarBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DashboardData(BaseModel):
    """The main response model for the user dashboard."""
    my_open_tasks: List[TaskRead]
    my_checked_out_tools: List[ToolReadBasic]
    my_checked_out_car: Optional[CarReadBasic] = None
    managed_projects: Optional[List[ProjectRead]] = None # For Admins/PMs

# --- NEW: Shopping List Schemas ---

class ShoppingListItem(BaseModel):
    """Represents a single item on a project's shopping list."""
    inventory_item: InventoryItemRead
    quantity_required: float
    quantity_in_stock: float
    quantity_to_order: float
    unit: Optional[str] = None