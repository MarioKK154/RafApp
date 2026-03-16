from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict, field_validator
from typing import Optional, List, Literal, Any, Union
from datetime import datetime, date, timedelta
from os import environ
import json
from pydantic import computed_field

# SYNC: All Enums imported from models including new Roadmap Categories
from .models import (UserRole, ProjectStatus, TaskStatus, ToolStatus, 
                     ToolLogAction, CarStatus, CarLogAction, TyreType, 
                     OfferStatus, OfferLineItemType, DrawingStatus, LeaveStatus,
                     EventType, TutorialCategory)

STATIC_BASE_URL = environ.get("STATIC_BASE_URL", "http://localhost:8000")

# --- Basic Read Schemas (For Nesting) ---

class TenantReadBasic(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    background_image_url: Optional[str] = None
    background_image_urls: Optional[List[str]] = None
    model_config = ConfigDict(from_attributes=True)

    @field_validator('background_image_urls', mode='before')
    @classmethod
    def parse_background_urls(cls, v):
        if v is None: return None
        if isinstance(v, list): return v
        if isinstance(v, str):
            try: return json.loads(v) if v.strip() else []
            except Exception: return []
        return []

class ProjectReadBasic(BaseModel):
    id: int
    name: str
    project_number: Optional[str] = None # ROADMAP #6
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
    city: Optional[str] = None # ROADMAP #3: Standardized location
    
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

# --- Authentication & Token ---

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
    background_image_urls: Optional[List[str]] = None

    @field_validator('background_image_urls', mode='before')
    @classmethod
    def parse_background_urls_base(cls, v):
        if v is None: return None
        if isinstance(v, list): return v
        if isinstance(v, str):
            try: return json.loads(v) if v.strip() else []
            except Exception: return []
        return []

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    logo_url: Optional[HttpUrl | str | None] = None
    background_image_url: Optional[HttpUrl | str | None] = None
    background_image_urls: Optional[List[str]] = None

class TenantRead(TenantBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_count: Optional[int] = None
    has_overdue_invoices: Optional[bool] = None
    overdue_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

# --- User Schemas ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None # ROADMAP #3
    location: Optional[str] = None # Legacy support

class UserCreateAdmin(UserBase):
    password: str
    role: str
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    hourly_rate: Optional[float] = None
    # Optional per-user granular permissions, e.g. ["offers.manage", "inventory.manage"]
    extra_permissions: Optional[List[str]] = None

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
    impersonated_by_email: Optional[str] = None
    impersonation_log_id: Optional[int] = None
    extra_permissions: Optional[List[str]] = None

    @computed_field
    @property
    def profile_picture_url(self) -> Optional[str]:
        if self.profile_picture_path:
            return f"{STATIC_BASE_URL}/{self.profile_picture_path}"
        return None
    model_config = ConfigDict(from_attributes=True)

    @field_validator("extra_permissions", mode="before")
    @classmethod
    def parse_extra_permissions(cls, v):
        """
        Allow DB to store permissions as JSON string or NULL, but expose as list[str] in API.
        """
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            try:
                return json.loads(v)
            except Exception:
                # Fallback: treat as single comma-separated string
                return [p.strip() for p in v.split(",") if p.strip()]
        return None

class UserReadAdmin(UserRead):
    hourly_rate: Optional[float] = None

class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    kennitala: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    hourly_rate: Optional[float] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role: Optional[str] = None
    tenant_id: Optional[int] = None
    extra_permissions: Optional[List[str]] = None

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
    City: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# --- Notification Schemas (ROADMAP #2) ---

class NotificationRead(BaseModel):
    id: int
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Project Schemas ---

class ProjectBase(BaseModel):
    name: str
    project_number: Optional[str] = None # ROADMAP #6
    parent_id: Optional[int] = None      # ROADMAP #6
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    project_manager_id: Optional[int] = None
    budget: Optional[float] = Field(None, ge=0)
    work_load_ratio_codes: Optional[str] = None  # JSON array of work load ratio codes e.g. ["3020","6013"]

class ProjectCreate(ProjectBase):
    tenant_id: Optional[int] = None 

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    project_number: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[Literal['Planning', 'Active', 'Pending', 'Commissioned', 'Completed', 'Archived']] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    project_manager_id: Optional[int] = None
    budget: Optional[float] = Field(None, ge=0)
    work_load_ratio_codes: Optional[str] = None  # JSON array of work load ratio codes

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    tenant_id: int
    verified_by_admin: bool = False # ROADMAP #1
    commissioned_at: Optional[datetime] = None # ROADMAP #1
    tenant: Optional[TenantReadBasic] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_manager: Optional[UserReadBasic] = None
    drawings: List["DrawingRead"] = []
    drawing_folders: List["DrawingFolderRead"] = []
    model_config = ConfigDict(from_attributes=True)

class ProjectAssignMember(BaseModel):
    user_id: int

# --- Task Schemas ---

TaskStatusLiteral = Literal["To Do", "In Progress", "Done", "Blocked", "Awaiting Commissioning", "Commissioned"]
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
    predecessors: Optional[List[Any]] = None

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

class TaskAssignUser(BaseModel):
    user_id: int

class TaskDependencyCreate(BaseModel):
    predecessor_id: int


# --- Risk Assessment Schemas ---

RiskLikelihoodLiteral = Literal["Low", "Medium", "High"]
RiskImpactLiteral = Literal["Low", "Medium", "High"]
RiskStatusLiteral = Literal["Open", "Monitoring", "Closed"]


class RiskItemBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    likelihood: RiskLikelihoodLiteral = "Medium"
    impact: RiskImpactLiteral = "Medium"
    mitigation: Optional[str] = None
    status: RiskStatusLiteral = "Open"


class RiskItemCreate(RiskItemBase):
    pass


class RiskItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    likelihood: Optional[RiskLikelihoodLiteral] = None
    impact: Optional[RiskImpactLiteral] = None
    mitigation: Optional[str] = None
    status: Optional[RiskStatusLiteral] = None


class RiskItemRead(RiskItemBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RiskTemplateBase(BaseModel):
    category: Optional[str] = None
    title: str
    description: Optional[str] = None
    default_likelihood: RiskLikelihoodLiteral = "Medium"
    default_impact: RiskImpactLiteral = "Medium"
    default_mitigation: Optional[str] = None
    default_status: RiskStatusLiteral = "Open"
    is_active: bool = True


class RiskTemplateCreate(RiskTemplateBase):
    pass


class RiskTemplateUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    default_likelihood: Optional[RiskLikelihoodLiteral] = None
    default_impact: Optional[RiskImpactLiteral] = None
    default_mitigation: Optional[str] = None
    default_status: Optional[RiskStatusLiteral] = None
    is_active: Optional[bool] = None


class RiskTemplateRead(RiskTemplateBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Inventory & BoQ Schemas ---

class InventoryItemBase(BaseModel):
    name: str
    category: Optional[str] = None # ROADMAP: Multi-level hierarchy
    subcategory: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None # Ronning
    shop_url_2: Optional[HttpUrl | str] = None # Iskraft
    shop_url_3: Optional[HttpUrl | str] = None # Reykjafell
    local_image_path: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    shop_url_1: Optional[HttpUrl | str] = None
    shop_url_2: Optional[HttpUrl | str] = None
    shop_url_3: Optional[HttpUrl | str] = None
    local_image_path: Optional[str] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class MaterialRequestBase(BaseModel):
    project_id: int
    inventory_item_id: int
    quantity: float = Field(..., gt=0)
    note: Optional[str] = None


class MaterialRequestCreate(MaterialRequestBase):
    pass


MaterialRequestStatusLiteral = Literal["Pending", "Approved", "Rejected", "Fulfilled"]


class MaterialRequestRead(MaterialRequestBase):
    id: int
    status: MaterialRequestStatusLiteral = "Pending"
    requested_by: Optional[UserReadBasic] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    inventory_item: InventoryItemRead
    model_config = ConfigDict(from_attributes=True)

class ProjectInventoryItemBase(BaseModel):
    quantity: float = Field(..., ge=0)
    location: Optional[str] = None

class ProjectInventoryItemCreate(ProjectInventoryItemBase):
    inventory_item_id: int
    project_id: int

class ProjectInventoryItemRead(ProjectInventoryItemBase):
    id: int
    project_id: int
    inventory_item: InventoryItemRead 
    model_config = ConfigDict(from_attributes=True)

class InventoryItemUpdateNeededQty(BaseModel):
    quantity_needed: float = Field(..., ge=0)

class InventoryItemReadForBoQ(BaseModel):
    id: int
    name: str
    unit: Optional[str] = None
    quantity: Optional[float] = None
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

# --- Drawing & Folder Schemas (ROADMAP #4) ---

class DrawingFolderBase(BaseModel):
    name: str
    project_id: int
    parent_id: Optional[int] = None

class DrawingFolderCreate(DrawingFolderBase):
    pass

class DrawingFolderRead(DrawingFolderBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DrawingBase(BaseModel):
    description: Optional[str] = None
    project_id: int
    folder_id: Optional[int] = None
    revision: Optional[str] = None
    discipline: Optional[str] = None
    status: Optional[DrawingStatus] = DrawingStatus.Draft
    drawing_date: Optional[date] = None
    author: Optional[str] = None

class DrawingCreate(DrawingBase):
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int

class DrawingUpdate(BaseModel):
    description: Optional[str] = None
    folder_id: Optional[int] = None
    revision: Optional[str] = None
    discipline: Optional[str] = None
    status: Optional[DrawingStatus] = None
    drawing_date: Optional[date] = None
    author: Optional[str] = None

class DrawingRead(DrawingBase):
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploaded_at: datetime
    uploader_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Wiring Diagram Schemas (ROADMAP #5) ---

# For creating new entries
class WiringDiagramCreate(BaseModel):
    title: str
    category: TutorialCategory
    description: Optional[str] = None
    tutorial_text: Optional[str] = None

# For reading data back (The one you have, updated)
class WiringDiagramRead(BaseModel):
    id: int
    title: str
    category: TutorialCategory
    description: Optional[str] = None
    tutorial_text: Optional[str] = None
    image_path: Optional[str] = None
    file_path: Optional[str] = None  # Added for PDF manuals
    created_at: datetime
    author_id: Optional[int] = None                  # Global tutorials may not have a specific author
    tenant_id: Optional[int] = None                  # Global tutorials have tenant_id = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Time Log Schemas ---

class TimeLogBase(BaseModel):
    notes: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class TimeLogCreate(TimeLogBase):
    pass

class TimeLogRead(TimeLogBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[timedelta] = None
    user_id: int
    project: Optional[ProjectReadBasic] = None
    task: Optional[TaskReadBasic] = None
    user: Optional[UserReadBasic] = None

    @computed_field
    @property
    def duration_hours(self) -> Optional[float]:
        if self.duration:
            return round(self.duration.total_seconds() / 3600.0, 2)
        return None
    model_config = ConfigDict(from_attributes=True)

class TimeLogStatus(BaseModel):
    is_clocked_in: bool
    current_log: Optional[TimeLogRead] = None

class TimeLogClockOut(BaseModel):
    notes: str

class TimeLogUpdate(BaseModel):
    """Admin-only: adjust clocked hours or reassign project."""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    project_id: Optional[int] = None
    notes: Optional[str] = None

# --- Asset Schemas (Tools) ---

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
    tenant_id: Optional[int] = None

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

class ToolReadBasic(ToolBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Asset Schemas (Cars) ---

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
    tenant_id: Optional[int] = None

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

class CarReadBasic(CarBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CarCheckout(BaseModel):
    odometer_reading: Optional[int] = None
    notes: Optional[str] = None

# --- Asset Schemas (Shops) ---

class ShopBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl | str] = None
    notes: Optional[str] = None

class ShopCreate(ShopBase):
    tenant_id: Optional[int] = None

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

# --- Reporting & Dashboard ---

class DashboardStats(BaseModel):
    active_projects: int
    pending_tasks: int
    active_users: int
    weekly_hours: float


class TenantHeatmapItem(BaseModel):
    tenant_id: int
    tenant_name: str
    active_projects: int
    total_users: int
    hours_last_30d: float


class TenantHeatmap(BaseModel):
    items: List[TenantHeatmapItem]


class SystemLoadStats(BaseModel):
    db_ok: bool
    db_latency_ms: float
    total_tenants: int
    total_users: int
    total_projects: int


class PlatformGrowthMetrics(BaseModel):
    total_tenants: int
    total_users: int
    total_projects: int
    new_projects_today: int
    total_hours_all_time: float
    total_hours_last_30d: float


class SystemStatus(BaseModel):
    maintenance: bool
    message: Optional[str] = None

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

class DashboardData(BaseModel):
    my_open_tasks: List[TaskRead]
    my_checked_out_tools: List[ToolReadBasic]
    my_checked_out_car: Optional[CarReadBasic] = None
    managed_projects: Optional[List[ProjectRead]] = None 

class ShoppingListItem(BaseModel):
    inventory_item: InventoryItemRead
    quantity_required: float
    quantity_in_stock: float
    quantity_to_order: float
    unit: Optional[str] = None

# --- HR & Accounting Schemas ---

class LaborCatalogItemBase(BaseModel):
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    unit: Optional[str] = "hour"
    recommended_item_ids: Optional[str] = None
    main_category: Optional[str] = None   # ar.is Aðalflokkur
    sub_category: Optional[str] = None   # ar.is Flokkur
    conditions: Optional[str] = None      # ar.is Aðstæður
    reference_price: Optional[float] = None  # ar.is Eining (unit cost)
    units_per_hour: Optional[float] = None  # ar.is Eining time: 4=15min/unit, 2=30min, 1=1hr, 0=hourly rate

class LaborCatalogItemCreate(LaborCatalogItemBase):
    default_unit_price: float = Field(..., ge=0)

class LaborCatalogItemUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    default_unit_price: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = None
    recommended_item_ids: Optional[str] = None
    main_category: Optional[str] = None
    sub_category: Optional[str] = None
    conditions: Optional[str] = None
    reference_price: Optional[float] = Field(None, ge=0)
    units_per_hour: Optional[float] = Field(None, ge=0)

class TenantLaborPriceRead(BaseModel):
    id: int
    tenant_id: int
    price: float
    model_config = ConfigDict(from_attributes=True)

class LaborCatalogItemRead(LaborCatalogItemBase):
    id: int
    tenant_price: Optional[float] = None  # Injected per tenant by CRUD
    model_config = ConfigDict(from_attributes=True)


class WorkLoadRatioRead(BaseModel):
    id: int
    code: str
    description: str
    ratio: float
    ratio_type: Optional[int] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class LaborMainCategoryRefRead(BaseModel):
    id: int
    code: str
    name: str
    model_config = ConfigDict(from_attributes=True)


class LaborCatalogItemConditionRead(BaseModel):
    """ar.is drill-down: one row per condition with its own Eining (units_per_hour)."""
    id: int
    labor_catalog_item_id: int
    code: str
    condition_description: str
    units_per_hour: Optional[float] = None
    effective_date: Optional[str] = None
    end_date: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class PayslipCreate(BaseModel):
    user_id: int
    issue_date: date
    amount_brutto: float
    amount_netto: float

class PayslipRead(BaseModel):
    id: int
    user_id: int
    issue_date: date
    amount_brutto: float
    amount_netto: float
    filename: str
    user: Optional[UserReadBasic] = None
    model_config = ConfigDict(from_attributes=True)


class PayslipGenerate(BaseModel):
    user_id: int
    issue_date: date
    amount_brutto: float
    amount_netto: float
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    regular_hours: Optional[float] = None
    overtime1_hours: Optional[float] = None
    overtime2_hours: Optional[float] = None
    bonuses: Optional[float] = None
    bonus_description: Optional[str] = None
    other_deductions: Optional[float] = None
    deductions_description: Optional[str] = None

class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: str
    reason: Optional[str] = None
    status: Optional[str] = "Pending"

class LeaveRequestRead(BaseModel):
    id: int
    user_id: int
    start_date: date
    end_date: date
    leave_type: str
    reason: Optional[str] = None
    status: LeaveStatus 
    manager_comment: Optional[str] = None
    user: Optional[UserReadBasic] = None

    @computed_field
    @property
    def user_name(self) -> str:
        if self.user:
            return self.user.full_name or self.user.email
        return "Unknown Node"

    model_config = ConfigDict(from_attributes=True)

class LeaveRequestReview(BaseModel):
    status: LeaveStatus
    manager_comment: Optional[str] = None


MoneyFlowLiteral = Literal["in", "out"]
ExpenseCategoryLiteral = Literal["project", "car", "tool", "repair", "clothing", "other"]


class ExpenseBase(BaseModel):
    date: date
    amount: float = Field(..., gt=0)
    flow_type: MoneyFlowLiteral = "out"
    category: Optional[ExpenseCategoryLiteral] = "other"
    description: Optional[str] = None
    reference: Optional[str] = None
    project_id: Optional[int] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseRead(ExpenseBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MonthlyMoneySummary(BaseModel):
    month: int
    total_in: float
    total_out: float


class CategoryMoneySummary(BaseModel):
    category: ExpenseCategoryLiteral
    total_in: float
    total_out: float


class YearlyMoneyOverview(BaseModel):
    year: int
    total_in: float
    total_out: float
    net: float
    by_month: List[MonthlyMoneySummary]
    by_category: List[CategoryMoneySummary]


BillingStatusLiteral = Literal["Pending", "Paid", "Overdue"]
BillingProviderLiteral = Literal["manual", "stripe", "bokun"]


class BillingInvoiceBase(BaseModel):
    tenant_id: int
    amount: float = Field(..., gt=0)
    currency: str = "ISK"
    due_date: date
    status: BillingStatusLiteral = "Pending"
    provider: BillingProviderLiteral = "manual"
    external_invoice_id: Optional[str] = None
    description: Optional[str] = None


class BillingInvoiceCreate(BillingInvoiceBase):
    pass


class BillingInvoiceRead(BillingInvoiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class BillingOverdueTenantSummary(BaseModel):
    tenant_id: int
    tenant_name: str
    overdue_count: int
    overdue_total: float

# --- Offer Schemas ---

class OfferLineItemBase(BaseModel):
    item_type: OfferLineItemType
    description: str
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    inventory_item_id: Optional[int] = None 

class OfferLineItemCreate(OfferLineItemBase):
    pass

class OfferLineItemUpdate(BaseModel):
    item_type: Optional[OfferLineItemType] = None
    description: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    inventory_item_id: Optional[int] = None 

class OfferLineItemRead(OfferLineItemBase):
    id: int
    total_price: float
    inventory_item: Optional[InventoryItemRead] = None 
    model_config = ConfigDict(from_attributes=True)

class OfferBase(BaseModel):
    title: Optional[str] = "Work Offer"
    status: Optional[OfferStatus] = OfferStatus.Draft
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[EmailStr] = None
    expiry_date: Optional[date] = None
    work_load_ratio_codes: Optional[str] = None  # JSON array of work load ratio codes; applied when adding labor

class OfferCreate(OfferBase):
    project_id: int

class OfferUpdate(OfferBase):
    title: Optional[str] = None
    status: Optional[OfferStatus] = None
    work_load_ratio_codes: Optional[str] = None

class OfferRead(OfferBase):
    id: int
    offer_number: str
    project_id: int
    tenant_id: int
    created_by_user_id: int
    issue_date: datetime
    total_amount: Optional[float] = None
    line_items: List[OfferLineItemRead] = []
    creator: Optional[UserReadBasic] = None
    model_config = ConfigDict(from_attributes=True)

# --- User License Schemas ---

class UserLicenseBase(BaseModel):
    description: str = Field(..., min_length=1)
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

class UserLicenseCreate(UserLicenseBase):
    pass

class UserLicenseRead(UserLicenseBase):
    id: int
    user_id: int
    filename: str
    model_config = ConfigDict(from_attributes=True)

# --- Event Schemas ---

class EventBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    event_type: EventType = EventType.custom
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    project_id: Optional[int] = None

class EventCreate(EventBase):
    attendee_ids: List[int] = []

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    project_id: Optional[int] = None
    attendee_ids: Optional[List[int]] = None

class EventRead(EventBase):
    id: int
    creator_id: int
    tenant_id: int
    creator: Optional[UserReadBasic] = None
    attendees: List[UserReadBasic] = []
    model_config = ConfigDict(from_attributes=True)

# --- Customer Schemas ---

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    address: Optional[str] = None
    kennitala: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    tenant_id: Optional[int] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    address: Optional[str] = None
    kennitala: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CustomerRead(CustomerBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- MANAGEMENT TOOLS (Clean Slate) ---

class CleanSlateRequest(BaseModel):
    main_admin_email: EmailStr

class CleanSlateSummary(BaseModel):
    users_deactivated: int
    projects_creator_reassigned: int = 0
    projects_pm_cleared: int = 0
    tasks_unassigned: int = 0
    message: Optional[str] = None


class ImpersonateRequest(BaseModel):
    user_id: int


class ImpersonationLogRead(BaseModel):
    id: int
    superuser_id: int
    target_user_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    superuser_email: Optional[str] = None
    target_user_email: Optional[str] = None
    target_user_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ImpersonationStartResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    impersonated_user: UserRead
    original_token: str
    impersonation_log_id: int


class ImpersonationEndRequest(BaseModel):
    impersonation_log_id: int


class AuditLogRead(BaseModel):
    id: int
    action_type: str
    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None
    tenant_id: Optional[int] = None
    target_ref: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class GlobalBannerRead(BaseModel):
    id: int
    message: str
    is_active: bool
    created_at: datetime
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class GlobalBannerCreate(BaseModel):
    message: str
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class TenantHealthItem(BaseModel):
    tenant_id: int
    tenant_name: str
    last_login_at: Optional[str] = None
    hours_this_week: float
    hours_avg_previous_4_weeks: float
    churn_risk: str  # none, medium, high


class CleanSlateResponse(BaseModel):
    message: str
    summary: CleanSlateSummary

# --- Cable Sizer Schemas ---

InstallMethodLiteral = Literal[
    "in_air_spaced", "clipped_direct", "conduit_surface", 
    "conduit_embedded", "buried_direct", "buried_in_duct"
]
InsulationLiteral = Literal["PVC", "XLPE"]
MaterialLiteral = Literal["copper", "aluminum"]
LoadTypeLiteral = Literal[
    "lighting", "general_power", "motors", "ev_chargers", "data_centers"
]

class CableSizerInput(BaseModel):
    voltage_system: Literal["single_phase", "three_phase"] = Field(..., example="single_phase")
    voltage: float = Field(..., gt=0, example=230)
    load_power_kw: float = Field(..., gt=0, example=12)
    power_factor: float = Field(..., gt=0, le=1, example=0.9)
    cable_length_m: float = Field(..., gt=0, example=40)
    material: MaterialLiteral = Field(..., example="copper")
    insulation: InsulationLiteral = Field(..., example="XLPE")
    installation_method: InstallMethodLiteral = Field(..., example="conduit_surface")
    ambient_temperature_c: int = Field(..., example=35)
    load_type: Optional[LoadTypeLiteral] = Field(None, example="general_power")
    allowable_vdrop_percent: Optional[float] = Field(None, gt=0, example=5.0)
    fault_current_ka: Optional[float] = Field(None, gt=0)
    disconnection_time_s: Optional[float] = Field(None, gt=0)
    enable_short_circuit_check: bool = Field(False)
    fault_current_at_load_ka: Optional[float] = Field(None, gt=0)
    assume_fault_at_load_fraction: Optional[float] = Field(None, ge=0, le=1)
    model_config = ConfigDict(from_attributes=True)

class CableSizerDerivedValues(BaseModel):
    load_current_a: float
    allowable_vdrop_percent: float
    allowable_vdrop_v: float
    Ct_temp: float
    Ci_install: float
    Cg_grouping: float = 1.0
    total_derating_factor: float
    effective_required_ampacity_a: float
    short_circuit_k_factor: float
    short_circuit_min_mm2: float

class CableSizerReasoningStep(BaseModel):
    size_mm2: float
    base_ampacity_a: float
    derated_ampacity_a: float
    ampacity_ok: bool
    resistance_ohm_per_km: float
    reactance_ohm_per_km: float
    voltage_drop_percent: float
    vdrop_ok: bool
    short_circuit_ok: bool

class CableSizerOutput(BaseModel):
    inputs: CableSizerInput
    derived_values: CableSizerDerivedValues
    reasoning: List[CableSizerReasoningStep]
    final_selection: CableSizerReasoningStep
    
    @computed_field
    @property
    def final_message(self) -> str:
        final_size = self.final_selection.size_mm2
        ampacity_min_size = self.reasoning[0].size_mm2
        
        reasons = []
        if final_size > ampacity_min_size:
            reasons.append("voltage drop or fault constraints")
        
        msg = f"Selected size {final_size}mm²."
        if reasons:
            msg += f" Upsized from {ampacity_min_size}mm² due to {', '.join(reasons)}."
        return msg

# --- Assignment Schemas (ROADMAP #3) ---

class AssignmentBase(BaseModel):
    user_id: int
    project_id: int
    start_date: date
    end_date: date
    notes: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentRead(AssignmentBase):
    id: int
    created_at: datetime
    # We include user/project info for the Grid labels
    user_name: Optional[str] = None 
    project_name: Optional[str] = None
    project_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- NEW DRAWING SCHEMAS (ROADMAP #4) ---

class DrawingFolderBase(BaseModel):
    name: str
    project_id: int
    parent_id: Optional[int] = None

class DrawingFolderCreate(DrawingFolderBase):
    tenant_id: int 

class DrawingFolderRead(DrawingFolderBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)

class DrawingBase(BaseModel):
    description: Optional[str] = None
    project_id: int
    folder_id: Optional[int] = None
    revision: Optional[str] = "1.0"
    discipline: Optional[str] = "General" 
    status: Optional[DrawingStatus] = DrawingStatus.Draft
    drawing_date: Optional[date] = None
    author: Optional[str] = None

class DrawingCreate(DrawingBase):
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int
    tenant_id: int 

class DrawingRead(DrawingBase):
    id: int
    filename: str
    filepath: str
    uploaded_at: datetime
    uploader_id: int
    tenant_id: int
    uploader: Optional[UserReadBasic] = None
    
    @computed_field
    @property
    def url(self) -> str:
        # Assumes STATIC_BASE_URL is defined in your file
        return f"{STATIC_BASE_URL}/{self.filepath}"
    
    model_config = ConfigDict(from_attributes=True)