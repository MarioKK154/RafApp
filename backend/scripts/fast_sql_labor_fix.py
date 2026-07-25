import sys
sys.path.insert(0, 'backend')
from app.database import engine
from sqlalchemy import text

SQL_STATEMENTS = [
    "UPDATE labor_catalog_items SET main_category_en = 'LIGHTING SYSTEMS' WHERE main_category_en = 'DESCRIPTION SYSTEM';",
    "UPDATE labor_catalog_items SET main_category_en = 'CONDUIT & CABLE TRAY RUNS' WHERE main_category_en = 'PIPELINES';",
    "UPDATE labor_catalog_items SET main_category_en = 'SPECIALIZED & CONTROL SYSTEMS' WHERE main_category_en = 'PRIVATE AND ADMINISTRATIVE SYSTEMS';",
    "UPDATE labor_catalog_items SET main_category_en = 'GENERAL WORKS & PREPARATION' WHERE main_category_en = 'GENERAL';",

    "UPDATE labor_catalog_items SET sub_category_en = 'Conduits & Flexible Tubing' WHERE sub_category_en = 'Tubes and tracheas';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Distribution Boards, Panels & Enclosures' WHERE sub_category_en = 'Tables, cabinets and boxes';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Receptacles, Plugs & Sockets' WHERE sub_category_en = 'Links, claws and cases';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Junction Boxes & Flush Enclosures' WHERE sub_category_en = 'Cans and inset boxes';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Fuses & Thermal Cutouts' WHERE sub_category_en = 'Melt safety equipment';",
    "UPDATE labor_catalog_items SET sub_category_en = 'MCBs & Residual Current Devices (RCDs)' WHERE sub_category_en = 'Circuit breakers and circuit breakers';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Utility Service Entrances & Metering' WHERE sub_category_en = 'Home Nerves and Energy Measurement';",
    "UPDATE labor_catalog_items SET sub_category_en = 'LED Strips & Architectural Lighting' WHERE sub_category_en = 'LED banners';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Cable Ladders & Cable Trays' WHERE sub_category_en = 'Rope ladders and trays';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Cable Trunking & Dado Raceways' WHERE sub_category_en = 'Cable and link chutes';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Core Drilling, Chasing & Concrete Work' WHERE sub_category_en = 'Holes, slots and broken work';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Unit Heaters, Radiators & Heating Elements' WHERE sub_category_en = 'Heaters, heaters and heaters';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Aluminum Power Cables' WHERE sub_category_en = 'Power cables Al';",
    "UPDATE labor_catalog_items SET sub_category_en = 'Copper Power Cables' WHERE sub_category_en = 'Power cables Cu';",

    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Pre-retracted trachea', 'Pre-wired Flexible Conduit') WHERE description_en ILIKE '%trachea%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'trachea', 'flexible conduit') WHERE description_en ILIKE '%trachea%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Trachea', 'Flexible Conduit') WHERE description_en ILIKE '%trachea%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Bark 16 mm', 'Flexible Conduit 16 mm') WHERE description_en ILIKE '%Bark%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Bark 20 mm', 'Flexible Conduit 20 mm') WHERE description_en ILIKE '%Bark%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Bark 25 mm', 'Flexible Conduit 25 mm') WHERE description_en ILIKE '%Bark%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Bark 32 mm', 'Flexible Conduit 32 mm') WHERE description_en ILIKE '%Bark%';",
    "UPDATE labor_catalog_items SET description_en = REPLACE(description_en, 'Corolla 20 mm', 'Flexible Conduit 20 mm') WHERE description_en ILIKE '%Corolla%';",

    "UPDATE labor_catalog_item_conditions SET condition_description_en = REPLACE(condition_description_en, 'Covers external tracheal tubes, fixed with tension borgholes inf.', 'Surface-mounted flexible conduits, secured with clamps (fastenings & drilling included).') WHERE condition_description_en ILIKE '%tracheal%';",
    "UPDATE labor_catalog_item_conditions SET condition_description_en = REPLACE(condition_description_en, 'Covers external tracheal tubes, fixed with tension borgät innif', 'Surface-mounted flexible conduits, secured with clamps (fastenings & drilling included)') WHERE condition_description_en ILIKE '%tracheal%';",
    "UPDATE labor_catalog_item_conditions SET condition_description_en = REPLACE(condition_description_en, 'Covers external pipes, fixed with tension borgholes inf.', 'Surface-mounted conduits, secured with clamps (fastenings & drilling included)') WHERE condition_description_en ILIKE '%borgholes%';",
]

def main():
    conn = engine.connect()
    for stmt in SQL_STATEMENTS:
        res = conn.execute(text(stmt))
        print(f"Executed: {stmt[:60]}... -> rows: {res.rowcount}")
    conn.commit()
    conn.close()
    print("[SUCCESS] Fast SQL Labor Fix Completed!")

if __name__ == '__main__':
    main()
