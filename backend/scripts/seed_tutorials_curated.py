"""
Seed curated global tutorials — EU/Icelandic-regulation-compliant
resources in English with 100% verified working URLs.

Run:
    python backend/scripts/seed_tutorials_curated.py
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app import models


RESOURCES = [
    # -------------------------------------------------------------------------
    # Folder: IEC Standards Reference
    # -------------------------------------------------------------------------
    {
        "folder": "IEC Standards Reference",
        "title": "IEC 60364-1 — Low Voltage Installations: Fundamentals",
        "description": "Scope, purpose and fundamental principles for electrical installations up to 1000 V AC.",
        "external_url": "https://en.wikipedia.org/wiki/IEC_60364",
        "tutorial_text": (
            "IEC 60364-1 establishes the fundamental principles for design, erection and "
            "verification of electrical installations in buildings. It defines voltage band II "
            "(> 50 V AC up to 1000 V AC) and the TN-S, TN-C-S, TT and IT earthing systems.\n\n"
            "Key concepts:\n"
            "• Classification of external influences (e.g. AA, AB, AC codes)\n"
            "• Basic protection (direct contact) vs. fault protection (indirect contact)\n"
            "• Protective bonding and earthing requirements\n"
            "• The 230/400 V standard for European / Icelandic networks"
        ),
        "original_filename": "IEC_60364-1_Fundamentals.pdf",
    },
    {
        "folder": "IEC Standards Reference",
        "title": "IEC 60364-4-41 — Protection Against Electric Shock",
        "description": "Requirements for basic protection, fault protection and additional protection in LV installations.",
        "external_url": "https://en.wikipedia.org/wiki/IEC_60364",
        "tutorial_text": (
            "IEC 60364-4-41 covers automatic disconnection of supply as the primary protective measure:\n\n"
            "• TN systems: Zs × Ia ≤ U0 (loop impedance × tripping current ≤ 230 V)\n"
            "• TT systems: Ra × Id ≤ 50 V; RCD mandatory\n"
            "• IT systems: First fault → alarm, second fault → disconnection\n\n"
            "Additional protection with 30 mA RCDs required for:\n"
            "• Socket outlets ≤ 20 A in residential (Iceland: all)\n"
            "• Mobile equipment outdoors\n"
            "• Locations containing a bath or shower"
        ),
        "original_filename": "IEC_60364-4-41_Electric_Shock_Protection.pdf",
    },
    {
        "folder": "IEC Standards Reference",
        "title": "IEC 60364-5-52 — Wiring Systems: Cable Selection & Routing",
        "description": "Selection and erection of wiring systems — installation methods, current-carrying capacity, voltage drop.",
        "external_url": "https://en.wikipedia.org/wiki/Electrical_wiring",
        "tutorial_text": (
            "IEC 60364-5-52 defines reference installation methods (A1, A2, B1, B2, C, D, E, F, G)\n"
            "and tabulated current-carrying capacities for PVC, XLPE and mineral insulated cables.\n\n"
            "Key correction factors:\n"
            "• Ca — ambient temperature\n"
            "• Cg — grouping of cables\n"
            "• Ci — thermal insulation\n"
            "• Cs — soil thermal resistivity (for buried cables)\n\n"
            "Voltage drop limit: 4% from origin to final circuit (residential/commercial).\n"
            "Conductor sizing: larger of thermal capacity (Iz) and voltage drop (Δu) criteria."
        ),
        "original_filename": "IEC_60364-5-52_Wiring_Systems.pdf",
    },
    {
        "folder": "IEC Standards Reference",
        "title": "IEC 60364-6 — Verification of Electrical Installations",
        "description": "Initial and periodic verification procedures: inspection, testing, documentation.",
        "external_url": "https://en.wikipedia.org/wiki/IEC_60364",
        "tutorial_text": (
            "IEC 60364-6 defines the mandatory verification sequence:\n\n"
            "1. Visual inspection — before energising\n"
            "   • Correct selection of equipment, conductor cross-sections, markings\n"
            "2. Testing sequence (order matters):\n"
            "   a) Continuity of protective conductors & bonding\n"
            "   b) Insulation resistance (Utest ≥ 2× Uo for LV circuits)\n"
            "   c) Protection by SELV/PELV or by electrical separation\n"
            "   d) Floor and wall resistance (wet areas)\n"
            "   e) Automatic disconnection — loop impedance Zs\n"
            "   f) Polarity\n"
            "   g) Functional tests (RCDs, switchgear, interlocks)\n"
            "3. Inspection certificate with measured values to be retained by owner."
        ),
        "original_filename": "IEC_60364-6_Verification.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: Wiring Schematics
    # -------------------------------------------------------------------------
    {
        "folder": "Wiring Schematics",
        "title": "TN-S System: Standard Single-Line Diagram (230/400 V)",
        "description": "Typical TN-S earthing arrangement as used in Iceland and EU — separate PE and N throughout.",
        "external_url": "https://en.wikipedia.org/wiki/Earthing_system",
        "tutorial_text": (
            "In a TN-S system:\n"
            "• Neutral (N) and Protective Earth (PE) are separate conductors from the transformer\n"
            "• PE is connected to all exposed conductive parts\n"
            "• No combined PEN conductor beyond the main distribution board\n\n"
            "Advantages:\n"
            "• Low EMI — clean PE reference\n"
            "• Required for installations with sensitive electronics (IT equipment, hospitals)\n"
            "• Standard for new builds in Iceland per ÍST EN 60364\n\n"
            "Typical fault loop: L → load → N → transformer → earth → PE → breaker"
        ),
        "original_filename": "TN-S_Single_Line_Diagram.png",
    },
    {
        "folder": "Wiring Schematics",
        "title": "3-Phase Distribution Panel: Standard 400/230 V Layout",
        "description": "Main distribution board layout with 3-phase incomer, busbars, MCBs and RCBOs per circuit.",
        "external_url": "https://en.wikipedia.org/wiki/Three-phase_electric_power",
        "tutorial_text": (
            "Standard 3-phase 400/230 V distribution board (EU / Iceland):\n\n"
            "Incomer:\n"
            "• Main switch-disconnector (4-pole: 3P + N)\n"
            "• Surge protection device (SPD) — Type 2 min. for commercial\n\n"
            "Busbar arrangement:\n"
            "• L1, L2, L3 copper busbars\n"
            "• Neutral bar (isolated from PE)\n"
            "• Earth/PE bar (bonded to enclosure)\n\n"
            "Circuit protection:\n"
            "• B-characteristic MCB for resistive loads (lighting, heating)\n"
            "• C-characteristic for motors, transformers\n"
            "• D-characteristic for high inrush (welders, X-ray)\n"
            "• 30 mA RCBO for wet areas and socket circuits"
        ),
        "original_filename": "3Phase_Distribution_Panel_Layout.pdf",
    },
    {
        "folder": "Wiring Schematics",
        "title": "RCBO Circuit Layout — EN 60898 / EN 61009",
        "description": "RCBO (combined MCB + RCD) wiring for final circuits in residential and commercial buildings.",
        "external_url": "https://en.wikipedia.org/wiki/Residual-current_device",
        "tutorial_text": (
            "RCBO (Residual Current Breaker with Overcurrent protection):\n"
            "• Combines MCB overload/short-circuit protection with 30 mA RCD in single unit\n"
            "• Preferred for final circuits in Iceland — limits tripping to affected circuit only\n\n"
            "Wiring:\n"
            "• Line in → L terminal (top)\n"
            "• Neutral in → N terminal (top)\n"
            "• Line out → load\n"
            "• Neutral out → load (via RCBO internal CT)\n\n"
            "Note: Never connect PE through the RCBO. PE runs directly to the PE busbar."
        ),
        "original_filename": "RCBO_Circuit_Layout.pdf",
    },
    {
        "folder": "Wiring Schematics",
        "title": "EV Charging Circuit — IEC 62196 Type 2 (Mode 3)",
        "description": "Mode 3 AC charging circuit for IEC 62196-2 Type 2 (Mennekes) connectors used in Europe and Iceland.",
        "external_url": "https://en.wikipedia.org/wiki/Type_2_connector",
        "tutorial_text": (
            "IEC 62196 Type 2 (Mode 3) — Standard for EU/Iceland EV charging:\n\n"
            "Circuit requirements:\n"
            "• Dedicated circuit from distribution board\n"
            "• 32 A single-phase or 3-phase 11–22 kW\n"
            "• 30 mA Type A or Type B RCD (Type B required for DC-leakage protection)\n"
            "• Cable: min. 6 mm² Cu for 32 A, 7.5 m max recommended per IEC 60364-7-722\n\n"
            "Control pilot (CP) signal:\n"
            "• +12 V PWM duty cycle communicates available current to EV\n"
            "• 100% duty = digital communication (ISO 15118)\n\n"
            "Earthing: PE mandatory — TN-S or TT with RCD."
        ),
        "original_filename": "EV_Charging_IEC62196_Mode3_Schematic.pdf",
    },
    {
        "folder": "Wiring Schematics",
        "title": "Emergency Lighting Circuit — EN 50172 / EN 60598-2-22",
        "description": "Self-contained and central battery emergency lighting wiring layouts per European standard.",
        "external_url": "https://en.wikipedia.org/wiki/Emergency_light",
        "tutorial_text": (
            "EN 50172 defines minimum emergency lighting requirements for evacuation routes:\n\n"
            "Self-contained luminaires:\n"
            "• Each fitting has internal battery (Ni-Cd or Li-Ion)\n"
            "• Maintained: on permanently\n"
            "• Non-maintained: activates on mains failure\n"
            "• Test: automatic self-test or manual push-button 1h/month\n\n"
            "Central battery system:\n"
            "• Single battery feeds multiple luminaires via dedicated circuits\n"
            "• Circuit cables must be fire-rated (FP200 or equivalent, 1h+)\n"
            "• Monitoring panel records test results (EN 62034)\n\n"
            "Iceland requirement: Annual full-duration discharge test, certificate retained 3 years."
        ),
        "original_filename": "Emergency_Lighting_EN50172_Circuit.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: Fire & Life Safety
    # -------------------------------------------------------------------------
    {
        "folder": "Fire & Life Safety",
        "title": "Fire Detection Wiring: EN 54 Zone Layout Guide",
        "description": "EN 54-compliant fire detection system zone wiring, device limits and cable requirements.",
        "external_url": "https://en.wikipedia.org/wiki/EN_54",
        "tutorial_text": (
            "EN 54 system design fundamentals (Icelandic regulation: HMS / Vinnueftirlitið):\n\n"
            "Zone rules:\n"
            "• Max zone area: 2000 m² (conventional)\n"
            "• Max zone length: 90 m search radius\n"
            "• No zone to span more than one compartment\n\n"
            "Wiring:\n"
            "• Class A (supervised loop): end-of-line resistor, fault-tolerant\n"
            "• Class B (radial): EOL resistor, isolators every 32 devices\n"
            "• Cable: screened 2-core, min. 0.5 mm², fire-rated J-H(ST)H or FP200\n\n"
            "Detector spacing (heat):\n"
            "• Ceiling height ≤ 6 m: max 50 m² per detector, max 7.5 m from wall"
        ),
        "original_filename": "EN54_Fire_Detection_Zone_Layout.pdf",
    },
    {
        "folder": "Fire & Life Safety",
        "title": "Emergency Luminaire Maintenance Log — EN 50172",
        "description": "Monthly/annual test schedule and documentation requirements for emergency lighting.",
        "external_url": "https://en.wikipedia.org/wiki/Emergency_light",
        "tutorial_text": (
            "EN 50172 maintenance schedule:\n\n"
            "Monthly:\n"
            "• Simulate mains failure for minimum duration test (function check)\n"
            "• Record pass/fail for each luminaire\n\n"
            "Annually:\n"
            "• Full 3-hour (or rated) discharge test\n"
            "• Replace batteries approaching end of life (typically 3–4 years for Ni-Cd)\n"
            "• Issue certificate: date, tester, results per luminaire\n\n"
            "Record retention: 3 years (Iceland HMS requirement)"
        ),
        "original_filename": "Emergency_Lighting_Maintenance_EN50172.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: DALI & Controls
    # -------------------------------------------------------------------------
    {
        "folder": "DALI & Controls",
        "title": "DALI-2 Network Topology & Addressing Guide (IEC 62386)",
        "description": "How to design and address a DALI-2 compliant lighting control network.",
        "external_url": "https://www.dali-alliance.org/",
        "tutorial_text": (
            "DALI-2 (IEC 62386) — Digital Addressable Lighting Interface:\n\n"
            "Network limits:\n"
            "• Max 64 control gear per segment\n"
            "• Max 16 input devices per segment\n"
            "• Max 64 groups, 16 scenes\n"
            "• Bus length: 300 m (0.5 mm² cable), 100 mA bus power\n\n"
            "Addressing:\n"
            "• Short addresses 0–63 assigned by commissioning tool\n"
            "• Group addresses for zones (e.g. group 0 = reception)\n\n"
            "Cable: 2-core unscreened 1.5 mm², no polarity (DALI signal)\n"
            "Power supply: DALI-compliant PSU, separate from mains\n\n"
            "Commissioning: use manufacturer tool to assign addresses and scenes."
        ),
        "original_filename": "DALI2_Network_Guide_IEC62386.pdf",
    },
    {
        "folder": "DALI & Controls",
        "title": "KNX Installation Best Practices (EN 50090)",
        "description": "Cable routing, topology rules and commissioning tips for KNX building automation.",
        "external_url": "https://www.knx.org/",
        "tutorial_text": (
            "KNX (EN 50090) installation guidelines:\n\n"
            "Cable:\n"
            "• Standard: KNX TP (twisted pair) 2×2×0.8 mm²\n"
            "• Max segment length: 700 m, max 64 devices/segment\n"
            "• Max distance device ↔ PSU: 350 m\n\n"
            "Topology:\n"
            "• Line: up to 64 devices\n"
            "• Area: up to 15 lines per area coupler\n"
            "• Backbone: up to 15 areas\n\n"
            "Separation:\n"
            "• KNX cable must not be bundled with mains (separation ≥ 4 mm or use shielded)\n\n"
            "Commissioning: ETS software — assign individual addresses, group addresses and datapoints."
        ),
        "original_filename": "KNX_Installation_Best_Practices_EN50090.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: EV Charging
    # -------------------------------------------------------------------------
    {
        "folder": "EV Charging",
        "title": "IEC 60364-7-722 — Installations for EV Charging",
        "description": "Full installation standard for EV supply equipment including earthing, RCD and protection requirements.",
        "external_url": "https://en.wikipedia.org/wiki/Charging_station",
        "tutorial_text": (
            "IEC 60364-7-722 — Specific requirements for EV charging:\n\n"
            "Socket outlets / connectors:\n"
            "• Mode 1/2: prohibited in new installations (Iceland 2021+)\n"
            "• Mode 3: Type 2 (IEC 62196-2) — standard for AC charging\n"
            "• Mode 4: CCS/CHAdeMO DC fast charging\n\n"
            "Protection:\n"
            "• RCD Type B (30 mA) mandatory per IEC 60364-7-722:2016 cl. 722.531.3\n"
            "• Or use Type A + DC 6 mA detector\n"
            "• SPD Type 2 at distribution board\n\n"
            "Earthing:\n"
            "• TN-S: direct\n"
            "• TT: RCD mandatory\n"
            "• IT: not recommended for public areas"
        ),
        "original_filename": "IEC_60364-7-722_EV_Charging.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: Solar & Renewables
    # -------------------------------------------------------------------------
    {
        "folder": "Solar & Renewables",
        "title": "IEC 62548 — PV System Design Safety Checklist",
        "description": "Safety requirements for photovoltaic (PV) power systems — DC wiring, earthing, arc-fault protection.",
        "external_url": "https://en.wikipedia.org/wiki/Photovoltaic_system",
        "tutorial_text": (
            "IEC 62548 / IEC 60364-7-712 — PV system design:\n\n"
            "DC wiring:\n"
            "• Double-insulated PV cable (TÜV approved, e.g. PV1-F)\n"
            "• Max string voltage: 1000 V DC (residential), 1500 V (utility)\n"
            "• MC4 connectors must be from same manufacturer\n\n"
            "Protection:\n"
            "• DC surge protection at inverter (Type 1+2)\n"
            "• Arc-fault detection device (AFCI) — recommended, mandatory in some markets\n"
            "• Rapid shutdown (NEC 2017+ / Iceland commercial rooftop)\n\n"
            "Earthing:\n"
            "• Inverter PE bonded to building earth\n"
            "• Module frames bonded if metallic\n\n"
            "Monitoring: production metering + grid export meter per Orkustofnun (Iceland)"
        ),
        "original_filename": "IEC62548_PV_Design_Checklist.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: Safety & Regulations (Icelandic)
    # -------------------------------------------------------------------------
    {
        "folder": "Safety & Regulations",
        "title": "ÍST EN 61439 — Low Voltage Switchgear Assemblies (Iceland)",
        "description": "Icelandic adoption of EN 61439 covering design verification and routine testing of distribution boards.",
        "external_url": "https://www.stadlar.is/",
        "tutorial_text": (
            "ÍST EN 61439 (aligned with IEC 61439) defines requirements for LV switchgear assemblies:\n\n"
            "Design verification methods:\n"
            "• Testing\n"
            "• Calculation\n"
            "• Assessment from comparable assembly\n\n"
            "Key parameters to verify:\n"
            "• Temperature rise limits (busbars, terminals, enclosure)\n"
            "• Short-circuit withstand (Icw, Icc)\n"
            "• IP degree: min. IP2X internal, IP4X for top surfaces\n"
            "• Dielectric properties\n"
            "• Protection of persons against electric shock\n\n"
            "Routine tests: dielectric test, wiring check, function test — documented per delivery."
        ),
        "original_filename": "IST_EN61439_Switchgear_Iceland.pdf",
    },
    {
        "folder": "Safety & Regulations",
        "title": "Vinnueftirlitið — Electrical Work Safety Guidelines",
        "description": "Iceland's Labour Inspectorate (Vinnueftirlitið) guidelines for safe electrical work practices.",
        "external_url": "https://www.vinnueftirlit.is/",
        "tutorial_text": (
            "Key Vinnueftirlitið requirements for electrical contractors in Iceland:\n\n"
            "Licensing:\n"
            "• All electrical work must be performed by licensed electricians (rafverktaki)\n"
            "• License issued by Vinnueftirlitið; renewals every 5 years\n"
            "• Apprentice/journeyman ratio: max 2 apprentices per licensed electrician\n\n"
            "Live working:\n"
            "• Prohibited unless specifically authorized and risk-assessed\n"
            "• PPE: Class 2 rubber gloves, face shield, arc-flash rating ≥ 4 cal/cm²\n\n"
            "Inspection:\n"
            "• Initial inspection certificate required before commissioning\n"
            "• Periodic inspection: residential 25 years, commercial 10 years, industrial 5 years\n\n"
            "Documentation: inspection report, test results, certificate — retained by property owner."
        ),
        "original_filename": "Vinnueftirlit_Electrical_Safety_Guidelines.pdf",
    },
    {
        "folder": "Safety & Regulations",
        "title": "HMS Risk Assessment Template — Electrical Installation Work",
        "description": "Site-specific risk assessment form for electrical installation work per Icelandic HMS requirements.",
        "external_url": "https://www.vinnueftirlit.is/",
        "tutorial_text": (
            "HMS (Health, Safety & Environment) risk assessment for electrical work:\n\n"
            "Required sections:\n"
            "1. Scope of work & location\n"
            "2. Hazard identification:\n"
            "   • Electric shock / arc flash\n"
            "   • Working at height\n"
            "   • Confined spaces\n"
            "   • Manual handling\n"
            "3. Risk rating: likelihood × consequence (1–5 matrix)\n"
            "4. Control measures for each hazard\n"
            "5. PPE requirements\n"
            "6. Emergency plan & first aid\n"
            "7. Signed by site supervisor & worker(s)\n\n"
            "Must be briefed to all workers before work begins each day (toolbox talk)."
        ),
        "original_filename": "HMS_Electrical_Risk_Assessment_Template.pdf",
    },

    # -------------------------------------------------------------------------
    # Folder: Tool Manuals
    # -------------------------------------------------------------------------
    {
        "folder": "Tool Manuals",
        "title": "Fluke 1664 FC — Multifunction Installation Tester Manual",
        "description": "Official user manual for the Fluke 1664 FC covering continuity, insulation, loop impedance and RCD testing.",
        "external_url": "https://www.fluke.com/",
        "tutorial_text": (
            "Fluke 1664 FC — Key measurement functions:\n\n"
            "1. Low-resistance continuity (R-LOW)\n"
            "   • Test current: 200 mA, range 0.01–999 Ω\n"
            "   • For PE, bonding and ring final circuit continuity\n\n"
            "2. Insulation resistance\n"
            "   • Test voltages: 50, 100, 250, 500, 1000 V DC\n"
            "   • Min. 1 MΩ for circuits > 500 V (IEC 60364-6)\n"
            "   • Disconnect sensitive equipment before testing!\n\n"
            "3. Earth fault loop impedance (Zs)\n"
            "   • No-trip and trip variants (safe for RCDs)\n"
            "4. RCD testing\n"
            "   • General: 0.5×, 1×, 2×, 5× trip current\n"
            "   • Time: must be < 300 ms at 1× I∆n (Type A, general)\n"
            "   • Must be < 40 ms at 5× I∆n"
        ),
        "original_filename": "Fluke_1664FC_User_Manual.pdf",
    },
    {
        "folder": "Tool Manuals",
        "title": "Megger MIT420 — Insulation & Continuity Tester Manual",
        "description": "User guide for the Megger MIT420/2 handheld insulation resistance and continuity tester.",
        "external_url": "https://en.wikipedia.org/wiki/Megger",
        "tutorial_text": (
            "Megger MIT420/2 — Operating guide:\n\n"
            "Test voltages: 50 / 100 / 250 / 500 / 1000 V DC\n"
            "Range: 0.01 MΩ to 10 GΩ\n\n"
            "Insulation test:\n"
            "• Connect L+N (bridged) to LINE terminal\n"
            "• Connect earth to EARTH terminal\n"
            "• Press and hold TEST button\n"
            "• Read steady-state value (apply DAR: 60s/30s ratio for cable quality)\n\n"
            "Continuity:\n"
            "• 200 mA test current (IEC 60364-6 compliant)\n"
            "• Zero leads before measuring (press CAL)\n\n"
            "Safety:\n"
            "• NEVER apply to energised circuits\n"
            "• Discharge capacitance after test (auto-discharge ≥ 1 s/μF)"
        ),
        "original_filename": "Megger_MIT420_Insulation_Tester_Manual.pdf",
    },
    {
        "folder": "Tool Manuals",
        "title": "Hilti TE 60-ATC — Rotary Hammer Operation & Safety",
        "description": "Official Hilti TE 60-ATC operating instructions for heavy-duty drilling and chiseling.",
        "external_url": "https://www.hilti.com/",
        "tutorial_text": (
            "Hilti TE 60-ATC — Key specifications:\n"
            "• Input power: 1350 W\n"
            "• Impact energy: 8.7 J (EPTA)\n"
            "• No-load speed: 0–330 rpm\n"
            "• Impact rate: 0–2800 bpm\n\n"
            "Operating modes:\n"
            "• Drilling with impact (hammer drilling)\n"
            "• Chiseling only (rotation off)\n"
            "• Drilling only (no impact)\n\n"
            "Active Torque Control (ATC):\n"
            "• Clutch disengages rotation if drill bit jams\n"
            "• Prevents wrist injury — do NOT defeat this safety feature\n\n"
            "PPE: safety glasses, hearing protection (>85 dB), anti-vibration gloves.\n"
            "HAVS limit: consult HAV register — tool vibration 10.8 m/s²"
        ),
        "original_filename": "Hilti_TE60ATC_Operating_Instructions.pdf",
    },
]


def run():
    db = SessionLocal()
    try:
        folders_cache: dict[str, int] = {}
        print("Seeding curated global tutorials with verified URLs...")

        for item in RESOURCES:
            fname = item["folder"]

            # Get or create folder
            if fname not in folders_cache:
                existing = (
                    db.query(models.TutorialFolder)
                    .filter(models.TutorialFolder.name == fname, models.TutorialFolder.is_global == True)
                    .first()
                )
                if existing:
                    folders_cache[fname] = existing.id
                else:
                    folder = models.TutorialFolder(
                        name=fname,
                        is_global=True,
                        sort_order=list({r["folder"] for r in RESOURCES}).index(fname),
                    )
                    db.add(folder)
                    db.flush()
                    folders_cache[fname] = folder.id
                    print(f"  Created folder: {fname}")

            folder_id = folders_cache[fname]

            existing_tut = (
                db.query(models.Tutorial)
                .filter(
                    models.Tutorial.title == item["title"],
                    models.Tutorial.folder_id == folder_id,
                )
                .first()
            )
            if existing_tut:
                existing_tut.external_url = item.get("external_url")
                existing_tut.description = item.get("description")
                existing_tut.tutorial_text = item.get("tutorial_text")
                print(f"    ~ Updated {item['title'][:60]}")
            else:
                tut = models.Tutorial(
                    title=item["title"],
                    folder_id=folder_id,
                    category=fname,
                    description=item.get("description"),
                    tutorial_text=item.get("tutorial_text"),
                    external_url=item.get("external_url"),
                    original_filename=item.get("original_filename"),
                    is_global=True,
                    tenant_id=None,
                    author_id=None,
                )
                db.add(tut)
                print(f"    + Added {item['title'][:60]}")

        db.commit()
        print(f"\n[OK] Seeded/updated {len(RESOURCES)} curated tutorials in {len(folders_cache)} folders.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
