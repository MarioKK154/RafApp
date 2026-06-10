from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from io import BytesIO
from datetime import datetime
from textwrap import wrap

from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter


router = APIRouter(
    prefix="/risk-assessments",
    tags=["Risk Assessments"],
    dependencies=[Depends(security.get_current_active_user)],
)

DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigherDependency = Annotated[
    models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))
]
ManagerOrAdminDependency = Annotated[
    models.User, Depends(security.require_role(["admin", "project manager"]))
]


def get_risk_item_and_verify_tenant(
    db: DbDependency,
    risk_item_id: int,
    current_user: CurrentUserDependency,
) -> models.RiskItem:
    db_item = crud.get_risk_item(db=db, risk_item_id=risk_item_id)
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk item not found.")

    project = db_item.project
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked project not found.")

    effective_tenant_id = project.tenant_id
    if effective_tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Resource belongs to a different tenant.",
        )

    return db_item


@router.get("/templates", response_model=List[schemas.RiskTemplateRead])
@limiter.limit("100/minute")
async def read_risk_templates(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    category: Optional[str] = None,
    lang: Optional[str] = None,
):
    templates = crud.get_risk_templates(db=db, category=category)

    # Apply simple language selection for title/description/mitigation
    lang = (lang or "").lower()
    if lang in {"en", "is"}:
        for tmpl in templates:
            if lang == "is":
                if getattr(tmpl, "category_is", None):
                    tmpl.category = tmpl.category_is
                if getattr(tmpl, "title_is", None):
                    tmpl.title = tmpl.title_is
                if getattr(tmpl, "description_is", None):
                    tmpl.description = tmpl.description_is
                if getattr(tmpl, "default_mitigation_is", None):
                    tmpl.default_mitigation = tmpl.default_mitigation_is
            elif lang == "en":
                # category stays English (canonical storage); optional category_en could be added later
                if getattr(tmpl, "title_en", None):
                    tmpl.title = tmpl.title_en
                if getattr(tmpl, "description_en", None):
                    tmpl.description = tmpl.description_en
                if getattr(tmpl, "default_mitigation_en", None):
                    tmpl.default_mitigation = tmpl.default_mitigation_en

    return templates


