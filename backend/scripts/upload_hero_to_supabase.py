"""
Upload generated landing page hero image to Supabase Storage and backend static folder.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.storage import upload_file

HERO_SRC = Path(r"C:\Users\mario\.gemini\antigravity\brain\a4a1acf0-918f-45cf-9d9e-a218510c0f47\rafapp_hero_electrician_1784995144438.jpg")
STATIC_DEST = Path(r"C:\Users\mario\Desktop\RafApp\backend\app\static\landing_hero_electrician.jpg")

def main():
    if not HERO_SRC.exists():
        print(f"Error: {HERO_SRC} not found!")
        return

    content = HERO_SRC.read_bytes()
    STATIC_DEST.write_bytes(content)
    print(f"Saved locally to {STATIC_DEST}")

    url = upload_file(
        content=content,
        filename="hero_electrician.jpg",
        folder="landing",
        content_type="image/jpeg"
    )
    print(f"Uploaded to Supabase Storage -> {url}")

if __name__ == "__main__":
    main()
