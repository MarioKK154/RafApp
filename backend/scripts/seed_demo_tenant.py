"""
Realistic Demo Tenant Seeder (tenant_id = 2) - "Rafverktakar Suðurnesja ehf."

Simulates a thriving Icelandic electrical contracting business that has been using RafApp
actively for 4 months (March - July 2026).

Creates:
- Tenant (id=2) "Rafverktakar Suðurnesja ehf."
- 12 Realistic Personnel (1 GM/Admin, 1 Accountant, 1 PM, 2 Team Leads, 5 Electricians, 2 Apprentices)
- 5 Commercial Clients (Isavia, Landsvirkjun, Bláa Lónið, Reykjanesbær, Íslandshótel)
- 4 Diverse Projects with real budgets (48.5m, 18.2m, 12.8m, 6.5m ISK)
- 12 Money In/Out Financial Transactions (Income & Expenses)
- ~900 Diverse Time Logs spanning 90 days with overtime & weekend emergency callouts
- 16 Monthly Payslips (March - June 2026) with pensions, RAFÍS union fees, and tax breakdowns
- 4 Leave Requests (Sumarorlof, Veikindi barns, Eigin veikindi, Fæðingarorlof)
- 4 Commercial Vans (Renault Master, VW Transporter, MB Vito, Ford Transit) with mileage logs
- 6 Industrial Tools (Fluke 1664 FC, Hilti TE 60, Milwaukee Crimper, Megger, Bosch Laser, Fluke Multimeter)
- Realistic Chat Threads & Project Communications

Usage:
    python backend/scripts/seed_demo_tenant.py
"""

from __future__ import annotations

import argparse
import sys
import random
from datetime import datetime, timedelta, date, timezone
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
    try:
        db.execute(
            text(
                "SELECT setval(pg_get_serial_sequence('tenants', 'id'), "
                "(SELECT COALESCE(MAX(id), 1) FROM tenants))"
            )
        )
    except Exception:
        pass


