# backend/app/models.py
# Uncondensed Version: Added Tenant model and relationships
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, Float, Interval, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# --- NEW: Tenant Model ---
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    logo_url = Column(String, nullable=True)
    background_image_url = Column(String, nullable=True)
    # primary_color = Column(String, nullable=True) # For later
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # If a tenant is deleted, what happens to its users and projects?
    # For now, let's assume deletion is restricted if they exist.
    # We can add cascade="all, delete-orphan" here if needed later.
    users = relationship("User", back_populates="tenant")
    projects = relationship("Project", back_populates="tenant")


# Association Table for Project Members (as before)
project_members_table = Table(
    "project_members", Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    kennitala = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False) # Global superuser
    role = Column(String, nullable=False)
    
    # --- NEW: Link to Tenant ---
    # Every user MUST belong to a tenant.
    # For existing users, migration will need to handle setting a default.
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False) 
    # --- End New Link ---

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="users") # New
    projects_created = relationship("Project", foreign_keys="[Project.creator_id]", back_populates="creator")
    projects_managed = relationship("Project", foreign_keys="[Project.project_manager_id]", back_populates="project_manager")
    uploaded_drawings = relationship("Drawing", back_populates="uploader", cascade="all, delete-orphan")
    time_logs = relationship("TimeLog", back_populates="user", cascade="all, delete-orphan")
    assigned_projects = relationship("Project", secondary=project_members_table, back_populates="members")
    assigned_tasks = relationship("Task", back_populates="assignee")
    task_comments = relationship("TaskComment", back_populates="author", cascade="all, delete-orphan")
    uploaded_task_photos = relationship("TaskPhoto", back_populates="uploader", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String, default="Planning")
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_manager_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # --- NEW: Link to Tenant ---
    # Every project MUST belong to a tenant.
    # For existing projects, migration will need to handle setting a default.
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    # --- End New Link ---

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="projects") # New
    creator = relationship("User", foreign_keys=[creator_id], back_populates="projects_created")
    project_manager = relationship("User", foreign_keys=[project_manager_id], back_populates="projects_managed")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
    members = relationship("User", secondary=project_members_table, back_populates="assigned_projects")

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

    # Relationships (Tasks are implicitly tenant-specific via their Project)
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    photos = relationship("TaskPhoto", back_populates="task", cascade="all, delete-orphan")

class InventoryItem(Base):
    __tablename__ = "inventory_items" # Kept global for now
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

class Drawing(Base):
    __tablename__ = "drawings"
    id = Column(Integer, primary_key=True, index=True); filename = Column(String, nullable=False); filepath = Column(String, nullable=False, unique=True); description = Column(Text, nullable=True); content_type = Column(String, nullable=True); size_bytes = Column(Integer, nullable=True); uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Consider ondelete SET NULL if drawings should remain if uploader deleted
    project = relationship("Project", back_populates="drawings"); uploader = relationship("User", back_populates="uploaded_drawings")

class TimeLog(Base):
    __tablename__ = "time_logs"
    id = Column(Integer, primary_key=True, index=True); start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now()); end_time = Column(DateTime(timezone=True), nullable=True); duration = Column(Interval, nullable=True); notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    user = relationship("User", back_populates="time_logs"); project = relationship("Project"); task = relationship("Task")

class TaskComment(Base):
    __tablename__ = "task_comments"
    id = Column(Integer, primary_key=True, index=True); content = Column(Text, nullable=False); created_at = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Consider ondelete SET NULL if comments should remain if author deleted
    task = relationship("Task", back_populates="comments"); author = relationship("User", back_populates="task_comments")

class TaskPhoto(Base):
    __tablename__ = "task_photos"
    id = Column(Integer, primary_key=True, index=True); filename = Column(String, nullable=False); filepath = Column(String, nullable=False, unique=True); description = Column(Text, nullable=True); content_type = Column(String, nullable=True); size_bytes = Column(Integer, nullable=True); uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Consider ondelete SET NULL
    task = relationship("Task", back_populates="photos"); uploader = relationship("User", back_populates="uploaded_task_photos")