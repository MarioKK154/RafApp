# backend/app/main.py
# Final, synchronized version with robust static file pathing.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # Use fastapi.staticfiles
from pathlib import Path # Use modern pathlib for path handling

# Import your models and engine
from . import models
from .database import engine

# Import all your routers
# --- CORRECTED IMPORTS: Ensure all routers are imported ---
from .routers import (
    auth,
    users,
    projects,
    tasks,
    inventory,
    drawings,
    timelogs,
    # The following were missing from my last suggestion but are needed by your app
    comments,
    task_photos,
    shopping_list,
    admin_tools,
    tenants,
    tools,
    cars,
    shops,
    boq,
    reports
)
# --- END CORRECTION ---

# This creates database tables if they don't exist. Good for development.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

# CORS Middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CORRECTED STATIC FILE MOUNTING ---
# Get the absolute path to the directory containing this main.py file (i.e., backend/app)
BASE_DIR = Path(__file__).resolve().parent
# Mount the 'static' directory which is inside the 'app' directory
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
# --- END CORRECTION ---


# Include Routers - Define prefixes here
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(drawings.router, prefix="/drawings", tags=["Drawings"])
app.include_router(timelogs.router, prefix="/timelogs", tags=["Time Logs"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"]) # Add prefix if not in comments.py
app.include_router(task_photos.router, prefix="/task_photos", tags=["Task Photos"]) # Add prefix
app.include_router(shopping_list.router, prefix="/shopping-list", tags=["Shopping List"]) # Add prefix
app.include_router(admin_tools.router, prefix="/admin-tools", tags=["Admin Tools"])
app.include_router(tenants.router)
app.include_router(tools.router)
app.include_router(cars.router)
app.include_router(shops.router)
app.include_router(boq.router)
app.include_router(reports.router)

@app.get("/")
async def read_root():
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}