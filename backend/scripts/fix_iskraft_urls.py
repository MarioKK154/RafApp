import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

POSTGRES_URL = "postgresql://postgres.tntvbultwjeyizswvqax:Tf22%26%26%25WbaJkdxb@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def main():
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Find all items where shop_url_2 contains /iskraftvefur/
    res = db.execute(text("SELECT id, shop_url_2 FROM inventory_items WHERE shop_url_2 LIKE '%/iskraftvefur/%'")).fetchall()
    print(f"Found {len(res)} items with old Iskraft URLs.")

    count = 0
    for item_id, url in res:
        new_url = url.replace("/iskraftvefur/", "/")
        db.execute(text("UPDATE inventory_items SET shop_url_2 = :new_url WHERE id = :id"), {"new_url": new_url, "id": item_id})
        count += 1

    db.commit()
    print(f"Successfully fixed {count} Iskraft URLs in database.")
    db.close()

if __name__ == "__main__":
    main()
