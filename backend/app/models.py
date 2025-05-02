# backend/app/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Interval # Import Interval
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="creator")
    uploaded_drawings = relationship("Drawing", back_populates="uploader") # Added relationship
    time_logs = relationship("TimeLog", back_populates="user") # Added relationship


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
    creator = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project") # Added relationship


class Task(Base):
    __tablename__ = "tasks"

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
    # Optional: Add relationship for TimeLogs linked directly to tasks later
    # time_logs = relationship("TimeLog", back_populates="task")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, default=0.0)
    unit = Column(String, nullable=True)
    location = Column(String, nullable=True)
    low_stock_threshold = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# --- New Models ---

class Drawing(Base):
    __tablename__ = "drawings"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False) # Original filename
    filepath = Column(String, nullable=False, unique=True) # Stored path relative to an upload root
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=True) # Store MIME type
    size_bytes = Column(Integer, nullable=True) # Store file size
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False) # Which project it belongs to
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Who uploaded it

    # Relationships
    project = relationship("Project", back_populates="drawings")
    uploader = relationship("User", back_populates="uploaded_drawings")


class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True) # Null until clocked out
    duration = Column(Interval, nullable=True) # Store difference, calculated on clock-out
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Allow linking to project OR task (or neither?) - adjust constraints as needed
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="time_logs")
    project = relationship("Project") # No back pop needed if not navigating Project->TimeLogs often
    task = relationship("Task")       # No back pop needed if not navigating Task->TimeLogs often