import sys
import os
import json

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud import get_system_setting, set_system_setting

def main():
    db = SessionLocal()
    try:
        setting = get_system_setting(db, "landing_feed_json")
        if not setting:
            print("Error: landing_feed_json not found.")
            sys.exit(1)
            
        parsed = json.loads(setting.value)
        
        # 1. Update Hero Titles
        parsed["hero_title"] = "Unify Your Electrical Business Operations"
        parsed["hero_title_en"] = "Unify Your Electrical Business Operations"
        parsed["hero_title_is"] = "Samræmdu rekstur rafvirkjafyrirtækisins"
        
        parsed["hero_subtitle"] = "The ultimate operating system for electrical contractors. Merging time logs, scheduling, materials tracking, and asset telemetry in one sleek dashboard."
        parsed["hero_subtitle_en"] = "The ultimate operating system for electrical contractors. Merging time logs, scheduling, materials tracking, and asset telemetry in one sleek dashboard."
        parsed["hero_subtitle_is"] = "Fullkomið rekstrarkerfi fyrir rafvirkja. Sameinar tímaskráningu, skipulagningu, efnisstýringu og verkfæraskrá í einu stílhreinu mælaborði."
        
        # 2. Update News Items
        parsed["news"] = [
            {
                "title": "Interactive Gantt & Task Scheduler",
                "title_en": "Interactive Gantt & Task Scheduler",
                "title_is": "Gagnvirkt Gantt & verkaskipulag",
                "text": "Project managers can now schedule milestones, map task dependencies, and allocate technicians directly on the interactive Gantt chart. Schedules sync instantly to field technicians' mobile calendars.",
                "text_en": "Project managers can now schedule milestones, map task dependencies, and allocate technicians directly on the interactive Gantt chart. Schedules sync instantly to field technicians' mobile calendars.",
                "text_is": "Verkefnastjórar geta nú skipulagt áfanga, tengt verkverkefni og úthlutað starfsmönnum beint á gagnvirku Gantt-töflunni. Dagskrár samstillast samstundis við dagatöl rafvirkja í snjallsíma.",
                "link_url": "/dashboard",
                "link_label": "Explore module",
                "image_url": None,
                "source": None,
                "is_pinned": False,
                "starts_at": None,
                "ends_at": None
            },
            {
                "title": "Relevance-Sorted Materials Search",
                "title_en": "Relevance-Sorted Materials Search",
                "title_is": "Snjöll efnisleit og flokkun",
                "text": "Search our materials index with a smart sorting engine that prioritizes exact matches (e.g. 'nym-j') and lists similar items (e.g. halogen-free cables) lower down. Eliminates catalog search friction.",
                "text_en": "Search our materials index with a smart sorting engine that prioritizes exact matches (e.g. 'nym-j') and lists similar items (e.g. halogen-free cables) lower down. Eliminates catalog search friction.",
                "text_is": "Leitaðu í efnisskrá okkar með snjallri leitarvél sem setur nákvæmar samsvaranir (t.d. „nym-j“) í forgang og listar svipar vörur (t.d. halógenfría kapla) neðar. Lágmarkar leitartíma í vörulista.",
                "link_url": "/dashboard",
                "link_label": "View catalog",
                "image_url": None,
                "source": None,
                "is_pinned": False,
                "starts_at": None,
                "ends_at": None
            },
            {
                "title": "Advanced HR & Leave Pipeline",
                "title_en": "Advanced HR & Leave Pipeline",
                "title_is": "Háþróað starfsmanna- og leyfiskerfi",
                "text": "Track electrician logs, check-in locations, and request reviews in a unified workspace. Approve leave requests and export certified hours directly to accounting for payroll.",
                "text_en": "Track electrician logs, check-in locations, and request reviews in a unified workspace. Approve leave requests and export certified hours directly to accounting for payroll.",
                "text_is": "Fylgstu með tímaskráningu rafvirkja, stimplunarstaðsetningum og óskaðu eftir yfirferð á einum stað. Samþykktu leyfisbeiðnir og fluttu samþykkta tíma beint í bókhald til launavinnslu.",
                "link_url": "/dashboard",
                "link_label": "Manage team",
                "image_url": None,
                "source": None,
                "is_pinned": False,
                "starts_at": None,
                "ends_at": None
            }
        ]
        
        # Save back to database
        set_system_setting(db, "landing_feed_json", json.dumps(parsed))
        print("Successfully seeded all Icelandic and English translations for Hero and News items!")
        
    except Exception as e:
        print(f"Error seeding translations: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
