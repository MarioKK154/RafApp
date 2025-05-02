# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List # Import List
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Planning"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass # Inherits all fields from Base, creator_id set in CRUD

class ProjectUpdate(ProjectBase):
    # Allow updating all fields from Base, make them optional for PATCH-like behavior
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: Include creator details if needed
    # creator: Optional[UserRead] = None # Requires UserRead to be defined above

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    due_date: Optional[datetime] = None
    # project_id is needed for creation
    project_id: int

class TaskCreate(TaskBase):
    pass # Inherits all fields from Base

class TaskUpdate(BaseModel):
    # Explicitly list fields that can be updated, make them optional
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None # Allow moving tasks (optional)
    # assignee_id: Optional[int] = None # If assignee is added

class TaskRead(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Optional: Include project details if needed
    # project: Optional[ProjectRead] = None # Requires ProjectRead to be defined above

    class Config:
        from_attributes = True


# --- Inventory Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: Optional[float] = 0.0
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None

class InventoryItemCreate(InventoryItemBase):
    pass # Inherits all fields from Base

class InventoryItemUpdate(InventoryItemBase):
    # Allow updating all fields from Base, make them optional
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[float] = None

class InventoryItemRead(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True