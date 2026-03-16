"""
Seed script to populate:
- Global Risk Library templates
- Tutorials / knowledge base entries

Usage (from backend directory, with venv active):

    python -m scripts.seed_risk_templates_and_tutorials

This script is idempotent: it checks by (category, title) for risks and by
(category, title) for tutorials, and only inserts when not already present.
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

from app.database import SessionLocal
from app import models
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


RISK_TEMPLATES = [
    # --- Design / Calculation ---
    dict(
        category="Design – Cable Sizing",
        title="Undersized conductors for design current",
        description=(
            "Cable cross-section not sized for design current considering installation method, "
            "ambient temperature and grouping factors. Can lead to overheating and insulation damage."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Verify design current per circuit; size conductors to local wiring rules using recognized "
            "tables or approved calculation tools. Document assumptions and correction factors."
        ),
    ),
    dict(
        category="Design – Short Circuit",
        title="Insufficient short-circuit withstand of protective devices",
        description=(
            "Breaking capacity (kA) of protective devices is below the prospective fault current at "
            "their point of installation."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Calculate or obtain prospective short-circuit current from DSO. Select devices with "
            "adequate breaking capacity for the installation location, including selectivity where required."
        ),
    ),
    dict(
        category="Design – Earthing & Bonding",
        title="Inadequate earthing and bonding",
        description=(
            "Protective conductors and bonding not designed to provide a reliable fault path, resulting "
            "in dangerous touch voltages or delayed disconnection."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Design earthing system according to supply characteristics and local standards. Verify "
            "conductor sizes and routing; specify continuity testing and earth fault loop impedance checks."
        ),
    ),
    # --- Installation / Site Work ---
    dict(
        category="Installation – Live Working",
        title="Work on or near live parts",
        description=(
            "Unintended contact with live conductors during installation, testing or fault finding, "
            "leading to electric shock or arc flash."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Apply safe isolation procedures with written steps (lockout/tagout). Prohibit live working "
            "unless justified and controlled. Use insulated tools and appropriate PPE."
        ),
    ),
    dict(
        category="Installation – Mechanical",
        title="Cable damage from sharp edges or supports",
        description=(
            "Cables routed over sharp edges, tight bends or unsupported spans leading to sheath damage "
            "and eventual faults."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Use proper cable management (grommets, saddles, trays). Respect minimum bending radii and "
            "fixing distances. Inspect mechanical protection before energizing."
        ),
    ),
    dict(
        category="Installation – Fire Stopping",
        title="Unsealed penetrations compromising fire compartments",
        description=(
            "Cable or conduit penetrations not sealed with approved fire-stopping materials, undermining "
            "fire-resistance rating of walls or floors."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Record all penetrations; apply tested fire-stopping systems compatible with substrate and "
            "service type. Maintain documentation and as-built drawings."
        ),
    ),
    # --- Commissioning / Testing ---
    dict(
        category="Commissioning – Functional",
        title="Safety devices not functionally tested",
        description=(
            "RCDs, AFDDs, emergency stops, fire interfaces or safety circuits not functionally tested "
            "before handover."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Prepare commissioning plan including functional tests for all safety-related devices. "
            "Record test results and corrective actions in commissioning report."
        ),
    ),
    dict(
        category="Commissioning – Labelling",
        title="Inadequate circuit and panel labelling",
        description=(
            "Boards, breakers and circuits not clearly labelled, leading to operational errors and "
            "unsafe isolation."
        ),
        default_likelihood="High",
        default_impact="Medium",
        default_mitigation=(
            "Apply durable labels matching as-built documentation and schedules. Include source, "
            "destination and circuit designation. Verify labels during final inspection."
        ),
    ),
    # --- Operation / Maintenance ---
    dict(
        category="Operation – Overloading",
        title="Overloaded final circuits due to changes in use",
        description=(
            "Existing circuits become overloaded when additional loads are connected without review, "
            "leading to nuisance tripping or overheating."
        ),
        default_likelihood="High",
        default_impact="Medium",
        default_mitigation=(
            "Establish change-management procedure for adding loads. Periodically review loading of main "
            "panels and key circuits, especially for heating and EV charging."
        ),
    ),
    dict(
        category="Operation – Environment",
        title="Ingress of moisture or dust into equipment",
        description=(
            "Enclosures installed in harsher environments than intended; IP rating insufficient for "
            "actual conditions."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Select enclosures with appropriate IP rating for the zone. Inspect periodically for signs of "
            "condensation, corrosion or contamination. Add heaters or filters where needed."
        ),
    ),
    # --- Additional Templates: Panel Boards ---
    dict(
        category="Panels – Main Incomer",
        title="Main breaker rating not coordinated with upstream protection",
        description=(
            "Main incoming breaker rating or characteristic not coordinated with upstream device (DSO breaker "
            "or feeder), leading to poor selectivity or nuisance tripping."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Check selectivity and cascading tables between upstream devices. Coordinate trip curves and ratings "
            "so that faults clear at the correct level without unnecessary loss of supply."
        ),
    ),
    dict(
        category="Panels – Busbar Heating",
        title="Loose terminations at busbars or main lugs",
        description=(
            "Insufficiently tightened or incorrectly assembled main connections causing local heating and potential arcing."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Torque tighten main terminations to manufacturer values using calibrated tools. Consider thermographic "
            "inspection during commissioning and early operation."
        ),
    ),
    dict(
        category="Panels – Segregation",
        title="Inadequate segregation between functional units",
        description=(
            "Switchgear compartments not properly segregated, increasing risk of fault propagation or unsafe access."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Specify form of separation in design (e.g., Form 2/3/4) and verify against the assembly manufacturer’s "
            "type-tested arrangement. Ensure doors and barriers are correctly installed."
        ),
    ),
    # --- Lighting & Emergency Systems ---
    dict(
        category="Lighting – Emergency",
        title="Emergency lighting not fed from appropriate circuit",
        description=(
            "Emergency luminaires supplied from circuits that may not be energized when required during an outage."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Design emergency lighting supplies in accordance with applicable codes. Verify circuit selection, "
            "autonomy and test scheduling."
        ),
    ),
    dict(
        category="Lighting – Controls",
        title="Control failure leaves escape routes unlit",
        description=(
            "Automatic lighting control (e.g. occupancy sensors) may inadvertently switch off lighting needed for safe egress."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Configure control strategy so that escape routes and stairways maintain minimum illumination. "
            "Verify behaviour during functional testing and commissioning."
        ),
    ),
    # --- Fire Detection & Alarm ---
    dict(
        category="Fire Systems – Interface",
        title="Incorrect interlocks between fire system and power systems",
        description=(
            "Fire alarm outputs not correctly interfaced to HVAC, smoke control or power shutdown circuits."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Coordinate cause-and-effect matrix with fire designer and M&E. Test all interlocks during integrated "
            "system testing and document results."
        ),
    ),
    dict(
        category="Fire Systems – Cabling",
        title="Non fire-rated cables on critical fire alarm circuits",
        description=(
            "Cabling for critical fire detection/evacuation circuits not selected or routed for required fire survival time."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Specify fire-resistant cables and supports where required by local code. Verify routing avoids unprotected "
            "areas where possible."
        ),
    ),
    # --- Data & Communication ---
    dict(
        category="Data – EMC",
        title="Electromagnetic interference to control or data cabling",
        description=(
            "Power and data cables run together without segregation, leading to interference on sensitive circuits."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Provide adequate separation or shielding between power and data cables according to manufacturer and "
            "standard recommendations. Avoid running parallel for long distances where possible."
        ),
    ),
    dict(
        category="Data – Redundancy",
        title="Single point of failure in communication backbone",
        description=(
            "Critical control or monitoring relies on a single communication path without redundancy."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Consider dual-path or ring topologies for critical systems (BMS, security, fire). Document architecture and "
            "test failover behaviour."
        ),
    ),
    # --- EV Charging & High Loads ---
    dict(
        category="EV Charging",
        title="Insufficient capacity for EV charging load",
        description=(
            "Main incomer or distribution not sized to handle added EV charger load during peak conditions."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Perform load study including diversity and EV charging scenarios. Provide load management, demand response or "
            "panel upgrades where needed."
        ),
    ),
    dict(
        category="EV Charging",
        title="Incorrect residual current protection for EV chargers",
        description=(
            "RCD type not suitable for chargers that can generate DC residual currents, risking loss of protection."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Follow EV charger manufacturer instructions for RCD type and rating. Use Type A with RDC-DD or Type B devices "
            "where required by standards."
        ),
    ),
    # --- Temporary Works & Site Power ---
    dict(
        category="Temporary Power",
        title="Inadequate protection on temporary site supplies",
        description=(
            "Temporary power boards not equipped with appropriate RCDs and overcurrent protection for site conditions."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Use site distribution boards designed for construction environments with appropriate IP rating and protection. "
            "Inspect regularly and test RCDs."
        ),
    ),
    dict(
        category="Temporary Power",
        title="Trip hazards from temporary cabling",
        description=(
            "Cables laid across walkways or poorly routed, leading to trips and mechanical damage."
        ),
        default_likelihood="High",
        default_impact="Medium",
        default_mitigation=(
            "Route temporary cables overhead or in protected channels where possible. Use cable covers across walkways and "
            "mark routes clearly."
        ),
    ),
    # --- Roof & External Installations ---
    dict(
        category="External – Roof",
        title="UV degradation of exposed cables",
        description=(
            "Cables not UV-resistant installed on roofs or façades, leading to sheath cracking over time."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Specify UV-resistant cables or protective covers for external runs. Periodically inspect exposed cabling."
        ),
    ),
    dict(
        category="External – Roof",
        title="Inadequate fall protection for roof-mounted equipment",
        description=(
            "Technicians accessing roof-mounted panels, PV or HVAC equipment without appropriate fall protection or safe access routes."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Coordinate with structural and H&S teams for safe access (guardrails, anchors, walkways). Include fall protection in "
            "risk assessment and method statements."
        ),
    ),
    # --- Maintenance & Lifecycle ---
    dict(
        category="Maintenance",
        title="Incomplete maintenance records for protective devices",
        description=(
            "Lack of documented testing/maintenance history for breakers, RCDs or surge protection devices."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Establish maintenance log with test intervals per manufacturer and local code. Record test results, replacements and "
            "settings adjustments."
        ),
    ),
    dict(
        category="Maintenance",
        title="Unauthorized modifications to panels or circuits",
        description=(
            "Changes made by unqualified personnel without updating documentation or labels."
        ),
        default_likelihood="Medium",
        default_impact="High",
        default_mitigation=(
            "Restrict access to switchgear, enforce change control procedures and periodically audit installations against drawings."
        ),
    ),
    # --- Earthing & Lightning ---
    dict(
        category="Earthing & Lightning",
        title="Lightning protection not bonded to main earthing system",
        description=(
            "Lightning protection system (LPS) earth not coordinated with building main earth, causing dangerous potential differences."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Coordinate LPS and power earthing design per applicable lightning protection standards. Ensure bonding and test continuity."
        ),
    ),
    dict(
        category="Earthing & Lightning",
        title="High earth resistance at remote structures",
        description=(
            "Auxiliary structures or remote equipment with insufficient earthing resistance for protective device operation."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Measure earth resistance at remote points and upgrade earthing (additional rods, tapes, meshes) where needed. "
            "Verify disconnection times with protective devices."
        ),
    ),
    # --- Controls & Automation ---
    dict(
        category="Controls & Automation",
        title="Unsafe default states on control system failure",
        description=(
            "Loss of control power or PLC failure leaves equipment in an unsafe or undefined state."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Design fail-safe states for critical actuators and interlocks. Test power-loss and restart behaviour during commissioning."
        ),
    ),
    dict(
        category="Controls & Automation",
        title="Inadequate segregation of safety-related control circuits",
        description=(
            "Safety functions (e.g., emergency stops) not segregated from standard control circuits, increasing risk of common-cause failure."
        ),
        default_likelihood="Low",
        default_impact="High",
        default_mitigation=(
            "Apply functional safety and wiring segregation principles for safety-related parts of control systems. "
            "Follow manufacturer guidance and applicable standards."
        ),
    ),
    # --- Miscellaneous / Workspace ---
    dict(
        category="Workspace",
        title="Obstructed access to switchgear and panels",
        description=(
            "Storage or furniture blocking access to distribution boards, preventing safe operation and maintenance."
        ),
        default_likelihood="High",
        default_impact="Medium",
        default_mitigation=(
            "Specify and mark minimum working space in front of panels. Communicate requirements to client and verify during inspections."
        ),
    ),
    dict(
        category="Workspace",
        title="Inadequate lighting at electrical equipment",
        description=(
            "Poor lighting around panels or plant, increasing risk of errors during switching or maintenance."
        ),
        default_likelihood="Medium",
        default_impact="Medium",
        default_mitigation=(
            "Provide adequate fixed lighting at all main panels and control locations. Verify lux levels during commissioning."
        ),
    ),
]


TUTORIALS = [
    dict(
        category=models.TutorialCategory.distribution,
        title="Reading a Single-Line Diagram",
        description=(
            "Step-by-step walkthrough of typical low-voltage single-line diagrams: feeders, incomers, "
            "busbars, protective devices and metering."
        ),
        tutorial_text=(
            "This primer explains how to interpret a typical LV single-line diagram in a project drawing set.\n\n"
            "1. Identify the supply source (utility transformer or upstream panel) and note the rated voltage, "
            "short-circuit level and earthing arrangement.\n"
            "2. Follow the main incomer into the main switchboard, locating the main breaker and any metering or "
            "surge protection.\n"
            "3. Trace each outgoing feeder to downstream distribution boards, noting breaker ratings, cable sizes "
            "and routing references.\n"
            "4. For each final circuit, understand what the circuit serves (lighting, sockets, HVAC, EV, etc.) and "
            "how it is protected.\n"
            "5. Use circuit identifiers (e.g. L1-01, L2-05) consistently when labelling, commissioning and fault finding.\n\n"
            "Use this tutorial together with the project-specific as-built drawings and applicable standards; do not rely "
            "on it as a complete design guide."
        ),
    ),
    dict(
        category=models.TutorialCategory.safety_code,
        title="Safe Isolation Procedure – LV Installations",
        description=(
            "Generic safe isolation checklist for low-voltage circuits before work commences."
        ),
        tutorial_text=(
            "This generic sequence is intended to support safe isolation of LV circuits. It does not replace "
            "your company procedure or national regulations.\n\n"
            "1. PLAN: Confirm the work scope, affected circuits and potential backfeeds. Ensure test equipment "
            "is available and proven.\n"
            "2. IDENTIFY: Locate the correct circuit on the diagrams and in the distribution board. Cross-check "
            "labels, schedules and physical layout.\n"
            "3. INFORM: Notify affected users that the supply will be isolated and agree on the timing.\n"
            "4. ISOLATE: Operate the isolating device (main switch, breaker, disconnect) to the OFF position.\n"
            "5. SECURE: Apply an approved lock-off device and warning tag. Each person working should apply their "
            "own lock where required by procedure.\n"
            "6. PROVE TESTER: Verify your voltage indicator on a known live source.\n"
            "7. TEST FOR ABSENCE OF VOLTAGE: Test between all live conductors and between live and earth at the "
            "point of work.\n"
            "8. RE-PROVE TESTER: Immediately re-check the indicator on a known live source.\n"
            "9. WORK: Proceed with the task, maintaining control of keys and access.\n"
            "10. RESTORE: When work is complete, remove tools, remove locks/tags in line with procedure, and "
            "restore supply. Inform users and update any documentation.\n"
            "\nAlways use company-specific forms or checklists if provided."
        ),
    ),
    dict(
        category=models.TutorialCategory.ev_charging,
        title="EV Charger Circuit Fundamentals",
        description=(
            "Overview of typical EV charger supply requirements, RCD types and load management considerations."
        ),
        tutorial_text=(
            "This overview highlights the main electrical considerations when adding EV chargers to a building.\n\n"
            "- SUPPLY RATING: Determine available spare capacity at the main incomer and any intermediate panels. "
            "Consider diversity, existing loads and worst-case scenarios.\n"
            "- CIRCUIT SIZING: Select cable sizes and protective devices according to charger rating, installation "
            "method and ambient conditions.\n"
            "- RESIDUAL CURRENT PROTECTION: Follow charger manufacturer guidance for RCD type (e.g., Type A with "
            "DC detection or Type B). Ensure selectivity with upstream RCDs where possible.\n"
            "- LOAD MANAGEMENT: For multiple chargers, consider dynamic load management to prevent main breaker trips.\n"
            "- EARTHING AND BONDING: Pay particular attention to earthing arrangements, especially in outdoor car parks.\n\n"
            "Always cross-check with the manufacturer’s installation manual and applicable national standards."
        ),
    ),
    dict(
        category=models.TutorialCategory.dali_system,
        title="DALI Bus Wiring Basics",
        description=(
            "Summary of common practices for wiring DALI control lines in commercial lighting systems."
        ),
        tutorial_text=(
            "This note describes typical wiring practices for DALI lighting control buses.\n\n"
            "- TOPOLOGY: DALI allows mixed bus topologies (line, star, tree). Avoid large closed loops to limit "
            "fault finding complexity.\n"
            "- LENGTH & LOADING: Observe maximum bus length and number of devices per DALI line as specified by "
            "the control gear manufacturer.\n"
            "- CABLE TYPE: Use cables suitable for the environment and voltage. Maintain segregation from mains circuits "
            "unless the cable construction and local rules allow otherwise.\n"
            "- SEGREGATION: Follow local wiring rules for SELV/PELV versus mains circuits. Maintain separation in trays, "
            "conduits and junction boxes as required.\n"
            "- ADDRESSING: After wiring, perform address scanning, group assignment and scene programming according to "
            "the control system tool.\n\n"
            "Always apply the specific DALI system supplier documentation and national codes in parallel with this guidance."
        ),
    ),
    dict(
        category=models.TutorialCategory.industrial,
        title="Motor Starter Panel – Typical Checks",
        description=(
            "Checklist of typical inspection and testing steps for motor starter panels before energization."
        ),
        tutorial_text=(
            "This checklist supports commissioning of motor starter panels (DOL, star-delta, soft-starter, VSD, etc.).\n\n"
            "1. DOCUMENT REVIEW: Confirm latest revisions of power and control schematics and motor data.\n"
            "2. VISUAL INSPECTION: Check enclosure, IP rating, gland plates, labelling and cable terminations.\n"
            "3. PROTECTIVE DEVICES: Verify breaker/fuse ratings, overload relay settings and coordination with upstream "
            "devices.\n"
            "4. CONTROL CIRCUITS: Confirm correct wiring of start/stop circuits, interlocks, emergency stops and feedback signals.\n"
            "5. INSULATION & CONTINUITY: Perform insulation resistance tests and earth continuity checks to the specified values.\n"
            "6. FUNCTIONAL TESTS: Prove correct operation of contactors, soft-starters or drives without mechanical load, then "
            "with load where safe.\n"
            "7. DIRECTION OF ROTATION: Confirm motor rotation direction and correct if needed before connecting driven equipment.\n\n"
            "Record results on commissioning forms and retain with the project handover package."
        ),
    ),
    dict(
        category=models.TutorialCategory.fire_system,
        title="Fire Alarm Zoning – Electrical Interface Notes",
        description=(
            "High-level guidance on how electrical contractors should treat fire alarm zones and plant interfaces."
        ),
        tutorial_text=(
            "Explains the relationship between fire alarm zones, plant shutdown circuits and electrical interfaces. "
            "Emphasizes following the approved cause-and-effect matrix and coordinating wiring with the fire engineer. "
            "Provides checklists for verifying that plant such as AHUs, smoke dampers and lifts respond correctly to fire signals."
        ),
    ),
    dict(
        category=models.TutorialCategory.lights_system,
        title="Emergency Lighting – Periodic Test Routine",
        description=(
            "Summary of a typical monthly and annual emergency lighting test routine for building operators."
        ),
        tutorial_text=(
            "Describes a generic structure for emergency lighting tests: monthly functional tests, annual full-duration "
            "tests and documentation of failures. Clarifies the responsibilities of the installer versus the building operator "
            "and highlights common defects to watch for (blocked luminaires, failed batteries, damaged signage)."
        ),
    ),
    dict(
        category=models.TutorialCategory.tools_equip,
        title="Multimeter Safety Basics for Electricians",
        description=(
            "Key points for safe use of multimeters on LV installations, including CAT ratings and test lead inspection."
        ),
        tutorial_text=(
            "Explains the meaning of CAT II/III/IV ratings, the importance of using intact fused leads, and verifying the "
            "instrument on a known live source before and after use. Includes reminders about measurement range selection and "
            "avoiding inadvertent current measurements on voltage ranges."
        ),
    ),
    dict(
        category=models.TutorialCategory.data_comms,
        title="Basic Separation Rules – Power vs Data Cabling",
        description=(
            "Short guide for routing power and data cabling in shared pathways without causing interference."
        ),
        tutorial_text=(
            "Summarizes typical separation distances between LV power and communication cables, the use of partitions in trays, "
            "and when to consider shielded data cables. Provides practical routing tips for risers, ceiling voids and outdoor runs."
        ),
    ),
    dict(
        category=models.TutorialCategory.renewables,
        title="PV String Cabling – Field Checklist",
        description=(
            "Checklist items for routing and terminating DC PV string cables on roofs and in plant rooms."
        ),
        tutorial_text=(
            "Covers DC polarity labelling, string cable routing, connector compatibility, protection against mechanical damage and "
            "firefighter access considerations. Aimed at on-site installers as a reminder alongside project-specific PV documentation."
        ),
    ),
]


def ensure_risk_templates(session) -> None:
    for tpl in RISK_TEMPLATES:
        exists = (
            session.query(models.RiskTemplate)
            .filter(
                models.RiskTemplate.category == tpl["category"],
                models.RiskTemplate.title == tpl["title"],
            )
            .first()
        )
        if exists:
            continue

        rt = models.RiskTemplate(
            category=tpl["category"],
            title=tpl["title"],
            description=tpl.get("description"),
            default_likelihood=tpl.get("default_likelihood", "Medium"),
            default_impact=tpl.get("default_impact", "Medium"),
            default_mitigation=tpl.get("default_mitigation"),
            default_status=tpl.get("default_status", "Open"),
            is_active=True,
        )
        session.add(rt)
    session.commit()


def ensure_tutorials(session) -> None:
    # Resolve static/tutorials directory relative to backend/app
    base_app_dir = Path(__file__).resolve().parents[1] / "app"
    tutorials_dir = base_app_dir / "static" / "tutorials"
    tutorials_dir.mkdir(parents=True, exist_ok=True)

    for tpl in TUTORIALS:
        existing = (
            session.query(models.Tutorial)
            .filter(
                models.Tutorial.category == tpl["category"],
                models.Tutorial.title == tpl["title"],
            )
            .first()
        )

        if existing:
            # Update description/text in case we improved the seed content
            existing.description = tpl.get("description")
            existing.tutorial_text = tpl.get("tutorial_text")
            tut = existing
        else:
            tut = models.Tutorial(
                title=tpl["title"],
                category=tpl["category"],
                description=tpl.get("description"),
                tutorial_text=tpl.get("tutorial_text"),
                image_path=None,
                file_path=None,
                tenant_id=None,  # global tutorials visible to all tenants
                author_id=None,
                created_at=datetime.utcnow(),
            )
            session.add(tut)

        # Generate/update a simple PDF manual for this tutorial
        safe_slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in tpl["title"]).strip("-") or "tutorial"
        pdf_name = f"{safe_slug}.pdf"
        pdf_path = tutorials_dir / pdf_name

        try:
            c = canvas.Canvas(str(pdf_path), pagesize=A4)
            width, height = A4
            y = height - 40
            c.setFont("Helvetica-Bold", 16)
            c.drawString(40, y, tpl["title"])
            y -= 24
            c.setFont("Helvetica", 9)
            c.drawString(40, y, f"Category: {tpl['category'].value if hasattr(tpl['category'], 'value') else tpl['category']}")
            y -= 24
            c.setFont("Helvetica", 10)

            text = tpl.get("tutorial_text") or tpl.get("description") or ""
            for line in text.splitlines():
                if y < 40:
                    c.showPage()
                    y = height - 40
                    c.setFont("Helvetica", 10)
                c.drawString(40, y, line)
                y -= 14
            c.showPage()
            c.save()

            rel_path = f"static/tutorials/{pdf_name}"
            tut.file_path = rel_path
            session.add(tut)
        except Exception:
            # If PDF generation fails, continue without blocking seeding
            pass

    session.commit()


def main() -> None:
    db = SessionLocal()
    try:
        ensure_risk_templates(db)
        ensure_tutorials(db)
        print("Seed completed: risk templates and tutorials ensured.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

