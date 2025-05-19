# backend/app/main.py
# Uncondensed Version: Standardized Router Prefix Handling
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all your routers
from .routers import (
    auth,
    users,
    projects,
    tasks,
    inventory,
    drawings,
    timelogs,
    comments,
    task_photos,
    shopping_list,
    admin_tools
)
# Ensure any other routers are imported here

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

# CORS Middleware (as before)
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

# Include Routers - Define prefixes HERE
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"]) # Add prefix if not in tasks.py
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(drawings.router, prefix="/drawings", tags=["Drawings"])
app.include_router(timelogs.router, prefix="/timelogs", tags=["Time Logs"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"]) # Add prefix if not in comments.py
app.include_router(task_photos.router, prefix="/task_photos", tags=["Task Photos"]) # Add prefix
app.include_router(shopping_list.router, prefix="/shopping-list", tags=["Shopping List"]) # Add prefix
app.include_router(admin_tools.router, prefix="/admin-tools", tags=["Admin Tools"])


@app.get("/")
async def read_root(): # Added async for consistency
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}