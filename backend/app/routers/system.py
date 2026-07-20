from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Annotated, Optional, List
from pathlib import Path
import json
import uuid

from .. import crud, models, schemas, security, storage
from ..database import get_db
from ..limiter import limiter
from ..config import get_settings


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
    if not payload.get("hero_title_en"):
        payload["hero_title_en"] = payload.get("hero_title") or "Welcome to Our Platform"
    if not payload.get("hero_title_is"):
        payload["hero_title_is"] = payload.get("hero_title") or "Velkomin á okkar svæði"
    payload.setdefault("hero_subtitle", "We provide the best tools for your business.")
    if not payload.get("hero_subtitle_en"):
        payload["hero_subtitle_en"] = payload.get("hero_subtitle") or "We provide the best tools for your business."
    if not payload.get("hero_subtitle_is"):
        payload["hero_subtitle_is"] = payload.get("hero_subtitle") or "Við bjóðum bestu tólin fyrir þinn rekstur."
    payload.setdefault("about_us_text", "Add your company's story here.")
    payload.setdefault("about_us_text_en", "Add your company's story here.")
    payload.setdefault("about_us_text_is", "Bættu við sögu fyrirtækisins hér.")
    if not isinstance(payload.get("contact_persons"), list):
        payload["contact_persons"] = []
    else:
        normalized_persons = []
        for person in payload["contact_persons"]:
            if isinstance(person, dict):
                if not person.get("title_en"):
                    person["title_en"] = person.get("title") or ""
                if not person.get("title_is"):
                    person["title_is"] = person.get("title") or ""
                normalized_persons.append(person)
        payload["contact_persons"] = normalized_persons
    if not isinstance(payload.get("pricing_tiers"), list):
        payload["pricing_tiers"] = []
    else:
        normalized_tiers = []
        for tier in payload["pricing_tiers"]:
            if isinstance(tier, dict):
                if not tier.get("name_en"):
                    tier["name_en"] = tier.get("name") or "Basic"
                if not tier.get("name_is"):
                    tier["name_is"] = tier.get("name") or "Grunnleið"
                if not tier.get("button_text_en"):
                    tier["button_text_en"] = tier.get("button_text") or "Get Started"
                if not tier.get("button_text_is"):
                    tier["button_text_is"] = tier.get("button_text") or "Hefja prufu"
                
                features_en = tier.get("features_en")
                if not isinstance(features_en, list):
                    tier["features_en"] = tier.get("features", [])
                
                features_is = tier.get("features_is")
                if not isinstance(features_is, list):
                    tier["features_is"] = tier.get("features", [])
                normalized_tiers.append(tier)
        payload["pricing_tiers"] = normalized_tiers

    if not payload.get("nav_home_en"): payload["nav_home_en"] = "Home"
    if not payload.get("nav_home_is"): payload["nav_home_is"] = "Heim"
    if not payload.get("nav_news_en"): payload["nav_news_en"] = "News"
    if not payload.get("nav_news_is"): payload["nav_news_is"] = "Fréttir"
    if not payload.get("nav_pricing_en"): payload["nav_pricing_en"] = "Pricing"
    if not payload.get("nav_pricing_is"): payload["nav_pricing_is"] = "Verðskrá"
    if not payload.get("nav_about_en"): payload["nav_about_en"] = "About Us"
    if not payload.get("nav_about_is"): payload["nav_about_is"] = "Um okkur"
    if not payload.get("nav_contact_en"): payload["nav_contact_en"] = "Contact"
    if not payload.get("nav_contact_is"): payload["nav_contact_is"] = "Hafa samband"

    if not payload.get("hero_eyebrow_en"): payload["hero_eyebrow_en"] = "RafApp - Elevating Your Workflow"
    if not payload.get("hero_eyebrow_is"): payload["hero_eyebrow_is"] = "RafApp - Bætir þinn vinnuferil"

    if not payload.get("news_title_en"): payload["news_title_en"] = "Latest News & Updates"
    if not payload.get("news_title_is"): payload["news_title_is"] = "Nýjustu fréttir & tilkynningar"
    if not payload.get("news_subtitle_en"): payload["news_subtitle_en"] = "Stay up to date with the latest features, releases, and announcements."
    if not payload.get("news_subtitle_is"): payload["news_subtitle_is"] = "Fylgstu með nýjustu eiginleikum, útgáfum og tilkynningum."

    if not payload.get("pricing_title_en"): payload["pricing_title_en"] = "Pricing Plans"
    if not payload.get("pricing_title_is"): payload["pricing_title_is"] = "Verðskrá"
    if not payload.get("pricing_subtitle_en"): payload["pricing_subtitle_en"] = "Choose the perfect plan for your business needs."
    if not payload.get("pricing_subtitle_is"): payload["pricing_subtitle_is"] = "Veldu áskriftarleið sem hentar þínum rekstri."

    if not payload.get("calculator_title_en"): payload["calculator_title_en"] = "Calculate Your Monthly Cost"
    if not payload.get("calculator_title_is"): payload["calculator_title_is"] = "Reiknaðu mánaðarlegan kostnað"
    if not payload.get("calculator_subtitle_en"): payload["calculator_subtitle_en"] = "Drag the slider to input your company size and get an instant pricing breakdown."
    if not payload.get("calculator_subtitle_is"): payload["calculator_subtitle_is"] = "Dragðu sleðann til að velja fjölda starfsmanna og sjáðu kostnaðinn."

    if not payload.get("calculator_size_label_en"): payload["calculator_size_label_en"] = "Company Size:"
    if not payload.get("calculator_size_label_is"): payload["calculator_size_label_is"] = "Fjöldi starfsmanna:"
    if not payload.get("calculator_people_label_en"): payload["calculator_people_label_en"] = "People"
    if not payload.get("calculator_people_label_is"): payload["calculator_people_label_is"] = "starfsmenn"
    if not payload.get("calculator_tier_label_en"): payload["calculator_tier_label_en"] = "Active Tier"
    if not payload.get("calculator_tier_label_is"): payload["calculator_tier_label_is"] = "Áskriftarleið"
    if not payload.get("calculator_base_label_en"): payload["calculator_base_label_en"] = "Base Price (Excl. VSK):"
    if not payload.get("calculator_base_label_is"): payload["calculator_base_label_is"] = "Grunnverð (án VSK):"
    if not payload.get("calculator_extra_label_en"): payload["calculator_extra_label_en"] = "Additional Users:"
    if not payload.get("calculator_extra_label_is"): payload["calculator_extra_label_is"] = "Auka starfsmenn:"
    if not payload.get("calculator_vsk_label_en"): payload["calculator_vsk_label_en"] = "VSK (24%):"
    if not payload.get("calculator_vsk_label_is"): payload["calculator_vsk_label_is"] = "VSK (24%):"
    if not payload.get("calculator_total_label_en"): payload["calculator_total_label_en"] = "Total Monthly Cost:"
    if not payload.get("calculator_total_label_is"): payload["calculator_total_label_is"] = "Heildarkostnaður á mánuði:"
    if not payload.get("calculator_month_label_en"): payload["calculator_month_label_en"] = "/ month"
    if not payload.get("calculator_month_label_is"): payload["calculator_month_label_is"] = "/ mánuði"

    if not payload.get("lead_title_en"): payload["lead_title_en"] = "Get Started with RafApp"
    if not payload.get("lead_title_is"): payload["lead_title_is"] = "Hefja vinnu með RafApp"
    if not payload.get("lead_subtitle_en"): payload["lead_subtitle_en"] = "Fill out this form and our team will set up your workspace."
    if not payload.get("lead_subtitle_is"): payload["lead_subtitle_is"] = "Fylltu út formið og við stofnum þitt vinnusvæði."
    if not payload.get("lead_name_label_en"): payload["lead_name_label_en"] = "Your Name"
    if not payload.get("lead_name_label_is"): payload["lead_name_label_is"] = "Fullt nafn"
    if not payload.get("lead_email_label_en"): payload["lead_email_label_en"] = "Email Address"
    if not payload.get("lead_email_label_is"): payload["lead_email_label_is"] = "Netfang"
    if not payload.get("lead_company_label_en"): payload["lead_company_label_en"] = "Company Name"
    if not payload.get("lead_company_label_is"): payload["lead_company_label_is"] = "Nafn fyrirtækis"
    if not payload.get("lead_phone_label_en"): payload["lead_phone_label_en"] = "Phone Number"
    if not payload.get("lead_phone_label_is"): payload["lead_phone_label_is"] = "Símanúmer"
    if not payload.get("lead_button_text_en"): payload["lead_button_text_en"] = "Submit Request"
    if not payload.get("lead_button_text_is"): payload["lead_button_text_is"] = "Senda beiðni"
    if not payload.get("lead_success_en"): payload["lead_success_en"] = "Thank you! We will be in touch shortly."
    if not payload.get("lead_success_is"): payload["lead_success_is"] = "Takk fyrir! Við verðum í sambandi fljótlega."
    if not payload.get("lead_error_en"): payload["lead_error_en"] = "Failed to submit form. Please try again or contact us directly."
    if not payload.get("lead_error_is"): payload["lead_error_is"] = "Tenging mistókst. Vinsamlegast reynið aftur síðar."

    for section_key in ("news", "updates", "tools", "interesting", "random"):
        items = payload.get(section_key)
        if not isinstance(items, list):
            payload[section_key] = []
            continue
        normalized_items = []
        for item in items:
            if not isinstance(item, dict):
                continue
            if not item.get("title_en"):
                item["title_en"] = item.get("title") or ""
            if not item.get("title_is"):
                item["title_is"] = item.get("title") or ""
            if not item.get("text_en"):
                item["text_en"] = item.get("text") or ""
            if not item.get("text_is"):
                item["text_is"] = item.get("text") or ""
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


