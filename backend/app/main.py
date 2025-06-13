# backend/app/main.py
# Uncondensed Version: Standardized Router Prefix Handling
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles # Import StaticFiles
import os # For path joining

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
    admin_tools,
    tenants
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

# --- Mount Static Files Directory ---
# Create the path to the 'static' directory relative to this main.py file
# This assumes 'main.py' is in 'backend/app/' and 'static' is in 'backend/static/'
# Adjust if your 'static' folder is elsewhere relative to 'main.py'
# For example, if 'static' is directly inside 'backend/' alongside 'app/'
# then use os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

# Assuming 'static' folder is at the same level as the 'app' folder (i.e., in 'backend/static')
# The following path assumes 'main.py' is in 'backend/app/'
# So, one '..' gets to 'backend/', then join with 'static'
static_files_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

# Check if the directory exists (optional, for debugging)
if not os.path.isdir(static_files_path):
    print(f"Warning: Static files directory not found at {static_files_path}. Please create it or check path.")
    # You might want to create it if it doesn't exist for convenience in dev
    # os.makedirs(static_files_path, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_files_path), name="static")
# Now, files in backend/static/inventory_images/some_image.jpg
# will be accessible at http://localhost:8000/static/inventory_images/some_image.jpg

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
app.include_router(tenants.router)


@app.get("/")
async def read_root(): # Added async for consistency
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}