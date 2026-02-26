from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional, Literal
import logging
from io import BytesIO
from datetime import datetime
from textwrap import wrap

from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

# Initialize Logging for technical diagnostics
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
    dependencies=[Depends(security.get_current_active_user)]
)

# Technical Dependencies
DbDependency = Annotated[Session, Depends(get_db)]
CurrentUserDependency = Annotated[models.User, Depends(security.get_current_active_user)]
TeamLeaderOrHigherTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager", "team leader"]))]
ManagerOrAdminTenantDependency = Annotated[models.User, Depends(security.require_role(["admin", "project manager"]))]

AllowedTaskSortFields = Literal["title", "status", "priority", "start_date", "due_date", "created_at", "id"]
AllowedSortDirections = Literal["asc", "desc"]

async def get_task_and_verify_tenant(task_id: int, db: DbDependency, current_user: CurrentUserDependency) -> models.Task:
    """
    Protocol: Fetch a task and verify cross-tenant security boundaries. 
    Superusers bypass ownership checks for global infrastructure oversight.
    """
    db_task = crud.get_task(db, task_id=task_id)
    if not db_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in registry")
    
    effective_tenant_id = db_task.project.tenant_id
    if not current_user.is_superuser and effective_tenant_id != current_user.tenant_id:
        logger.warning(f"Security Alert: User {current_user.id} attempted unauthorized access to Task {task_id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Resource belongs to a different tenant infrastructure")
    return db_task

