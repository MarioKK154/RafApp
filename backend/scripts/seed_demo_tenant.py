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
    # Get user IDs for the tenant
    user_ids = [u.id for u in db.query(models.User).filter(models.User.tenant_id == tenant_id).all()]
    
    # Delete child objects referencing users
    if user_ids:
        db.query(models.Notification).filter(models.Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.Payslip).filter(models.Payslip.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.TimeLog).filter(models.TimeLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.MaterialRequest).filter(models.MaterialRequest.requested_by_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.CarLog).filter(models.CarLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.ToolLog).filter(models.ToolLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.flush()

    # Projects first (tasks/comments/photos are ORM-cascaded from Project)
    for p in db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all():
        db.delete(p)
    db.flush()

    # Remaining tenant-scoped entities requested for demo.
    db.query(models.LeaveRequest).filter(models.LeaveRequest.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Offer).filter(models.Offer.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Event).filter(models.Event.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Shop).filter(models.Shop.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Tool).filter(models.Tool.tenant_id == tenant_id).delete(synchronize_session=False)
    # Delete dependent car logs and tyre sets first to satisfy foreign key constraints
    car_ids = [c.id for c in db.query(models.Car).filter(models.Car.tenant_id == tenant_id).all()]
    if car_ids:
        db.query(models.CarLog).filter(models.CarLog.car_id.in_(car_ids)).delete(synchronize_session=False)
        db.query(models.TyreSet).filter(models.TyreSet.car_id.in_(car_ids)).delete(synchronize_session=False)
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
    role_map = {
        "admin": "admin",
        "accountant": "accountant",
        "project manager": "project manager",
        "team leader": "team_lead",
        "electrician": "electrician",
    }
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
        dict(email="el6.demo@rafapp.is", full_name="Inga Resistance", role="electrician", employee_id="2011", kennitala="1111110234", phone="5551011", city="Reykjavik", hourly=5600),
        dict(email="el7.demo@rafapp.is", full_name="Jon Capacitor", role="electrician", employee_id="2012", kennitala="1212120345", phone="5551012", city="Kopavogur", hourly=5600),
        dict(email="el8.demo@rafapp.is", full_name="Kristin Inductor", role="electrician", employee_id="2013", kennitala="1301130456", phone="5551013", city="Hafnarfjordur", hourly=5600),
        dict(email="el9.demo@rafapp.is", full_name="Ludvik Transistor", role="electrician", employee_id="2014", kennitala="1402140567", phone="5551014", city="Gardabaer", hourly=5600),
        dict(email="el10.demo@rafapp.is", full_name="Maria Diode", role="electrician", employee_id="2015", kennitala="1503150678", phone="5551015", city="Mosfellsbaer", hourly=5600),
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
            role=role_map.get(row["role"], row["role"]),
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
            models.Customer(
                tenant_id=tenant_id,
                name="Landsvirkjun",
                kennitala="4202691239",
                address="Háaleitisbraut 68, Reykjavík",
                contact_person="Bjarni Benediktsson",
                phone_number="5159000",
                email="landsvirkjun@lv.is",
                notes="National power company of Iceland, focus on substation wiring.",
            ),
            models.Customer(
                tenant_id=tenant_id,
                name="Reykjavíkurborg",
                kennitala="5302697609",
                address="Tjarnargötu 11, Reykjavík",
                contact_person="Dagur B. Eggertsson",
                phone_number="4111111",
                email="rvk@rvk.is",
                notes="City municipality, maintenance contracts for schools.",
            ),
            models.Customer(
                tenant_id=tenant_id,
                name="Orkuveita Reykjavíkur",
                kennitala="4302694409",
                address="Bæjarhálsi 1, Reykjavík",
                contact_person="Sólrún Gísladóttir",
                phone_number="5166000",
                email="or@or.is",
                notes="Municipal utility utility installations and EV charging grids.",
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
    now = _utc_now()
    c1 = models.Car(
        make="Ford", model="Transit Custom", year=2022, license_plate="DEMO01",
        status=models.CarStatus.Available, vin="WF0XXXTTGXNY10001",
        tenant_id=tenant_id, current_user_id=users["tl1.demo@rafapp.is"].id, service_needed=False,
    )
    c2 = models.Car(
        make="Volkswagen", model="Caddy", year=2021, license_plate="DEMO02",
        status=models.CarStatus.Checked_Out, vin="WV1ZZZSKZMY20002",
        tenant_id=tenant_id, current_user_id=users["el1.demo@rafapp.is"].id, service_needed=False,
    )
    c3 = models.Car(
        make="Toyota", model="Hilux", year=2020, license_plate="DEMO03",
        status=models.CarStatus.In_Service, vin="AHTBA3CD703000003",
        tenant_id=tenant_id, current_user_id=None, service_needed=True,
        service_notes="Brake service scheduled next week.",
    )
    db.add_all([c1, c2, c3])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)
    db.refresh(c3)

    # Seed Tyres for cars
    for car in [c1, c2, c3]:
        db.add_all([
            models.TyreSet(type=models.TyreType.Summer, brand="Michelin Primacy", notes="Summer tires, good tread", is_on_car=True, car_id=car.id),
            models.TyreSet(type=models.TyreType.Winter, brand="Nokian Hakkapeliitta", notes="Studded winter tires, 7mm depth", is_on_car=False, car_id=car.id)
        ])

        # Seed Car history logs
        db.add_all([
            models.CarLog(action=models.CarLogAction.Created, odometer_reading=25000, notes="Fleet asset entry", car_id=car.id, user_id=users["admin.demo@rafapp.is"].id, timestamp=now - timedelta(days=90)),
            models.CarLog(action=models.CarLogAction.Checked_Out, odometer_reading=26100, notes="Project dispatch", car_id=car.id, user_id=users["tl1.demo@rafapp.is"].id, timestamp=now - timedelta(days=60)),
            models.CarLog(action=models.CarLogAction.Checked_In, odometer_reading=26450, notes="Returned to lot", car_id=car.id, user_id=users["tl1.demo@rafapp.is"].id, timestamp=now - timedelta(days=59)),
            models.CarLog(action=models.CarLogAction.Maintenance, odometer_reading=27000, notes="Oil and filter change", car_id=car.id, user_id=users["admin.demo@rafapp.is"].id, timestamp=now - timedelta(days=30))
        ])
    db.commit()


def _create_tools(db, tenant_id: int, users: dict[str, models.User]) -> None:
    now = _utc_now()
    t1 = models.Tool(
        name="Fluke 179 Multimeter", brand="Fluke", model="179",
        serial_number="FLK179-DEM-001", status=models.ToolStatus.In_Use,
        tenant_id=tenant_id, current_user_id=users["el2.demo@rafapp.is"].id,
        description="Primary diagnostics multimeter.",
    )
    t2 = models.Tool(
        name="Milwaukee Hammer Drill", brand="Milwaukee", model="M18 FPD2",
        serial_number="MIL-M18-DEM-002", status=models.ToolStatus.Available,
        tenant_id=tenant_id, current_user_id=None,
        description="General site drilling.",
    )
    t3 = models.Tool(
        name="Cable Cutter 1000V", brand="Knipex", model="95 16 165",
        serial_number="KPX-DEM-003", status=models.ToolStatus.In_Repair,
        tenant_id=tenant_id, current_user_id=None,
        description="Insulated heavy duty cutter.",
    )
    db.add_all([t1, t2, t3])
    db.commit()
    db.refresh(t1)
    db.refresh(t2)
    db.refresh(t3)

    # Seed Tool history logs
    for tool in [t1, t2, t3]:
        db.add_all([
            models.ToolLog(action=models.ToolLogAction.Created, notes="Initial purchase", tool_id=tool.id, user_id=users["admin.demo@rafapp.is"].id, timestamp=now - timedelta(days=120)),
            models.ToolLog(action=models.ToolLogAction.Checked_Out, notes="Dispatched to site", tool_id=tool.id, user_id=users["el2.demo@rafapp.is"].id, timestamp=now - timedelta(days=10)),
            models.ToolLog(action=models.ToolLogAction.Checked_In, notes="Returned to tool crib", tool_id=tool.id, user_id=users["el2.demo@rafapp.is"].id, timestamp=now - timedelta(days=9))
        ])
    db.commit()


def _create_timelogs(db, tenant_id: int, users: dict[str, models.User]) -> None:
    now = _utc_now()
    projects = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all()
    if not projects:
        return
    
    for email, user in users.items():
        for d in range(1, 6): # Exactly 5 logs per user across projects
            proj = projects[d % len(projects)]
            db.add(models.TimeLog(
                user_id=user.id,
                project_id=proj.id,
                start_time=now - timedelta(days=d, hours=8),
                end_time=now - timedelta(days=d, hours=0),
                notes=f"Daily electrical installation task - Day {d}",
                duration=timedelta(hours=8)
            ))
    db.commit()

def _create_shops(db, tenant_id: int) -> None:
    db.add_all([
        models.Shop(
            tenant_id=tenant_id, name="Ískraft", address="Smiðjuvegur 11, Kópavogur", 
            phone_number="5551234", email="sala@iskraft.is", contact_person="Aron Þórsson", 
            notes="Preferred vendor for conduit and electrical panels."
        ),
        models.Shop(
            tenant_id=tenant_id, name="Johan Rönning", address="Klettagörðum 25, Reykjavík", 
            phone_number="5559800", email="ronning@ronning.is", contact_person="Elín Jónsdóttir", 
            notes="Special agreement for 15% discount on cable trays."
        ),
        models.Shop(
            tenant_id=tenant_id, name="Reykjafell", address="Skipholti 35, Reykjavík", 
            phone_number="5200200", email="reykjafell@reykjafell.is", contact_person="Gunnar Pétursson", 
            notes="Supplier for switches, sockets, and local lighting fixtures."
        ),
        models.Shop(
            tenant_id=tenant_id, name="Smith & Norland", address="Nóatúni 4, Reykjavík", 
            phone_number="5203000", email="sminor@sminor.is", contact_person="Birgir Smith", 
            notes="Industrial motors and complex automation relays."
        ),
        models.Shop(
            tenant_id=tenant_id, name="Húsasmiðjan", address="Kjalarvogi 7-11, Reykjavík", 
            phone_number="5253000", email="husa@husa.is", contact_person="Sigurður Skarphéðinsson", 
            notes="General tools and fixing materials/screws."
        ),
    ])
    db.commit()

def _create_comments_and_photos(db, tenant_id: int, users: dict[str, models.User]) -> None:
    task = db.query(models.Task).join(models.Project).filter(models.Project.tenant_id == tenant_id).first()
    if not task:
        return
    el1 = users["el1.demo@rafapp.is"]
    db.add_all([
        models.TaskComment(task_id=task.id, author_id=el1.id, content="Wiring is halfway done. Waiting for materials."),
        models.TaskComment(task_id=task.id, author_id=users["pm.demo@rafapp.is"].id, content="Understood. Will order from Ískraft today.")
    ])
    db.commit()

def _create_schedules(db, tenant_id: int, users: dict[str, models.User]) -> None:
    now = _utc_now()
    pm = users["pm.demo@rafapp.is"]
    db.add_all([
        models.Event(
            tenant_id=tenant_id, title="Client Sync Meeting", description="Discussing project phases.",
            start_time=now + timedelta(days=1, hours=10), end_time=now + timedelta(days=1, hours=11),
            creator_id=pm.id, event_type=models.EventType.meeting
        ),
    ])
    db.commit()

def _create_offers(db, tenant_id: int, users: dict[str, models.User]) -> None:
    project = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).first()
    if not project:
        return
    pm = users["pm.demo@rafapp.is"]
    offer = models.Offer(
        tenant_id=tenant_id, project_id=project.id, created_by_user_id=pm.id,
        offer_number="OFF-2026-001", title="Initial Installation Offer",
        status=models.OfferStatus.Draft, total_amount=1500000.0
    )
    db.add(offer)
    db.commit()

