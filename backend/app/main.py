# backend/app/main.py
# Final Verified Version: Task Photos Added
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from .routers import (
    auth, users, projects, tasks, inventory, drawings, timelogs, comments,
    task_photos # Add task_photos router
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
app.include_router(tasks.router) # Prefix="/tasks" defined within tasks.py
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(drawings.router, prefix="/drawings", tags=["Drawings"])
app.include_router(timelogs.router, prefix="/timelogs", tags=["Time Logs"])
app.include_router(comments.router) # Prefix="/comments" defined within comments.py
app.include_router(task_photos.router) # Prefix="/task_photos" defined within task_photos.py

# Root Endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}