"""
Comprehensive Demo Tenant Seeder (tenant_id = 2) - "Rafverktakar Suðurnesja ehf."

Features:
- 12 Personnel (Admin, PM, Accountant, Team Leads, Electricians, Apprentices) with custom photos & emails (@rafsud.is)
- Strong unique passwords per user (exported to Desktop on run)
- 5 Major Commercial Clients
- 5 Diverse Projects with real budgets & locations (including a new 5th project)
- Realistic varied hours: different daily/weekly patterns per worker, with sick/vacation gaps,
  overtime spikes, short Fridays, and partial days. Full history March - July 2026.
- Fictional 17-character VIN Numbers for all commercial vans
- HD Equipment & Vehicle Images
- Wholesaler Vendors (Reykjafell, Rönning, Ískraft, JÓCO) with contact persons & photos
- Official Electrical Licenses & Certificates (HMS, RAFÍS, Vinnueftirlitið)
- Rich Mix of Leave Requests (Approved & Pending)
- Project Drawing Folders & Technical PDF Schematics
- Detailed Financial Income & Expense Transactions (monthly invoicing, material orders, overhead)
- Active Chat Threads & Communications
- Monthly Payslips with realistic overtime variations (March - July 2026)

Usage:
    python backend/scripts/seed_demo_tenant.py
"""

from __future__ import annotations

import argparse
import secrets
import string
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
DESKTOP_CREDS_PATH = Path.home() / "Desktop" / "rafsud_demo_credentials.txt"


