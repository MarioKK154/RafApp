"""
Central application settings for local dev and production (multi-tenant SaaS).

For ~80 companies and ~5000 users you typically run:
- One PostgreSQL cluster (often RDS / Cloud SQL / managed Postgres).
- PgBouncer or the cloud proxy in front of the DB (transaction pooling).
- Row-level tenancy (tenant_id) on shared schemas — scales well to hundreds of tenants;
  optional separate DATABASE_URL_* values prepare a later split (registry / shop / reference).
- Multiple API replicas behind a load balancer → set REDIS_URL so rate limits are shared.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

import sys
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
# Do not load .env when running tests via pytest to avoid overriding SQLite DATABASE_URL
if "pytest" not in sys.modules and not any("pytest" in arg for arg in sys.argv):
    load_dotenv(_ENV_PATH, override=False)


def _env_str(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _env_int(name: str, default: int) -> int:
    raw = _env_str(name, "")
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _split_csv(name: str, default: Optional[str] = None) -> List[str]:
    raw = _env_str(name, default or "")
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def _default_database_url() -> str:
    url = _env_str("DATABASE_URL")
    if url:
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url
    return "sqlite:///./sql_app.db"


@dataclass(frozen=True)
class AppSettings:
    app_env: str
    database_url: str
    database_url_registry: str
    database_url_shop: str
    database_url_reference: str
    db_pool_size: int
    db_max_overflow: int
    db_pool_recycle: int
    db_pool_timeout: int
    redis_url: Optional[str]
    cors_origins: List[str]
    trusted_hosts: List[str]
    smtp_host: Optional[str]
    smtp_port: int
    smtp_user: Optional[str]
    smtp_password: Optional[str]
    smtp_from_email: Optional[str]
    admin_email: Optional[str]
    paypal_client_id: Optional[str]
    paypal_client_secret: Optional[str]
    supabase_url: Optional[str]
    supabase_service_key: Optional[str]


@lru_cache
def get_settings() -> AppSettings:
    app_env = _env_str("APP_ENV", "development").lower()
    is_prod = app_env == "production"
    primary = _default_database_url()

    # Optional logical split: unset → same as primary (current behaviour).
    registry = _env_str("DATABASE_URL_REGISTRY") or primary
    shop = _env_str("DATABASE_URL_SHOP") or primary
    reference = _env_str("DATABASE_URL_REFERENCE") or primary

    if registry.startswith("postgresql://"):
        registry = registry.replace("postgresql://", "postgresql+psycopg2://", 1)
    if shop.startswith("postgresql://"):
        shop = shop.replace("postgresql://", "postgresql+psycopg2://", 1)
    if reference.startswith("postgresql://"):
        reference = reference.replace("postgresql://", "postgresql+psycopg2://", 1)

    pool_size = _env_int("DB_POOL_SIZE", 20 if is_prod else 5)
    max_overflow = _env_int("DB_MAX_OVERFLOW", 40 if is_prod else 10)

    cors = _split_csv("CORS_ORIGINS")
    if not cors:
        cors = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://www.rafapp.is",
            "https://rafapp.is",
        ]

    trusted = _split_csv("TRUSTED_HOSTS")

    return AppSettings(
        app_env=app_env,
        database_url=primary,
        database_url_registry=registry,
        database_url_shop=shop,
        database_url_reference=reference,
        db_pool_size=pool_size,
        db_max_overflow=max_overflow,
        db_pool_recycle=_env_int("DB_POOL_RECYCLE", 1800),
        db_pool_timeout=_env_int("DB_POOL_TIMEOUT", 30),
        redis_url=_env_str("REDIS_URL") or None,
        cors_origins=cors,
        trusted_hosts=trusted,
        smtp_host=_env_str("SMTP_HOST") or None,
        smtp_port=_env_int("SMTP_PORT", 587),
        smtp_user=_env_str("SMTP_USER") or None,
        smtp_password=_env_str("SMTP_PASSWORD") or None,
        smtp_from_email=_env_str("SMTP_FROM_EMAIL") or "noreply@rafapp.is",
        admin_email=_env_str("ADMIN_EMAIL") or None,
        paypal_client_id=_env_str("PAYPAL_CLIENT_ID") or None,
        paypal_client_secret=_env_str("PAYPAL_CLIENT_SECRET") or None,
        supabase_url=_env_str("SUPABASE_URL") or None,
        supabase_service_key=_env_str("SUPABASE_SERVICE_KEY") or None,
    )
