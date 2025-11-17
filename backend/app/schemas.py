# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, date, timedelta
from os import environ
from pydantic import computed_field

from .models import (UserRole, ProjectStatus, TaskStatus, ToolStatus, 
                     ToolLogAction, CarStatus, CarLogAction, TyreType, OfferStatus, OfferLineItemType, DrawingStatus)

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
    revision: Optional[str] = None
    discipline: Optional[str] = None
    status: Optional[DrawingStatus] = DrawingStatus.Draft
    drawing_date: Optional[date] = None
    author: Optional[str] = None

class DrawingCreate(DrawingBase):
    # Fields set during file upload by the server
    filename: str
    filepath: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    uploader_id: int

class DrawingUpdate(BaseModel):
    # Schema for updating metadata after upload
    description: Optional[str] = None
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
    duration: Optional[timedelta] = None # Keep the original timedelta from DB
    user_id: int
    # Add project and task basic schemas if not already present
    project: Optional[ProjectReadBasic] = None
    task: Optional[TaskReadBasic] = None
    user: Optional[UserReadBasic] = None # Ensure user is included


    # --- NEW: Calculated field for duration in hours ---
    @computed_field
    @property
    def duration_hours(self) -> Optional[float]:
        if self.duration:
            return round(self.duration.total_seconds() / 3600.0, 2)
        return None
    # --- END NEW ---

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

# --- NEW: Offer Schemas ---

class OfferLineItemBase(BaseModel):
    item_type: OfferLineItemType
    description: str
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    inventory_item_id: Optional[int] = None # Required if item_type is Material

class OfferLineItemCreate(OfferLineItemBase):
    # Add validation later if needed (e.g., ensure inventory_item_id exists if Material)
    pass

class OfferLineItemUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    inventory_item_id: Optional[int] = None # Allow changing material link

class OfferLineItemRead(OfferLineItemBase):
    id: int
    total_price: float
    # Optionally include basic inventory item info if it's a material
    inventory_item: Optional[InventoryItemRead] = None # Use existing basic read schema
    model_config = ConfigDict(from_attributes=True)

class OfferBase(BaseModel):
    title: Optional[str] = "Work Offer"
    status: Optional[OfferStatus] = OfferStatus.Draft
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    client_email: Optional[EmailStr] = None
    expiry_date: Optional[date] = None

class OfferCreate(OfferBase):
    project_id: int

class OfferUpdate(OfferBase):
    title: Optional[str] = None
    status: Optional[OfferStatus] = None
    # Add other fields as needed

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

# --- NEW: User License Schemas ---

class UserLicenseBase(BaseModel):
    description: str = Field(..., min_length=1)
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None

class UserLicenseCreate(UserLicenseBase):
    # File path and filename will be set by the server
    pass

class UserLicenseRead(UserLicenseBase):
    id: int
    user_id: int
    filename: str
    # We won't expose the direct file_path, use a download link instead

    model_config = ConfigDict(from_attributes=True)

class EventBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    project_id: Optional[int] = None

class EventCreate(EventBase):
    attendee_ids: List[int] = [] # List of user IDs to invite

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    project_id: Optional[int] = None
    attendee_ids: Optional[List[int]] = None # Allow updating attendees

class EventRead(EventBase):
    id: int
    creator_id: int
    tenant_id: int
    creator: Optional[UserReadBasic] = None
    attendees: List[UserReadBasic] = []
    model_config = ConfigDict(from_attributes=True)

# --- NEW: Customer Schemas ---

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    address: Optional[str] = None
    kennitala: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

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

# --- NEW: Labor Catalog Schemas ---

class LaborCatalogItemBase(BaseModel):
    description: str = Field(..., min_length=1)
    default_unit_price: float = Field(..., ge=0)
    unit: Optional[str] = "hour"

class LaborCatalogItemCreate(LaborCatalogItemBase):
    pass

class LaborCatalogItemUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    default_unit_price: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = None

class LaborCatalogItemRead(LaborCatalogItemBase):
    id: int
    tenant_id: int
    model_config = ConfigDict(from_attributes=True)

# --- UPDATED: Calculator Schemas ---