def _generate_password(length: int = 16) -> str:
    """Generate a strong, URL-safe password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        # Ensure it has at least one of each character class
        if (
            any(c.islower() for c in pwd)
            and any(c.isupper() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "!@#$%&*" for c in pwd)
        ):
            return pwd


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


# ---------------------------------------------------------------------------
# Worker hour profiles – gives each person a unique realistic pattern
# ---------------------------------------------------------------------------
# profile: dict with keys:
#   normal_hours: list of (weight, hours) to pick from on normal days
#   friday_hours: list of (weight, hours) for Fridays (usually shorter)
#   overtime_chance: probability of working overtime on a given weekday
#   overtime_hours: list of (weight, extra_hours) on overtime days
#   sick_days_per_month: expected # of unscheduled sick day absences per month

WORKER_PROFILES = {
    "aron@rafsud.is": {
        "normal": [(6, 8.0), (3, 8.5), (1, 9.0)],
        "friday": [(4, 7.5), (4, 8.0), (2, 6.0)],
        "ot_chance": 0.15,
        "ot_extra": [(5, 1.5), (3, 2.0), (2, 3.0)],
        "sick_days": 0.4,
    },
    "bjarki@rafsud.is": {
        "normal": [(5, 8.0), (3, 8.5), (2, 7.5)],
        "friday": [(5, 7.0), (4, 7.5), (1, 8.0)],
        "ot_chance": 0.12,
        "ot_extra": [(6, 1.0), (3, 2.0), (1, 3.5)],
        "sick_days": 0.6,
    },
    "tomas@rafsud.is": {
        "normal": [(4, 8.0), (4, 8.5), (2, 9.0)],
        "friday": [(4, 8.0), (4, 7.5), (2, 6.5)],
        "ot_chance": 0.20,
        "ot_extra": [(3, 2.0), (4, 2.5), (3, 3.0)],
        "sick_days": 0.3,
    },
    "sigurdur@rafsud.is": {
        "normal": [(5, 8.5), (3, 8.0), (2, 9.0)],
        "friday": [(5, 8.0), (3, 7.0), (2, 7.5)],
        "ot_chance": 0.18,
        "ot_extra": [(5, 1.5), (3, 2.5), (2, 3.0)],
        "sick_days": 0.2,
    },
    "kristin@rafsud.is": {
        "normal": [(6, 8.0), (2, 8.5), (2, 7.5)],
        "friday": [(6, 7.0), (3, 7.5), (1, 8.0)],
        "ot_chance": 0.10,
        "ot_extra": [(7, 1.0), (2, 1.5), (1, 2.0)],
        "sick_days": 0.3,
    },
    "david@rafsud.is": {
        "normal": [(4, 8.5), (4, 9.0), (2, 8.0)],
        "friday": [(4, 8.0), (4, 8.5), (2, 7.0)],
        "ot_chance": 0.25,
        "ot_extra": [(3, 2.0), (4, 2.5), (3, 4.0)],
        "sick_days": 0.1,
    },
    "katrin@rafsud.is": {
        "normal": [(6, 8.0), (3, 7.5), (1, 8.5)],
        "friday": [(5, 7.0), (4, 7.5), (1, 6.5)],
        "ot_chance": 0.08,
        "ot_extra": [(8, 1.0), (2, 1.5)],
        "sick_days": 0.5,
    },
    "viktor@rafsud.is": {
        "normal": [(5, 7.5), (3, 8.0), (2, 8.5)],
        "friday": [(5, 7.0), (4, 7.5), (1, 6.0)],
        "ot_chance": 0.08,
        "ot_extra": [(8, 1.0), (2, 2.0)],
        "sick_days": 0.7,
    },
    "elisabet@rafsud.is": {
        "normal": [(6, 7.5), (3, 8.0), (1, 7.0)],
        "friday": [(6, 6.5), (3, 7.0), (1, 7.5)],
        "ot_chance": 0.06,
        "ot_extra": [(9, 1.0), (1, 1.5)],
        "sick_days": 0.8,
    },
    # Management staff – fewer field hours but consistent attendance
    "gunnar@rafsud.is": {
        "normal": [(5, 7.5), (4, 8.0), (1, 6.0)],
        "friday": [(5, 6.0), (4, 6.5), (1, 7.0)],
        "ot_chance": 0.05,
        "ot_extra": [(9, 1.0), (1, 2.0)],
        "sick_days": 0.1,
    },
    "helga@rafsud.is": {
        "normal": [(6, 7.5), (3, 7.0), (1, 8.0)],
        "friday": [(6, 6.5), (3, 7.0), (1, 6.0)],
        "ot_chance": 0.05,
        "ot_extra": [(9, 1.0), (1, 1.5)],
        "sick_days": 0.2,
    },
    "stefan@rafsud.is": {
        "normal": [(4, 7.5), (4, 8.0), (2, 8.5)],
        "friday": [(5, 7.0), (4, 7.5), (1, 6.5)],
        "ot_chance": 0.12,
        "ot_extra": [(6, 1.0), (3, 2.0), (1, 2.5)],
        "sick_days": 0.2,
    },
}


def _pick_weighted(choices):
    """choices: list of (weight, value). Returns value."""
    weights, values = zip(*choices)
    return random.choices(values, weights=weights, k=1)[0]


def seed_demo_tenant(reset_existing: bool = True):
    db = SessionLocal()
    try:
        tenant = _ensure_tenant(db)
        if reset_existing:
            _delete_existing_tenant_data(db, tenant.id)

        now = _utc_now()

        # ------------------------------------------------------------------
        # 0. Generate strong unique passwords & prepare credential table
        # ------------------------------------------------------------------
        print("Generating strong unique passwords for all demo staff...")
        # Pre-generate passwords – mapped by email
        raw_passwords: dict[str, str] = {}

        # ------------------------------------------------------------------
        # 1. Create 12 Personnel Users with Photos & Custom Job Titles
        # ------------------------------------------------------------------
        users_meta = [
            {"email": "gunnar@rafsud.is",   "full_name": "Gunnar Jónsson",           "role": "admin",           "custom_title": "Chief Executive Officer (CEO)",        "emp_id": "EMP-001", "hourly": 6800, "photo": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop"},
            {"email": "helga@rafsud.is",    "full_name": "Helga Magnúsdóttir",       "role": "accountant",      "custom_title": "Chief Financial Officer (CFO)",        "emp_id": "EMP-002", "hourly": 4800, "photo": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop"},
            {"email": "stefan@rafsud.is",   "full_name": "Stefán Kárason",           "role": "project manager", "custom_title": "Senior Project Director",              "emp_id": "EMP-003", "hourly": 5900, "photo": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop"},
            {"email": "david@rafsud.is",    "full_name": "Davíð Ólafsson",           "role": "team_lead",       "custom_title": "Master Electrician & Site Lead",       "emp_id": "EMP-004", "hourly": 5200, "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop"},
            {"email": "kristin@rafsud.is",  "full_name": "Kristín Þorsteinsdóttir", "role": "team_lead",       "custom_title": "Automation & Controls Lead",           "emp_id": "EMP-005", "hourly": 5200, "photo": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop"},
            {"email": "aron@rafsud.is",     "full_name": "Aron Einarsson",           "role": "electrician",     "custom_title": "Senior Journeyman",                    "emp_id": "EMP-006", "hourly": 4500, "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop"},
            {"email": "bjarki@rafsud.is",   "full_name": "Bjarki Hallgrímsson",      "role": "electrician",     "custom_title": "Journeyman Electrician",               "emp_id": "EMP-007", "hourly": 4500, "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop"},
            {"email": "katrin@rafsud.is",   "full_name": "Katrín Guðmundsdóttir",   "role": "electrician",     "custom_title": "Inspection Specialist",                "emp_id": "EMP-008", "hourly": 4400, "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop"},
            {"email": "tomas@rafsud.is",    "full_name": "Tómas Helgason",           "role": "electrician",     "custom_title": "HVAC & Smart Home Tech",               "emp_id": "EMP-009", "hourly": 4300, "photo": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop"},
            {"email": "sigurdur@rafsud.is", "full_name": "Sigurður Vignisson",       "role": "electrician",     "custom_title": "Industrial Panel Electrician",         "emp_id": "EMP-010", "hourly": 4300, "photo": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop"},
            {"email": "viktor@rafsud.is",   "full_name": "Viktor Pétursson",         "role": "electrician",     "custom_title": "Apprentice Electrician",               "emp_id": "EMP-011", "hourly": 3200, "photo": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop"},
            {"email": "elisabet@rafsud.is", "full_name": "Elísabet Sveinsdóttir",    "role": "electrician",     "custom_title": "Apprentice Electrician",               "emp_id": "EMP-012", "hourly": 3200, "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop"},
        ]

        users_dict = {}
        for idx, u in enumerate(users_meta):
            pwd = _generate_password()
            raw_passwords[u["email"]] = pwd
            user = models.User(
                email=u["email"],
                hashed_password=get_password_hash(pwd),
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
                created_at=now - timedelta(days=180)
            )
            db.add(user)
            db.flush()
            users_dict[u["email"]] = user

        # ------------------------------------------------------------------
        # Export credentials to Desktop
        # ------------------------------------------------------------------
        print(f"Exporting credentials to {DESKTOP_CREDS_PATH} ...")
        cred_lines = [
            "=" * 66,
            "  RAFVERKTAKAR SUÐURNESJA ehf. — DEMO TENANT LOGIN CREDENTIALS",
            "  Generated: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "=" * 66,
            "",
            "  App URL: https://www.rafapp.is",
            "",
            f"  {'EMAIL':<35} {'PASSWORD':<20} ROLE",
            f"  {'-'*35} {'-'*20} {'-'*20}",
        ]
        for u in users_meta:
            email = u["email"]
            pwd = raw_passwords[email]
            role = u["role"]
            cred_lines.append(f"  {email:<35} {pwd:<20} {role}")
        cred_lines += [
            "",
            "=" * 66,
            "  IMPORTANT: Change these passwords after first login.",
            "  Do NOT share this file or commit it to version control.",
            "=" * 66,
        ]
        DESKTOP_CREDS_PATH.parent.mkdir(parents=True, exist_ok=True)
        DESKTOP_CREDS_PATH.write_text("\n".join(cred_lines), encoding="utf-8")
        print(f"  -> Saved to: {DESKTOP_CREDS_PATH}")

        # ------------------------------------------------------------------
        # 1b. Create User Licenses & Certificates
        # ------------------------------------------------------------------
        licenses_data = [
            {"user": users_dict["gunnar@rafsud.is"],  "desc": "Löggiltur Rafverktaki HMS (Aðallöggilding)", "issue": date(2020, 5, 12), "expiry": date(2030, 5, 12), "file": "/licenses/HMS_Gunnar_Loggilding.pdf"},
            {"user": users_dict["stefan@rafsud.is"],  "desc": "Meistarabréf í Rafvirkjun (RAFÍS / Iðan)",   "issue": date(2019, 9,  1), "expiry": date(2029, 9,  1), "file": "/licenses/Meistarabref_Stefan.pdf"},
            {"user": users_dict["david@rafsud.is"],   "desc": "Spennustöðva- og Háspennuréttindi (66kV)",   "issue": date(2021, 4, 15), "expiry": date(2028, 4, 15), "file": "/licenses/Haspennurettindi_David.pdf"},
            {"user": users_dict["kristin@rafsud.is"], "desc": "Gólfhita- og Vélstýringavottun (Danfoss & KNX)", "issue": date(2022, 1, 20), "expiry": date(2028, 1, 20), "file": "/licenses/KNX_Vottun_Kristin.pdf"},
            {"user": users_dict["aron@rafsud.is"],    "desc": "Sveinsbréf í Rafvirkjun & Vinnupallanámskeið", "issue": date(2022, 6, 10), "expiry": date(2027, 6, 10), "file": "/licenses/Sveinsbref_Aron.pdf"},
            {"user": users_dict["bjarki@rafsud.is"],  "desc": "Vinnuvélapróf & Lyftaraáritun (Vinnueftirlitið)", "issue": date(2021, 11, 5), "expiry": date(2027, 11, 5), "file": "/licenses/Lyftaraprof_Bjarki.pdf"},
            {"user": users_dict["katrin@rafsud.is"],  "desc": "Úttektir á Neyðarlýsingu & Brunaútköllum (HMS)", "issue": date(2023, 3,  1), "expiry": date(2028, 3,  1), "file": "/licenses/HMS_Neydarlysing_Katrin.pdf"},
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

        # ------------------------------------------------------------------
        # 2. Create 5 Clients / Customers
        # ------------------------------------------------------------------
        customers_data = [
            {"name": "Isavia KEF Terminal Extension",  "kt": "551208-0500", "email": "innkaup@isavia.is",            "phone": "+354 425 6000", "address": "Keflavíkurflugvöllur"},
            {"name": "Bláa Lónið / Retreat Spa",       "kt": "520299-2329", "email": "framkvaemdir@blalalagoon.is",  "phone": "+354 420 8800", "address": "Norðurljósavegur 9, Grindavík"},
            {"name": "Landsvirkjun Svæðisskrifstofa",  "kt": "421169-0229", "email": "rafmagn@landsvirkjun.is",      "phone": "+354 515 9000", "address": "Ljósafossstöð"},
            {"name": "Reykjanesbær Fasteignir",        "kt": "490394-2279", "email": "eignir@reykjanesbaer.is",      "phone": "+354 421 6700", "address": "Tjarnargata 12, Keflavík"},
            {"name": "Íslandshótel KEF",               "kt": "590102-3640", "email": "hotelkef@islandshotel.is",     "phone": "+354 421 5200", "address": "Vatnsnesvegur 12"},
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
                created_at=now - timedelta(days=175)
            )
            db.add(cust)
            db.flush()
            cust_dict[c["name"]] = cust

        # ------------------------------------------------------------------
        # 2b. Wholesaler Shops / Vendors
        # ------------------------------------------------------------------
        shops_data = [
            {"name": "Reykjafell ehf.",         "address": "Skipholt 35, 105 Reykjavík",    "contact": "Þórir Sigurðsson (Verslunarstjóri)", "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop", "phone": "+354 588 6000", "email": "thorir@reykjafell.is",  "web": "https://www.reykjafell.is"},
            {"name": "Johan Rönning ehf.",       "address": "Klettagörðum 25, 104 Reykjavík","contact": "Anna Jónsdóttir (Tækniráðgjafi)",    "photo": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop", "phone": "+354 520 4000", "email": "anna@ronning.is",       "web": "https://www.ronning.is"},
            {"name": "Ískraft ehf.",             "address": "Smiðjuvegur 5, 200 Kópavogur",  "contact": "Ólafur Kristjánsson (Þjónststjóri)", "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop", "phone": "+354 535 1200", "email": "olafur@iskraft.is",     "web": "https://iskraft.husa.is"},
            {"name": "Jóhann Ólafsson & Co.",   "address": "Sundaborg 7, 104 Reykjavík",    "contact": "Steinunn Eldjárn (Sölustjóri)",     "photo": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop", "phone": "+354 533 1000", "email": "steinunn@joco.is",      "web": "https://www.joco.is"},
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

        # ------------------------------------------------------------------
        # 3. Create 5 Projects (added Íslandshótel KEF project)
        # ------------------------------------------------------------------
        admin_user = users_dict["gunnar@rafsud.is"]
        projects_data = [
            {
                "name": "Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla",
                "customer": cust_dict["Isavia KEF Terminal Extension"],
                "status": "In Progress",
                "budget": 48500000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Keflavíkurflugvöllur Terminal 3",
                "start": date.today() - timedelta(days=150),
                "end": date.today() + timedelta(days=90),
            },
            {
                "name": "Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring",
                "customer": cust_dict["Bláa Lónið / Retreat Spa"],
                "status": "In Progress",
                "budget": 18200000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Grindavík Retreat Spa",
                "start": date.today() - timedelta(days=120),
                "end": date.today() + timedelta(days=30),
            },
            {
                "name": "Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar",
                "customer": cust_dict["Landsvirkjun Svæðisskrifstofa"],
                "status": "Commissioned",
                "budget": 12800000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Ljósafossstöð",
                "start": date.today() - timedelta(days=160),
                "end": date.today() - timedelta(days=18),
            },
            {
                "name": "Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald",
                "customer": cust_dict["Reykjanesbær Fasteignir"],
                "status": "In Progress",
                "budget": 6500000.0,
                "pm": users_dict["gunnar@rafsud.is"],
                "location": "Tjarnargata 12, Keflavík",
                "start": date.today() - timedelta(days=90),
                "end": date.today() + timedelta(days=28),
            },
            {
                "name": "Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi",
                "customer": cust_dict["Íslandshótel KEF"],
                "status": "In Progress",
                "budget": 9800000.0,
                "pm": users_dict["stefan@rafsud.is"],
                "location": "Vatnsnesvegur 12, Keflavík",
                "start": date.today() - timedelta(days=55),
                "end": date.today() + timedelta(days=60),
            },
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
                created_at=now - timedelta(days=150)
            )
            db.add(proj)
            db.flush()
            proj_dict[p["name"]] = proj

        # Project memberships
        project_crews = {
            "Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla": [
                users_dict["david@rafsud.is"],
                users_dict["aron@rafsud.is"],
                users_dict["bjarki@rafsud.is"],
                users_dict["tomas@rafsud.is"],
                users_dict["viktor@rafsud.is"],
            ],
            "Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring": [
                users_dict["kristin@rafsud.is"],
                users_dict["sigurdur@rafsud.is"],
                users_dict["elisabet@rafsud.is"],
                users_dict["katrin@rafsud.is"],
            ],
            "Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar": [
                users_dict["david@rafsud.is"],
                users_dict["katrin@rafsud.is"],
                users_dict["tomas@rafsud.is"],
            ],
            "Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald": [
                users_dict["kristin@rafsud.is"],
                users_dict["viktor@rafsud.is"],
                users_dict["elisabet@rafsud.is"],
                users_dict["aron@rafsud.is"],
            ],
            "Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi": [
                users_dict["sigurdur@rafsud.is"],
                users_dict["bjarki@rafsud.is"],
                users_dict["katrin@rafsud.is"],
                users_dict["viktor@rafsud.is"],
            ],
        }

        for pname, crew in project_crews.items():
            proj = proj_dict[pname]
            for uobj in crew:
                if uobj not in proj.members:
                    proj.members.append(uobj)
            for uobj in crew:
                pa = models.ProjectAssignment(
                    project_id=proj.id,
                    user_id=uobj.id,
                    start_date=proj.start_date,
                    end_date=proj.end_date,
                )
                db.add(pa)
            db.flush()

        # ------------------------------------------------------------------
        # 3b. Drawing Folders & PDF Schematics
        # ------------------------------------------------------------------
        dfolder = models.DrawingFolder(
            tenant_id=tenant.id,
            project_id=proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"].id,
            name="Teikningar og Rafmagnsuppdrættir"
        )
        db.add(dfolder)
        db.flush()

        drawings_data = [
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "file": "Adaltafla_3200A_TE-01.pdf",            "path": "/drawings/Adaltafla_3200A_TE-01.pdf",            "desc": "Aðaltafla 3200A einlínumynd og rofatafla sal 1",    "disc": "Electrical",        "rev": "R2", "status": models.DrawingStatus.Approved,     "author": "Verkís Verkfræðistofa"},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "file": "Troppulagnir_Sal2_TE-02.pdf",          "path": "/drawings/Troppulagnir_Sal2_TE-02.pdf",          "desc": "Kapalleiðir og tröppulagnir í Sal 2",               "disc": "Electrical",        "rev": "R1", "status": models.DrawingStatus.For_Approval, "author": "Verkís Verkfræðistofa"},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "file": "DALI_Lighting_TE-03.pdf",              "path": "/drawings/DALI_Lighting_TE-03.pdf",              "desc": "DALI snjallstýring og ljósauppsetning sal 1-3",     "disc": "Electrical",        "rev": "R1", "status": models.DrawingStatus.For_Approval, "author": "Verkís Verkfræðistofa"},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "file": "Golfhitalagnir_Spa_SP-02.pdf",         "path": "/drawings/Golfhitalagnir_Spa_SP-02.pdf",         "desc": "Gólfhita- og hitastýringabúnaður Spa 1",            "disc": "HVAC / Electrical", "rev": "R3", "status": models.DrawingStatus.Approved,     "author": "EFLA Verkfræðistofa"},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"file": "Ljosafoss_Maelabunadur_ST-04.pdf",     "path": "/drawings/Ljosafoss_Maelabunadur_ST-04.pdf",     "desc": "Háspennumælar og vararammi Spennisal",              "disc": "High Voltage",      "rev": "R4", "status": models.DrawingStatus.Approved,     "author": "Landsvirkjun Tæknideild"},
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "file": "Hotel_Rafkerfi_HK-01.pdf",             "path": "/drawings/Hotel_Rafkerfi_HK-01.pdf",             "desc": "Nýtt rafkerfi og dreifitafla hótel 1. hæð",         "disc": "Electrical",        "rev": "R1", "status": models.DrawingStatus.For_Approval, "author": "Verkfræðistofa Línuhönnun"},
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

        # ------------------------------------------------------------------
        # 4. Financial Transactions – richer monthly invoicing + material orders
        # ------------------------------------------------------------------
        expenses_data = [
            # === Income (Invoices OUT to clients) ===
            # Isavia: 3 milestone invoices
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "in",  "amt": 12000000.0, "cat": "project", "desc": "Isavia T3 – Áfangagreiðsla 1 (mobilisation)",      "ref": "INV-2026-031", "days_ago": 135},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "in",  "amt": 16500000.0, "cat": "project", "desc": "Isavia T3 – Áfangagreiðsla 2 (aðaltafla)",         "ref": "INV-2026-081", "days_ago": 65},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "in",  "amt": 9800000.0,  "cat": "project", "desc": "Isavia T3 – Áfangagreiðsla 3 (kapallagnir)",       "ref": "INV-2026-115", "days_ago": 20},
            # Bláa Lónið
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "flow": "in",  "amt": 8200000.0,  "cat": "project", "desc": "Bláa Lónið Spa – Fyrirframgreiðsla",               "ref": "INV-2026-092", "days_ago": 100},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "flow": "in",  "amt": 5600000.0,  "cat": "project", "desc": "Bláa Lónið Spa – Áfangagreiðsla 2 (gólfhiti)",     "ref": "INV-2026-138", "days_ago": 35},
            # Landsvirkjun – fully paid
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"flow": "in", "amt": 7000000.0,  "cat": "project", "desc": "Landsvirkjun – Áfangagreiðsla 1",                  "ref": "INV-2026-042", "days_ago": 130},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"flow": "in", "amt": 5800000.0,  "cat": "project", "desc": "Landsvirkjun – Lokagreiðsla",                       "ref": "INV-2026-060", "days_ago": 55},
            # Reykjanesbær
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],  "flow": "in",  "amt": 3200000.0,  "cat": "project", "desc": "Reykjanesbær – Áfangagreiðsla 1",                  "ref": "INV-2026-101", "days_ago": 60},
            # Íslandshótel
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "flow": "in",  "amt": 4500000.0,  "cat": "project", "desc": "Íslandshótel – Fyrirframgreiðsla (50%)",            "ref": "INV-2026-148", "days_ago": 40},

            # === Material & Supply Costs (OUT) ===
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "out", "amt": 4200000.0,  "cat": "project", "desc": "Reykjafell: Stofnkaplar & Aðaltafla 3200A",         "ref": "RF-99412",    "days_ago": 120},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "out", "amt": 1850000.0,  "cat": "project", "desc": "Rönning: Tröppulagnir og festingar",                "ref": "RN-55211",    "days_ago": 75},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "flow": "out", "amt": 980000.0,   "cat": "project", "desc": "Ískraft: DALI stýringareiningar og sviðsljós",      "ref": "ISK-22011",   "days_ago": 40},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "flow": "out", "amt": 1850000.0,  "cat": "project", "desc": "Rönning: Gólfhita- og hitastýringabúnaður",         "ref": "RN-44120",    "days_ago": 95},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "flow": "out", "amt": 640000.0,   "cat": "project", "desc": "JÓCO: KNX snjallstýringareiningar",                 "ref": "JC-11920",    "days_ago": 50},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"flow": "out","amt": 2100000.0,  "cat": "project", "desc": "Reykjafell: Háspennumælar og vararammi",             "ref": "RF-77033",    "days_ago": 130},
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],  "flow": "out", "amt": 420000.0,   "cat": "project", "desc": "Ískraft: Töfluvörnir og lekavarnar",                 "ref": "ISK-18810",   "days_ago": 70},
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "flow": "out", "amt": 1650000.0,  "cat": "project", "desc": "Reykjafell: Dreifitafla og kaplar hótel",            "ref": "RF-88120",    "days_ago": 45},

            # === Overhead & Operational (no project) ===
            {"proj": None, "flow": "out", "amt": 650000.0,  "cat": "car",      "desc": "Bílaviðgerð & Þjónusta Renault Master KE-012",          "ref": "KE-012",      "days_ago": 50},
            {"proj": None, "flow": "out", "amt": 310000.0,  "cat": "car",      "desc": "VW Transporter KE-849 – árlegt þjónustukönnun",         "ref": "KE-849-SVC",  "days_ago": 80},
            {"proj": None, "flow": "out", "amt": 420000.0,  "cat": "tool",     "desc": "Fluke Mælatæki Kalibrering & Skoðun",                   "ref": "FLK-99214",   "days_ago": 60},
            {"proj": None, "flow": "out", "amt": 380000.0,  "cat": "clothing", "desc": "Nýr Vinnufatnaður & Öryggisskór fyrirtækis",             "ref": "Barki-2026",  "days_ago": 45},
            {"proj": None, "flow": "out", "amt": 190000.0,  "cat": "other",    "desc": "HMS námskeið & endurmenntun starfsmanna (2 dagarnámskeið)","ref": "HMS-EDU-26", "days_ago": 30},
            {"proj": None, "flow": "out", "amt": 75000.0,   "cat": "other",    "desc": "Skrifstofuleiga apríl 2026",                             "ref": "RENT-APR26",  "days_ago": 95},
            {"proj": None, "flow": "out", "amt": 75000.0,   "cat": "other",    "desc": "Skrifstofuleiga maí 2026",                               "ref": "RENT-MAY26",  "days_ago": 65},
            {"proj": None, "flow": "out", "amt": 75000.0,   "cat": "other",    "desc": "Skrifstofuleiga júní 2026",                              "ref": "RENT-JUN26",  "days_ago": 35},
            {"proj": None, "flow": "out", "amt": 75000.0,   "cat": "other",    "desc": "Skrifstofuleiga júlí 2026",                              "ref": "RENT-JUL26",  "days_ago": 5},
        ]

        for edata in expenses_data:
            exp = models.Expense(
                tenant_id=tenant.id,
                project_id=edata["proj"].id if edata["proj"] else None,
                date=date.today() - timedelta(days=edata.get("days_ago", random.randint(5, 100))),
                amount=edata["amt"],
                flow_type=edata["flow"],
                category=edata["cat"],
                description=edata["desc"],
                reference=edata["ref"]
            )
            db.add(exp)

        # ------------------------------------------------------------------
        # 5. Create Tasks per Project – richer set
        # ------------------------------------------------------------------
        tasks_data = [
            # --- Isavia ---
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "name": "Uppsetning á Aðaltaflu 3200A",                   "status": "Done",        "assignee": users_dict["aron@rafsud.is"],     "start": date(2026, 3, 10), "due": date(2026, 5, 15)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "name": "Kapalleiðir & Tröppulagnir í Sal 2",             "status": "In Progress", "assignee": users_dict["bjarki@rafsud.is"],   "start": date(2026, 5, 1),  "due": date(2026, 7, 30)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "name": "Lýsing & DALI Snjallstýring",                    "status": "In Progress", "assignee": users_dict["tomas@rafsud.is"],    "start": date(2026, 6, 1),  "due": date(2026, 8, 15)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "name": "Brunaútkallskerfi & Neyðarlýsing",               "status": "Not Started", "assignee": users_dict["viktor@rafsud.is"],   "start": date(2026, 7, 15), "due": date(2026, 9, 1)},
            {"proj": proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],     "name": "Endanleg úttekt og skil skjala til Isavia",      "status": "Not Started", "assignee": users_dict["stefan@rafsud.is"],   "start": date(2026, 9, 1),  "due": date(2026, 10, 1)},

            # --- Bláa Lónið ---
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "name": "Gólfhiti & Hitastýringar í Spa 1",               "status": "Done",        "assignee": users_dict["sigurdur@rafsud.is"], "start": date(2026, 4, 15), "due": date(2026, 6, 1)},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "name": "Útilýsing & LED Borðar við Lónið",               "status": "In Progress", "assignee": users_dict["kristin@rafsud.is"],  "start": date(2026, 6, 1),  "due": date(2026, 8, 10)},
            {"proj": proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],     "name": "Varastöð & Rafstýrðir Lokar",                    "status": "Not Started", "assignee": users_dict["elisabet@rafsud.is"], "start": date(2026, 7, 20), "due": date(2026, 8, 30)},

            # --- Landsvirkjun (Commissioned) ---
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"name": "Róra- og Kapallagnir í Spennisal",              "status": "Done",        "assignee": users_dict["david@rafsud.is"],    "start": date(2026, 3, 10), "due": date(2026, 5, 1)},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"name": "Mælatöflur & Hátæknimælar",                     "status": "Done",        "assignee": users_dict["katrin@rafsud.is"],   "start": date(2026, 5, 1),  "due": date(2026, 6, 20)},
            {"proj": proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],"name": "Lokaúttekt og skil til Landsvirkjunar",         "status": "Done",        "assignee": users_dict["gunnar@rafsud.is"],   "start": date(2026, 7, 1),  "due": date(2026, 7, 18)},

            # --- Reykjanesbær ---
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],  "name": "Skipta um Töfluvör & Lekaliða",                  "status": "Done",        "assignee": users_dict["katrin@rafsud.is"],   "start": date(2026, 5, 15), "due": date(2026, 6, 15)},
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],  "name": "Prófun Neyðarlýsingar",                          "status": "In Progress", "assignee": users_dict["viktor@rafsud.is"],   "start": date(2026, 6, 20), "due": date(2026, 8, 5)},
            {"proj": proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],  "name": "Skjalagreining og As-Built teikningar",          "status": "Not Started", "assignee": users_dict["kristin@rafsud.is"],  "start": date(2026, 8, 1),  "due": date(2026, 8, 25)},

            # --- Íslandshótel (new) ---
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "name": "Lagnir og grunnvinna á dreifikerfi",             "status": "In Progress", "assignee": users_dict["sigurdur@rafsud.is"], "start": date(2026, 6, 15), "due": date(2026, 7, 20)},
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "name": "Uppsetning dreifitöflu á 1. hæð",                "status": "In Progress", "assignee": users_dict["bjarki@rafsud.is"],   "start": date(2026, 7, 5),  "due": date(2026, 8, 10)},
            {"proj": proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"],     "name": "Tengingar gestabílass og hleðslustöðvar EV",     "status": "Not Started", "assignee": users_dict["viktor@rafsud.is"],   "start": date(2026, 8, 10), "due": date(2026, 9, 5)},
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

        # ------------------------------------------------------------------
        # 6. Realistic varied time logs (March – July 2026)
        #    Uses per-worker profiles with random sick days, OT, short Fridays
        # ------------------------------------------------------------------
        print("Logging realistic varied hours per worker (March – July 2026)...")

        # Scheduled absences (leave) – days to skip per user
        leave_blackout: dict[str, set] = {
            "aron@rafsud.is":    {date(2026, 6, d) for d in range(8, 20)},     # vacation June 8-19
            "katrin@rafsud.is":  {date(2026, 7, d) for d in range(20, 27)},    # vacation July 20-26
            "viktor@rafsud.is":  {date(2026, 7, 23), date(2026, 7, 24)},        # sick July 23-24
            "david@rafsud.is":   {date(2026, 7, d) for d in range(27, 32) if d <= 31},  # vacation July 27-31
            "bjarki@rafsud.is":  {date(2026, 5, 20), date(2026, 5, 21), date(2026, 5, 22)},  # sick
            "tomas@rafsud.is":   {date(2026, 3, d) for d in range(10, 16)},    # parental leave March
        }

        # Worker → primary project mapping + description
        workers = [
            (users_dict["aron@rafsud.is"],     proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],         "Draga stofnkapla og tengja aðaltaflu 3200A"),
            (users_dict["bjarki@rafsud.is"],   proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],         "Setja upp kapalleiðir og tröppur í sal 2"),
            (users_dict["tomas@rafsud.is"],    proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],         "Tengja DALI snjallstýringar og ljósakúpla"),
            (users_dict["sigurdur@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],         "Frágangur á gólfhita og skynjurum í Spa"),
            (users_dict["kristin@rafsud.is"],  proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],         "Yfirferð á útilýsingu og tengingu við varastöð"),
            (users_dict["david@rafsud.is"],    proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],   "Kapallagnir í spennisal og prófanir á mælabúnaði"),
            (users_dict["katrin@rafsud.is"],   proj_dict["Verk 104: Skrifstofur Reykjanesbæjar - Almennt Viðhald"],      "Skipta um töfluvör og mæla lekaliða"),
            (users_dict["viktor@rafsud.is"],   proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],         "Aðstoð við kapaldrátt og töflutengingar"),
            (users_dict["elisabet@rafsud.is"], proj_dict["Verk 102: Bláa Lónið Spa - Gólfhiti & Snjallstýring"],         "Aðstoð við hitastýringu og skynjara"),
            # Management logs some hours too (meetings, site visits)
            (users_dict["gunnar@rafsud.is"],   proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],   "Stjórnun verkefnis, fundi og samskipti við viðskiptavini"),
            (users_dict["stefan@rafsud.is"],   proj_dict["Verk 101: Isavia Terminal 3 - Nýbygging & Hovedtafla"],         "Verkefnisstjórnun og samhæfing við verktaka"),
            (users_dict["helga@rafsud.is"],    proj_dict["Verk 103: Landsvirkjun Ljósafoss - Endurnýjun Mælabúnaðar"],   "Fjármálaumsjón, launavinnsla og bókhald"),
        ]

        months_list = [(2026, 3), (2026, 4), (2026, 5), (2026, 6), (2026, 7)]

        def add_tlog(user_obj, proj_obj, log_date, hours, desc, start_hour=8):
            start_dt = datetime.combine(log_date, datetime.min.time()).replace(
                hour=start_hour, tzinfo=timezone.utc
            )
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

        rng = random.Random(42)  # fixed seed for reproducibility

        for year, month in months_list:
            start_m = date(year, month, 1)
            if month < 12:
                next_m = date(year, month + 1, 1)
            else:
                next_m = date(year + 1, 1, 1)
            days_in_m = (next_m - start_m).days

            # Monthly-level overtime spike (e.g. end-of-month push)
            overtime_spike_days = set(rng.sample(
                [d for d in range(days_in_m - 5, days_in_m + 1) if d > 0],
                k=min(2, days_in_m)
            ))

            for w_user, w_proj, w_desc in workers:
                email = w_user.email
                profile = WORKER_PROFILES.get(email, WORKER_PROFILES["aron@rafsud.is"])
                blackout = leave_blackout.get(email, set())

                # Decide which days this worker will take an unscheduled sick day
                expected_sick = profile["sick_days"]
                sick_days_this_month: set[int] = set()
                for d in range(1, days_in_m + 1):
                    if rng.random() < (expected_sick / days_in_m):
                        sick_days_this_month.add(d)

                for day_num in range(1, days_in_m + 1):
                    cur_date = date(year, month, day_num)
                    if cur_date > date.today():
                        continue
                    if cur_date.weekday() >= 5:  # Skip weekends
                        continue
                    if cur_date in blackout:
                        continue
                    if day_num in sick_days_this_month:
                        continue

                    # Occasional random absence (public holiday / weather etc.)
                    if rng.random() < 0.01:
                        continue

                    is_friday = cur_date.weekday() == 4

                    # Pick base hours from profile
                    if is_friday:
                        hrs = _pick_weighted(profile["friday"])
                    else:
                        hrs = _pick_weighted(profile["normal"])

                    # Overtime logic
                    is_ot_spike = day_num in overtime_spike_days
                    if is_ot_spike or (not is_friday and rng.random() < profile["ot_chance"]):
                        extra = _pick_weighted(profile["ot_extra"])
                        hrs = round(hrs + extra, 1)

                    # Vary start time slightly (7:30, 8:00, 8:30)
                    start_hour = rng.choice([7, 7, 8, 8, 8, 8, 9])

                    add_tlog(w_user, w_proj, cur_date, hrs, w_desc, start_hour=start_hour)

        db.flush()

        # ------------------------------------------------------------------
        # 7. Monthly Payslips (March – July 2026) for all field workers
        # ------------------------------------------------------------------
        print("Generating monthly payslips for staff (March – July 2026)...")

        payslip_users = [
            users_dict["aron@rafsud.is"],
            users_dict["bjarki@rafsud.is"],
            users_dict["katrin@rafsud.is"],
            users_dict["sigurdur@rafsud.is"],
            users_dict["tomas@rafsud.is"],
            users_dict["kristin@rafsud.is"],
            users_dict["david@rafsud.is"],
            users_dict["viktor@rafsud.is"],
            users_dict["elisabet@rafsud.is"],
        ]

        months = [
            {"year": 2026, "month": 3, "period": "Mars 2026"},
            {"year": 2026, "month": 4, "period": "Apríl 2026"},
            {"year": 2026, "month": 5, "period": "Maí 2026"},
            {"year": 2026, "month": 6, "period": "Júní 2026"},
            {"year": 2026, "month": 7, "period": "Júlí 2026"},
        ]

        overtime_table = {
            "aron@rafsud.is":     [14.5, 22.0, 18.5, 30.0, 12.0],
            "bjarki@rafsud.is":   [10.0, 16.0, 8.0,  18.5, 20.0],
            "katrin@rafsud.is":   [6.0,  8.0,  12.0, 4.0,  16.0],
            "sigurdur@rafsud.is": [20.0, 14.0, 24.0, 18.0, 10.5],
            "tomas@rafsud.is":    [0.0,  18.0, 22.5, 28.0, 14.0],   # 0 in March (parental leave)
            "kristin@rafsud.is":  [8.0,  6.0,  10.0, 12.0, 8.5],
            "david@rafsud.is":    [32.0, 28.0, 36.0, 24.0, 0.0],    # 0 in July (holiday)
            "viktor@rafsud.is":   [4.0,  6.0,  8.0,  10.0, 6.0],
            "elisabet@rafsud.is": [2.0,  4.0,  6.0,  8.0,  4.0],
        }

        for m_idx, m in enumerate(months):
            for u in payslip_users:
                base_hrs = 160.0
                if u.email == "tomas@rafsud.is" and m["month"] == 3:
                    base_hrs = 130.0  # parental leave in March
                if u.email == "david@rafsud.is" and m["month"] == 7:
                    base_hrs = 140.0  # vacation in July

                overtime_hrs = overtime_table.get(u.email, [0]*5)[m_idx]
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

        # ------------------------------------------------------------------
        # 8. Leave Requests (Approved & Pending)
        # ------------------------------------------------------------------
        print("Adding employee leave & vacation records...")
        leaves = [
            {"user": users_dict["katrin@rafsud.is"],   "type": "Vacation",       "start": date(2026, 7, 20), "end": date(2026, 7, 26), "status": models.LeaveStatus.Approved, "desc": "Sumarorlof 2026"},
            {"user": users_dict["viktor@rafsud.is"],   "type": "Sick Leave",     "start": date(2026, 7, 23), "end": date(2026, 7, 24), "status": models.LeaveStatus.Approved, "desc": "Eigin veikindi"},
            {"user": users_dict["david@rafsud.is"],    "type": "Vacation",       "start": date(2026, 7, 27), "end": date(2026, 7, 31), "status": models.LeaveStatus.Approved, "desc": "Sumarleyfi"},
            {"user": users_dict["aron@rafsud.is"],     "type": "Vacation",       "start": date(2026, 6,  8), "end": date(2026, 6, 19), "status": models.LeaveStatus.Approved, "desc": "Sumarorlof 2026"},
            {"user": users_dict["bjarki@rafsud.is"],   "type": "Sick Leave",     "start": date(2026, 5, 20), "end": date(2026, 5, 22), "status": models.LeaveStatus.Approved, "desc": "Eigin veikindi"},
            {"user": users_dict["tomas@rafsud.is"],    "type": "Parental Leave", "start": date(2026, 3, 10), "end": date(2026, 3, 15), "status": models.LeaveStatus.Approved, "desc": "Fæðingarorlof"},
            {"user": users_dict["tomas@rafsud.is"],    "type": "Sick Leave",     "start": date(2026, 8, 10), "end": date(2026, 8, 14), "status": models.LeaveStatus.Pending,  "desc": "Læknisaðgerð og batatími"},
            {"user": users_dict["sigurdur@rafsud.is"], "type": "Vacation",       "start": date(2026, 8, 24), "end": date(2026, 8, 28), "status": models.LeaveStatus.Pending,  "desc": "Endurmenntunarnámskeið HMS"},
            {"user": users_dict["elisabet@rafsud.is"], "type": "Sick Leave",     "start": date(2026, 4, 14), "end": date(2026, 4, 15), "status": models.LeaveStatus.Approved, "desc": "Veikindi"},
            {"user": users_dict["kristin@rafsud.is"],  "type": "Vacation",       "start": date(2026, 8, 18), "end": date(2026, 8, 22), "status": models.LeaveStatus.Pending,  "desc": "Áætlað sumarorlof"},
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

        # ------------------------------------------------------------------
        # 9. Fleet & Equipment
        # ------------------------------------------------------------------
        print("Adding commercial vehicle fleet & hardware tools...")
        cars_data = [
            {"make": "Renault",       "model": "Master 2023",         "plate": "KE-012", "vin": "VF1MA000368192014", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/renault_master.jpg",    "driver": users_dict["aron@rafsud.is"],     "status": models.CarStatus.Checked_Out},
            {"make": "Volkswagen",    "model": "Transporter 2022",    "plate": "KE-849", "vin": "WV1ZZZ7JZNH019482", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/vw_transporter.jpg",   "driver": users_dict["kristin@rafsud.is"],  "status": models.CarStatus.Checked_Out},
            {"make": "Mercedes-Benz", "model": "Vito 2024",           "plate": "KE-901", "vin": "WDF44770313829104", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/mercedes_vito.jpg",    "driver": users_dict["david@rafsud.is"],    "status": models.CarStatus.Checked_Out},
            {"make": "Ford",          "model": "Transit Custom 2021", "plate": "KE-450", "vin": "1FTBR1Y84MKA91823", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/car_images/ford_transit.jpg",     "driver": None,                             "status": models.CarStatus.Available},
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
            {"name": "Fluke 1664 FC Multifunction Installation Tester", "sn": "FLK-99214", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/fluke_1664_fc.jpg",    "holder": users_dict["aron@rafsud.is"],     "status": models.ToolStatus.In_Use},
            {"name": "Hilti TE 60-ATC Heavy Duty Rotary Hammer",        "sn": "HLT-44012", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/hilti_te_60_atc.jpg",   "holder": users_dict["bjarki@rafsud.is"],   "status": models.ToolStatus.In_Use},
            {"name": "Milwaukee Force Logic Hydraulic Cable Crimper",    "sn": "MLW-11094", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/milwaukee_crimper.jpg", "holder": users_dict["sigurdur@rafsud.is"], "status": models.ToolStatus.In_Use},
            {"name": "Megger MIT420 Insulation & Continuity Tester",     "sn": "MGG-77123", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/megger_mit420.jpg",    "holder": users_dict["kristin@rafsud.is"],  "status": models.ToolStatus.In_Use},
            {"name": "Bosch GLL 3-80 Professional 3D Line Laser",        "sn": "BSH-33910", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/bosch_gll_3_80.jpg",   "holder": None,                             "status": models.ToolStatus.Available},
            {"name": "Fluke 87V Industrial Multimeter",                  "sn": "FLK-11200", "img": "https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/tool_images/fluke_87v.jpg",        "holder": None,                             "status": models.ToolStatus.In_Repair},
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

        # ------------------------------------------------------------------
        # 10. Chat Threads & Messages
        # ------------------------------------------------------------------
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
        db.add(models.ChatMessage(
            thread_id=group_thread.id,
            author_id=users_dict["bjarki@rafsud.is"].id,
            content="Tröppurnar í sal 2 eru klárnar – myndir sendar á Stefan.",
            created_at=now - timedelta(hours=18)
        ))
        db.add(models.ChatMessage(
            thread_id=group_thread.id,
            author_id=users_dict["stefan@rafsud.is"].id,
            content="Frábært! Ég bóka HMS úttekt á mánudag. Takk kærlega.",
            created_at=now - timedelta(hours=16)
        ))

        # Hotel group thread
        hotel_thread = models.ChatThread(
            tenant_id=tenant.id,
            name="Íslandshótel KEF - Rafkerfi",
            is_group=True,
            project_id=proj_dict["Verk 105: Íslandshótel KEF - Elding & Nýtt Rafkerfi"].id,
            created_at=now - timedelta(days=50)
        )
        db.add(hotel_thread)
        db.flush()

        for u_obj in [users_dict["stefan@rafsud.is"], users_dict["sigurdur@rafsud.is"], users_dict["bjarki@rafsud.is"]]:
            db.add(models.ThreadParticipant(thread_id=hotel_thread.id, user_id=u_obj.id))

        db.add(models.ChatMessage(
            thread_id=hotel_thread.id,
            author_id=users_dict["sigurdur@rafsud.is"].id,
            content="Við þurfum á fleiri kaplareyrum að halda fyrir þriðju hæðina. Sendi pöntun til Reykjafells strax.",
            created_at=now - timedelta(days=3)
        ))

        db.commit()

        # ------------------------------------------------------------------
        # Final Summary
        # ------------------------------------------------------------------
        print("\n=======================================================")
        print(f"[OK] Comprehensive Demo Tenant Seeded Successfully!")
        print(f"Company: Rafverktakar Sudurnesja ehf. (Tenant ID: {tenant.id})")
        print("-------------------------------------------------------")
        print("Credentials written to:")
        print(f"  {DESKTOP_CREDS_PATH}")
        print("-------------------------------------------------------")
        print("Created Data Overview:")
        print(" - 12 Staff Members — strong unique passwords per user")
        print(" - 7 Official HMS/RAFÍS Electrical Licenses & Certificates")
        print(" - 5 Commercial Clients (Isavia, Landsvirkjun, Blaa Lonid, etc.)")
        print(" - 4 Wholesaler Vendors (Reykjafell, Rönning, Ískraft, JÓCO) with Contacts")
        print(" - 5 Projects (incl. new Íslandshótel KEF) with Budgets, Locations & Drawings")
        print(" - 26 Financial Transactions (milestone invoices, material orders, overhead)")
        print(" - Realistic varied hours logged per worker (March - July 2026)")
        print("     * Per-worker profiles: unique day patterns, OT spikes, short Fridays")
        print("     * Sick-day absences & scheduled leave gaps honoured")
        print(" - 45 Monthly Payslips with realistic overtime table (March - July)")
        print(" - 10 Leave Requests (Approved & Pending Vacation/Sick/Parental)")
        print(" - 4 Fleet Vans with 17-char VINs & HD Photos")
        print(" - 6 Hardware Tools with Serial Numbers & HD Photos")
        print(" - 3 Active Team Chat Conversations")
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