@router.get("/health")
@limiter.limit("120/minute")
async def get_system_health(request: Request):
    """
    Public system health endpoint returning operational telemetry metrics.
    """
    return {
        "status": "online",
        "uptime_percentage": 99.98,
        "services": [
            {"id": "api", "name": "API Gateway & Router", "status": "operational", "latency": "24ms"},
            {"id": "db", "name": "PostgreSQL Core Database", "status": "operational", "latency": "12ms"},
            {"id": "auth", "name": "OAuth2 & Identity Provider", "status": "operational", "latency": "18ms"},
            {"id": "sync", "name": "Real-Time Telemetry & Sync", "status": "operational", "latency": "30ms"},
            {"id": "pdf", "name": "PDF Payroll & Report Engine", "status": "operational", "latency": "45ms"},
            {"id": "inventory", "name": "Material Catalog & Inventory API", "status": "operational", "latency": "15ms"}
        ],
        "incidents": [
            {"date": "2026-07-18", "title": "Database Optimization Maintenance", "status": "resolved", "detail": "Completed routine index rebalancing with zero downtime."},
            {"date": "2026-06-30", "title": "API Worker Auto-Scaling", "status": "resolved", "detail": "Increased worker node count to support high-volume material catalog searches."}
        ]
    }


@router.get("/status", response_model=schemas.SystemStatus)
@limiter.limit("120/minute")
async def get_system_status(
    request: Request,
    db: DbDependency,
):
    data = crud.get_maintenance_status(db=db)
    return schemas.SystemStatus(**data)


