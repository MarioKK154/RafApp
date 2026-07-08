import sys
import os
import json
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

def main():
    client = TestClient(app)
    response = client.get("/api/system/landing-feed")
    data = response.json()
    
    print("=== HERO SECTION ===")
    print("hero_title:", data.get("hero_title"))
    print("hero_title_en:", data.get("hero_title_en"))
    print("hero_title_is:", data.get("hero_title_is"))
    print("hero_subtitle:", data.get("hero_subtitle"))
    print("hero_subtitle_en:", data.get("hero_subtitle_en"))
    print("hero_subtitle_is:", data.get("hero_subtitle_is"))
    
    print("\n=== NEWS ITEMS ===")
    for i, item in enumerate(data.get("news", [])):
        print(f"\nItem {i+1}:")
        print("  title:", item.get("title"))
        print("  title_en:", item.get("title_en"))
        print("  title_is:", item.get("title_is"))
        print("  text:", item.get("text"))
        print("  text_en:", item.get("text_en"))
        print("  text_is:", item.get("text_is"))

if __name__ == "__main__":
    main()
