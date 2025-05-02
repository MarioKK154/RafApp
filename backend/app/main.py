# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from .routers import auth, users, projects, tasks, inventory # Add new routers

# --- FastAPI App Initialization ---
app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
    # Add other OpenAPI metadata if desired
    # docs_url="/docs", redoc_url="/redoc"
)

# --- CORS Configuration ---
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

# --- Include Routers ---
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])


# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"message": "Welcome to RafApp API - Check /docs for endpoints"}