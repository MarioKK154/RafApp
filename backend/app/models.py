# backend/app/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Interval, Table # Import Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base # Assuming Base is defined in database.py

# --- Association Table for Project Members (Many-to-Many) ---
# Define this table structure BEFORE the models that use it.
project_members_table = Table(
    "project_members", # Table name
    Base.metadata,     # Use the metadata from our Base class
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True), # Foreign key to projects table, part of composite PK
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)        # Foreign key to users table, part of composite PK
)
# --- End Association Table Definition ---


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="employee") # Roles: admin, project manager, team leader, electrician
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    projects_created = relationship("Project", back_populates="creator") # Renamed for clarity
    uploaded_drawings = relationship("Drawing", back_populates="uploader")
    time_logs = relationship("TimeLog", back_populates="user")

    # Many-to-Many relationship with Project via project_members_table
    assigned_projects = relationship(
        "Project",
        secondary=project_members_table, # Link via the association table
        back_populates="members"          # Link back from Project.members
    )


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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="projects_created")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan") # Added cascade

    # Many-to-Many relationship with User via project_members_table
    members = relationship(
        "User",
        secondary=project_members_table, # Link via the association table
        back_populates="assigned_projects" # Link back from User.assigned_projects
    )


class Task(Base):
    __tablename__ = "tasks"
    # ... (Task columns remain the same) ...
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="To Do")
    priority = Column(String, default="Medium")
    due_date = Column(DateTime(timezone=True), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    # Optional: Add assignee_id later
    # time_logs = relationship("TimeLog", back_populates="task") # Optional


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    # ... (Inventory columns remain the same) ...
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, default=0.0)
    unit = Column(String, nullable=True)
    location = Column(String, nullable=True)
    low_stock_threshold = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Drawing(Base):
    __tablename__ = "drawings"
    # ... (Drawing columns remain the same) ...
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="drawings")
    uploader = relationship("User", back_populates="uploaded_drawings")

class TimeLog(Base):
    __tablename__ = "time_logs"
    # ... (TimeLog columns remain the same) ...
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Interval, nullable=True)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="time_logs")
    project = relationship("Project")
    task = relationship("Task")