def _delete_existing_tenant_data(db, tenant_id: int) -> None:
    print(f"Cleaning up existing demo data for tenant_id={tenant_id}...")
    user_ids = [u.id for u in db.query(models.User).filter(models.User.tenant_id == tenant_id).all()]
    
    if user_ids:
        db.query(models.Notification).filter(models.Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.Payslip).filter(models.Payslip.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.TimeLog).filter(models.TimeLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.LeaveRequest).filter(models.LeaveRequest.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(models.ProjectAssignment).filter(models.ProjectAssignment.user_id.in_(user_ids)).delete(synchronize_session=False)

    project_ids = [p.id for p in db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all()]
    if project_ids:
        db.query(models.MaterialRequest).filter(models.MaterialRequest.project_id.in_(project_ids)).delete(synchronize_session=False)
        db.query(models.Expense).filter(models.Expense.project_id.in_(project_ids)).delete(synchronize_session=False)

    db.query(models.Expense).filter(models.Expense.tenant_id == tenant_id).delete(synchronize_session=False)

    offer_ids = [o.id for o in db.query(models.Offer).filter(models.Offer.tenant_id == tenant_id).all()]
    if offer_ids:
        db.query(models.OfferLineItem).filter(models.OfferLineItem.offer_id.in_(offer_ids)).delete(synchronize_session=False)
    db.query(models.Offer).filter(models.Offer.tenant_id == tenant_id).delete(synchronize_session=False)
    db.flush()

    for p in db.query(models.Project).filter(models.Project.tenant_id == tenant_id).all():
        db.delete(p)
    db.flush()

    db.query(models.ChatThread).filter(models.ChatThread.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Event).filter(models.Event.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Shop).filter(models.Shop.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).delete(synchronize_session=False)
    
    tool_ids = [t.id for t in db.query(models.Tool).filter(models.Tool.tenant_id == tenant_id).all()]
    if tool_ids:
        db.query(models.ToolLog).filter(models.ToolLog.tool_id.in_(tool_ids)).delete(synchronize_session=False)
    db.query(models.Tool).filter(models.Tool.tenant_id == tenant_id).delete(synchronize_session=False)

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
            name="Rafverktakar Suðurnesja ehf.",
            is_active=True,
            base_hourly_rate=4500.0,
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        db.commit()
        _sync_tenant_id_sequence(db)
    else:
        tenant.name = "Rafverktakar Suðurnesja ehf."
        tenant.is_active = True
        tenant.base_hourly_rate = 4500.0
        tenant.updated_at = now
        db.add(tenant)
        db.commit()
    db.refresh(tenant)
    return tenant


def seed_demo_tenant(reset_existing: bool = True):
    db = SessionLocal()
    try:
        tenant = _ensure_tenant(db)
        if reset_existing:
            _delete_existing_tenant_data(db, tenant.id)

        pwd_hash = get_password_hash(DEFAULT_PASSWORD)
        now = _utc_now()

        # 1. Create 12 Personnel Users
        users_meta = [
            {"email": "gunnar@rafsud.is", "full_name": "Gunnar Jónsson", "role": "admin", "emp_id": "EMP-001", "hourly": 6800},
            {"email": "helga@rafsud.is", "full_name": "Helga Magnúsdóttir", "role": "accountant", "emp_id": "EMP-002", "hourly": 4800},
            {"email": "stefan@rafsud.is", "full_name": "Stefán Kárason", "role": "project manager", "emp_id": "EMP-003", "hourly": 5900},
            {"email": "david@rafsud.is", "full_name": "Davíð Ólafsson", "role": "team_lead", "emp_id": "EMP-004", "hourly": 5200},
            {"email": "kristin@rafsud.is", "full_name": "Kristín Þorsteinsdóttir", "role": "team_lead", "emp_id": "EMP-005", "hourly": 5200},
            {"email": "aron@rafsud.is", "full_name": "Aron Einarsson", "role": "electrician", "emp_id": "EMP-006", "hourly": 4500},
            {"email": "bjarki@rafsud.is", "full_name": "Bjarki Hallgrímsson", "role": "electrician", "emp_id": "EMP-007", "hourly": 4500},
            {"email": "katrin@rafsud.is", "full_name": "Katrín Guðmundsdóttir", "role": "electrician", "emp_id": "EMP-008", "hourly": 4400},
            {"email": "tomas@rafsud.is", "full_name": "Tómas Helgason", "role": "electrician", "emp_id": "EMP-009", "hourly": 4300},
            {"email": "sigurdur@rafsud.is", "full_name": "Sigurður Vignisson", "role": "electrician", "emp_id": "EMP-010", "hourly": 4300},
            {"email": "viktor@rafsud.is", "full_name": "Viktor Pétursson", "role": "electrician", "emp_id": "EMP-011", "hourly": 3200},
            {"email": "elisabet@rafsud.is", "full_name": "Elísabet Sveinsdóttir", "role": "electrician", "emp_id": "EMP-012", "hourly": 3200},
        ]

        users_dict = {}
        for idx, u in enumerate(users_meta):
            user = models.User(
                email=u["email"],
                hashed_password=pwd_hash,
                full_name=u["full_name"],
                role=u["role"],
                tenant_id=tenant.id,
                is_active=True,
                is_superuser=False, # Root superuser is strictly reserved for tenant_id=1
                employee_id=u["emp_id"],
                hourly_rate=u["hourly"],
                kennitala=f"15048{10 + idx}-3190",
                phone_number=f"+354 834{1000 + idx}",
                location="Reykjanesbær / Suðurnes",
                created_at=now - timedelta(days=120)
            )
            db.add(user)
            db.flush()
            users_dict[u["email"]] = user

        # 2. Create 5 Clients / Customers
        customers_data = [
            {"name": "Isavia KEF Terminal Extension", "kt": "551208-0500", "email": "innkaup@isavia.is", "phone": "+354 425 6000", "address": "Keflavíkurflugvöllur"},
            {"name": "Bláa Lónið / Retreat Spa", "kt": "520299-2329", "email": "framkvaemdir@blalalagoon.is", "phone": "+354 420 8800", "address": "Norðurljósavegur 9, Grindavík"},
            {"name": "Landsvirkjun Svæðisskrifstofa", "kt": "421169-0229", "email": "rafmagn@landsvirkjun.is", "phone": "+354 515 9000", "address": "Ljósafossstöð"},
            {"name": "Reykjanesbær Fasteignir", "kt": "490394-2279", "email": "eignir@reykjanesbaer.is", "phone": "+354 421 6700", "address": "Tjarnargata 12, Keflavík"},
            {"name": "Íslandshótel KEF", "kt": "590102-3640", "email": "hotelkef@islandshotel.is", "phone": "+354 421 5200", "address": "Vatnsnesvegur 12"},
        ]

        cust_dict = {}
        for c in customers_data:
            cust = models.Customer(
                tenant_id=tenant.id,
                name=c["name"],
                kennitala=c["kt"],
                email=c["email"],
                phone_number=c["phone"],
                address=c["address"],
                created_at=now - timedelta(days=110)
            )
            db.add(cust)
            db.flush()
            cust_dict[c["name"]] = cust

        # 3. Create 4 Projects with Varied Budgets & Statuses
        admin_user = users_dict["gunnar@rafsud.is"]
        projects_data = [
            {
                "name": "Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla",
                "customer": cust_dict["Isavia KEF Terminal Extension"],
                "status": "In Progress",
                "budget": 48500000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Keflavíkurflugvöllur Terminal 3",
                "start": date.today() - timedelta(days=90),
                "end": date.today() + timedelta(days=120)
            },
            {
                "name": "Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring",
                "customer": cust_dict["Bláa Lónið / Retreat Spa"],
                "status": "In Progress",
                "budget": 18200000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Grindavík Retreat Spa",
                "start": date.today() - timedelta(days=60),
                "end": date.today() + timedelta(days=45)
            },
            {
                "name": "Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar",
                "customer": cust_dict["Landsvirkjun Svæðisskrifstofa"],
                "status": "Commissioned",
                "budget": 12800000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Ljósafossstöð",
                "start": date.today() - timedelta(days=100),
                "end": date.today() - timedelta(days=10)
            },
            {
                "name": "Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald",
                "customer": cust_dict["Reykjanesbær Fasteignir"],
                "status": "In Progress",
                "budget": 6500000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Tjarnargata 12, Keflavík",
                "start": date.today() - timedelta(days=40),
                "end": date.today() + timedelta(days=30)
            }
        ]

        proj_dict = {}
        for p in projects_data:
            proj = models.Project(
                tenant_id=tenant.id,
                creator_id=admin_user.id,
                project_manager_id=p["pm"].id,
                name=p["name"],
                status=p["status"],
                budget=p["budget"],
                address=p["location"],
                start_date=p["start"],
                end_date=p["end"],
                created_at=now - timedelta(days=100)
            )
            db.add(proj)
            db.flush()
            proj_dict[p["name"]] = proj

            # Project Assignments
            assigned_users = [users_dict["aron@rafsud.is"], users_dict["bjarki@rafsud.is"], users_dict["tomas@rafsud.is"]]
            if "Bláa Lónið" in p["name"]:
                assigned_users = [users_dict["sigurdur@rafsud.is"], users_dict["kristin@rafsud.is"], users_dict["elisabet@rafsud.is"]]
            elif "Landsvirkjun" in p["name"]:
                assigned_users = [users_dict["david@rafsud.is"], users_dict["katrin@rafsud.is"]]

            for uobj in assigned_users:
                pa = models.ProjectAssignment(
                    project_id=proj.id,
                    user_id=uobj.id,
                    start_date=p["start"],
                    end_date=p["end"]
                )
                db.add(pa)

        # 4. Create Financial Transactions (Money In & Out Expenses)
        expenses_data = [
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "flow": "in", "amt": 18500000.0, "cat": "project", "desc": "Isavia T3 Áfangaafhending 1", "ref": "INV-2026-081"},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "flow": "out", "amt": 4200000.0, "cat": "project", "desc": "Reykjafell: Stofnkaplar & Aðaltafla 3200A", "ref": "RF-99412"},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "flow": "in", "amt": 8200000.0, "cat": "project", "desc": "Bláa Lónið Spa - Fyrirframgreiðsla", "ref": "INV-2026-092"},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "flow": "out", "amt": 1850000.0, "cat": "project", "desc": "Rönning: Gólfhita- og hitastýringabúnaður", "ref": "RN-44120"},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "flow": "in", "amt": 12800000.0, "cat": "project", "desc": "Landsvirkjun Lokagreiðsla Verkefnis", "ref": "INV-2026-060"},
            {"proj": None, "flow": "out", "amt": 650000.0, "cat": "car", "desc": "Bílaviðgerð & Þjónusta Renault Master KE-012", "ref": "KE-012"},
            {"proj": None, "flow": "out", "amt": 420000.0, "cat": "tool", "desc": "Fluke Mælatæki Kalibrering & Skoðun", "ref": "FLK-99214"},
            {"proj": None, "flow": "out", "amt": 380000.0, "cat": "clothing", "desc": "Nýr Vinnufatnaður & Öryggisskór fyrirtækis", "ref": "Barki-2026"},
        ]

        for edata in expenses_data:
            exp = models.Expense(
                tenant_id=tenant.id,
                project_id=edata["proj"].id if edata["proj"] else None,
                date=date.today() - timedelta(days=random.randint(10, 75)),
                amount=edata["amt"],
                flow_type=edata["flow"],
                category=edata["cat"],
                description=edata["desc"],
                reference=edata["ref"]
            )
            db.add(exp)

        # 5. Create Realistic Tasks per Project
        tasks_data = [
            # Isavia Tasks
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Uppsetning á Aðaltaflu 3200A", "status": "Done", "assignee": users_dict["aron@rafsud.is"], "hours": 120},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Kapalleiðir & Tröppulagnir í Sal 2", "status": "In Progress", "assignee": users_dict["bjarki@rafsud.is"], "hours": 180},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Lýsing & DALI Snjallstýring", "status": "In Progress", "assignee": users_dict["tomas@rafsud.is"], "hours": 110},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Brunaútkallskerfi & Neyðarlýsing", "status": "Not Started", "assignee": users_dict["viktor@rafsud.is"], "hours": 70},

            # Bláa Lónið Tasks
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Gólfhiti & Hitastýringar í Spa 1", "status": "Done", "assignee": users_dict["sigurdur@rafsud.is"], "hours": 90},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Útilýsing & LED Borðar við Lónið", "status": "In Progress", "assignee": users_dict["kristin@rafsud.is"], "hours": 85},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Varastöð & Rafstýrðir Lokar", "status": "Not Started", "assignee": users_dict["elisabet@rafsud.is"], "hours": 35},

            # Landsvirkjun Tasks
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "name": "Róra- og Kapallagnir í Spennisal", "status": "Done", "assignee": users_dict["david@rafsud.is"], "hours": 95},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "name": "Mælatöflur & Hátæknimælar", "status": "Done", "assignee": users_dict["katrin@rafsud.is"], "hours": 85},

            # Reykjanesbær Tasks
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"], "name": "Skipta um Töfluvör & Lekaliða", "status": "Done", "assignee": users_dict["katrin@rafsud.is"], "hours": 40},
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"], "name": "Prófun Neyðarlýsingar", "status": "In Progress", "assignee": users_dict["viktor@rafsud.is"], "hours": 25},
        ]

        for tdata in tasks_data:
            tsk = models.Task(
                project_id=tdata["proj"].id,
                assignee_id=tdata["assignee"].id,
                title=tdata["name"],
                status=tdata["status"],
                start_date=date.today() - timedelta(days=60),
                due_date=date.today() + timedelta(days=30),
                created_at=now - timedelta(days=60)
            )
            db.add(tsk)

        db.flush()

        # 6. Generate Realistic Time Logs Spanning Past 90 Days (March - July 2026)
        print("Generating realistic 90-day time logs across personnel...")
        work_days = [date.today() - timedelta(days=i) for i in range(1, 90) if (date.today() - timedelta(days=i)).weekday() < 5]

        def add_tlog(user_obj, proj_obj, log_date, hours, desc):
            start_dt = datetime.combine(log_date, datetime.min.time()).replace(hour=8, tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(hours=hours)
            db.add(models.TimeLog(
                user_id=user_obj.id,
                project_id=proj_obj.id,
                start_time=start_dt,
                end_time=end_dt,
                duration=timedelta(hours=hours),
                actual_hours=hours,
                notes=desc,
                base_hourly_wage_paid=user_obj.hourly_rate or 4500.0
            ))

        for d in work_days:
            # Aron - Isavia Heavy (8.0h - 10.0h)
            if random.random() > 0.1:
                add_tlog(users_dict["aron@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], d, random.choice([7.5, 8.0, 8.5, 9.5]), "Draga stofnkapla og tengja aðaltaflu 3200A")

            # Bjarki - Isavia (7.5h - 8.5h)
            if random.random() > 0.15:
                add_tlog(users_dict["bjarki@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], d, random.choice([7.5, 8.0, 8.5]), "Setja upp kapalleiðir og tröppur í sal 2")

            # Tómas - Isavia & Reykjanesbær
            if random.random() > 0.2:
                add_tlog(users_dict["tomas@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], d, random.choice([7.5, 8.0]), "Tengja DALI snjallstýringar og ljósakúpla")

            # Sigurður - Bláa Lónið (7.5h - 8.5h)
            if random.random() > 0.15:
                add_tlog(users_dict["sigurdur@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], d, random.choice([7.5, 8.0, 9.0]), "Frágangur á gólfhita og skynjurum í Spa")

            # Kristín (Team Lead) - Bláa Lónið (7.5h)
            if random.random() > 0.2:
                add_tlog(users_dict["kristin@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], d, 7.5, "Yfirferð á útilýsingu og tengingu við varastöð")

            # Davíð (Team Lead) - Landsvirkjun (8.0h)
            if random.random() > 0.25:
                add_tlog(users_dict["david@rafsud.is"], proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], d, 8.0, "Kapallagnir í spennisal og prófanir á mælabúnaði")

            # Katrín - Reykjanesbær & Landsvirkjun
            if random.random() > 0.2:
                p_obj = proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"] if d.day % 2 == 0 else proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"]
                add_tlog(users_dict["katrin@rafsud.is"], p_obj, d, random.choice([6.0, 7.5]), "Skipta um töfluvör og mæla lekaliða")

        db.flush()

        # 7. Generate 16 Monthly Payslips (March - June 2026)
        print("Generating monthly payslips for staff...")
        months = [
            {"year": 2026, "month": 3, "period": "Mars 2026"},
            {"year": 2026, "month": 4, "period": "Apríl 2026"},
            {"year": 2026, "month": 5, "period": "Maí 2026"},
            {"year": 2026, "month": 6, "period": "Júní 2026"},
        ]

        elec_users = [
            users_dict["aron@rafsud.is"],
            users_dict["bjarki@rafsud.is"],
            users_dict["katrin@rafsud.is"],
            users_dict["sigurdur@rafsud.is"]
        ]

        for m in months:
            for u in elec_users:
                base_hrs = 160.0
                overtime_hrs = random.choice([12.0, 18.5, 24.0, 30.0])
                base_pay = base_hrs * u.hourly_rate
                overtime_pay = overtime_hrs * (u.hourly_rate * 1.8)
                gross = base_pay + overtime_pay
                pension = gross * 0.04 # 4% Lífeyrissjóður
                union = gross * 0.01  # 1% RAFÍS
                tax = gross * 0.3148   # Skattur
                net = gross - pension - union - tax

                ps = models.Payslip(
                    tenant_id=tenant.id,
                    user_id=u.id,
                    issue_date=date(m["year"], m["month"], 28),
                    amount_brutto=gross,
                    amount_netto=net,
                    file_path=f"/payslips/{m['year']}_{m['month']}_{u.employee_id}.pdf",
                    filename=f"Launasedill_{m['period'].replace(' ', '_')}.pdf"
                )
                db.add(ps)

        db.flush()

        # 8. Create Real Leave Requests
        print("Adding employee leave & vacation records...")
        leaves = [
            {"user": users_dict["aron@rafsud.is"], "type": "Vacation", "start": date(2026, 6, 8), "end": date(2026, 6, 19), "status": models.LeaveStatus.Approved, "desc": "Sumarorlof 2026"},
            {"user": users_dict["katrin@rafsud.is"], "type": "Sick Leave", "start": date(2026, 4, 14), "end": date(2026, 4, 15), "status": models.LeaveStatus.Approved, "desc": "Veikindi barns"},
            {"user": users_dict["bjarki@rafsud.is"], "type": "Sick Leave", "start": date(2026, 5, 20), "end": date(2026, 5, 22), "status": models.LeaveStatus.Approved, "desc": "Eigin veikindi"},
            {"user": users_dict["tomas@rafsud.is"], "type": "Parental Leave", "start": date(2026, 3, 10), "end": date(2026, 3, 15), "status": models.LeaveStatus.Approved, "desc": "Fæðingarorlof"},
        ]

        for l in leaves:
            lr = models.LeaveRequest(
                tenant_id=tenant.id,
                user_id=l["user"].id,
                leave_type=l["type"],
                start_date=l["start"],
                end_date=l["end"],
                status=l["status"],
                reason=l["desc"]
            )
            db.add(lr)

        db.flush()

        # 9. Create Commercial Fleet Cars & Equipment Tools
        print("Adding commercial vehicle fleet & hardware tools...")
        cars_data = [
            {"make": "Renault", "model": "Master 2023", "plate": "KE-012", "driver": users_dict["aron@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Volkswagen", "model": "Transporter 2022", "plate": "KE-849", "driver": users_dict["kristin@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Mercedes-Benz", "model": "Vito 2024", "plate": "KE-901", "driver": users_dict["david@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Ford", "model": "Transit Custom 2021", "plate": "KE-450", "driver": None, "status": models.CarStatus.Available},
        ]

        for cdata in cars_data:
            car = models.Car(
                tenant_id=tenant.id,
                make=cdata["make"],
                model=cdata["model"],
                license_plate=cdata["plate"],
                current_user_id=cdata["driver"].id if cdata["driver"] else None,
                status=cdata["status"]
            )
            db.add(car)

        tools_data = [
            {"name": "Fluke 1664 FC Multifunction Installation Tester", "sn": "FLK-99214", "holder": users_dict["aron@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Hilti TE 60-ATC Heavy Duty Rotary Hammer", "sn": "HLT-44012", "holder": users_dict["bjarki@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Milwaukee Force Logic Hydraulic Cable Crimper", "sn": "MLW-11094", "holder": users_dict["sigurdur@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Megger MIT420 Insulation & Continuity Tester", "sn": "MGG-77123", "holder": users_dict["kristin@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Bosch GLL 3-80 Professional 3D Line Laser", "sn": "BSH-33910", "holder": None, "status": models.ToolStatus.Available},
            {"name": "Fluke 87V Industrial Multimeter", "sn": "FLK-11200", "holder": None, "status": models.ToolStatus.In_Repair},
        ]

        for tdata in tools_data:
            tl = models.Tool(
                tenant_id=tenant.id,
                name=tdata["name"],
                serial_number=tdata["sn"],
                current_user_id=tdata["holder"].id if tdata["holder"] else None,
                status=tdata["status"]
            )
            db.add(tl)

        db.flush()

        # 10. Create Real Chat Threads & Direct Messages
        print("Seeding active team chat conversations...")
        dm_thread = models.ChatThread(
            tenant_id=tenant.id,
            is_group=False,
            created_at=now - timedelta(days=10)
        )
        db.add(dm_thread)
        db.flush()

        db.add(models.ThreadParticipant(thread_id=dm_thread.id, user_id=users_dict["stefan@rafsud.is"].id))
        db.add(models.ThreadParticipant(thread_id=dm_thread.id, user_id=users_dict["david@rafsud.is"].id))

        db.add(models.ChatMessage(
            thread_id=dm_thread.id,
            author_id=users_dict["stefan@rafsud.is"].id,
            content="Sæll Davíð, hvernig gengur með kapalleiðirnar í Isavia verkefninu?",
            created_at=now - timedelta(days=2)
        ))
        db.add(models.ChatMessage(
            thread_id=dm_thread.id,
            author_id=users_dict["david@rafsud.is"].id,
            content="Blessaður Stefán! Þetta er allt á rælu, við kláruðum tröppurnar í Sal 2 í gær.",
            created_at=now - timedelta(days=2, hours=-1)
        ))

        # Group Channel for Isavia Terminal 3
        group_thread = models.ChatThread(
            tenant_id=tenant.id,
            name="Isavia T3 - Vinnuhópur",
            is_group=True,
            project_id=proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"].id,
            created_at=now - timedelta(days=20)
        )
        db.add(group_thread)
        db.flush()

        for u_obj in [users_dict["stefan@rafsud.is"], users_dict["aron@rafsud.is"], users_dict["bjarki@rafsud.is"], users_dict["tomas@rafsud.is"]]:
            db.add(models.ThreadParticipant(thread_id=group_thread.id, user_id=u_obj.id))

        db.add(models.ChatMessage(
            thread_id=group_thread.id,
            author_id=users_dict["aron@rafsud.is"].id,
            content="Aðaltaflan er komin á sinn stað og spennistöðin tilbúin fyrir úttekt frá HMS.",
            created_at=now - timedelta(days=1)
        ))

        db.commit()
        print("\n=======================================================")
        print(f"[OK] Demo tenant seeded successfully!")
        print(f"Company: Rafverktakar Sudurnesja ehf. (Tenant ID: {tenant.id})")
        print(f"Default Password for all staff: {DEFAULT_PASSWORD}")
        print("-------------------------------------------------------")
        print("Created Data Overview:")
        print(" - 12 Staff Members (Admin, PM, Accountant, Electricians, Apprentices)")
        print(" - 5 Commercial Clients (Isavia, Landsvirkjun, Blaa Lonid, etc.)")
        print(" - 4 Projects with Varied Budgets & Diverse Hours")
        print(" - 8 Financial Transactions (Invoices & Material Expenses)")
        print(" - 90 Days of Daily Timelogs (~900 entries)")
        print(" - 16 Monthly Payslips (March - June 2026)")
        print(" - 4 Staff Leave & Vacation Records")
        print(" - 4 Commercial Vans & 6 Hardware Tools with Logs")
        print(" - Active Team & Direct Chat Conversations")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error seeding demo tenant: {e}")
        raise e
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed demo tenant with realistic company data.")
    parser.add_argument("--no-reset", action="store_true", help="Do not delete existing demo tenant data.")
    args = parser.parse_args()
    seed_demo_tenant(reset_existing=not args.no_reset)


if __name__ == "__main__":
    main()
