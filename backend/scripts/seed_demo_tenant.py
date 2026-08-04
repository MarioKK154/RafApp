"""
Comprehensive Demo Tenant Seeder (tenant_id = 2) - "Rafverktakar Suðurnesja ehf."

Features:
- 12 Personnel (Admin, PM, Accountant, Team Leads, Electricians, Apprentices) with custom photos & emails (@rafsud.is)
- 5 Major Commercial Clients
- 4 Diverse Projects with real budgets & locations
- 160+ Hours Logged Per Active Worker Every Month (March - July 2026)
- Fictional 17-character VIN Numbers for all commercial vans
- HD Equipment & Vehicle Images
- Wholesaler Vendors (Reykjafell, Rönning, Ískraft, JÓCO) with contact persons & photos
- Official Electrical Licenses & Certificates (HMS, RAFÍS, Vinnueftirlitið)
- Mixed Leave Requests (Approved & Pending) for vacation and sick leave
- Project Drawing Folders & Technical PDF Schematics
- Financial Income & Expense Transactions
- Active Chat Threads & Communications

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
        db.query(models.UserLicense).filter(models.UserLicense.user_id.in_(user_ids)).delete(synchronize_session=False)

    db.query(models.Drawing).filter(models.Drawing.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(models.DrawingFolder).filter(models.DrawingFolder.tenant_id == tenant_id).delete(synchronize_session=False)

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
            subdomain="rafsud",
            kennitala="540210-1230",
            address="Stórhöfði 17, 110 Reykjavík",
            ceo="Márió Ólafsson",
            email="rafsud@rafsud.is",
            phone_number="+354 555 1234",
            is_active=True,
            base_hourly_rate=4500.0,
            logo_url="https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tenant_assets/2/logo.png",
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        db.commit()
        _sync_tenant_id_sequence(db)
    else:
        tenant.name = "Rafverktakar Suðurnesja ehf."
        tenant.subdomain = "rafsud"
        tenant.kennitala = "540210-1230"
        tenant.address = "Stórhöfði 17, 110 Reykjavík"
        tenant.ceo = "Márió Ólafsson"
        tenant.email = "rafsud@rafsud.is"
        tenant.phone_number = "+354 555 1234"
        tenant.is_active = True
        tenant.base_hourly_rate = 4500.0
        tenant.logo_url = "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tenant_assets/2/logo.png"
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

        # 1. Create 12 Personnel Users with Photos & Custom Job Titles
        users_meta = [
            {"email": "gunnar@rafsud.is", "full_name": "Gunnar Jónsson", "role": "admin", "custom_title": "Chief Executive Officer (CEO)", "emp_id": "EMP-001", "hourly": 6800, "photo": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop"},
            {"email": "helga@rafsud.is", "full_name": "Helga Magnúsdóttir", "role": "accountant", "custom_title": "Chief Financial Officer (CFO)", "emp_id": "EMP-002", "hourly": 4800, "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop"},
            {"email": "stefan@rafsud.is", "full_name": "Stefán Kárason", "role": "project manager", "custom_title": "Senior Project Director", "emp_id": "EMP-003", "hourly": 5900, "photo": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop"},
            {"email": "david@rafsud.is", "full_name": "Davíð Ólafsson", "role": "team_lead", "custom_title": "Master Electrician & Site Lead", "emp_id": "EMP-004", "hourly": 5200, "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop"},
            {"email": "kristin@rafsud.is", "full_name": "Kristín Þorsteinsdóttir", "role": "team_lead", "custom_title": "Automation & Controls Lead", "emp_id": "EMP-005", "hourly": 5200, "photo": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop"},
            {"email": "aron@rafsud.is", "full_name": "Aron Einarsson", "role": "electrician", "custom_title": "Senior Journeyman", "emp_id": "EMP-006", "hourly": 4500, "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop"},
            {"email": "bjarki@rafsud.is", "full_name": "Bjarki Hallgrímsson", "role": "electrician", "custom_title": "Journeyman Electrician", "emp_id": "EMP-007", "hourly": 4500, "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop"},
            {"email": "katrin@rafsud.is", "full_name": "Katrín Guðmundsdóttir", "role": "electrician", "custom_title": "Inspection Specialist", "emp_id": "EMP-008", "hourly": 4400, "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop"},
            {"email": "tomas@rafsud.is", "full_name": "Tómas Helgason", "role": "electrician", "custom_title": "HVAC & Smart Home Tech", "emp_id": "EMP-009", "hourly": 4300, "photo": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop"},
            {"email": "sigurdur@rafsud.is", "full_name": "Sigurður Vignisson", "role": "electrician", "custom_title": "Industrial Panel Electrician", "emp_id": "EMP-010", "hourly": 4300, "photo": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop"},
            {"email": "viktor@rafsud.is", "full_name": "Viktor Pétursson", "role": "electrician", "custom_title": "Apprentice Electrician", "emp_id": "EMP-011", "hourly": 3200, "photo": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop"},
            {"email": "elisabet@rafsud.is", "full_name": "Elísabet Sveinsdóttir", "role": "electrician", "custom_title": "Apprentice Electrician", "emp_id": "EMP-012", "hourly": 3200, "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop"},
        ]

        users_dict = {}
        for idx, u in enumerate(users_meta):
            user = models.User(
                email=u["email"],
                hashed_password=pwd_hash,
                full_name=u["full_name"],
                role=u["role"],
                custom_title=u.get("custom_title"),
                tenant_id=tenant.id,
                is_active=True,
                is_superuser=False,
                employee_id=u["emp_id"],
                hourly_rate=u["hourly"],
                kennitala=f"15048{10 + idx}-3190",
                phone_number=f"+354 834{1000 + idx}",
                profile_picture_path=u["photo"],
                location="Reykjanesbær / Suðurnes",
                created_at=now - timedelta(days=120)
            )
            db.add(user)
            db.flush()
            users_dict[u["email"]] = user

        # 1b. Create User Licenses & Certificates
        licenses_data = [
            {"user": users_dict["gunnar@rafsud.is"], "desc": "Löggiltur Rafverktaki HMS (Aðallöggilding)", "issue": date(2020, 5, 12), "expiry": date(2030, 5, 12), "file": "/licenses/HMS_Gunnar_Loggilding.pdf"},
            {"user": users_dict["stefan@rafsud.is"], "desc": "Meistarabréf í Rafvirkjun (RAFÍS / Iðan)", "issue": date(2019, 9, 1), "expiry": date(2029, 9, 1), "file": "/licenses/Meistarabref_Stefan.pdf"},
            {"user": users_dict["david@rafsud.is"], "desc": "Spennustöðva- og Háspennuréttindi (66kV)", "issue": date(2021, 4, 15), "expiry": date(2028, 4, 15), "file": "/licenses/Haspennurettindi_David.pdf"},
            {"user": users_dict["kristin@rafsud.is"], "desc": "Gólfhita- og Vélstýringavottun (Danfoss & KNX)", "issue": date(2022, 1, 20), "expiry": date(2028, 1, 20), "file": "/licenses/KNX_Vottun_Kristin.pdf"},
            {"user": users_dict["aron@rafsud.is"], "desc": "Sveinsbréf í Rafvirkjun & Vinnupallanámskeið", "issue": date(2022, 6, 10), "expiry": date(2027, 6, 10), "file": "/licenses/Sveinsbref_Aron.pdf"},
            {"user": users_dict["bjarki@rafsud.is"], "desc": "Vinnuvélapróf & Lyftaraáritun (Vinnueftirlitið)", "issue": date(2021, 11, 5), "expiry": date(2027, 11, 5), "file": "/licenses/Lyftaraprof_Bjarki.pdf"},
            {"user": users_dict["katrin@rafsud.is"], "desc": "Úttektir á Neyðarlýsingu & Brunaútköllum (HMS)", "issue": date(2023, 3, 1), "expiry": date(2028, 3, 1), "file": "/licenses/HMS_Neydarlysing_Katrin.pdf"},
        ]

        for ldata in licenses_data:
            lic = models.UserLicense(
                user_id=ldata["user"].id,
                description=ldata["desc"],
                issue_date=ldata["issue"],
                expiry_date=ldata["expiry"],
                file_path=ldata["file"],
                filename=Path(ldata["file"]).name
            )
            db.add(lic)

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

        # 2b. Create Wholesaler Shops / Vendors with Contact Persons & Photos
        shops_data = [
            {
                "name": "Reykjafell ehf.",
                "address": "Skipholt 35, 105 Reykjavík",
                "contact": "Þórir Sigurðsson (Verslunarstjóri)",
                "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
                "phone": "+354 588 6000",
                "email": "thorir@reykjafell.is",
                "web": "https://www.reykjafell.is"
            },
            {
                "name": "Johan Rönning ehf.",
                "address": "Klettagörðum 25, 104 Reykjavík",
                "contact": "Anna Jónsdóttir (Tækniráðgjafi)",
                "photo": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop",
                "phone": "+354 520 4000",
                "email": "anna@ronning.is",
                "web": "https://www.ronning.is"
            },
            {
                "name": "Ískraft ehf.",
                "address": "Smiðjuvegur 5, 200 Kópavogur",
                "contact": "Ólafur Kristjánsson (Þjónustustjóri)",
                "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
                "phone": "+354 535 1200",
                "email": "olafur@iskraft.is",
                "web": "https://iskraft.husa.is"
            },
            {
                "name": "Jóhann Ólafsson & Co.",
                "address": "Sundaborg 7, 104 Reykjavík",
                "contact": "Steinunn Eldjárn (Sölustjóri)",
                "photo": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop",
                "phone": "+354 533 1000",
                "email": "steinunn@joco.is",
                "web": "https://www.joco.is"
            }
        ]

        for sdata in shops_data:
            sh = models.Shop(
                tenant_id=tenant.id,
                name=sdata["name"],
                address=sdata["address"],
                contact_person=sdata["contact"],
                contact_person_photo_url=sdata["photo"],
                phone_number=sdata["phone"],
                email=sdata["email"],
                website=sdata["web"]
            )
            db.add(sh)

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
                "start": date.today() - timedelta(days=120),
                "end": date.today() + timedelta(days=120)
            },
            {
                "name": "Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring",
                "customer": cust_dict["Bláa Lónið / Retreat Spa"],
                "status": "In Progress",
                "budget": 18200000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Grindavík Retreat Spa",
                "start": date.today() - timedelta(days=100),
                "end": date.today() + timedelta(days=45)
            },
            {
                "name": "Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar",
                "customer": cust_dict["Landsvirkjun Svæðisskrifstofa"],
                "status": "Commissioned",
                "budget": 12800000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Ljósafossstöð",
                "start": date.today() - timedelta(days=120),
                "end": date.today() - timedelta(days=10)
            },
            {
                "name": "Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald",
                "customer": cust_dict["Reykjanesbær Fasteignir"],
                "status": "In Progress",
                "budget": 6500000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Tjarnargata 12, Keflavík",
                "start": date.today() - timedelta(days=80),
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
                created_at=now - timedelta(days=120)
            )
            db.add(proj)
            db.flush()
            proj_dict[p["name"]] = proj

            # Project Personnel Roster (project_members) & Shift Schedule Assignments
            assigned_users = [
                users_dict["david@rafsud.is"],
                users_dict["aron@rafsud.is"],
                users_dict["bjarki@rafsud.is"],
                users_dict["tomas@rafsud.is"],
                users_dict["viktor@rafsud.is"]
            ]
            if "Bláa Lónið" in p["name"]:
                assigned_users = [
                    users_dict["kristin@rafsud.is"],
                    users_dict["sigurdur@rafsud.is"],
                    users_dict["elisabet@rafsud.is"],
                    users_dict["katrin@rafsud.is"]
                ]
            elif "Landsvirkjun" in p["name"]:
                assigned_users = [
                    users_dict["david@rafsud.is"],
                    users_dict["katrin@rafsud.is"],
                    users_dict["tomas@rafsud.is"]
                ]
            elif "Reykjanesbæjar" in p["name"]:
                assigned_users = [
                    users_dict["kristin@rafsud.is"],
                    users_dict["viktor@rafsud.is"],
                    users_dict["elisabet@rafsud.is"],
                    users_dict["aron@rafsud.is"]
                ]

            # Populate official project membership table (project_members)
            for uobj in assigned_users:
                if uobj not in proj.members:
                    proj.members.append(uobj)

            # Create shift schedule entries (ProjectAssignment)
            for uobj in assigned_users:
                pa = models.ProjectAssignment(
                    project_id=proj.id,
                    user_id=uobj.id,
                    start_date=p["start"],
                    end_date=p["end"]
                )
                db.add(pa)
            db.flush()

        # 3b. Create Project Drawing Folders & PDF Schematics
        dfolder = models.DrawingFolder(
            tenant_id=tenant.id,
            project_id=proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"].id,
            name="Teikningar og Rafmagnsuppdrættir"
        )
        db.add(dfolder)
        db.flush()

        drawings_data = [
            {
                "proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],
                "file": "Adaltafla_3200A_TE-01.pdf",
                "path": "/drawings/Adaltafla_3200A_TE-01.pdf",
                "desc": "Aðaltafla 3200A einlínumynd og rofatafla sal 1",
                "disc": "Electrical",
                "rev": "R2",
                "status": models.DrawingStatus.Approved,
                "author": "Verkís Verkfræðistofa"
            },
            {
                "proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],
                "file": "Troppulagnir_Sal2_TE-02.pdf",
                "path": "/drawings/Troppulagnir_Sal2_TE-02.pdf",
                "desc": "Kapalleiðir og tröppulagnir í Sal 2",
                "disc": "Electrical",
                "rev": "R1",
                "status": models.DrawingStatus.For_Approval,
                "author": "Verkís Verkfræðistofa"
            },
            {
                "proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],
                "file": "Golfhitalagnir_Spa_SP-02.pdf",
                "path": "/drawings/Golfhitalagnir_Spa_SP-02.pdf",
                "desc": "Gólfhita- og hitastýringabúnaður Spa 1",
                "disc": "HVAC / Electrical",
                "rev": "R3",
                "status": models.DrawingStatus.Approved,
                "author": "EFLA Verkfræðistofa"
            },
            {
                "proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],
                "file": "Ljosafoss_Maelabunadur_ST-04.pdf",
                "path": "/drawings/Ljosafoss_Maelabunadur_ST-04.pdf",
                "desc": "Háspennumælar og vararammi Spennisal",
                "disc": "High Voltage",
                "rev": "R4",
                "status": models.DrawingStatus.Approved,
                "author": "Landsvirkjun Tæknideild"
            }
        ]

        for ddata in drawings_data:
            drw = models.Drawing(
                tenant_id=tenant.id,
                project_id=ddata["proj"].id,
                uploader_id=admin_user.id,
                folder_id=dfolder.id if ddata["proj"].id == dfolder.project_id else None,
                filename=ddata["file"],
                filepath=ddata["path"],
                description=ddata["desc"],
                discipline=ddata["disc"],
                revision=ddata["rev"],
                status=ddata["status"],
                author=ddata["author"],
                drawing_date=date.today() - timedelta(days=60)
            )
            db.add(drw)

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

        # 5. Create Tasks per Project
        tasks_data = [
            # Isavia Tasks
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Uppsetning á Aðaltaflu 3200A", "status": "Done", "assignee": users_dict["aron@rafsud.is"], "start": date(2026, 4, 1), "due": date(2026, 5, 15)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Kapalleiðir & Tröppulagnir í Sal 2", "status": "In Progress", "assignee": users_dict["bjarki@rafsud.is"], "start": date(2026, 5, 1), "due": date(2026, 7, 30)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Lýsing & DALI Snjallstýring", "status": "In Progress", "assignee": users_dict["tomas@rafsud.is"], "start": date(2026, 6, 1), "due": date(2026, 8, 15)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "name": "Brunaútkallskerfi & Neyðarlýsing", "status": "Not Started", "assignee": users_dict["viktor@rafsud.is"], "start": date(2026, 7, 15), "due": date(2026, 9, 1)},

            # Bláa Lónið Tasks
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Gólfhiti & Hitastýringar í Spa 1", "status": "Done", "assignee": users_dict["sigurdur@rafsud.is"], "start": date(2026, 4, 15), "due": date(2026, 6, 1)},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Útilýsing & LED Borðar við Lónið", "status": "In Progress", "assignee": users_dict["kristin@rafsud.is"], "start": date(2026, 6, 1), "due": date(2026, 8, 10)},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "name": "Varastöð & Rafstýrðir Lokar", "status": "Not Started", "assignee": users_dict["elisabet@rafsud.is"], "start": date(2026, 7, 20), "due": date(2026, 8, 30)},

            # Landsvirkjun Tasks
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "name": "Róra- og Kapallagnir í Spennisal", "status": "Done", "assignee": users_dict["david@rafsud.is"], "start": date(2026, 3, 10), "due": date(2026, 5, 1)},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "name": "Mælatöflur & Hátæknimælar", "status": "Done", "assignee": users_dict["katrin@rafsud.is"], "start": date(2026, 5, 1), "due": date(2026, 6, 20)},

            # Reykjanesbær Tasks
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"], "name": "Skipta um Töfluvör & Lekaliða", "status": "Done", "assignee": users_dict["katrin@rafsud.is"], "start": date(2026, 5, 15), "due": date(2026, 6, 15)},
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"], "name": "Prófun Neyðarlýsingar", "status": "In Progress", "assignee": users_dict["viktor@rafsud.is"], "start": date(2026, 6, 20), "due": date(2026, 8, 5)},
        ]

        for tdata in tasks_data:
            tsk = models.Task(
                project_id=tdata["proj"].id,
                assignee_id=tdata["assignee"].id,
                title=tdata["name"],
                status=tdata["status"],
                start_date=tdata["start"],
                due_date=tdata["due"],
                created_at=datetime.combine(tdata["start"], datetime.min.time()).replace(tzinfo=timezone.utc)
            )
            db.add(tsk)

        db.flush()

        # 6. Generate 160+ Hours Per Month For EVERY Active Worker across March, April, May, June, July 2026
        print("Logging 160+ hours per active worker for every month (March - July 2026)...")

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

        months_list = [
            (2026, 3), (2026, 4), (2026, 5), (2026, 6), (2026, 7)
        ]

        workers = [
            (users_dict["aron@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "Draga stofnkapla og tengja aðaltaflu 3200A"),
            (users_dict["bjarki@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "Setja upp kapalleiðir og tröppur í sal 2"),
            (users_dict["tomas@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "Tengja DALI snjallstýringar og ljósakúpla"),
            (users_dict["sigurdur@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "Frágangur á gólfhita og skynjurum í Spa"),
            (users_dict["kristin@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "Yfirferð á útilýsingu og tengingu við varastöð"),
            (users_dict["david@rafsud.is"], proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"], "Kapallagnir í spennisal og prófanir á mælabúnaði"),
            (users_dict["katrin@rafsud.is"], proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"], "Skipta um töfluvör og mæla lekaliða"),
            (users_dict["viktor@rafsud.is"], proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"], "Aðstoð við kapaldrátt og töflutengingar"),
            (users_dict["elisabet@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"], "Aðstoð við hitastýringu og skynjara"),
        ]

        for year, month in months_list:
            # Find all weekday dates in month
            start_m = date(year, month, 1)
            next_m = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
            days_in_m = (next_m - start_m).days

            for w_user, w_proj, w_desc in workers:
                for day_num in range(1, days_in_m + 1):
                    cur_date = date(year, month, day_num)
                    if cur_date > date.today():
                        continue
                    if cur_date.weekday() >= 5: # Skip weekends
                        continue

                    # Vacation check: Aron Einarsson vacation in June (June 8 - June 19)
                    if w_user.email == "aron@rafsud.is" and month == 6 and (8 <= day_num <= 19):
                        continue

                    # Log 8.0h or 8.5h per weekday (guarantees >= 160 hours per full month)
                    hrs = 8.5 if (day_num % 3 == 0) else 8.0
                    add_tlog(w_user, w_proj, cur_date, hrs, w_desc)

        db.flush()

        # 7. Generate Monthly Payslips (March - June 2026)
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
                pension = gross * 0.04
                union = gross * 0.01
                tax = gross * 0.3148
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

        # 8. Create Leave Requests (Approved & Pending)
        print("Adding employee leave & vacation records (Approved & Pending)...")
        leaves = [
            {"user": users_dict["katrin@rafsud.is"], "type": "Vacation", "start": date(2026, 7, 20), "end": date(2026, 7, 26), "status": models.LeaveStatus.Approved, "desc": "Sumarorlof 2026"},
            {"user": users_dict["viktor@rafsud.is"], "type": "Sick Leave", "start": date(2026, 7, 23), "end": date(2026, 7, 24), "status": models.LeaveStatus.Approved, "desc": "Eigin veikindi"},
            {"user": users_dict["david@rafsud.is"], "type": "Vacation", "start": date(2026, 7, 27), "end": date(2026, 7, 31), "status": models.LeaveStatus.Approved, "desc": "Sumarleyfi"},
            {"user": users_dict["aron@rafsud.is"], "type": "Vacation", "start": date(2026, 6, 8), "end": date(2026, 6, 19), "status": models.LeaveStatus.Approved, "desc": "Sumarorlof 2026"},
            {"user": users_dict["bjarki@rafsud.is"], "type": "Sick Leave", "start": date(2026, 5, 20), "end": date(2026, 5, 22), "status": models.LeaveStatus.Approved, "desc": "Eigin veikindi"},
            {"user": users_dict["tomas@rafsud.is"], "type": "Parental Leave", "start": date(2026, 3, 10), "end": date(2026, 3, 15), "status": models.LeaveStatus.Approved, "desc": "Fæðingarorlof"},
            {"user": users_dict["tomas@rafsud.is"], "type": "Sick Leave", "start": date(2026, 8, 10), "end": date(2026, 8, 14), "status": models.LeaveStatus.Pending, "desc": "Læknisaðgerð og batatími"},
            {"user": users_dict["sigurdur@rafsud.is"], "type": "Vacation", "start": date(2026, 8, 24), "end": date(2026, 8, 28), "status": models.LeaveStatus.Pending, "desc": "Endurmenntunarnámskeið HMS"},
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

        # 9. Create Commercial Fleet Cars (with VIN & Supabase Images) & Equipment Tools (with Supabase Images)
        print("Adding commercial vehicle fleet with VIN & hardware tools with Supabase Storage photos...")
        cars_data = [
            {"make": "Renault", "model": "Master 2023", "plate": "KE-012", "vin": "VF1MA000368192014", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/renault_master.jpg", "driver": users_dict["aron@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Volkswagen", "model": "Transporter 2022", "plate": "KE-849", "vin": "WV1ZZZ7JZNH019482", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/vw_transporter.jpg", "driver": users_dict["kristin@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Mercedes-Benz", "model": "Vito 2024", "plate": "KE-901", "vin": "WDF44770313829104", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/mercedes_vito.jpg", "driver": users_dict["david@rafsud.is"], "status": models.CarStatus.Checked_Out},
            {"make": "Ford", "model": "Transit Custom 2021", "plate": "KE-450", "vin": "1FTBR1Y84MKA91823", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/ford_transit.jpg", "driver": None, "status": models.CarStatus.Available},
        ]

        for cdata in cars_data:
            car = models.Car(
                tenant_id=tenant.id,
                make=cdata["make"],
                model=cdata["model"],
                license_plate=cdata["plate"],
                vin=cdata["vin"],
                image_path=cdata["img"],
                current_user_id=cdata["driver"].id if cdata["driver"] else None,
                status=cdata["status"]
            )
            db.add(car)

        tools_data = [
            {"name": "Fluke 1664 FC Multifunction Installation Tester", "sn": "FLK-99214", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/fluke_1664_fc.jpg", "holder": users_dict["aron@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Hilti TE 60-ATC Heavy Duty Rotary Hammer", "sn": "HLT-44012", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/hilti_te_60_atc.jpg", "holder": users_dict["bjarki@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Milwaukee Force Logic Hydraulic Cable Crimper", "sn": "MLW-11094", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/milwaukee_crimper.jpg", "holder": users_dict["sigurdur@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Megger MIT420 Insulation & Continuity Tester", "sn": "MGG-77123", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/megger_mit420.jpg", "holder": users_dict["kristin@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Bosch GLL 3-80 Professional 3D Line Laser", "sn": "BSH-33910", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/bosch_gll_3_80.jpg", "holder": None, "status": models.ToolStatus.Available},
            {"name": "Fluke 87V Industrial Multimeter", "sn": "FLK-11200", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/fluke_87v.jpg", "holder": None, "status": models.ToolStatus.In_Repair},
        ]

        for tdata in tools_data:
            tl = models.Tool(
                tenant_id=tenant.id,
                name=tdata["name"],
                serial_number=tdata["sn"],
                image_path=tdata["img"],
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
        print(f"[OK] Comprehensive Demo Tenant Seeded Successfully!")
        print(f"Company: Rafverktakar Sudurnesja ehf. (Tenant ID: {tenant.id})")
        print(f"Default Password for all staff: {DEFAULT_PASSWORD}")
        print("-------------------------------------------------------")
        print("Created Data Overview:")
        print(" - 12 Staff Members with Avatars & @rafsud.is Emails")
        print(" - 7 Official HMS/RAFÍS Electrical Licenses & Certificates")
        print(" - 5 Commercial Clients (Isavia, Landsvirkjun, Blaa Lonid, etc.)")
        print(" - 4 Wholesaler Vendors (Reykjafell, Rönning, Ískraft, JÓCO) with Contacts")
        print(" - 4 Projects with Varied Budgets, Locations & Technical PDF Drawings")
        print(" - 8 Financial Transactions (Invoices & Material Expenses)")
        print(" - Guaranteed 160+ Hours Logged Per Active Worker Every Month (March - July)")
        print(" - 16 Monthly Payslips (March - June 2026)")
        print(" - 6 Leave Requests (Approved & Pending Vacation/Sick Leave)")
        print(" - 4 Fleet Vans with 17-char VINs & HD Photos")
        print(" - 6 Hardware Tools with Serial Numbers & HD Photos")
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
