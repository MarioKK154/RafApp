import sys
import re
import psycopg2
sys.path.insert(0, 'backend')
from app.config import get_settings

MAIN_CAT_MAP = {
    "DESCRIPTION SYSTEM": "LIGHTING SYSTEMS",
    "PIPELINES": "CONDUIT & CABLE TRAY RUNS",
    "PRIVATE AND ADMINISTRATIVE SYSTEMS": "SPECIALIZED & CONTROL SYSTEMS",
    "LOW VOLTAGE SYSTEMS": "LOW VOLTAGE SYSTEMS",
    "GENERAL": "GENERAL WORKS & PREPARATION",
}

SUB_CAT_MAP = {
    "Tubes and tracheas": "Conduits & Flexible Tubing",
    "Tables, cabinets and boxes": "Distribution Boards, Panels & Enclosures",
    "Links, claws and cases": "Receptacles, Plugs & Sockets",
    "Cans and inset boxes": "Junction Boxes & Flush Enclosures",
    "Melt safety equipment": "Fuses & Thermal Cutouts",
    "Circuit breakers and circuit breakers": "MCBs & Residual Current Devices (RCDs)",
    "Home Nerves and Energy Measurement": "Utility Service Entrances & Metering",
    "LED banners": "LED Strips & Architectural Lighting",
    "Rope ladders and trays": "Cable Ladders & Cable Trays",
    "Cable and link chutes": "Cable Trunking & Dado Raceways",
    "Holes, slots and broken work": "Core Drilling, Chasing & Concrete Work",
    "Heaters, heaters and heaters": "Unit Heaters, Radiators & Heating Elements",
    "Power cables Al": "Aluminum Power Cables",
    "Power cables Cu": "Copper Power Cables",
    "String fasteners and loose strings": "Cable Cleats, Fasteners & Pigtails",
    "Communication": "Communications & Networking",
    "Components for cabinets and tables": "Panelboard & Cabinet Accessories",
    "Facility creation": "Site Setup & Logistics",
    "Analysis, crosses, corners, etc. for string and link gutters": "Fittings, Tees, Crosses & Elbows for Cable Trunking",
    "Manual Callers for Numbered Fire Alarm System": "Addressable Fire Alarm Manual Call Points",
    "Manual Callers for Multi-channel Fire Alarm System": "Conventional Fire Alarm Manual Call Points",
    "Detectors for a numbered fire alarm system": "Addressable Fire Alarm Detectors",
    "Sensors for multi-channel fire alarm systems": "Conventional Fire Alarm Detectors",
    "Annunciators for a numbered fire alarm system": "Addressable Fire Alarm Sounders & Strobes",
    "Signalers for multi-channel fire alarm systems": "Conventional Fire Alarm Sounders & Strobes",
    "Fire stations for numbered system": "Addressable Fire Alarm Control Panels",
    "Fire stations for ducted systems": "Conventional Fire Alarm Control Panels",
    "Embedded description": "Recessed Lighting Fixtures",
    "Ground connections and voltage compensation": "Grounding, Earthing & Equipotential Bonding",
    "Telecommunication links": "Telecommunication Receptacles & Ports",
    "Cross board and fiber optic drawer": "Patch Panels & Fiber Enclosures",
    "Working electricity, temporary wiring": "Temporary Site Power & Construction Wiring",
    "Bends, T's, Crosses and Brackets for Rope Ladders and Trays": "Fittings & Brackets for Cable Ladders & Trays",
    "Connections of conductors": "Conductor Terminations & Splices",
    "Access and Security System": "Access Control & Security Systems",
    "Heating cables and mats": "Heating Cables & Heat Trace Mats",
    "Reserve power": "Standby Power & UPS Systems",
    "Engines and motors": "Motors & Actuators",
    "Clock system": "Master Clock Systems",
    "Control cables": "Control & Signal Cables",
    "Separators": "Isolator Switches & Disconnects",
    "Ceiling and wall lamps": "Ceiling & Wall Luminaires",
    "Air control system": "HVAC Control Systems",
    "Undefined collection clauses": "Miscellaneous Line Items",
    "Measurements": "Testing & Commissioning Measurements",
    "Fire cables": "Fire-Resistant Cables",
    "Insulated wire and monoconductors": "Single-Core Insulated Building Wires",
    "Carrier cables": "Messenger & Catenary Cables",
    "Door phone and bell system": "Door Intercom & Chime Systems",
    "Housekeeping system": "Building Management Systems (BMS)",
    "Telecommunication cables": "Telecommunication & Data Cables",
    "Device": "Devices & Outlets",
    "Skins": "Busbars & Conductive Strips",
    "Bends for pipes": "Conduit Bends & Elbows",
    "Ventilation system": "Ventilation Systems",
    "Bulbs, components, etc.": "Lamps & Lighting Accessories",
    "Device charges": "Equipment & Tool Fees",
    "Transformer and power supply": "Transformers & Power Supplies",
    "Image monitoring system": "CCTV & Video Surveillance Systems",
    "Computer and telephone wiring and network equipment": "Structured Cabling & Network Equipment",
    "Connections in cabinets and boards": "Panelboard Internal Wiring & Terminations",
    "Smoke extraction system": "Smoke Evacuation & Extraction Systems",
    "Outdoor lighting": "Outdoor & Area Lighting",
    "Telecommunication cabinets": "Telecommunication Racks & Cabinets",
    "Optical fiber network": "Fiber Optic Networks & Infrastructure",
    "Serial port": "Terminal Blocks & Modular Connectors",
    "Power and motor switches": "Motor Starters & Power Contactors",
    "Intake Pipes, Ground Pipes and Wells": "Underground Duct Banks, Inlets & Junction Pits",
    "Audio and video system": "Audio-Visual (AV) Systems",
    "Lamp rails": "Lighting Track Systems",
    "Hourly rates for extra work": "Hourly Rates for Additional Works",
    "Lighting control system units": "Lighting Control System Modules",
    "Acoustic seals, penetrations and moisture seals": "Firestop, Wall Penetrations & Moisture Seals",
    "Coil switches, actuators and contacts": "Contactors, Relays & Control Switches",
    "Switches and sensors": "Lighting Switches & Motion Sensors",
    "General for system": "General System Provisions",
    "Emergency lighting": "Emergency & Exit Lighting",
    "Charging stations for electric cars": "EV Charging Stations",
    "Fire seals": "Firestop & Cable Penetration Seals",
    "Steel": "Structural Steel & Mounting Channels",
}

