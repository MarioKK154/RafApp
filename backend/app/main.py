# backend/app/main.py
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .limiter import limiter
from . import models
from .config import get_settings
from .database import engine, is_sqlite

# 1. Import all routers
from .routers import (
    auth, users, projects, tasks, tenants,
    inventory, tools, cars, shops, boq, drawings, 
    timelogs, admin_tools, comments, task_photos, 
    shopping_list, reports,
    dashboard, project_inventory, offers, events,
    labor_catalog, calculators, customers,
    accounting,
    notifications, assignments, tutorials,
    risk_assessments,
    system,
)

# 2. Database schema
# SQLite (local dev): ensure tables exist via create_all.
# PostgreSQL: apply schema with `alembic upgrade head` — avoid create_all fighting migrations.
if is_sqlite():
    models.Base.metadata.create_all(bind=engine)

# Legacy SQLite-only migrations (old single-file DBs that predated full models).
# PostgreSQL: use Alembic + model definitions; skip ad hoc ALTERs.
if is_sqlite():
    from sqlalchemy import text

    def _dup_col(e: Exception) -> bool:
        msg = str(e).lower()
        return (
            "duplicate column name" in msg
            or "already exists" in msg
            or "duplicate column" in msg
        )

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
            conn.commit()
    except Exception as e:
        if not _dup_col(e):
            raise

    for col in ("main_category", "sub_category", "conditions"):
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE labor_catalog_items ADD COLUMN {col} VARCHAR"))
                conn.commit()
        except Exception as e:
            if not _dup_col(e):
                raise
    for stmt in (
        "ALTER TABLE labor_catalog_items ADD COLUMN reference_price FLOAT",
        "ALTER TABLE labor_catalog_items ADD COLUMN default_unit_price FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE labor_catalog_items ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE labor_catalog_items ADD COLUMN units_per_hour FLOAT",
        "ALTER TABLE projects ADD COLUMN work_load_ratio_codes TEXT",
        "ALTER TABLE offers ADD COLUMN work_load_ratio_codes TEXT",
    ):
        try:
            with engine.connect() as conn:
                conn.execute(text(stmt))
                conn.commit()
        except Exception as e:
            if not _dup_col(e):
                raise
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
            CREATE TABLE IF NOT EXISTS labor_catalog_item_conditions (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                labor_catalog_item_id INTEGER NOT NULL REFERENCES labor_catalog_items(id),
                code VARCHAR NOT NULL,
                condition_description VARCHAR NOT NULL,
                units_per_hour FLOAT,
                effective_date VARCHAR,
                end_date VARCHAR
            )
        """
                )
            )
            conn.commit()
    except Exception:
        pass

    def _add_column_if_missing(column_sql: str) -> None:
        try:
            with engine.connect() as conn:
                conn.execute(text(column_sql))
                conn.commit()
        except Exception as e:
            if not _dup_col(e):
                raise

    for _col_stmt in (
        "ALTER TABLE inventory_items ADD COLUMN iskraft_sku VARCHAR",
        "ALTER TABLE inventory_items ADD COLUMN ronning_sku VARCHAR",
        "ALTER TABLE inventory_items ADD COLUMN reykjafell_sku VARCHAR",
        "ALTER TABLE inventory_items ADD COLUMN name_en VARCHAR",
        "ALTER TABLE inventory_items ADD COLUMN description_en TEXT",
    ):
        _add_column_if_missing(_col_stmt)

    for _idx_stmt in (
        "CREATE INDEX IF NOT EXISTS ix_inventory_items_iskraft_sku ON inventory_items (iskraft_sku)",
        "CREATE INDEX IF NOT EXISTS ix_inventory_items_ronning_sku ON inventory_items (ronning_sku)",
        "CREATE INDEX IF NOT EXISTS ix_inventory_items_reykjafell_sku ON inventory_items (reykjafell_sku)",
        "CREATE INDEX IF NOT EXISTS ix_inventory_items_name_en ON inventory_items (name_en)",
    ):
        try:
            with engine.connect() as conn:
                conn.execute(text(_idx_stmt))
                conn.commit()
        except Exception:
            pass

app = FastAPI(
    title="RafApp API",
    description="API for the Electrical Project Management App",
    version="0.1.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_settings = get_settings()
if _settings.trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_settings.trusted_hosts)

# 3. CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
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
    "licenses",
    "tenant_assets",
    "inventory_images/iskraft_images",
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
app.include_router(system.router)
app.include_router(risk_assessments.router)


@app.on_event("startup")
def _normalize_legacy_task_statuses() -> None:
    """
    Backward compatibility: normalize legacy task status labels to current ones.
    Prevents response validation errors in timeline/calendar views.
    """
    from sqlalchemy import text

    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE tasks SET status = 'To Do' WHERE status = 'Not Started'"))
    except Exception:
        # Non-fatal: app should still boot even if this compatibility step fails.
        pass

# 6. Root Endpoint
@app.get("/")
@limiter.limit("5/minute")
def read_root(request: Request):
    return {"message": "Welcome to the Raf-App API"}


@app.get("/health/db")
@limiter.limit("60/minute")
def health_db(request: Request):
    from .database import healthcheck_db, healthcheck_by_role, database_layout

    if not healthcheck_db():
        raise HTTPException(status_code=503, detail="database unavailable")
    return {
        "status": "ok",
        "database": "reachable",
        "app_env": _settings.app_env,
        "roles": healthcheck_by_role(),
        "layout": database_layout(),
    }