def _create_time_off(db, tenant_id: int, users: dict[str, models.User]) -> None:
    now = _utc_now()
    leave_types = ["Vacation", "Sick Leave", "Parental Leave"]
    leave_statuses = [models.LeaveStatus.Approved, models.LeaveStatus.Pending, models.LeaveStatus.Rejected]
    
    for email, user in users.items():
        # 1. Leave Request for everyone
        start_offset = 10 + (user.id % 20)
        db.add(models.LeaveRequest(
            tenant_id=tenant_id,
            user_id=user.id,
            leave_type=leave_types[user.id % len(leave_types)],
            start_date=(now + timedelta(days=start_offset)).date(),
            end_date=(now + timedelta(days=start_offset + 5)).date(),
            status=leave_statuses[user.id % len(leave_statuses)],
            reason="Scheduled absence / personal matters"
        ))
        
        # 2. Payslip for everyone
        hourly = user.hourly_rate or 5600
        brutto = hourly * 160
        netto = brutto * 0.63
        db.add(models.Payslip(
            tenant_id=tenant_id,
            user_id=user.id,
            issue_date=(now - timedelta(days=15)).date(),
            amount_brutto=float(brutto),
            amount_netto=float(netto),
            file_path=f"/static/payslips/demo_payslip_{user.id}.pdf",
            filename=f"payslip_2026_06_{user.employee_id or user.id}.pdf"
        ))
    
    # Active overlapping sick leaves
    el6 = users.get("el6.demo@rafapp.is")
    el7 = users.get("el7.demo@rafapp.is")
    if el6:
        db.add(models.LeaveRequest(
            tenant_id=tenant_id, user_id=el6.id, leave_type="Sick Leave",
            start_date=(now - timedelta(days=1)).date(), end_date=(now + timedelta(days=3)).date(),
            status=models.LeaveStatus.Approved, reason="Flu and high fever"
        ))
    if el7:
        db.add(models.LeaveRequest(
            tenant_id=tenant_id, user_id=el7.id, leave_type="Sick Leave",
            start_date=(now - timedelta(days=2)).date(), end_date=(now + timedelta(days=2)).date(),
            status=models.LeaveStatus.Approved, reason="Dental surgery recovery"
        ))
        
    db.commit()


