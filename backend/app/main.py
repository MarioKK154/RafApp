# backend/app/main.py
# Final version with the 'dashboard' router and corrected root endpoint.

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from .limiter import limiter
from . import models
from .database import engine

# Import all your routers
from .routers import (
    auth, users, projects, tasks, tenants,
    inventory, tools, cars, shops, boq, drawings, 
    timelogs, admin_tools, comments, task_photos, 
    shopping_list, reports,
    dashboard, project_inventory, offers, events,
    labor_catalog
)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Include all routers
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
app.include_router(drawings.router)
app.include_router(timelogs.router)
app.include_router(comments.router)
app.include_router(task_photos.router)
app.include_router(shopping_list.router)
app.include_router(admin_tools.router)


# --- THIS IS THE FIX ---
# The decorator should be attached to 'app', not 'router'.
@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {"message": "Welcome to the Raf-App API"}