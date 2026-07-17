# backend/app/routers/accounting.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import os
import shutil
import uuid
from pathlib import Path
from datetime import date, datetime
from io import BytesIO
import logging

from .. import crud, models, schemas, security, storage
from ..database import get_db
from ..limiter import limiter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

# Initialize Telemetry Logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/accounting",
    tags=["Accounting & HR"],
    dependencies=[Depends(security.block_subcontractor)]
)

APP_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR_PAYSLIPS = APP_DIR / "static" / "payslips"
UPLOAD_DIR_PAYSLIPS.mkdir(parents=True, exist_ok=True)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
AccountantOrAdminDependency = Annotated[models.User, Depends(security.require_role(["admin", "accountant"]))]

# --- Payslip Infrastructure ---

@router.post("/payslips", response_model=schemas.PayslipRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def upload_payslip(
    request: Request,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
    user_id: int = Form(...),
    issue_date: date = Form(...),
    amount_brutto: float = Form(...),
    amount_netto: float = Form(...),
    file: UploadFile = File(...)
):
    target_user = crud.get_user(db, user_id=user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target employee not found in registry.")
    
    if not current_user.is_superuser and target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Security Violation: Cross-tenant upload blocked.")

    file_extension = Path(file.filename).suffix
    if file_extension.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Protocol Error: Only PDF assets accepted for payroll.")
        
    unique_filename = f"payslip_{user_id}_{uuid.uuid4()}{file_extension}"
    
    try:
        content = await file.read()
        db_file_path = storage.upload_file(content, unique_filename, "payslips", content_type="application/pdf")
    except Exception as e:
        logger.error(f"IO Error during payslip upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registry Error: Failed to commit file to disk: {e}")
    finally:
        await file.close()

    payslip_data = schemas.PayslipCreate(
        user_id=user_id,
        issue_date=issue_date,
        amount_brutto=amount_brutto,
        amount_netto=amount_netto
    )
    
    return crud.create_payslip(
        db=db, 
        payslip=payslip_data, 
        tenant_id=target_user.tenant_id, 
        file_path=db_file_path,
        filename=file.filename
    )

@router.get("/payslips/me", response_model=List[schemas.PayslipRead])
@limiter.limit("50/minute")
async def get_my_payslips(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    return crud.get_payslips_for_user(db, user_id=current_user.id)

@router.get("/payslips/download/{payslip_id}")
@limiter.limit("10/minute")
async def download_payslip(
    request: Request, 
    payslip_id: int, 
    db: DbDependency, 
    current_user: CurrentUserDependency
):
    db_payslip = crud.get_payslip(db, payslip_id=payslip_id)
    if not db_payslip:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_owner = db_payslip.user_id == current_user.id
    is_hr = (current_user.role in ["admin", "accountant"]) and (db_payslip.tenant_id == current_user.tenant_id)
    
    if not (is_owner or is_hr or current_user.is_superuser):
        raise HTTPException(status_code=403, detail="Clearance Denied: Unauthorized document access.")

    if db_payslip.file_path.startswith("http://") or db_payslip.file_path.startswith("https://"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=db_payslip.file_path)

    full_path = APP_DIR / db_payslip.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Asset lost on server storage.")

    return FileResponse(path=full_path, filename=db_payslip.filename, media_type="application/pdf")


@router.post("/payslips/auto", response_model=schemas.PayslipRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def generate_and_store_payslip(
    request: Request,
    payload: schemas.PayslipGenerate,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
):
    target_user = crud.get_user(db, user_id=payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target employee not found in registry.")

    if not current_user.is_superuser and target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Security Violation: Cross-tenant generation blocked.")

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def write_line(text: str, state: dict, bold: bool = False, size: int = 9) -> None:
        if state["y"] < 40:
            pdf.showPage()
            state["y"] = height - 40
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(40, state["y"], text)
        state["y"] -= 14

    y_state = {"y": height - 40}

    # Header
    write_line("Payslip", y_state, bold=True, size=16)
    write_line(f"Employee: {target_user.full_name or target_user.email}", y_state)
    write_line(f"Issue date: {payload.issue_date.isoformat()}", y_state)
    if payload.period_from or payload.period_to:
        period = f"{payload.period_from or ''} – {payload.period_to or ''}"
        write_line(f"Period: {period}", y_state)

    y_state["y"] -= 6
    write_line("Hours", y_state, bold=True, size=11)

    if payload.regular_hours is not None:
        write_line(f"Regular hours: {payload.regular_hours:.2f}", y_state)
    if payload.overtime1_hours is not None:
        write_line(f"Overtime 1 hours: {payload.overtime1_hours:.2f}", y_state)
    if payload.overtime2_hours is not None:
        write_line(f"Overtime 2 hours: {payload.overtime2_hours:.2f}", y_state)

    y_state["y"] -= 6
    write_line("Adjustments", y_state, bold=True, size=11)

    if payload.bonuses:
        desc = payload.bonus_description or "Bonuses"
        write_line(f"{desc}: {payload.bonuses:.0f} ISK", y_state)
    if payload.other_deductions:
        desc_d = payload.deductions_description or "Other deductions"
        write_line(f"{desc_d}: {payload.other_deductions:.0f} ISK", y_state)

    # Simple tax estimate based on brutto/net
    estimated_tax = payload.amount_brutto - payload.amount_netto - (payload.other_deductions or 0.0)
    y_state["y"] -= 6
    write_line("Summary", y_state, bold=True, size=11)
    write_line(f"Brutto: {payload.amount_brutto:.0f} ISK", y_state)
    if estimated_tax > 0:
        write_line(f"Tax & charges (approx.): {estimated_tax:.0f} ISK", y_state)
    write_line(f"Net: {payload.amount_netto:.0f} ISK", y_state)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    unique_filename = f"payslip_auto_{payload.user_id}_{uuid.uuid4()}.pdf"
    file_content = buffer.getvalue()
    db_file_path = storage.upload_file(file_content, unique_filename, "payslips", content_type="application/pdf")

    payslip_data = schemas.PayslipCreate(
        user_id=payload.user_id,
        issue_date=payload.issue_date,
        amount_brutto=payload.amount_brutto,
        amount_netto=payload.amount_netto,
    )

    return crud.create_payslip(
        db=db,
        payslip=payslip_data,
        tenant_id=target_user.tenant_id,
        file_path=db_file_path,
        filename=unique_filename,
    )


@router.post("/payslips/estimate")
@limiter.limit("20/minute")
async def generate_salary_estimate_pdf(
    request: Request,
    payload: schemas.PayslipEstimateGenerate,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    target_user = crud.get_user(db, user_id=payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target employee not found.")

    if current_user.id != payload.user_id and current_user.role not in ["admin", "accountant"] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Permission Denied: You can only generate salary estimates for yourself.")

    if not current_user.is_superuser and target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Security Violation: Cross-tenant generation blocked.")

    # Calculate values
    base_wages = payload.regular_hours * payload.hourly_rate
    ot1_wages = (payload.overtime1_hours or 0.0) * payload.hourly_rate * (payload.overtime1_multiplier or 1.5)
    ot2_wages = (payload.overtime2_hours or 0.0) * payload.hourly_rate * (payload.overtime2_multiplier or 1.8)
    gross = base_wages + ot1_wages + ot2_wages + (payload.bonuses or 0.0)

    pension_deduction = gross * 0.04
    sereign_deduction = gross * ((payload.sereignarsparnadur_percent or 0.0) / 100.0)
    union_fee = gross * 0.011

    taxable_income = max(0.0, gross - pension_deduction - sereign_deduction)

    # Tax brackets (2025/2026)
    TAX_BRACKETS = [
        {"limit": 472005.0, "rate": 0.3149},
        {"limit": 1325127.0, "rate": 0.3799},
        {"limit": float('inf'), "rate": 0.4629},
    ]
    PERSONAL_CREDIT = 68691.0 if payload.apply_personal_tax_credit else 0.0

    remaining = taxable_income
    computed_tax = 0.0
    last_limit = 0.0
    for b in TAX_BRACKETS:
        upper = b["limit"]
        span = remaining if upper == float('inf') else max(0.0, min(remaining, upper - last_limit))
        if span <= 0.0:
            continue
        computed_tax += span * b["rate"]
        remaining -= span
        last_limit = upper
        if remaining <= 0.0:
            break

    net_tax = max(0.0, computed_tax - PERSONAL_CREDIT)
    net_salary = max(0.0, gross - net_tax - pension_deduction - sereign_deduction - union_fee - (payload.other_deductions or 0.0))
    employer_pension = gross * 0.115

    # ReportLab pdf generation
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Helper function
    def draw_text(text: str, x: float, y: float, font: str = "Helvetica", size: int = 10, align: str = "left"):
        pdf.setFont(font, size)
        if align == "right":
            pdf.drawRightString(x, y, text)
        elif align == "center":
            pdf.drawCentredString(x, y, text)
        else:
            pdf.drawString(x, y, text)

    # Draw nice title/header
    pdf.setFillColorRGB(0.31, 0.27, 0.90)  # Indigo primary
    pdf.rect(0, height - 80, width, 80, fill=True, stroke=False)
    
    pdf.setFillColorRGB(1.0, 1.0, 1.0)
    draw_text("Launaáætlun / Salary Estimate", 40, height - 40, font="Helvetica-Bold", size=16)
    draw_text(f"RafApp Industrial OS — Tenant ID: {target_user.tenant_id}", 40, height - 55, size=9)

    pdf.setFillColorRGB(0.1, 0.1, 0.1)
    
    # Employee info section box
    y = height - 120
    draw_text("Starfsmaður / Employee Details:", 40, y, font="Helvetica-Bold", size=11)
    y -= 18
    draw_text(f"Nafn / Name: {target_user.full_name or target_user.email}", 50, y, size=10)
    draw_text(f"Kennitala: {target_user.kennitala or 'N/A'}", 300, y, size=10)
    y -= 14
    draw_text(f"Tímakaup / Base Hourly Rate: {payload.hourly_rate:,.0f} ISK", 50, y, size=10)
    if payload.period_from and payload.period_to:
        draw_text(f"Tímabil / Period: {payload.period_from} to {payload.period_to}", 300, y, size=10)

    # Earnings Table Header
    y -= 30
    pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
    pdf.setLineWidth(1)
    pdf.line(40, y, width - 40, y)
    y -= 15
    draw_text("Liður / Earnings & Hours", 40, y, font="Helvetica-Bold", size=10)
    draw_text("Gildi / Hours", 250, y, font="Helvetica-Bold", size=10, align="right")
    draw_text("Mælir / Multiplier", 350, y, font="Helvetica-Bold", size=10, align="right")
    draw_text("Upphæð / Amount (ISK)", width - 40, y, font="Helvetica-Bold", size=10, align="right")
    y -= 8
    pdf.line(40, y, width - 40, y)

    # Earnings Details
    y -= 18
    draw_text("Almenn vinna / Regular hours", 40, y, size=10)
    draw_text(f"{payload.regular_hours:,.2f}", 250, y, size=10, align="right")
    draw_text("1.0", 350, y, size=10, align="right")
    draw_text(f"{base_wages:,.0f} ISK", width - 40, y, size=10, align="right")

    if payload.overtime1_hours and payload.overtime1_hours > 0:
        y -= 14
        draw_text("Eftirvinna / Overtime 1", 40, y, size=10)
        draw_text(f"{payload.overtime1_hours:,.2f}", 250, y, size=10, align="right")
        draw_text(f"{payload.overtime1_multiplier:.1f}", 350, y, size=10, align="right")
        draw_text(f"{ot1_wages:,.0f} ISK", width - 40, y, size=10, align="right")

    if payload.overtime2_hours and payload.overtime2_hours > 0:
        y -= 14
        draw_text("Næturvinna / Overtime 2", 40, y, size=10)
        draw_text(f"{payload.overtime2_hours:,.2f}", 250, y, size=10, align="right")
        draw_text(f"{payload.overtime2_multiplier:.1f}", 350, y, size=10, align="right")
        draw_text(f"{ot2_wages:,.0f} ISK", width - 40, y, size=10, align="right")

    if payload.bonuses and payload.bonuses > 0:
        y -= 14
        bonus_desc = payload.bonus_description or "Álag / Bonus"
        draw_text(f"Bónusar ({bonus_desc})", 40, y, size=10)
        draw_text(f"{payload.bonuses:,.0f} ISK", width - 40, y, size=10, align="right")

    y -= 10
    pdf.line(40, y, width - 40, y)
    y -= 16
    draw_text("Heildarlaun / Gross Earnings (Brúttó)", 40, y, font="Helvetica-Bold", size=10)
    draw_text(f"{gross:,.0f} ISK", width - 40, y, font="Helvetica-Bold", size=10, align="right")
    y -= 8
    pdf.line(40, y, width - 40, y)

    # Deductions Header
    y -= 30
    draw_text("Frádráttarliðir / Deductions", 40, y, font="Helvetica-Bold", size=11)
    y -= 8
    pdf.line(40, y, width - 40, y)

    y -= 18
    draw_text("Lífeyrissjóður / Pension (4%)", 40, y, size=10)
    draw_text(f"-{pension_deduction:,.0f} ISK", width - 40, y, size=10, align="right")

    if sereign_deduction > 0:
        y -= 14
        draw_text(f"Séreignarsparnaður / Private Pension ({payload.sereignarsparnadur_percent}%)", 40, y, size=10)
        draw_text(f"-{sereign_deduction:,.0f} ISK", width - 40, y, size=10, align="right")

    y -= 14
    draw_text("Stéttarfélagsgjald / RSÍ Union Fee (1.1%)", 40, y, size=10)
    draw_text(f"-{union_fee:,.0f} ISK", width - 40, y, size=10, align="right")

    if net_tax > 0:
        y -= 14
        tax_desc = "Staðgreiðsla / Income Tax"
        if payload.apply_personal_tax_credit:
            tax_desc += " (Persónuafsláttur nýttur)"
        draw_text(tax_desc, 40, y, size=10)
        draw_text(f"-{net_tax:,.0f} ISK", width - 40, y, size=10, align="right")

    if payload.other_deductions and payload.other_deductions > 0:
        y -= 14
        ded_desc = payload.deductions_description or "Annar frádráttur / Other deduction"
        draw_text(ded_desc, 40, y, size=10)
        draw_text(f"-{payload.other_deductions:,.0f} ISK", width - 40, y, size=10, align="right")

    y -= 10
    pdf.line(40, y, width - 40, y)
    
    # Net salary
    y -= 20
    pdf.setFillColorRGB(0.05, 0.5, 0.1) # dark green
    draw_text("Útborguð laun / Estimated Net Salary (Nettó)", 40, y, font="Helvetica-Bold", size=12)
    draw_text(f"{net_salary:,.0f} ISK", width - 40, y, font="Helvetica-Bold", size=12, align="right")
    y -= 8
    pdf.setFillColorRGB(0.1, 0.1, 0.1)
    pdf.line(40, y, width - 40, y)

    # Employer Contributions (Transparency section)
    y -= 35
    draw_text("Framlag vinnuveitanda / Employer Contributions (Costs in addition to gross):", 40, y, font="Helvetica-Bold", size=9)
    y -= 14
    draw_text(f"Lífeyrissjóður / Pension Fund Contribution (11.5%): {employer_pension:,.0f} ISK", 50, y, size=9)

    # Notice
    y -= 50
    pdf.setFillColorRGB(0.4, 0.4, 0.4)
    draw_text("Umsögn / Notice:", 40, y, font="Helvetica-Bold", size=8)
    y -= 10
    draw_text("Skjal þetta er launaáætlun reiknuð út frá gefnum vinnustundum og gildandi kjarasamningsákvæðum.", 40, y, size=8)
    y -= 10
    draw_text("Þetta telst ekki opinber launaseðill. / This document is a salary estimate and not an official payslip.", 40, y, size=8)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=launaaaetlun_estimate.pdf"}
    )


# --- Leave Request Registry ---

@router.post("/leave-requests", response_model=schemas.LeaveRequestRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_leave_request(
    request: Request,
    leave_data: schemas.LeaveRequestCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    try:
        return crud.create_leave_request(
            db=db, 
            leave_data=leave_data, 
            user_id=current_user.id, 
            tenant_id=current_user.tenant_id
        )
    except Exception as e:
        logger.error(f"Leave Request Failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.get("/leave-requests/me", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_my_leave_requests(request: Request, db: DbDependency, current_user: CurrentUserDependency):
    return crud.get_leave_requests_for_user(db, user_id=current_user.id)


@router.get("/leave-requests/calendar", response_model=List[schemas.LeaveCalendarBlock])
@limiter.limit("120/minute")
async def get_leave_calendar_blocks(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    start: date = Query(..., description="Range start (inclusive)"),
    end: date = Query(..., description="Range end (inclusive)"),
    tenant_id: Optional[int] = Query(
        None,
        description="Superuser-only: filter tenant; omit for all tenants.",
    ),
):
    """
    Approved leave only, for scheduling / calendar overlays (sick, vacation, etc.).
    Mirrors assignment list tenant scope: superuser may pass tenant_id; others are tenant-scoped.
    """
    if start > end:
        raise HTTPException(status_code=400, detail="start must be <= end.")

    effective_tenant_id = current_user.tenant_id
    if current_user.is_superuser:
        effective_tenant_id = tenant_id

    rows = crud.get_approved_leave_in_date_range(db, start, end, effective_tenant_id)
    out: List[schemas.LeaveCalendarBlock] = []
    for r in rows:
        u = r.user
        user_name = (u.full_name or u.email) if u else "Unknown"
        out.append(
            schemas.LeaveCalendarBlock(
                id=r.id,
                user_id=r.user_id,
                tenant_id=r.tenant_id,
                user_name=user_name,
                leave_type=r.leave_type,
                start_date=r.start_date,
                end_date=r.end_date,
            )
        )
    return out


@router.get("/leave-requests/pending", response_model=List[schemas.LeaveRequestRead])
@limiter.limit("50/minute")
async def get_pending_leave_requests(
    request: Request, 
    db: DbDependency, 
    current_user: AccountantOrAdminDependency
):
    effective_tenant_id = current_user.tenant_id
    # Accessing the Enum member directly from models
    return crud.get_all_leave_requests(db, tenant_id=effective_tenant_id, status=models.LeaveStatus.Pending)

@router.put("/leave-requests/{request_id}/review", response_model=schemas.LeaveRequestRead)
@limiter.limit("50/minute")
async def review_leave_request(
    request: Request,
    request_id: int,
    review_data: schemas.LeaveRequestReview,
    db: DbDependency,
    current_user: AccountantOrAdminDependency
):
    db_request = crud.get_leave_request(db, request_id=request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request node not found.")

    if not current_user.is_superuser and db_request.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access Denied: Tenant mismatch.")

    # TECHNICAL SYNC:
    # review_data.status is a LeaveStatus enum member (e.g. LeaveStatus.Approved)
    # because Pydantic automatically converted the string from the frontend.
    # We pass it directly to CRUD.
    
    try:
        return crud.update_leave_request_status(
            db, 
            db_request=db_request, 
            status_enum=review_data.status, 
            comment=review_data.manager_comment
        )
    except Exception as e:
        logger.error(f"Authorization Error: {str(e)}")
        raise HTTPException(status_code=400, detail="Database rejected the status transition.")


# --- Expenses & Annual Overview ---

@router.post("/expenses", response_model=schemas.ExpenseRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_expense_entry(
    request: Request,
    expense: schemas.ExpenseCreate,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
):
    effective_tenant_id = current_user.tenant_id
    if effective_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context required to record expenses.",
        )

    if expense.project_id:
        project = crud.get_project(db, project_id=expense.project_id, tenant_id=effective_tenant_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked project not found or not accessible.",
            )

    return crud.create_expense(db=db, tenant_id=effective_tenant_id, expense=expense)


@router.get("/expenses", response_model=List[schemas.ExpenseRead])
@limiter.limit("120/minute")
async def list_expenses(
    request: Request,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
    year: Optional[int] = None,
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    flow_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
):
    effective_tenant_id = current_user.tenant_id
    if effective_tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant context required.")
    return crud.get_expenses_for_tenant(
        db=db,
        tenant_id=effective_tenant_id,
        year=year,
        project_id=project_id,
        category=category,
        flow_type=flow_type,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )


@router.get("/overview/year/{year}", response_model=schemas.YearlyMoneyOverview)
@limiter.limit("60/minute")
async def yearly_money_overview(
    request: Request,
    year: int,
    db: DbDependency,
    current_user: AccountantOrAdminDependency,
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    flow_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
):
    effective_tenant_id = current_user.tenant_id
    if effective_tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant context required.")

    if year < 2000 or year > datetime.utcnow().year + 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Year out of allowed range.")

    return crud.get_yearly_money_overview(
        db=db,
        tenant_id=effective_tenant_id,
        year=year,
        project_id=project_id,
        category=category,
        flow_type=flow_type,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )
