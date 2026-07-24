"""
Upload demo tenant car and tool pictures to Supabase Storage bucket 'rafapp-uploads'
and update seed_demo_tenant.py with the generated Supabase public URLs.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.storage import upload_file

PICTURES_DIR = Path(r"C:\Users\mario\Desktop\Rafapp stuff\Pictures")

ASSETS = [
    # Cars
    {"local": "Renault Master.jpg", "folder": "car_images", "filename": "renault_master.jpg"},
    {"local": "VW transporter.jpg", "folder": "car_images", "filename": "vw_transporter.jpg"},
    {"local": "Mercedes Vito.jpg", "folder": "car_images", "filename": "mercedes_vito.jpg"},
    {"local": "Ford Transit.jpg", "folder": "car_images", "filename": "ford_transit.jpg"},
    # Tools
    {"local": "Fluke 1664 FC.jpg", "folder": "tool_images", "filename": "fluke_1664_fc.jpg"},
    {"local": "Hilti TE 60-ATC.jpg", "folder": "tool_images", "filename": "hilti_te_60_atc.jpg"},
    {"local": "Milwaukee Force Logic Hydraulic Cable Crimper.jpg", "folder": "tool_images", "filename": "milwaukee_crimper.jpg"},
    {"local": "Megger MIT420.jpg", "folder": "tool_images", "filename": "megger_mit420.jpg"},
    {"local": "Bosch GLL 3-80.jpg", "folder": "tool_images", "filename": "bosch_gll_3_80.jpg"},
    {"local": "Fluke 87V.jpg", "folder": "tool_images", "filename": "fluke_87v.jpg"},
]

def main():
    print("Uploading demo asset pictures to Supabase Storage...")
    urls = {}
    for item in ASSETS:
        file_path = PICTURES_DIR / item["local"]
        if not file_path.exists():
            print(f"Error: {file_path} does not exist!")
            continue
        
        content = file_path.read_bytes()
        url = upload_file(
            content=content,
            filename=item["filename"],
            folder=item["folder"],
            content_type="image/jpeg"
        )
        urls[item["filename"]] = url
        print(f"Uploaded {item['filename']} -> {url}")

    return urls

if __name__ == "__main__":
    main()
