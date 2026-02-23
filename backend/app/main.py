# backend/app/main.py
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from .limiter import limiter
from . import models
from .database import engine

# 1. Import all routers
from .routers import (
    auth, users, projects, tasks, tenants,
    inventory, tools, cars, shops, boq, drawings, 
    timelogs, admin_tools, comments, task_photos, 
    shopping_list, reports,
    dashboard, project_inventory, offers, events,
    labor_catalog, calculators, customers,
    accounting,
    notifications, assignments, tutorials  # <--- ROADMAP #2: Added
)

# 2. Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 3. CORS Middleware configuration
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Static Files Setup & Directory Initialization
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

subdirs = [
    "car_images", 
    "tool_images", 
    "project_drawings", 
    "task_photos", 
    "payslips", 
    "licenses"
]
for folder in subdirs:
    (STATIC_DIR / folder).mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 5. Include all routers in the app
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(tenants.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(inventory.router)
app.include_router(project_inventory.router)
app.include_router(tools.router)
app.include_router(cars.router)
app.include_router(shops.router)
app.include_router(boq.router)
app.include_router(offers.router)
app.include_router(reports.router)
app.include_router(events.router)
app.include_router(labor_catalog.router)
app.include_router(calculators.router)
app.include_router(customers.router)
app.include_router(drawings.router)
app.include_router(timelogs.router)
app.include_router(comments.router)
app.include_router(task_photos.router)
app.include_router(shopping_list.router)
app.include_router(accounting.router)
app.include_router(notifications.router) # <--- ROADMAP #2: Added
app.include_router(assignments.router)
app.include_router(tutorials.router)
app.include_router(admin_tools.router)

# 6. Root Endpoint
@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {"message": "Welcome to the Raf-App API"}