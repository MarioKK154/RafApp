# backend/app/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # For default timestamps

# Import the Base class from database.py
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="employee") # Example roles: admin, manager, employee
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # --- Relationships ---
    # Relationship to Projects created by this user
    projects = relationship("Project", back_populates="creator")
    # Relationship to TimeLogs recorded by this user (Add TimeLog model later)
    # time_logs = relationship("TimeLog", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String, default="Planning") # e.g., Planning, In Progress, Completed, On Hold
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Link to the user who created it
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # --- Relationships ---
    # Relationship back to the User who created the project
    creator = relationship("User", back_populates="projects")
    # Relationship to Tasks within this project
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="To Do") # e.g., To Do, In Progress, Done, Blocked
    priority = Column(String, default="Medium") # e.g., Low, Medium, High
    due_date = Column(DateTime(timezone=True), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False) # Link to the project
    # Optional: Assignee ID (link back to User) - Add later if needed
    # assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # --- Relationships ---
    # Relationship back to the Project
    project = relationship("Project", back_populates="tasks")
    # Relationship back to the User assigned (if assignee_id is added)
    # assignee = relationship("User", back_populates="assigned_tasks")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, default=0.0) # Using Float for potential fractional quantities
    unit = Column(String, nullable=True) # e.g., pcs, meters, kg
    location = Column(String, nullable=True) # Where is it stored?
    low_stock_threshold = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Optional: Link to project if inventory is project-specific
    # project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    # project = relationship("Project")


# --- Add other models below based on your plan (TimeLog, Drawing, etc.) ---