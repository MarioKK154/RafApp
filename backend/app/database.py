from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

settings = get_settings()


def get_database_url() -> str:
    """Primary application database URL (migrations use DATABASE_URL the same way)."""
    return settings.database_url


def _create_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        pool_timeout=settings.db_pool_timeout,
    )


_role_urls = {
    "primary": settings.database_url,
    "registry": settings.database_url_registry,
    "shop": settings.database_url_shop,
    "reference": settings.database_url_reference,
}

_engines_by_url: dict[str, object] = {}
engines_by_role: dict[str, object] = {}

for _role, _url in _role_urls.items():
    if _url not in _engines_by_url:
        _engines_by_url[_url] = _create_engine(_url)
    engines_by_role[_role] = _engines_by_url[_url]

engine = engines_by_role["primary"]
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SessionRegistry = sessionmaker(autocommit=False, autoflush=False, bind=engines_by_role["registry"])
SessionShop = sessionmaker(autocommit=False, autoflush=False, bind=engines_by_role["shop"])
SessionReference = sessionmaker(
    autocommit=False, autoflush=False, bind=engines_by_role["reference"]
)

# Backwards compatibility for scripts that expect a single module-level URL string.
SQLALCHEMY_DATABASE_URL = settings.database_url

Base = declarative_base()


def is_postgresql() -> bool:
    return engine.dialect.name == "postgresql"


def is_sqlite() -> bool:
    return engine.dialect.name == "sqlite"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_registry_db():
    """Reserved for registry-only tables (tenants, routing). Same pool as primary until split."""
    db = SessionRegistry()
    try:
        yield db
    finally:
        db.close()


def get_shop_db():
    """Reserved for global catalog / shop tables. Same pool as primary until split."""
    db = SessionShop()
    try:
        yield db
    finally:
        db.close()


def get_reference_db():
    """Reserved for shared tutorials, risk library, labor templates, etc."""
    db = SessionReference()
    try:
        yield db
    finally:
        db.close()


def _ping_engine(eng) -> bool:
    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def healthcheck_db() -> bool:
    """True only if every distinct configured backend URL is reachable."""
    return all(_ping_engine(e) for e in _engines_by_url.values())


def healthcheck_by_role() -> dict[str, bool]:
    """Connectivity per logical role (shared URL → shared result)."""
    seen: dict[int, bool] = {}
    out: dict[str, bool] = {}
    for role, eng in engines_by_role.items():
        eid = id(eng)
        if eid not in seen:
            seen[eid] = _ping_engine(eng)
        out[role] = seen[eid]
    return out


def database_layout() -> dict[str, str]:
    """Whether each role uses a dedicated URL (for ops dashboards; no secrets)."""
    primary = settings.database_url
    return {
        "registry": "split" if settings.database_url_registry != primary else "shared_with_primary",
        "shop": "split" if settings.database_url_shop != primary else "shared_with_primary",
        "reference": "split" if settings.database_url_reference != primary else "shared_with_primary",
    }
