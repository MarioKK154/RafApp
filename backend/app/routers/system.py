from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, Optional
from pathlib import Path
import json
import uuid

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter


router = APIRouter(
    prefix="/system",
    tags=["System"],
)

DbDependency = Annotated[Session, Depends(get_db)]
SuperUserDependency = Annotated[models.User, Depends(security.require_superuser)]

LANDING_FEED_KEY = "landing_feed_json"

APP_DIR = Path(__file__).resolve().parent.parent
LANDING_BG_DIR = APP_DIR / "static" / "landing_backgrounds"
LANDING_BG_ALLOWED = {".png", ".jpg", ".jpeg", ".webp"}
LANDING_BG_MAX_MB = 10


def _default_landing_feed() -> schemas.LandingFeed:
    return schemas.LandingFeed(
        news=[
            schemas.LandingFeedItem(title="Welcome to RafApp", text="Track platform news from a single public home page."),
        ],
        updates=[
            schemas.LandingFeedItem(title="Weekly Updates", text="Share improvements, fixes, and operational announcements."),
        ],
        tools=[
            schemas.LandingFeedItem(
                title="Tool Spotlight",
                text="Share new tools for electrical work with quick practical notes.",
            ),
        ],
        interesting=[
            schemas.LandingFeedItem(title="Interesting Stuff", text="Post quick tips, highlights, and useful links for teams."),
        ],
        random=[
            schemas.LandingFeedItem(title="Random Stuff", text="Post quick tips, highlights, and useful links for teams."),
        ],
        show_news=True,
        show_updates=True,
        show_tools=True,
        show_interesting=True,
        background_image_urls=[],
        background_slide_seconds=8,
        hero_title="Welcome to Our Platform",
        hero_subtitle="We provide the best tools for your business.",
        about_us_text="Add your company's story here.",
        about_us_text_en="Add your company's story here.",
        about_us_text_is="Bættu við sögu fyrirtækisins hér.",
        contact_persons=[],
        pricing_tiers=[]
    )


def _normalize_landing_payload(payload: dict) -> dict:
    """Backward compatibility for older shapes using only `random`."""
    if not isinstance(payload, dict):
        return _default_landing_feed().model_dump()
    if "interesting" not in payload and isinstance(payload.get("random"), list):
        payload["interesting"] = payload.get("random", [])
    if "random" not in payload and isinstance(payload.get("interesting"), list):
        payload["random"] = payload.get("interesting", [])
    if "tools" not in payload:
        payload["tools"] = []
    payload.setdefault("show_news", True)
    payload.setdefault("show_updates", True)
    payload.setdefault("show_tools", True)
    payload.setdefault("show_interesting", True)
    raw_bgs = payload.get("background_image_urls")
    if not isinstance(raw_bgs, list):
        payload["background_image_urls"] = []
    else:
        payload["background_image_urls"] = [
            str(u).strip() for u in raw_bgs if isinstance(u, str) and str(u).strip()
        ]
    try:
        slide = int(payload.get("background_slide_seconds", 8))
    except (TypeError, ValueError):
        slide = 8
    payload["background_slide_seconds"] = max(3, min(600, slide))
    
    payload.setdefault("hero_title", "Welcome to Our Platform")
    payload.setdefault("hero_subtitle", "We provide the best tools for your business.")
    payload.setdefault("about_us_text", "Add your company's story here.")
    payload.setdefault("about_us_text_en", "Add your company's story here.")
    payload.setdefault("about_us_text_is", "Bættu við sögu fyrirtækisins hér.")
    if not isinstance(payload.get("contact_persons"), list):
        payload["contact_persons"] = []
    if not isinstance(payload.get("pricing_tiers"), list):
        payload["pricing_tiers"] = []

    for section_key in ("news", "updates", "tools", "interesting", "random"):
        items = payload.get(section_key)
        if not isinstance(items, list):
            payload[section_key] = []
            continue
        normalized_items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            item.setdefault("link_url", None)
            item.setdefault("link_label", None)
            item.setdefault("image_url", None)
            item.setdefault("source", None)
            item.setdefault("is_pinned", False)
            item.setdefault("starts_at", None)
            item.setdefault("ends_at", None)
            normalized_items.append(item)
        payload[section_key] = normalized_items
    return payload


def _read_landing_feed(db: Session) -> schemas.LandingFeed:
    setting = crud.get_system_setting(db, LANDING_FEED_KEY)
    if not setting or not setting.value:
        return _default_landing_feed()
    try:
        parsed = _normalize_landing_payload(json.loads(setting.value))
        return schemas.LandingFeed.model_validate(parsed)
    except Exception:
        return _default_landing_feed()


@router.get("/status", response_model=schemas.SystemStatus)
@limiter.limit("120/minute")
async def get_system_status(
    request: Request,
    db: DbDependency,
):
    data = crud.get_maintenance_status(db=db)
    return schemas.SystemStatus(**data)


@router.post("/maintenance", response_model=schemas.SystemStatus)
@limiter.limit("30/minute")
async def set_maintenance_mode(
    request: Request,
    payload: schemas.SystemStatus,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    mode_value = "on" if payload.maintenance else "off"
    crud.set_system_setting(db, "maintenance_mode", mode_value)
    crud.set_system_setting(db, "maintenance_message", payload.message or "")
    data = crud.get_maintenance_status(db=db)
    return schemas.SystemStatus(**data)


@router.get("/banner", response_model=Optional[schemas.GlobalBannerRead])
@limiter.limit("120/minute")
async def get_active_banner(
    request: Request,
    db: DbDependency,
):
    """Current active global banner (e.g. roadmap announcement). Shown to all authenticated users."""
    banner = crud.get_active_global_banner(db=db)
    if not banner:
        return None
    return schemas.GlobalBannerRead.model_validate(banner)


@router.get("/landing-feed", response_model=schemas.LandingFeed)
@limiter.limit("120/minute")
async def get_landing_feed(
    request: Request,
    db: DbDependency,
):
    """Public content feed for the unauthenticated landing page."""
    return _read_landing_feed(db)


@router.post("/landing-feed", response_model=schemas.LandingFeed)
@limiter.limit("30/minute")
async def upsert_landing_feed(
    request: Request,
    body: schemas.LandingFeed,
    db: DbDependency,
    current_user: SuperUserDependency,
):
    """Update landing feed content (superuser)."""
    payload = _normalize_landing_payload(body.model_dump())
    crud.set_system_setting(db, LANDING_FEED_KEY, json.dumps(payload))
    return schemas.LandingFeed.model_validate(payload)


@router.post("/landing-background", response_class=JSONResponse)
@limiter.limit("20/minute")
async def upload_landing_background(
    request: Request,
    db: DbDependency,
    current_user: SuperUserDependency,
    file: UploadFile = File(...),
):
    """Store a public landing-page background image on disk; returns URL path for `background_image_urls`."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in LANDING_BG_ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image must be one of: {', '.join(sorted(LANDING_BG_ALLOWED))}",
        )
    content = await file.read()
    if len(content) > LANDING_BG_MAX_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image must be under {LANDING_BG_MAX_MB}MB",
        )
    LANDING_BG_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"bg_{uuid.uuid4().hex[:16]}{ext}"
    out_path = LANDING_BG_DIR / filename
    with open(out_path, "wb") as f:
        f.write(content)
    url_path = f"/static/landing_backgrounds/{filename}"
    return JSONResponse({"url": url_path})

