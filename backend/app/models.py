# backend/app/models.py
# Final version based on the user-provided file with corrections.

from sqlalchemy import (Boolean, Column, ForeignKey, Integer, String, DateTime,
                        Text, Enum as SQLAlchemyEnum, Float, Interval, Table, Date)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
import enum
from typing import Optional, List
from datetime import datetime # <--- ADDED THE MISSING IMPORT

from .database import Base

class UserRole(enum.Enum):
    admin = "admin"
    project_manager = "project manager"
    team_lead = "team_lead"
    regular_user = "regular_user"
    superuser = "superuser"

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

# --- NEW: Tool Log Action Enum ---
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

# --- NEW: TyreType Enum ---
class TyreType(enum.Enum):
    Summer = "Summer"
    Winter = "Winter"

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    background_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    projects: Mapped[list["Project"]] = relationship(back_populates="tenant")
    tools: Mapped[list["Tool"]] = relationship(back_populates="tenant")
    cars: Mapped[list["Car"]] = relationship(back_populates="tenant")
    shops: Mapped[list["Shop"]] = relationship(back_populates="tenant")

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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    kennitala = Column(String, unique=True, index=True, nullable=True)
    profile_picture_path = Column(String, nullable=True) # This was already correct
    hourly_rate = Column(Float, nullable=True)
    phone_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    tools_checked_out: Mapped[list["Tool"]] = relationship(back_populates="current_user")
    tenant = relationship("Tenant", back_populates="users")
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
    quantity = Column(Float, default=0.0, nullable=False)
    quantity_needed = Column(Float, default=0.0, nullable=False)
    unit = Column(String, nullable=True)
    location = Column(String, nullable=True)
    low_stock_threshold = Column(Float, nullable=True)
    shop_url_1 = Column(String, nullable=True)
    shop_url_2 = Column(String, nullable=True)
    shop_url_3 = Column(String, nullable=True)
    local_image_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    boq_items: Mapped[List["BoQItem"]] = relationship(back_populates="inventory_item")

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

# --- NEW: Tool Model ---
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

    # Foreign Keys
    current_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)

    # Relationships
    current_user: Mapped[Optional["User"]] = relationship(back_populates="tools_checked_out")
    tenant: Mapped["Tenant"] = relationship(back_populates="tools")
    history_logs: Mapped[list["ToolLog"]] = relationship(back_populates="tool", cascade="all, delete-orphan")

# --- END NEW MODEL ---

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
    year: Mapped[Optional[int]] = mapped_column(Integer) # Year manufactured
    purchase_date: Mapped[Optional[Date]] = mapped_column(Date) # Year bought
    license_plate: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    status: Mapped[CarStatus] = mapped_column(SQLAlchemyEnum(CarStatus), default=CarStatus.Available)
    
    last_oil_change_km: Mapped[Optional[int]] = mapped_column(Integer)
    next_oil_change_due_km: Mapped[Optional[int]] = mapped_column(Integer)
    
    service_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    service_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    image_path: Mapped[Optional[str]] = mapped_column(String)
    vin: Mapped[Optional[str]] = mapped_column(String, unique=True)

    # Foreign Keys
    current_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)

    # Relationships
    current_user: Mapped[Optional["User"]] = relationship(back_populates="car_checked_out")
    tenant: Mapped["Tenant"] = relationship(back_populates="cars")
    history_logs: Mapped[list["CarLog"]] = relationship(back_populates="car", cascade="all, delete-orphan")
    tyre_sets: Mapped[list["TyreSet"]] = relationship(back_populates="car", cascade="all, delete-orphan")

# --- NEW: TyreSet Model ---
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

# --- CarLog Model (previously defined, remains correct) ---
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

# --- NEW: BoQ Model ---
class BoQ(Base):
    __tablename__ = "boqs"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, default="Main Bill of Quantities")
    
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, nullable=False)
    
    project: Mapped["Project"] = relationship(back_populates="boq")
    items: Mapped[List["BoQItem"]] = relationship(back_populates="boq", cascade="all, delete-orphan")

# --- NEW: BoQItem Model ---
class BoQItem(Base):
    __tablename__ = "boq_items"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quantity_required: Mapped[float] = mapped_column(Float, nullable=False)
    
    boq_id: Mapped[int] = mapped_column(ForeignKey("boqs.id"), nullable=False)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    
    boq: Mapped["BoQ"] = relationship(back_populates="items")
    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="boq_items")