def clean_str(s):
    if not s:
        return s
    t = str(s)
    t = re.sub(r'Pre-retracted trachea', 'Pre-wired Flexible Conduit', t, flags=re.IGNORECASE)
    t = re.sub(r'pre-retracted', 'pre-wired', t, flags=re.IGNORECASE)
    t = re.sub(r'tracheal tubes', 'flexible conduits', t, flags=re.IGNORECASE)
    t = re.sub(r'tracheal tube', 'flexible conduit', t, flags=re.IGNORECASE)
    t = re.sub(r'tracheas', 'flexible conduits', t, flags=re.IGNORECASE)
    t = re.sub(r'trachea', 'flexible conduit', t, flags=re.IGNORECASE)
    t = re.sub(r'Bark (\d+)', r'Flexible Conduit \1', t, flags=re.IGNORECASE)
    t = re.sub(r'Bark\b', 'Flexible Conduit', t, flags=re.IGNORECASE)
    t = re.sub(r'Corolla (\d+)', r'Flexible Conduit \1', t, flags=re.IGNORECASE)
    t = re.sub(r'borgholes inf\.?', 'fastenings & drilling included', t, flags=re.IGNORECASE)
    t = re.sub(r'borgát innif\.?', 'fastenings & drilling included', t, flags=re.IGNORECASE)
    t = re.sub(r'borgat innif\.?', 'fastenings & drilling included', t, flags=re.IGNORECASE)
    t = re.sub(r'Rope ladders', 'Cable Ladders', t, flags=re.IGNORECASE)
    t = re.sub(r'Rope ladder', 'Cable Ladder', t, flags=re.IGNORECASE)
    t = re.sub(r'Home Nerves', 'Utility Service Entrances', t, flags=re.IGNORECASE)
    t = re.sub(r'Melt safety', 'Fuse protection', t, flags=re.IGNORECASE)
    return t.strip()

def main():
    settings = get_settings()
    db_url = settings.database_url
    # convert postgresql+psycopg2:// to postgresql://
    if db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://", 1)

    print("Connecting to PostgreSQL directly via psycopg2...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT id, description_en, main_category_en, sub_category_en FROM labor_catalog_items")
    items = cur.fetchall()
    updated_items = 0
    for row in items:
        item_id, desc_en, main_en, sub_en = row
        c_main = main_en or ""
        c_sub = sub_en or ""
        c_desc = desc_en or ""

        n_main = MAIN_CAT_MAP.get(c_main, c_main)
        n_sub = SUB_CAT_MAP.get(c_sub, c_sub)
        n_desc = clean_str(c_desc)

        if n_main != c_main or n_sub != c_sub or n_desc != c_desc:
            cur.execute(
                "UPDATE labor_catalog_items SET main_category_en = %s, sub_category_en = %s, description_en = %s WHERE id = %s",
                (n_main, n_sub, n_desc, item_id)
            )
            updated_items += 1

    print(f"Updated {updated_items} items in labor_catalog_items.")

    cur.execute("SELECT id, condition_description_en FROM labor_catalog_item_conditions")
    conds = cur.fetchall()
    updated_conds = 0
    for row in conds:
        cid, cdesc_en = row
        c_cdesc = cdesc_en or ""
        n_cdesc = clean_str(c_cdesc)
        if n_cdesc != c_cdesc:
            cur.execute(
                "UPDATE labor_catalog_item_conditions SET condition_description_en = %s WHERE id = %s",
                (n_cdesc, cid)
            )
            updated_conds += 1

    print(f"Updated {updated_conds} condition variants in labor_catalog_item_conditions.")
    conn.commit()
    cur.close()
    conn.close()
    print("[SUCCESS] All labor catalog translations fixed in PostgreSQL!")

if __name__ == '__main__':
    main()