# Define Literals based on the keys from your CABLE_DATA
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
    # Core Load
    voltage_system: Literal["single_phase", "three_phase"] = Field(..., example="single_phase")
    voltage: float = Field(..., gt=0, example=230)
    load_power_kw: float = Field(..., gt=0, example=12)
    power_factor: float = Field(..., gt=0, le=1, example=0.9)
    cable_length_m: float = Field(..., gt=0, example=40)
    
    # Cable & Installation
    material: MaterialLiteral = Field(..., example="copper")
    insulation: InsulationLiteral = Field(..., example="XLPE")
    installation_method: InstallMethodLiteral = Field(..., example="conduit_surface")
    ambient_temperature_c: int = Field(..., example=35)
    
    # Requirements
    load_type: Optional[LoadTypeLiteral] = Field(None, example="general_power")
    allowable_vdrop_percent: Optional[float] = Field(None, gt=0, example=5.0)
    
    # ------------------------------------------------------------------
    # Fault Check (UPDATED)
    # ------------------------------------------------------------------
    # Backward compatible:
    #   - If none of the new short-circuit fields are sent,
    #     the calculator switches SC check OFF automatically.
    #
    fault_current_ka: Optional[float] = Field(
        None, gt=0, example=6.0,
        description="Source prospective fault level (kA) — optional"
    )
    disconnection_time_s: Optional[float] = Field(
        None, gt=0, example=0.4,
        description="Disconnection time for SC check — optional"
    )

    # NEW — toggle SC calculations
    enable_short_circuit_check: bool = Field(
        False,
        example=False,
        description="Enable thermal short-circuit sizing check"
    )

    # NEW — preferred fault current at the LOAD
    fault_current_at_load_ka: Optional[float] = Field(
        None, gt=0,
        description="Actual fault current at cable end (preferred)"
    )

    # NEW — attenuation when using source fault_current_ka
    assume_fault_at_load_fraction: Optional[float] = Field(
        None, ge=0, le=1,
        description="Fraction of source fault current reaching load (default = 0.10)"
    )
    
    model_config = ConfigDict(from_attributes=True)

class CableSizerDerivedValues(BaseModel):
    load_current_a: float
    allowable_vdrop_percent: float
    allowable_vdrop_v: float
    Ct_temp: float
    Ci_install: float
    Cg_grouping: float = 1.0 # Hardcoded for now
    total_derating_factor: float
    effective_required_ampacity_a: float
    short_circuit_k_factor: float
    short_circuit_min_mm2: float

class CableSizerReasoningStep(BaseModel):
    size_mm2: float
    
    # Ampacity Check
    base_ampacity_a: float
    derated_ampacity_a: float
    ampacity_ok: bool
    
    # Voltage Drop Check
    resistance_ohm_per_km: float
    reactance_ohm_per_km: float
    voltage_drop_percent: float
    vdrop_ok: bool
    
    # Short Circuit Check
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
        if final_size == self.reasoning[0].size_mm2:
            return f"Selected size {final_size}mm² is the minimum size for all checks."
        
        # Check why it was upsized
        ampacity_min_size = self.reasoning[0].size_mm2
        vdrop_min_size = next(s.size_mm2 for s in self.reasoning if s.ampacity_ok and s.vdrop_ok)
        sc_min_size = next(s.size_mm2 for s in self.reasoning if s.short_circuit_ok)

        reasons = []
        if final_size > ampacity_min_size:
            reasons.append(f"voltage drop (required {vdrop_min_size}mm²)")
        if final_size > vdrop_min_size:
             reasons.append(f"short-circuit withstand (required {sc_min_size}mm²)")
        
        if not reasons:
             # This can happen if, e.g., vdrop_min_size > ampacity_min_size and sc_min_size > ampacity_min_size
             # but vdrop_min_size == final_size and sc_min_size == final_size
             if vdrop_min_size == final_size:
                 reasons.append("voltage drop")
             if sc_min_size == final_size:
                 reasons.append("short-circuit withstand")

        # Deduplicate reasons if necessary (e.g., if both vdrop and sc point to the same final size)
        unique_reasons = " and ".join(sorted(list(set(reasons))))
        
        return f"Selected size {final_size}mm²; upsized from {ampacity_min_size}mm² (for ampacity) due to {unique_reasons}."

# --- END UPDATED ---