def _create_material_requests(db, tenant_id: int, users: dict[str, models.User]) -> None:
    projects = db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all()
    items = db.query(models.InventoryItem).limit(6).all()
    if not projects or not items:
        return
        
    el1 = users["el1.demo@rafapp.is"]
    el2 = users["el2.demo@rafapp.is"]
    tl1 = users["tl1.demo@rafapp.is"]
    
    db.add_all([
        models.MaterialRequest(
            project_id=projects[0].id,
            inventory_item_id=items[0].id,
            requested_by_id=el1.id,
            quantity=25.0,
            note="Need extra copper cable coils for the second floor corridor layout.",
            status="Pending"
        ),
        models.MaterialRequest(
            project_id=projects[1].id,
            inventory_item_id=items[1].id,
            requested_by_id=el2.id,
            quantity=10.0,
            note="EV Charger mounting frames damaged in shipping; requesting replacements.",
            status="Pending"
        ),
        models.MaterialRequest(
            project_id=projects[2].id,
            inventory_item_id=items[2].id,
            requested_by_id=tl1.id,
            quantity=4.0,
            note="Replacement switch fuses for the main distribution panel upgrade.",
            status="Approved",
            resolved_at=_utc_now()
        ),
        models.MaterialRequest(
            project_id=projects[0].id,
            inventory_item_id=items[3].id,
            requested_by_id=el1.id,
            quantity=50.0,
            note="Plastic conduit pipes - short on primary stock.",
            status="Pending"
        )
    ])
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
        _create_timelogs(db, tenant.id, users)
        _create_shops(db, tenant.id)
        _create_comments_and_photos(db, tenant.id, users)
        _create_schedules(db, tenant.id, users)
        _create_offers(db, tenant.id, users)
        _create_time_off(db, tenant.id, users)
        _create_material_requests(db, tenant.id, users)

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