@router.post("/templates", response_model=schemas.RiskTemplateRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_risk_template_endpoint(
    request: Request,
    payload: schemas.RiskTemplateCreate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    return crud.create_risk_template(db=db, template=payload)


@router.put("/templates/{template_id}", response_model=schemas.RiskTemplateRead)
@limiter.limit("60/minute")
async def update_risk_template_endpoint(
    request: Request,
    template_id: int,
    payload: schemas.RiskTemplateUpdate,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    db_template = crud.get_risk_template(db=db, template_id=template_id)
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk template not found.")
    updated = crud.update_risk_template(db=db, db_template=db_template, update=payload)
    return updated


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def delete_risk_template_endpoint(
    request: Request,
    template_id: int,
    db: DbDependency,
    current_user: ManagerOrAdminDependency,
):
    db_template = crud.get_risk_template(db=db, template_id=template_id)
    if not db_template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk template not found.")
    crud.delete_risk_template(db=db, db_template=db_template)
    return None


@router.get("/project/{project_id}", response_model=List[schemas.RiskItemRead])
@limiter.limit("100/minute")
async def read_risk_items_for_project(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    effective_tenant_id = current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not accessible.",
        )

    return crud.get_risk_items_for_project(db=db, project_id=project_id)


@router.post("/", response_model=schemas.RiskItemRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_risk_item_endpoint(
    request: Request,
    payload: schemas.RiskItemCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherDependency,
):
    effective_tenant_id = current_user.tenant_id
    project = crud.get_project(db, project_id=payload.project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not accessible.",
        )

    return crud.create_risk_item(db=db, item=payload)


@router.put("/{risk_item_id}", response_model=schemas.RiskItemRead)
@limiter.limit("60/minute")
async def update_risk_item_endpoint(
    request: Request,
    risk_item_id: int,
    payload: schemas.RiskItemUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherDependency,
):
    db_item = get_risk_item_and_verify_tenant(db=db, risk_item_id=risk_item_id, current_user=current_user)
    updated = crud.update_risk_item(db=db, db_item=db_item, update=payload)
    return updated


@router.delete("/{risk_item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
async def delete_risk_item_endpoint(
    request: Request,
    risk_item_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherDependency,
):
    db_item = get_risk_item_and_verify_tenant(db=db, risk_item_id=risk_item_id, current_user=current_user)
    crud.delete_risk_item(db=db, db_item=db_item)
    return None


@router.post("/project/{project_id}/from-templates", response_model=List[schemas.RiskItemRead])
@limiter.limit("60/minute")
async def create_risks_from_templates(
    request: Request,
    project_id: int,
    template_ids: List[int],
    db: DbDependency,
    current_user: TeamLeaderOrHigherDependency,
):
    effective_tenant_id = current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or not accessible.",
        )

    if not template_ids:
        return []

    # Let client optionally request a specific language for seeded items
    lang = request.query_params.get("lang")
    created_items = crud.create_risk_items_from_templates(
        db=db,
        project_id=project_id,
        template_ids=template_ids,
        lang=lang,
    )
    return created_items


@router.get("/project/{project_id}/pdf")
@limiter.limit("30/minute")
async def export_risk_assessment_pdf(
    request: Request,
    project_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    """
    Export a project's risk assessment (risk register) as PDF.
    """
    effective_tenant_id = current_user.tenant_id
    project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible.")

    risk_items = crud.get_risk_items_for_project(db=db, project_id=project_id)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def write_line(text: str, state: dict) -> None:
        if state["y"] < 40:
            pdf.showPage()
            state["y"] = height - 40
        pdf.drawString(40, state["y"], text)
        state["y"] -= 14

    y_state = {"y": height - 40}

    # Header
    pdf.setFont("Helvetica-Bold", 16)
    write_line("Project Risk Assessment", y_state)

    pdf.setFont("Helvetica", 10)
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    generated_for = current_user.full_name or current_user.email
    write_line(f"Generated for {generated_for} on {now_str} UTC", y_state)
    y_state["y"] -= 6

    # Project information
    pdf.setFont("Helvetica-Bold", 11)
    write_line(f"Project: {project.name}", y_state)
    pdf.setFont("Helvetica", 10)
    write_line(f"Number: {project.project_number or project.id}", y_state)
    write_line(f"Status: {project.status}", y_state)
    if project.address:
        write_line(f"Address: {project.address}", y_state)

    y_state["y"] -= 10
    pdf.setFont("Helvetica-Bold", 11)
    write_line("Risk Register", y_state)

    pdf.setFont("Helvetica", 9)
    if not risk_items:
        write_line("No risk items registered for this project.", y_state)
    else:
        for item in risk_items:
            y_state["y"] -= 4
            pdf.setFont("Helvetica-Bold", 10)
            write_line(f"Risk #{item.id}: {item.title}", y_state)

            pdf.setFont("Helvetica", 9)
            summary = f"Likelihood: {item.likelihood}   Impact: {item.impact}   Status: {item.status}"
            write_line(summary, y_state)

            if item.description:
                pdf.setFont("Helvetica-Bold", 9)
                write_line("Description:", y_state)
                pdf.setFont("Helvetica", 9)
                for line in wrap(item.description, 100):
                    write_line(line, y_state)

            if item.mitigation:
                pdf.setFont("Helvetica-Bold", 9)
                write_line("Mitigation:", y_state)
                pdf.setFont("Helvetica", 9)
                for line in wrap(item.mitigation, 100):
                    write_line(line, y_state)

            y_state["y"] -= 6

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    crud.create_audit_log(
        db, action_type="data_export",
        actor_user_id=current_user.id, actor_email=current_user.email,
        tenant_id=project.tenant_id if getattr(project, "tenant_id", None) else current_user.tenant_id,
        target_ref=f"project:{project_id}", details=f"Risk assessment PDF export for project {project.name}",
    )
    filename = f"project-{project_id}-risk-assessment.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )


