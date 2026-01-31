# backend/app/models.py
from sqlalchemy import (Boolean, Column, ForeignKey, Integer, String, DateTime,
                        Text, Enum as SQLAlchemyEnum, Float, Interval, Table, Date, UniqueConstraint)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
import enum
from typing import Optional, List
from datetime import datetime, date

from .database import Base

# --- Enums ---

class UserRole(enum.Enum):
    admin = "admin"
    project_manager = "project manager"
    team_lead = "team_lead"
    regular_user = "regular_user"
    superuser = "superuser"
    accountant = "accountant"  # Added accountant role

class ProjectStatus(enum.Enum):
    Not_Started = "Not Started"
    In_Progress = "In Progress"
    On_Hold = "On Hold"
    Completed = "Completed"
    Cancelled = "Cancelled"

class TaskStatus(enum.Enum):
    Not_Started = "Not Started"
    In_Progress = "In Progress"
    On_Hold = "On Hold"
    Done = "Done"
    Commissioned = "Commissioned"
    Cancelled = "Cancelled"

class ToolStatus(enum.Enum):
    Available = "Available"
    In_Use = "In Use"
    In_Repair = "In Repair"
    Retired = "Retired"

class ToolLogAction(enum.Enum):
    Checked_Out = "Checked Out"
    Checked_In = "Checked In"
    Maintenance = "Maintenance"
    Created = "Created"

class CarStatus(enum.Enum):
    Available = "Available"
    Checked_Out = "Checked Out"
    In_Service = "In Service"
    Needs_Service = "Needs Service"
    Retired = "Retired"

class CarLogAction(enum.Enum):
    Checked_Out = "Checked Out"
    Checked_In = "Checked In"
    Maintenance = "Maintenance"
    Created = "Created"

class TyreType(enum.Enum):
    Summer = "Summer"
    Winter = "Winter"

class OfferStatus(enum.Enum):
    Draft = "Draft"
    Sent = "Sent"
    Accepted = "Accepted"
    Rejected = "Rejected"

class OfferLineItemType(enum.Enum):
    Material = "Material"
    Labor = "Labor"

class DrawingStatus(enum.Enum):
    Draft = "Draft"
    For_Approval = "For Approval"
    Approved = "Approved"
    As_Built = "As-Built"
    Archived = "Archived"

class LeaveStatus(enum.Enum):
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"

# --- Association Tables ---

project_members_table = Table(
    "project_members", Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)

task_dependencies_table = Table(
    'task_dependencies',
    Base.metadata,
    Column('task_id', Integer, ForeignKey('tasks.id'), primary_key=True),
    Column('predecessor_id', Integer, ForeignKey('tasks.id'), primary_key=True)
)

