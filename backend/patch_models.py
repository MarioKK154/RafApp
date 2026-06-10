import os

path = r"c:\Users\mario\Desktop\RafApp\backend\app\models.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add can_export_data to User
content = content.replace(
    'extra_permissions = Column(Text, nullable=True)\n    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)',
    'extra_permissions = Column(Text, nullable=True)\n    can_export_data = Column(Boolean, default=False)\n    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)'
)

# 2. Add checklists to Task
content = content.replace(
    'comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")\n    photos = relationship("TaskPhoto", back_populates="task", cascade="all, delete-orphan")',
    'comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")\n    checklists = relationship("TaskChecklistItem", back_populates="task", cascade="all, delete-orphan")\n    photos = relationship("TaskPhoto", back_populates="task", cascade="all, delete-orphan")'
)

# 3. Add fields to InventoryItem
content = content.replace(
    'subcategory = Column(String, index=True, nullable=True)\n    category_en = Column(String, nullable=True, index=True)',
    'subcategory = Column(String, index=True, nullable=True)\n    master_category = Column(String, index=True, nullable=True)\n    category_en = Column(String, nullable=True, index=True)'
)

content = content.replace(
    'description_en = Column(Text, nullable=True)\n    unit = Column(String, nullable=True)',
    'description_en = Column(Text, nullable=True)\n    brand = Column(String, index=True, nullable=True)\n    voltage = Column(String, nullable=True)\n    amperage = Column(String, nullable=True)\n    ip_rating = Column(String, nullable=True)\n    ar_labor_tasks_list = Column(Text, nullable=True)\n    unit = Column(String, nullable=True)'
)

# 4. Add TaskChecklistItem and PushSubscription before TaskPhoto
content = content.replace(
    'class TaskPhoto(Base):',
    '''class TaskChecklistItem(Base):
    __tablename__ = "task_checklist_items"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    is_private = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    task = relationship("Task", back_populates="checklists")
    author = relationship("User")

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class TaskPhoto(Base):'''
)

# 5. Append missing classes at the end
content += '''
class ChatThread(Base):
    __tablename__ = "chat_threads"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=True) # None for DMs
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant")
    project = relationship("Project")
    participants = relationship("ThreadParticipant", back_populates="thread", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")


class ThreadParticipant(Base):
    __tablename__ = "thread_participants"
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), nullable=True)

    thread = relationship("ChatThread", back_populates="participants")
    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    attachment_url = Column(String, nullable=True)

    thread = relationship("ChatThread", back_populates="messages")
    author = relationship("User")

from datetime import datetime

class TenantIntegration(Base):
    __tablename__ = "tenant_integrations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    provider = Column(String, nullable=False) # e.g., 'PROCORE', 'ACC', 'AJOUR'
    api_key = Column(String, nullable=True)   # Simulated API Key
    base_url = Column(String, nullable=True)  # Simulated Base URL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tenant = relationship("Tenant")

class SalesLead(Base):
    __tablename__ = "sales_leads"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    selected_tier: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="New", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch applied.")
