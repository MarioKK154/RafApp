"""
Read Export 1 xlsx and write a clean CSV: Main category, Sub-category, Item, Conditions, Effective date, Unit cost (Eining).
"""
import csv
from pathlib import Path

try:
    import openpyxl
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "-q"])
    import openpyxl

DOWNLOADS = Path(r"C:\Users\mario\Downloads")
FILE1 = DOWNLOADS / "_export_1772304267679.xlsx"
OUT_CSV = Path(__file__).resolve().parent / "labor_cost_export.csv"

def main():
    wb = openpyxl.load_workbook(FILE1, read_only=True, data_only=True)
    ws = wb["data"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        print("No data")
        return
    headers = ["Main_category", "Sub_category", "Item", "Conditions", "Effective_date", "Unit_cost"]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for row in rows[1:]:
            if not row or len(row) < 6:
                continue
            main_cat = row[0] if row[0] is not None else ""
            sub_cat = row[1] if len(row) > 1 and row[1] is not None else ""
            item = row[2] if len(row) > 2 and row[2] is not None else ""
            conditions = row[3] if len(row) > 3 and row[3] is not None else ""
            effective = row[4] if len(row) > 4 and row[4] is not None else ""
            unit = row[5] if len(row) > 5 and row[5] is not None else ""
            if main_cat == "" and sub_cat == "" and item == "":
                continue
            w.writerow([main_cat, sub_cat, item, conditions, effective, unit])
    print(f"Written: {OUT_CSV}")

if __name__ == "__main__":
    main()
