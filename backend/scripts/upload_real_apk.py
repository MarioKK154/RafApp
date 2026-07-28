import os
import shutil
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.storage import upload_file

REAL_APK_PATH = r"C:\Users\mario\Desktop\Rafapp stuff\RafApp.apk"

def main():
    if not os.path.exists(REAL_APK_PATH):
        print(f"ERROR: File not found at {REAL_APK_PATH}")
        sys.exit(1)

    apk_size = os.path.getsize(REAL_APK_PATH)
    print(f"Found real APK at: {REAL_APK_PATH} ({apk_size} bytes / {apk_size / (1024*1024):.2f} MB)")

    # 1. Copy to local project directories
    destinations = [
        r"C:\Users\mario\Desktop\RafApp\frontend\public\downloads\rafapp-v1.0.apk",
        r"C:\Users\mario\Desktop\RafApp\frontend\dist\downloads\rafapp-v1.0.apk",
        r"C:\Users\mario\Desktop\RafApp\backend\app\static\downloads\rafapp-v1.0.apk",
        r"C:\Users\mario\Desktop\RafApp\frontend\public\downloads\RafApp.apk",
        r"C:\Users\mario\Desktop\RafApp\frontend\dist\downloads\RafApp.apk",
    ]

    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(REAL_APK_PATH, dest)
        print(f"Copied to local path: {dest}")

    # 2. Read APK bytes
    with open(REAL_APK_PATH, "rb") as f:
        apk_bytes = f.read()

    # 3. Upload to Supabase Storage in 'rafapp-uploads' bucket
    url1 = upload_file(apk_bytes, "rafapp-v1.0.apk", "downloads", "application/vnd.android.package-archive")
    url2 = upload_file(apk_bytes, "RafApp.apk", "downloads", "application/vnd.android.package-archive")

    print("\n--- SUPABASE UPLOAD RESULTS ---")
    print(f"Uploaded rafapp-v1.0.apk: {url1}")
    print(f"Uploaded RafApp.apk:       {url2}")

if __name__ == "__main__":
    main()