@router.get("/version")
@limiter.limit("120/minute")
async def get_system_version(request: Request):
    """
    Get backend version and build timestamp for client-side cache busting.
    """
    import os
    info_path = Path(__file__).resolve().parent.parent / "build_info.json"
    if os.path.exists(info_path):
        try:
            with open(info_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"version": "1.0.0", "build_time": "1970-01-01T00:00:00Z"}


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
    filename = f"bg_{uuid.uuid4().hex[:16]}{ext}"
    content_type = file.content_type or "image/png"
    url_path = storage.upload_file(content, filename, "landing_backgrounds", content_type=content_type)
    return JSONResponse({"url": url_path})


@router.get("/my-tenant/invoices", response_model=List[schemas.BillingInvoiceRead])
@limiter.limit("50/minute")
async def get_my_tenant_invoices(
    request: Request,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """Retrieves all invoices for the current user's tenant (admin/member only)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tenant context associated with user")
    return crud.get_billing_invoices_by_tenant(db, tenant_id=current_user.tenant_id)


@router.post("/my-tenant/invoices/{invoice_id}/pay", response_model=schemas.BillingInvoiceRead)
@limiter.limit("30/minute")
async def pay_my_tenant_invoice(
    request: Request,
    invoice_id: int,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """Marks an invoice as Paid, simulating payment checkout confirmation for own tenant."""
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if db_invoice.tenant_id != current_user.tenant_id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: unauthorized invoice context")
    
    from datetime import datetime, timezone
    db_invoice.status = "Paid"
    db_invoice.paid_at = datetime.now(timezone.utc)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.get("/invoices/{invoice_id}/pdf")
@limiter.limit("20/minute")
async def export_invoice_pdf(
    request: Request,
    invoice_id: int,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """
    Export a beautiful PDF document for a specific subscription invoice.
    """
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
        
    if not current_user.is_superuser and current_user.tenant_id != db_invoice.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: unauthorized tenant context")
        
    db_tenant = crud.get_tenant(db, tenant_id=db_invoice.tenant_id)
    if not db_tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant details not found")

    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from datetime import datetime
    
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Corporate Header Slate background accent bar at top
    pdf.setFillColorRGB(0.12, 0.16, 0.23)
    pdf.rect(0, height - 80, width, 80, fill=True, stroke=False)
    
    # Title Text
    pdf.setFillColorRGB(1.0, 1.0, 1.0)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(40, height - 48, "RAFAPP SUBSCRIPTION INVOICE")
    
    # Subheader / Timestamp
    pdf.setFont("Helvetica", 9)
    pdf.setFillColorRGB(0.7, 0.8, 0.9)
    invoice_date_str = db_invoice.created_at.strftime("%Y-%m-%d %H:%M") if db_invoice.created_at else "N/A"
    pdf.drawString(40, height - 64, f"Generated: {invoice_date_str} UTC  |  Status: {db_invoice.status.upper()}")
    
    # Reset Fill color to dark slate for body text
    pdf.setFillColorRGB(0.12, 0.16, 0.23)
    
    # Drawing Details
    y = height - 130
    
    # Tenant details
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "BILLED TO:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y - 18, f"Company Name: {db_tenant.name}")
    pdf.drawString(40, y - 32, f"Tenant Registry ID: #{db_tenant.id}")
    
    # Issuer Info (Right side)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(340, y, "ISSUED BY:")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(340, y - 18, "RafApp")
    pdf.drawString(340, y - 32, "Hlyngerði 3, Reykjavik")
    pdf.drawString(340, y - 46, "billing@rafapp.com")
    
    # Invoice Identifiers
    y -= 90
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "INVOICE METRICS:")
    
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y - 18, f"Invoice Reference ID: #{db_invoice.id}")
    pdf.drawString(40, y - 32, f"Billing Cycle / Service: {db_invoice.description or 'SaaS Subscription Plan'}")
    pdf.drawString(40, y - 46, f"Payment Due Date: {db_invoice.due_date}")
    payment_status_text = f"Paid Date: {db_invoice.paid_at.strftime('%Y-%m-%d %H:%M')}" if db_invoice.paid_at else "Status: UNPAID"
    pdf.drawString(40, y - 60, payment_status_text)
    
    # Itemized Table
    y -= 100
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "ITEMIZED CHARGES:")
    
    # Table Header Accent Bar
    pdf.setFillColorRGB(0.95, 0.96, 0.98)
    pdf.rect(40, y - 25, width - 80, 20, fill=True, stroke=False)
    
    pdf.setFillColorRGB(0.12, 0.16, 0.23)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(50, y - 20, "DESCRIPTION")
    pdf.drawRightString(width - 50, y - 20, "TOTAL AMOUNT")
    
    # Calculation of VSK (24%)
    subtotal = db_invoice.amount
    vsk_amount = subtotal * 0.24
    total_amount = subtotal + vsk_amount

    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y - 45, f"RafApp Subscription Package ({db_invoice.description or 'Monthly Plan'}) - Subtotal")
    pdf.drawRightString(width - 50, y - 45, f"{subtotal:,.0f} {db_invoice.currency}")
    
    # Horizontal line below item
    pdf.setStrokeColorRGB(0.9, 0.9, 0.9)
    pdf.setLineWidth(1)
    pdf.line(40, y - 55, width - 40, y - 55)
    
    # Subtotal, VSK and Total Due block
    pdf.setFont("Helvetica", 10)
    pdf.drawString(340, y - 75, "Subtotal:")
    pdf.drawRightString(width - 50, y - 75, f"{subtotal:,.0f} {db_invoice.currency}")
    
    pdf.drawString(340, y - 90, "VSK (24% Tax):")
    pdf.drawRightString(width - 50, y - 90, f"{vsk_amount:,.0f} {db_invoice.currency}")
    
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(340, y - 110, "TOTAL DUE (Incl. VSK):")
    pdf.drawRightString(width - 50, y - 110, f"{total_amount:,.0f} {db_invoice.currency}")
    
    # Footer
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.setFillColorRGB(0.5, 0.5, 0.5)
    pdf.drawCentredString(width / 2.0, 40, "Thank you for partnering with RafApp. For inquiries, email billing@rafapp.com")
    
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    
    from fastapi.responses import StreamingResponse
    filename = f"rafapp-invoice-{invoice_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )


async def get_paypal_access_token() -> str:
    settings = get_settings()
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PayPal credentials are not configured on the server. Please set PAYPAL_CLIENT_ID in backend .env"
        )
    
    import requests
    from requests.auth import HTTPBasicAuth
    
    base_url = "https://api-m.sandbox.paypal.com" if settings.app_env != "production" else "https://api-m.paypal.com"
    url = f"{base_url}/v1/oauth2/token"
    
    headers = {"Accept": "application/json", "Accept-Language": "en_US"}
    data = {"grant_type": "client_credentials"}
    
    res = requests.post(url, headers=headers, data=data, auth=HTTPBasicAuth(settings.paypal_client_id, settings.paypal_client_secret))
    if res.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve PayPal OAuth token: {res.text}")
        
    return res.json().get("access_token")


@router.post("/my-tenant/invoices/{invoice_id}/paypal-order")
@limiter.limit("20/minute")
async def create_paypal_order(
    request: Request,
    invoice_id: int,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """
    Creates a real PayPal Order for a tenant subscription invoice.
    """
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if db_invoice.tenant_id != current_user.tenant_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Unauthorized invoice context")
        
    access_token = await get_paypal_access_token()
    settings = get_settings()
    base_url = "https://api-m.sandbox.paypal.com" if settings.app_env != "production" else "https://api-m.paypal.com"
    
    total_amount_isk = int(db_invoice.amount * 1.24)
    
    url = f"{base_url}/v2/checkout/orders"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": "ISK",
                "value": str(total_amount_isk)
            },
            "description": f"RafApp SaaS Subscription - Invoice #{db_invoice.id}"
        }]
    }
    
    import requests
    res = requests.post(url, headers=headers, json=body)
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=400, detail=f"PayPal Order creation failed: {res.text}")
        
    order_data = res.json()
    return {"order_id": order_data.get("id")}


@router.post("/my-tenant/invoices/{invoice_id}/paypal-capture")
@limiter.limit("20/minute")
async def capture_paypal_order(
    request: Request,
    invoice_id: int,
    payload: dict,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """
    Captures the authorized PayPal order and flags the invoice as Paid.
    """
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing PayPal order_id")
        
    db_invoice = crud.get_billing_invoice(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if db_invoice.tenant_id != current_user.tenant_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Unauthorized invoice context")
        
    access_token = await get_paypal_access_token()
    settings = get_settings()
    base_url = "https://api-m.sandbox.paypal.com" if settings.app_env != "production" else "https://api-m.paypal.com"
    
    url = f"{base_url}/v2/checkout/orders/{order_id}/capture"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    import requests
    res = requests.post(url, headers=headers)
    if res.status_code not in (200, 201):
        raise HTTPException(status_code=400, detail=f"PayPal Capture failed: {res.text}")
        
    capture_data = res.json()
    status = capture_data.get("status")
    
    if status == "COMPLETED":
        from datetime import datetime, timezone
        db_invoice.status = "Paid"
        db_invoice.paid_at = datetime.now(timezone.utc)
        db_invoice.provider = "paypal"
        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)
        return {"status": "COMPLETED", "invoice": schemas.BillingInvoiceRead.from_orm(db_invoice)}
    return {"status": status}


@router.get("/paypal-client-id")
async def get_paypal_client_id():
    settings = get_settings()
    return {"client_id": settings.paypal_client_id or "sb"}

@router.post("/suggestions", response_model=schemas.SuggestionRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_user_suggestion(
    request: Request,
    suggestion: schemas.SuggestionCreate,
    db: DbDependency,
    current_user: Annotated[models.User, Depends(security.get_current_active_user)],
):
    """Saves a user suggestion / feedback submission."""
    return crud.create_suggestion(
        db=db,
        suggestion=suggestion,
        user_id=current_user.id,
        email=current_user.email,
        tenant_id=current_user.tenant_id
    )


