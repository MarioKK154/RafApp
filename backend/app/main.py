# backend/app/main.py
# Uncondensed Version: Shopping List Added
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from .routers import (
    auth, users, projects, tasks, inventory, drawings, timelogs, comments,
    task_photos, shopping_list # Add shopping_list
)

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(tasks.router) # Prefix defined in tasks.py
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(drawings.router, prefix="/drawings", tags=["Drawings"])
app.include_router(timelogs.router, prefix="/timelogs", tags=["Time Logs"])
app.include_router(comments.router) # Prefix defined in comments.py
app.include_router(task_photos.router) # Prefix defined in task_photos.py
# Use prefix defined in shopping_list.py by not specifying one here
app.include_router(shopping_list.router)

# Root Endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}