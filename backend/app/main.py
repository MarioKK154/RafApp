# backend/app/main.py
from fastapi import FastAPI, Depends, Request, HTTPException, APIRouter
from fastapi.responses import FileResponse
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
    chat,
    integrations,
    shop_catalog,
    piecework,
    work_orders,
    approvals,
    hms_inspections,
    mileage,
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
    except Exception as e:
        import logging
        logging.warning(f"Migration error (labor_catalog_item_conditions): {e}")

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
        "ALTER TABLE users ADD COLUMN can_export_data BOOLEAN DEFAULT FALSE",
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
        except Exception as e:
            import logging
            logging.warning(f"Migration index error ({_idx_stmt}): {e}")

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
    allow_origin_regex=r"https://.*\.rafapp\.is",
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

# 5. Include all routers in the app under /api prefix
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(tenants.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(inventory.router)
api_router.include_router(project_inventory.router)
api_router.include_router(tools.router)
api_router.include_router(cars.router)
api_router.include_router(shops.router)
api_router.include_router(boq.router)
api_router.include_router(offers.router)
api_router.include_router(reports.router)
api_router.include_router(events.router)
api_router.include_router(labor_catalog.router)
api_router.include_router(calculators.router)
api_router.include_router(customers.router)
api_router.include_router(drawings.router)
api_router.include_router(timelogs.router)
api_router.include_router(comments.router)
api_router.include_router(task_photos.router)
api_router.include_router(shopping_list.router)
api_router.include_router(accounting.router)
api_router.include_router(notifications.router) # <--- ROADMAP #2: Added
api_router.include_router(assignments.router)
api_router.include_router(tutorials.router)
api_router.include_router(admin_tools.router)
api_router.include_router(system.router)
api_router.include_router(risk_assessments.router)
api_router.include_router(chat.router)
api_router.include_router(integrations.router)
api_router.include_router(shop_catalog.router)
api_router.include_router(piecework.router)
api_router.include_router(work_orders.router)
api_router.include_router(approvals.router)
api_router.include_router(hms_inspections.router)
api_router.include_router(mileage.router)

app.include_router(api_router)


@app.on_event("startup")
def _ensure_tenant_enabled_features_column() -> None:
    """Ensure enabled_features column exists on tenants table."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if is_sqlite():
                try:
                    conn.execute(text("ALTER TABLE tenants ADD COLUMN enabled_features TEXT"))
                except Exception as e:
                    if "duplicate column name" not in str(e).lower():
                        raise
            else:
                conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enabled_features VARCHAR"))
    except Exception as e:
        import logging
        logging.warning(f"Failed to add enabled_features column to tenants table: {e}")


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
    except Exception as e:
        import logging
        logging.warning(f"Legacy task normalization failed: {e}")

@app.on_event("startup")
def _ensure_suggestions_table() -> None:
    """Ensure suggestions table is created in database."""
    try:
        if is_sqlite():
            models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        import logging
        logging.warning(f"Failed to ensure suggestions table: {e}")

@app.on_event("startup")
def _ensure_suggestions_is_read_column() -> None:
    """Ensure is_read column exists on suggestions table."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if is_sqlite():
                try:
                    conn.execute(text("ALTER TABLE suggestions ADD COLUMN is_read BOOLEAN DEFAULT 0"))
                except Exception as e:
                    if "duplicate column name" not in str(e).lower():
                        raise
            else:
                conn.execute(text("ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE"))
    except Exception as e:
        import logging
        logging.warning(f"Failed to add is_read column to suggestions table: {e}")

@app.on_event("startup")
def _ensure_timelogs_travel_hours_column() -> None:
    """Ensure travel_hours column exists on time_logs table."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if is_sqlite():
                try:
                    conn.execute(text("ALTER TABLE time_logs ADD COLUMN travel_hours FLOAT DEFAULT 0.0"))
                except Exception as e:
                    if "duplicate column name" not in str(e).lower():
                        raise
            else:
                conn.execute(text("ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS travel_hours DOUBLE PRECISION DEFAULT 0.0"))
    except Exception as e:
        import logging
        logging.warning(f"Failed to add travel_hours column to time_logs table: {e}")

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

@app.on_event("startup")
def _ensure_dynamic_shop_columns() -> None:
    """Ensure dynamic shop_url_{id} columns exist on inventory_items for all global shops."""
    from .database import SessionLocal
    db = SessionLocal()
    try:
        from sqlalchemy import text
        result = db.execute(text("SELECT id FROM global_shops")).fetchall()
        for r in result:
            models.add_dynamic_shop_column(db, r[0])
    except Exception as e:
        import logging
        logging.warning(f"Failed to ensure dynamic shop columns on startup: {e}")
    finally:
        db.close()


# 6. Public File Downloads & SPA Catch-All Route
FRONTEND_BUILD_DIR = BASE_DIR.parent.parent / "frontend" / "dist"

@app.get("/downloads/{filename}")
async def download_public_asset(filename: str):
    """Direct handler for public downloadable package assets (APK, PWA, PDF)."""
    safe_filename = os.path.basename(filename)
    file_path = FRONTEND_BUILD_DIR / "downloads" / safe_filename
    if not file_path.is_file():
        file_path = BASE_DIR / "static" / "downloads" / safe_filename
    if not file_path.is_file():
        file_path = BASE_DIR.parent.parent / "frontend" / "public" / "downloads" / safe_filename

    if file_path.is_file():
        media_type = "application/vnd.android.package-archive" if safe_filename.endswith(".apk") else "application/octet-stream"
        return FileResponse(
            path=file_path,
            filename=safe_filename,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'}
        )
    raise HTTPException(status_code=404, detail="Requested file not found")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Skip handling /api requests here, they should be handled by the api_router and return 404/405 correctly if missed.
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    path = FRONTEND_BUILD_DIR / full_path
    if path.is_file():
        media_type = "application/vnd.android.package-archive" if full_path.endswith(".apk") else None
        return FileResponse(
            path=path,
            filename=path.name if full_path.endswith(".apk") else None,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{path.name}"'} if full_path.endswith(".apk") else None
        )
    
    index_path = FRONTEND_BUILD_DIR / "index.html"
    if index_path.is_file():
        return FileResponse(index_path)
    
    # If the frontend hasn't been built yet
    return {"message": "Welcome to the Raf-App API. The frontend is not built yet."}