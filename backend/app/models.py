# backend/app/models.py
# Uncondensed Version: Added start_date to Task
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, Float, Interval, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Association Table for Project Members
project_members_table = Table(
    "project_members", Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    # ... user columns and relationships as before ...
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Relationships
    projects_created = relationship("Project", back_populates="creator")
    uploaded_drawings = relationship("Drawing", back_populates="uploader")
    time_logs = relationship("TimeLog", back_populates="user")
    assigned_projects = relationship("Project", secondary=project_members_table, back_populates="members")
    assigned_tasks = relationship("Task", back_populates="assignee")
    task_comments = relationship("TaskComment", back_populates="author")
    uploaded_task_photos = relationship("TaskPhoto", back_populates="uploader")

class Project(Base):
    __tablename__ = "projects"
    # ... project columns and relationships as before ...
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
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
    members = relationship("User", secondary=project_members_table, back_populates="assigned_projects")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="To Do")
    priority = Column(String, default="Medium")
    # --- NEW: Task Start Date ---
    start_date = Column(DateTime(timezone=True), nullable=True) # Added optional start date
    # --- End New Field ---
    due_date = Column(DateTime(timezone=True), nullable=True) # Keep due_date as end date
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    photos = relationship("TaskPhoto", back_populates="task", cascade="all, delete-orphan")


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    # ... inventory columns as before ...
    id = Column(Integer, primary_key=True, index=True); name = Column(String, index=True, nullable=False); description = Column(Text, nullable=True); quantity = Column(Float, default=0.0, nullable=False); quantity_needed = Column(Float, default=0.0, nullable=False); unit = Column(String, nullable=True); location = Column(String, nullable=True); low_stock_threshold = Column(Float, nullable=True); shop_url_1 = Column(String, nullable=True); shop_url_2 = Column(String, nullable=True); shop_url_3 = Column(String, nullable=True); created_at = Column(DateTime(timezone=True), server_default=func.now()); updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Drawing(Base):
    __tablename__ = "drawings"
    # ... drawing columns and relationships as before ...
    id = Column(Integer, primary_key=True, index=True); filename = Column(String, nullable=False); filepath = Column(String, nullable=False, unique=True); description = Column(Text, nullable=True); content_type = Column(String, nullable=True); size_bytes = Column(Integer, nullable=True); uploaded_at = Column(DateTime(timezone=True), server_default=func.now()); project_id = Column(Integer, ForeignKey("projects.id"), nullable=False); uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project = relationship("Project", back_populates="drawings"); uploader = relationship("User", back_populates="uploaded_drawings")

class TimeLog(Base):
    __tablename__ = "time_logs"
    # ... timelog columns and relationships as before ...
    id = Column(Integer, primary_key=True, index=True); start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now()); end_time = Column(DateTime(timezone=True), nullable=True); duration = Column(Interval, nullable=True); notes = Column(Text, nullable=True); user_id = Column(Integer, ForeignKey("users.id"), nullable=False); project_id = Column(Integer, ForeignKey("projects.id"), nullable=True); task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    user = relationship("User", back_populates="time_logs"); project = relationship("Project"); task = relationship("Task")

class TaskComment(Base):
    __tablename__ = "task_comments"
    # ... task comment columns and relationships as before ...
    id = Column(Integer, primary_key=True, index=True); content = Column(Text, nullable=False); created_at = Column(DateTime(timezone=True), server_default=func.now()); task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False); author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task = relationship("Task", back_populates="comments"); author = relationship("User", back_populates="task_comments")

class TaskPhoto(Base):
    __tablename__ = "task_photos"
    # ... task photo columns and relationships as before ...
    id = Column(Integer, primary_key=True, index=True); filename = Column(String, nullable=False); filepath = Column(String, nullable=False, unique=True); description = Column(Text, nullable=True); content_type = Column(String, nullable=True); size_bytes = Column(Integer, nullable=True); uploaded_at = Column(DateTime(timezone=True), server_default=func.now()); task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False); uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task = relationship("Task", back_populates="photos"); uploader = relationship("User", back_populates="uploaded_task_photos")