event_attendees_table = Table(
    "event_attendees",
    Base.metadata,
    Column("event_id", Integer, ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)

# --- Models ---

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    background_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    projects: Mapped[list["Project"]] = relationship(back_populates="tenant")
    tools: Mapped[list["Tool"]] = relationship(back_populates="tenant")
    cars: Mapped[list["Car"]] = relationship(back_populates="tenant")
    shops: Mapped[list["Shop"]] = relationship(back_populates="tenant")
    offers: Mapped[list["Offer"]] = relationship(back_populates="tenant")
    labor_catalog_items: Mapped[list["LaborCatalogItem"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    customers: Mapped[list["Customer"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    payslips: Mapped[list["Payslip"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    leave_requests: Mapped[list["LeaveRequest"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    kennitala = Column(String, unique=True, index=True, nullable=True)
    profile_picture_path = Column(String, nullable=True)
    hourly_rate = Column(Float, nullable=True)
    phone_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    tools_checked_out: Mapped[list["Tool"]] = relationship(back_populates="current_user")
    projects_created = relationship("Project", foreign_keys="[Project.creator_id]", back_populates="creator")
    projects_managed = relationship("Project", foreign_keys="[Project.project_manager_id]", back_populates="project_manager")
    uploaded_drawings = relationship("Drawing", back_populates="uploader", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="user", cascade="all, delete-orphan")
    assigned_projects = relationship("Project", secondary=project_members_table, back_populates="members")
    assigned_tasks = relationship("Task", back_populates="assignee")
    task_comments = relationship("TaskComment", back_populates="author", cascade="all, delete-orphan")
    uploaded_task_photos = relationship("TaskPhoto", back_populates="uploader", cascade="all, delete-orphan")
    tool_logs: Mapped[list["ToolLog"]] = relationship(back_populates="user")
    car_checked_out: Mapped[Optional["Car"]] = relationship(back_populates="current_user")
    car_logs: Mapped[list["CarLog"]] = relationship(back_populates="user")
    licenses: Mapped[list["UserLicense"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    events_attending = relationship("Event", secondary=event_attendees_table, back_populates="attendees")
    payslips: Mapped[list["Payslip"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    leave_requests: Mapped[list["LeaveRequest"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class UserLicense(Base):
    __tablename__ = "user_licenses"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=False)
    issue_date: Mapped[Optional[date]] = mapped_column(Date)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user: Mapped["User"] = relationship(back_populates="licenses")

class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"))
    creator: Mapped["User"] = relationship()
    tenant: Mapped["Tenant"] = relationship()
    project: Mapped[Optional["Project"]] = relationship()
    attendees = relationship("User", secondary=event_attendees_table, back_populates="events_attending")
    
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String, default="Planning")
    budget: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_manager_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="projects")
    creator = relationship("User", foreign_keys=[creator_id], back_populates="projects_created")
    project_manager = relationship("User", foreign_keys=[project_manager_id], back_populates="projects_managed")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
    members = relationship("User", secondary=project_members_table, back_populates="assigned_projects")
    boq: Mapped[Optional["BoQ"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    project_inventory: Mapped[List["ProjectInventoryItem"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    offers: Mapped[list["Offer"]] = relationship(back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="To Do")
    priority = Column(String, default="Medium")
    start_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_commissioned = Column(Boolean, default=False, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    photos = relationship("TaskPhoto", back_populates="task", cascade="all, delete-orphan")
    successors = relationship(
        "Task",
        secondary=task_dependencies_table,
        primaryjoin=(id == task_dependencies_table.c.predecessor_id),
        secondaryjoin=(id == task_dependencies_table.c.task_id),
        back_populates="predecessors"
    )
    predecessors = relationship(
        "Task",
        secondary=task_dependencies_table,
        primaryjoin=(id == task_dependencies_table.c.task_id),
        secondaryjoin=(id == task_dependencies_table.c.predecessor_id),
        back_populates="successors"
    )

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=True)
    low_stock_threshold = Column(Float, nullable=True)
    shop_url_1 = Column(String, nullable=True)
    shop_url_2 = Column(String, nullable=True)
    shop_url_3 = Column(String, nullable=True)
    local_image_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    project_allocations: Mapped[List["ProjectInventoryItem"]] = relationship(back_populates="inventory_item")
    boq_items: Mapped[List["BoQItem"]] = relationship(back_populates="inventory_item")
    offer_line_items: Mapped[list["OfferLineItem"]] = relationship(back_populates="inventory_item")

class Offer(Base):
    __tablename__ = "offers"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    offer_number: Mapped[str] = mapped_column(String, unique=True, index=True) 
    title: Mapped[str] = mapped_column(String, default="Work Offer")
    status: Mapped[OfferStatus] = mapped_column(SQLAlchemyEnum(OfferStatus), default=OfferStatus.Draft)
    client_name: Mapped[Optional[str]] = mapped_column(String)
    client_address: Mapped[Optional[str]] = mapped_column(String)
    client_email: Mapped[Optional[str]] = mapped_column(String)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expiry_date: Mapped[Optional[Date]] = mapped_column(Date)
    total_amount: Mapped[Optional[float]] = mapped_column(Float)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="offers")
    tenant: Mapped["Tenant"] = relationship(back_populates="offers")
    creator: Mapped["User"] = relationship()
    line_items: Mapped[list["OfferLineItem"]] = relationship(back_populates="offer", cascade="all, delete-orphan")

class OfferLineItem(Base):
    __tablename__ = "offer_line_items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    item_type: Mapped[OfferLineItemType] = mapped_column(SQLAlchemyEnum(OfferLineItemType), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False) 
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    offer_id: Mapped[int] = mapped_column(ForeignKey("offers.id"), nullable=False)
    inventory_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory_items.id"))
    offer: Mapped["Offer"] = relationship(back_populates="line_items")
    inventory_item: Mapped[Optional["InventoryItem"]] = relationship(back_populates="offer_line_items")

class LaborCatalogItem(Base):
    __tablename__ = "labor_catalog_items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=False, index=True)
    default_unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String, default="hour")
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    tenant: Mapped["Tenant"] = relationship(back_populates="labor_catalog_items")
    
class ProjectInventoryItem(Base):
    __tablename__ = "project_inventory_items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quantity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="project_inventory")
    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="project_allocations")

class Drawing(Base):
    __tablename__ = "drawings"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    revision: Mapped[Optional[str]] = mapped_column(String)
    discipline: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[Optional[DrawingStatus]] = mapped_column(SQLAlchemyEnum(DrawingStatus), default=DrawingStatus.Draft)
    drawing_date: Mapped[Optional[date]] = mapped_column(Date)
    author: Mapped[Optional[str]] = mapped_column(String)
    project = relationship("Project", back_populates="drawings")
    uploader = relationship("User", back_populates="uploaded_drawings")

class TimeLog(Base):
    __tablename__ = "time_logs"
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Interval, nullable=True)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    user = relationship("User", back_populates="time_logs")
    project = relationship("Project")
    task = relationship("Task")

class TaskComment(Base):
    __tablename__ = "task_comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="task_comments")

class TaskPhoto(Base):
    __tablename__ = "task_photos"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task = relationship("Task", back_populates="photos")
    uploader = relationship("User", back_populates="uploaded_task_photos")

class Tool(Base):
    __tablename__ = "tools"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String)
    model: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)
    serial_number: Mapped[Optional[str]] = mapped_column(String, unique=True)
    status: Mapped[ToolStatus] = mapped_column(SQLAlchemyEnum(ToolStatus), default=ToolStatus.Available, nullable=False)
    purchase_date: Mapped[Optional[Date]] = mapped_column(Date)
    last_service_date: Mapped[Optional[Date]] = mapped_column(Date)
    image_path: Mapped[Optional[str]] = mapped_column(String)
    current_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    current_user: Mapped[Optional["User"]] = relationship(back_populates="tools_checked_out")
    tenant: Mapped["Tenant"] = relationship(back_populates="tools")
    history_logs: Mapped[list["ToolLog"]] = relationship(back_populates="tool", cascade="all, delete-orphan")

class ToolLog(Base):
    __tablename__ = "tool_logs"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    action: Mapped[ToolLogAction] = mapped_column(SQLAlchemyEnum(ToolLogAction), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tool_id: Mapped[int] = mapped_column(ForeignKey("tools.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    tool: Mapped["Tool"] = relationship(back_populates="history_logs")
    user: Mapped["User"] = relationship(back_populates="tool_logs")

class Car(Base):
    __tablename__ = "cars"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    make: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[Optional[int]] = mapped_column(Integer) 
    purchase_date: Mapped[Optional[Date]] = mapped_column(Date)
    license_plate: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    status: Mapped[CarStatus] = mapped_column(SQLAlchemyEnum(CarStatus), default=CarStatus.Available)
    last_oil_change_km: Mapped[Optional[int]] = mapped_column(Integer)
    next_oil_change_due_km: Mapped[Optional[int]] = mapped_column(Integer)
    service_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    service_notes: Mapped[Optional[str]] = mapped_column(Text)
    image_path: Mapped[Optional[str]] = mapped_column(String)
    vin: Mapped[Optional[str]] = mapped_column(String, unique=True)
    current_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    current_user: Mapped[Optional["User"]] = relationship(back_populates="car_checked_out")
    tenant: Mapped["Tenant"] = relationship(back_populates="cars")
    history_logs: Mapped[list["CarLog"]] = relationship(back_populates="car", cascade="all, delete-orphan")
    tyre_sets: Mapped[list["TyreSet"]] = relationship(back_populates="car", cascade="all, delete-orphan")

class TyreSet(Base):
    __tablename__ = "tyre_sets"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[TyreType] = mapped_column(SQLAlchemyEnum(TyreType), nullable=False)
    purchase_date: Mapped[Optional[Date]] = mapped_column(Date)
    brand: Mapped[Optional[str]] = mapped_column(String)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_on_car: Mapped[bool] = mapped_column(Boolean, default=False)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), nullable=False)
    car: Mapped["Car"] = relationship(back_populates="tyre_sets")

class CarLog(Base):
    __tablename__ = "car_logs"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    action: Mapped[CarLogAction] = mapped_column(SQLAlchemyEnum(CarLogAction), nullable=False)
    odometer_reading: Mapped[Optional[int]] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    car: Mapped["Car"] = relationship(back_populates="history_logs")
    user: Mapped["User"] = relationship(back_populates="car_logs")

class Shop(Base):
    __tablename__ = "shops"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String)
    contact_person: Mapped[Optional[str]] = mapped_column(String)
    phone_number: Mapped[Optional[str]] = mapped_column(String)
    email: Mapped[Optional[str]] = mapped_column(String)
    website: Mapped[Optional[str]] = mapped_column(String)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    tenant: Mapped["Tenant"] = relationship(back_populates="shops")

class BoQ(Base):
    __tablename__ = "boqs"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, default="Main Bill of Quantities")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, nullable=False)
    project: Mapped["Project"] = relationship(back_populates="boq")
    items: Mapped[List["BoQItem"]] = relationship(back_populates="boq", cascade="all, delete-orphan")

class BoQItem(Base):
    __tablename__ = "boq_items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quantity_required: Mapped[float] = mapped_column(Float, nullable=False)
    boq_id: Mapped[int] = mapped_column(ForeignKey("boqs.id"), nullable=False)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    boq: Mapped["BoQ"] = relationship(back_populates="items")
    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="boq_items")

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String)
    kennitala: Mapped[Optional[str]] = mapped_column(String, index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String)
    phone_number: Mapped[Optional[str]] = mapped_column(String)
    email: Mapped[Optional[str]] = mapped_column(String, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    tenant: Mapped["Tenant"] = relationship(back_populates="customers")
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='_tenant_customer_name_uc'),
        UniqueConstraint('tenant_id', 'kennitala', name='_tenant_customer_kennitala_uc'),
        UniqueConstraint('tenant_id', 'email', name='_tenant_customer_email_uc')
    )

# --- NEW: HR / Accounting Models ---

class Payslip(Base):
    __tablename__ = "payslips"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_brutto: Mapped[float] = mapped_column(Float, nullable=False)
    amount_netto: Mapped[float] = mapped_column(Float, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False) # Path to PDF
    filename: Mapped[str] = mapped_column(String, nullable=False) # Display name
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="payslips")
    tenant: Mapped["Tenant"] = relationship(back_populates="payslips")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    leave_type: Mapped[str] = mapped_column(String, nullable=False) # e.g., Sick, Vacation
    reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[LeaveStatus] = mapped_column(SQLAlchemyEnum(LeaveStatus), default=LeaveStatus.Pending)
    manager_comment: Mapped[Optional[str]] = mapped_column(Text)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="leave_requests")
    tenant: Mapped["Tenant"] = relationship(back_populates="leave_requests")