@router.post("/", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_new_task(request: Request, task_data: schemas.TaskCreate, db: DbDependency, current_user: TeamLeaderOrHigherTenantDependency):
    """
    Deployment: Register a new task. 
    Superadmins can deploy tasks globally; others are restricted to their local tenant projects.
    """
    effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
    project = crud.get_project(db, project_id=task_data.project_id, tenant_id=effective_tenant_id)
    
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target project not found or inaccessible for this node")
    
    return crud.create_task(db=db, task=task_data, project_tenant_id=project.tenant_id)

@router.get("/", response_model=List[schemas.TaskRead])
@limiter.limit("1000/minute")
async def read_all_tasks(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    project_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    status: Optional[schemas.TaskStatusLiteral] = Query(None),
    search: Optional[str] = Query(None, description="Filter by title identifier"),
    sort_by: Optional[AllowedTaskSortFields] = Query('id'),
    sort_dir: Optional[AllowedSortDirections] = Query('asc'),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Telemetry: Retrieve task registry entries based on operational filters.
    """
    if project_id:
        effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
        project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
        if not project:
            return []

    tasks = crud.get_tasks(
        db=db, 
        project_id=project_id, 
        assignee_id=assignee_id, 
        status=status,
        search=search,
        sort_by=sort_by, 
        sort_dir=sort_dir, 
        skip=skip, 
        limit=limit
    )

    # Filter by tenant for non-superuser accounts
    if not current_user.is_superuser:
        tasks = [task for task in tasks if task.project.tenant_id == current_user.tenant_id]

    return tasks

@router.get("/{task_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def read_single_task(request: Request, task_id: int, db: DbDependency, current_user: CurrentUserDependency):
    """Telemetry: Fetch specific task metrics."""
    return await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)

@router.put("/{task_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def update_existing_task(
    request: Request,
    task_id: int,
    task_update_data: schemas.TaskUpdate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """
    Modification Protocol: Synchronize task details with provided telemetry.
    """
    # Verify current state and ownership
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    
    if db_task.is_commissioned and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Commissioned tasks are locked for integrity")

    effective_validation_id = None if current_user.is_superuser else current_user.tenant_id
    
    try:
        updated_task = crud.update_task(
            db=db, 
            task_id=task_id, 
            task_update=task_update_data, 
            project_tenant_id=effective_validation_id
        )
        if not updated_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update target lost")
        return updated_task
    except Exception as e:
        logger.error(f"Task Update Failure [ID: {task_id}]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Update protocol failed: {str(e)}"
        )

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("100/minute")
async def delete_existing_task(request: Request, task_id: int, db: DbDependency, current_user: TeamLeaderOrHigherTenantDependency):
    """Registry Cleanup: Remove task node from system."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    crud.delete_task(db=db, task_id=db_task.id)
    return None

@router.post("/{task_id}/commission", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def commission_task_endpoint(request: Request, task_id: int, db: DbDependency, current_user: ManagerOrAdminTenantDependency):
    """
    Compliance Protocol: Mark task as commissioned. 
    Requires 'Done' status. Triggers archival and node locking.
    """
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    if db_task.status != "Done":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Protocol mismatch: Task must reach 'Done' state before commissioning")
    return crud.commission_task(db=db, task_to_commission=db_task)

@router.post("/{task_id}/dependencies", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def add_dependency_to_task(
    request: Request,
    task_id: int,
    dependency: schemas.TaskDependencyCreate,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Logic: Establish a predecessor node dependency (Gantt Logic)."""
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(dependency.predecessor_id, db, current_user)
    
    if task.id == predecessor_task.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recursive dependency rejected: Task cannot depend on self")
    if task.project_id != predecessor_task.project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Domain mismatch: Dependency must reside within the same infrastructure project")
        
    updated_task = crud.add_task_dependency(db=db, task=task, predecessor=predecessor_task)
    if updated_task is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Circular dependency protocol triggered: Loop detected")
    return updated_task

@router.delete("/{task_id}/dependencies/{predecessor_id}", response_model=schemas.TaskRead)
@limiter.limit("100/minute")
async def remove_dependency_from_task(
    request: Request,
    task_id: int,
    predecessor_id: int,
    db: DbDependency,
    current_user: TeamLeaderOrHigherTenantDependency
):
    """Logic: Dissolve dependency relationship between nodes."""
    task = await get_task_and_verify_tenant(task_id, db, current_user)
    predecessor_task = await get_task_and_verify_tenant(predecessor_id, db, current_user)
    return crud.remove_task_dependency(db=db, task=task, predecessor=predecessor_task)

@router.post("/{task_id}/comments/", response_model=schemas.TaskCommentRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
async def create_comment_for_task(
    request: Request,
    task_id: int,
    comment: schemas.TaskCommentCreate,
    db: DbDependency,
    current_user: CurrentUserDependency 
):
    """Telemetry: Attach communication log to task node."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    new_comment = crud.create_task_comment(db=db, comment=comment, task_id=db_task.id, author_id=current_user.id)
    return new_comment

@router.get("/{task_id}/comments/", response_model=List[schemas.TaskCommentRead])
@limiter.limit("100/minute")
async def read_comments_for_task(
    request: Request,
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """Telemetry: Retrieve all communication logs for a task node."""
    db_task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    return crud.get_comments_for_task(db=db, task_id=db_task.id, skip=skip, limit=limit)


@router.get("/export/pdf")
@limiter.limit("30/minute")
async def export_tasks_pdf(
    request: Request,
    db: DbDependency,
    current_user: CurrentUserDependency,
    project_id: Optional[int] = Query(None),
    assignee_id: Optional[int] = Query(None),
    status: Optional[schemas.TaskStatusLiteral] = Query(None),
    search: Optional[str] = Query(None, description="Filter by title identifier"),
):
    """
    Export a filtered set of tasks to PDF using the 'detail pack' layout.
    """
    # Reuse the same visibility rules as read_all_tasks
    if project_id:
        effective_tenant_id = None if current_user.is_superuser else current_user.tenant_id
        project = crud.get_project(db, project_id=project_id, tenant_id=effective_tenant_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found or not accessible.")

    tasks = crud.get_tasks(
        db=db,
        project_id=project_id,
        assignee_id=assignee_id,
        status=status,
        search=search,
        sort_by="id",
        sort_dir="asc",
        skip=0,
        limit=1000,
    )

    if not current_user.is_superuser:
        tasks = [task for task in tasks if task.project.tenant_id == current_user.tenant_id]

    # Mirror UI semantics: when no explicit status filter, exclude commissioned tasks
    if status is None:
        tasks = [task for task in tasks if task.status != "Commissioned"]

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def write_line(text: str, state: dict) -> None:
        # Simple line writer with pagination
        if state["y"] < 40:
            pdf.showPage()
            state["y"] = height - 40
        pdf.drawString(40, state["y"], text)
        state["y"] -= 14

    y_state = {"y": height - 40}

    header = "Task Brief"
    pdf.setFont("Helvetica-Bold", 16)
    write_line(header, y_state)

    pdf.setFont("Helvetica", 9)
    meta = f"Generated for {current_user.full_name or current_user.email} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC"
    write_line(meta, y_state)
    y_state["y"] -= 10

    status_counts: dict[str, int] = {}

    for task in tasks:
        status_text = task.status or "Unknown"
        status_counts[status_text] = status_counts.get(status_text, 0) + 1

        pdf.setFont("Helvetica-Bold", 11)
        write_line(f"#{task.id} – {task.title}", y_state)

        pdf.setFont("Helvetica", 9)
        project_name = task.project.name if task.project else "-"
        assignee_name = (task.assignee.full_name or task.assignee.email) if task.assignee else "Unassigned"
        created = task.created_at.strftime("%Y-%m-%d") if getattr(task, "created_at", None) else "-"
        start_date = task.start_date.strftime("%Y-%m-%d") if getattr(task, "start_date", None) else "-"
        due_date = task.due_date.strftime("%Y-%m-%d") if getattr(task, "due_date", None) else "-"

        write_line(f"Status: {status_text} | Priority: {task.priority or '-'}", y_state)
        write_line(
            f"Project: {project_name} | Assignee: {assignee_name} | Created: {created} | Start: {start_date} | Due: {due_date}",
            y_state,
        )

        if task.description:
            desc_lines = wrap(task.description, 95)
            for line in desc_lines:
                write_line(f"  {line}", y_state)

        y_state["y"] -= 6

    # Summary
    pdf.setFont("Helvetica-Bold", 10)
    total = len(tasks)
    summary_parts = [f"Total tasks: {total}"] + [f"{k}: {v}" for k, v in status_counts.items()]
    write_line(" | ".join(summary_parts), y_state)

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    filename = "tasks-export.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )


@router.get("/{task_id}/export/pdf")
@limiter.limit("30/minute")
async def export_single_task_pdf(
    request: Request,
    task_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency,
):
    """
    Export a single task with extended details and recent comments.
    """
    task = await get_task_and_verify_tenant(task_id=task_id, db=db, current_user=current_user)
    comments = crud.get_comments_for_task(db=db, task_id=task.id, skip=0, limit=10)

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

    pdf.setFont("Helvetica-Bold", 16)
    write_line("Task Detail", y_state)

    pdf.setFont("Helvetica", 10)
    meta = f"Generated for {current_user.full_name or current_user.email} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC"
    write_line(meta, y_state)
    y_state["y"] -= 10

    pdf.setFont("Helvetica-Bold", 11)
    write_line(f"#{task.id} – {task.title}", y_state)

    pdf.setFont("Helvetica", 10)
    project_name = task.project.name if task.project else "-"
    assignee_name = (task.assignee.full_name or task.assignee.email) if task.assignee else "Unassigned"
    created = task.created_at.strftime("%Y-%m-%d %H:%M") if getattr(task, "created_at", None) else "-"
    start_date = task.start_date.strftime("%Y-%m-%d") if getattr(task, "start_date", None) else "-"
    due_date = task.due_date.strftime("%Y-%m-%d") if getattr(task, "due_date", None) else "-"

    write_line(f"Project: {project_name}", y_state)
    write_line(f"Status: {task.status or '-'} | Priority: {task.priority or '-'}", y_state)
    write_line(f"Assignee: {assignee_name}", y_state)
    write_line(f"Created: {created} | Start: {start_date} | Due: {due_date}", y_state)

    if task.description:
        y_state["y"] -= 6
        pdf.setFont("Helvetica-Bold", 11)
        write_line("Description", y_state)
        pdf.setFont("Helvetica", 10)
        for line in wrap(task.description, 95):
            write_line(line, y_state)

    if comments:
        y_state["y"] -= 6
        pdf.setFont("Helvetica-Bold", 11)
        write_line("Recent Comments", y_state)
        pdf.setFont("Helvetica", 9)
        for c in comments:
            author = c.author.full_name or c.author.email if c.author else f"User {c.author_id}"
            ts = c.created_at.strftime("%Y-%m-%d %H:%M")
            write_line(f"- {author} @ {ts}", y_state)
            for line in wrap(c.content, 95):
                write_line(f"  {line}", y_state)

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    filename = f"task-{task.id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )