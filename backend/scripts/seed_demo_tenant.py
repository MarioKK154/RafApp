"""
One-click demo tenant seeder (tenant id=2) for presentations.

Creates/refreshes:
- Tenant (id=2)
- 10 users (1 admin, 1 accountant, 1 project manager, 2 team leaders, 5 electricians)
- 2 customers
- 3 projects
- 3 tasks per project
- 3 cars
- 4 tools

Usage (from backend/):
    python scripts/seed_demo_tenant.py
    python scripts/seed_demo_tenant.py --no-reset
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import models
from app.database import SessionLocal, engine
from app.security import get_password_hash


TENANT_ID = 2
DEFAULT_PASSWORD = "12345678"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _sync_tenant_id_sequence(db) -> None:
    if engine.dialect.name != "postgresql":
        return
    db.execute(
        text(
            "SELECT setval(pg_get_serial_sequence('tenants', 'id'), "
            "(SELECT COALESCE(MAX(id), 1) FROM tenants))"
        )
    )


def _delete_existing_tenant_data(db, tenant_id: int) -> None:
    # Projects first (tasks/comments/photos are ORM-cascaded from Project)
    for p in db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all():
        db.delete(p)
    db.flush()

    # Remaining tenant-scoped entities requested for demo.
    db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Tool).filter(models.Tool.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Car).filter(models.Car.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.User).filter(models.User.tenant_id == tenant_id).delete(synchronize_session=False)
    db.commit()


def _ensure_tenant(db) -> models.Tenant:
    now = _utc_now()
    tenant = db.query(models.Tenant).filter(models.Tenant.id == TENANT_ID).first()
    if tenant is None:
        tenant = models.Tenant(
            id=TENANT_ID,
            name="Demo Tenant Showcase",
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        db.commit()
        _sync_tenant_id_sequence(db)
    else:
        tenant.name = "Demo Tenant Showcase"
        tenant.is_active = True
        tenant.updated_at = now
        db.add(tenant)
        db.commit()
    db.refresh(tenant)
    return tenant


def _create_users(db, tenant_id: int) -> dict[str, models.User]:
    now = _utc_now()
    demo_users = [
        # admin
        dict(email="admin.demo@rafapp.is", full_name="John Admin Doe", role="admin", employee_id="2001", kennitala="1201011234", phone="5551001", city="Reykjavik", hourly=9500),
        # accountant
        dict(email="accountant.demo@rafapp.is", full_name="Sara Ledger", role="accountant", employee_id="2002", kennitala="2202022345", phone="5551002", city="Kopavogur", hourly=7800),
        # PM
        dict(email="pm.demo@rafapp.is", full_name="Michael Projectson", role="project manager", employee_id="2003", kennitala="0303033456", phone="5551003", city="Reykjavik", hourly=8800),
        # team leaders
        dict(email="tl1.demo@rafapp.is", full_name="Anna Teamlead", role="team leader", employee_id="2004", kennitala="1404044567", phone="5551004", city="Hafnarfjordur", hourly=7200),
        dict(email="tl2.demo@rafapp.is", full_name="Bjorn Teamlead", role="team leader", employee_id="2005", kennitala="2505055678", phone="5551005", city="Reykjanesbaer", hourly=7200),
        # electricians
        dict(email="el1.demo@rafapp.is", full_name="David Sparks", role="electrician", employee_id="2006", kennitala="0606066789", phone="5551006", city="Reykjavik", hourly=5600),
        dict(email="el2.demo@rafapp.is", full_name="Elena Current", role="electrician", employee_id="2007", kennitala="1707077890", phone="5551007", city="Akranes", hourly=5600),
        dict(email="el3.demo@rafapp.is", full_name="Fridrik Volt", role="electrician", employee_id="2008", kennitala="2808088901", phone="5551008", city="Mosfellsbaer", hourly=5600),
        dict(email="el4.demo@rafapp.is", full_name="Greta Wire", role="electrician", employee_id="2009", kennitala="0909099012", phone="5551009", city="Selfoss", hourly=5600),
        dict(email="el5.demo@rafapp.is", full_name="Hakon Ohm", role="electrician", employee_id="2010", kennitala="1010100123", phone="5551010", city="Reykjavik", hourly=5600),
    ]

    out: dict[str, models.User] = {}
    for row in demo_users:
        user = models.User(
            email=row["email"],
            hashed_password=get_password_hash(DEFAULT_PASSWORD),
            full_name=row["full_name"],
            employee_id=row["employee_id"],
            kennitala=row["kennitala"],
            phone_number=row["phone"],
            city=row["city"],
            location=row["city"],
            role=row["role"],
            is_active=True,
            is_superuser=False,
            tenant_id=tenant_id,
            hourly_rate=row["hourly"],
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        out[row["email"]] = user
    return out


def _create_customers(db, tenant_id: int) -> None:
    db.add_all(
        [
            models.Customer(
                tenant_id=tenant_id,
                name="Aurora Facilities ehf.",
                kennitala="5501019988",
                address="Kringlan 4, Reykjavik",
                contact_person="Lina Sigurdardottir",
                phone_number="5552201",
                email="lina@aurorafacilities.is",
                notes="Primary customer for office and retail work.",
            ),
            models.Customer(
                tenant_id=tenant_id,
                name="North Harbor Logistics",
                kennitala="6602028877",
                address="Hafnarbakki 12, Reykjavik",
                contact_person="Aron Gunnarsson",
                phone_number="5552202",
                email="aron@northharbor.is",
                notes="Warehouse and outdoor area maintenance customer.",
            ),
        ]
    )
    db.commit()


def _create_projects_and_tasks(db, tenant_id: int, users: dict[str, models.User]) -> None:
    now = _utc_now()
    pm = users["pm.demo@rafapp.is"]
    tl1 = users["tl1.demo@rafapp.is"]
    tl2 = users["tl2.demo@rafapp.is"]
    el1 = users["el1.demo@rafapp.is"]
    el2 = users["el2.demo@rafapp.is"]
    el3 = users["el3.demo@rafapp.is"]
    admin = users["admin.demo@rafapp.is"]

    projects_data = [
        dict(
            name="Harbor Office Lighting Retrofit",
            number="DEMO-2026-001",
            address="Fiskislod 31, Reykjavik",
            desc="Upgrade office lighting to LED and smart controls.",
            manager=pm.id,
            members=[tl1.id, el1.id, el2.id],
        ),
        dict(
            name="Retail EV Charger Installation",
            number="DEMO-2026-002",
            address="Smaratorg 8, Kopavogur",
            desc="Install dual EV charging points with load balancing.",
            manager=tl1.id,
            members=[pm.id, el3.id, tl2.id],
        ),
        dict(
            name="Warehouse Panel Modernization",
            number="DEMO-2026-003",
            address="Sundahofn 5, Reykjavik",
            desc="Replace old distribution panels and improve labeling.",
            manager=tl2.id,
            members=[pm.id, el1.id, el2.id, el3.id],
        ),
    ]

    created_projects: list[models.Project] = []
    for i, p in enumerate(projects_data):
        proj = models.Project(
            name=p["name"],
            project_number=p["number"],
            description=p["desc"],
            address=p["address"],
            status="Active",
            start_date=now - timedelta(days=14 - i * 4),
            end_date=now + timedelta(days=60 + i * 10),
            creator_id=admin.id,
            project_manager_id=p["manager"],
            tenant_id=tenant_id,
        )
        db.add(proj)
        db.flush()

        for uid in p["members"]:
            user = db.query(models.User).filter(models.User.id == uid).first()
            if user:
                proj.members.append(user)

        created_projects.append(proj)

    db.commit()
    for p in created_projects:
        db.refresh(p)

    assignees = [el1.id, el2.id, el3.id, tl1.id, tl2.id]
    for i, proj in enumerate(created_projects):
        for t in range(1, 4):
            task = models.Task(
                title=f"Task {t}: {proj.name.split()[0]} work package",
                description=f"Demo task {t} for project presentation workflow.",
                status="In Progress" if t == 1 else "To Do",
                priority="High" if t == 1 else "Medium",
                start_date=now - timedelta(days=t),
                due_date=now + timedelta(days=7 + t + i * 3),
                project_id=proj.id,
                assignee_id=assignees[(i + t) % len(assignees)],
            )
            db.add(task)
    db.commit()


def _create_cars(db, tenant_id: int, users: dict[str, models.User]) -> None:
    db.add_all(
        [
            models.Car(
                make="Ford",
                model="Transit Custom",
                year=2022,
                license_plate="DEMO01",
                status=models.CarStatus.Available,
                vin="WF0XXXTTGXNY10001",
                tenant_id=tenant_id,
                current_user_id=users["tl1.demo@rafapp.is"].id,
                service_needed=False,
            ),
            models.Car(
                make="Volkswagen",
                model="Caddy",
                year=2021,
                license_plate="DEMO02",
                status=models.CarStatus.Checked_Out,
                vin="WV1ZZZSKZMY20002",
                tenant_id=tenant_id,
                current_user_id=users["el1.demo@rafapp.is"].id,
                service_needed=False,
            ),
            models.Car(
                make="Toyota",
                model="Hilux",
                year=2020,
                license_plate="DEMO03",
                status=models.CarStatus.In_Service,
                vin="AHTBA3CD703000003",
                tenant_id=tenant_id,
                current_user_id=None,
                service_needed=True,
                service_notes="Brake service scheduled next week.",
            ),
        ]
    )
    db.commit()


def _create_tools(db, tenant_id: int, users: dict[str, models.User]) -> None:
    db.add_all(
        [
            models.Tool(
                name="Fluke 179 Multimeter",
                brand="Fluke",
                model="179",
                serial_number="FLK179-DEM-001",
                status=models.ToolStatus.In_Use,
                tenant_id=tenant_id,
                current_user_id=users["el2.demo@rafapp.is"].id,
                description="Primary diagnostics multimeter.",
            ),
            models.Tool(
                name="Milwaukee Hammer Drill",
                brand="Milwaukee",
                model="M18 FPD2",
                serial_number="MIL-M18-DEM-002",
                status=models.ToolStatus.Available,
                tenant_id=tenant_id,
                current_user_id=None,
                description="General site drilling.",
            ),
            models.Tool(
                name="Cable Cutter 1000V",
                brand="Knipex",
                model="95 16 165",
                serial_number="KPX-DEM-003",
                status=models.ToolStatus.In_Repair,
                tenant_id=tenant_id,
                current_user_id=None,
                description="Insulated heavy duty cutter.",
            ),
            models.Tool(
                name="Network Cable Tester",
                brand="Trend",
                model="SignalTEK",
                serial_number="TRD-DEM-004",
                status=models.ToolStatus.Available,
                tenant_id=tenant_id,
                current_user_id=None,
                description="Cat6/Cat6A certification checks.",
            ),
        ]
    )
    db.commit()


def seed_demo_tenant(reset_existing: bool = True) -> None:
    db = SessionLocal()
    try:
        tenant = _ensure_tenant(db)
        if reset_existing:
            _delete_existing_tenant_data(db, tenant.id)

        users = _create_users(db, tenant.id)
        _create_customers(db, tenant.id)
        _create_projects_and_tasks(db, tenant.id, users)
        _create_cars(db, tenant.id, users)
        _create_tools(db, tenant.id, users)

        users_count = db.query(models.User).filter(models.User.tenant_id == tenant.id).count()
        customers_count = db.query(models.Customer).filter(models.Customer.tenant_id == tenant.id).count()
        projects_count = db.query(models.Project).filter(models.Project.tenant_id == tenant.id).count()
        project_ids = [p.id for p in db.query(models.Project).filter(models.Project.tenant_id == tenant.id).all()]
        tasks_count = db.query(models.Task).filter(models.Task.project_id.in_(project_ids)).count() if project_ids else 0
        cars_count = db.query(models.Car).filter(models.Car.tenant_id == tenant.id).count()
        tools_count = db.query(models.Tool).filter(models.Tool.tenant_id == tenant.id).count()

        print(f"Demo tenant ready: id={tenant.id}, name={tenant.name}")
        print(f"Default password for all demo users: {DEFAULT_PASSWORD}")
        print(
            "Created counts -> "
            f"users={users_count}, customers={customers_count}, projects={projects_count}, "
            f"tasks={tasks_count}, cars={cars_count}, tools={tools_count}"
        )
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo tenant (id=2) with presentation data.")
    parser.add_argument(
        "--no-reset",
        action="store_true",
        help="Do not delete existing tenant id=2 data before seeding.",
    )
    args = parser.parse_args()
    seed_demo_tenant(reset_existing=not args.no_reset)


if __name__ == "__main__":
    main()

