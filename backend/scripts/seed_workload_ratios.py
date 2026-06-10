import pandas as pd
from app.database import SessionLocal
from app.models import WorkLoadRatio

def main():
    db = SessionLocal()
    try:
        df = pd.read_excel(r'C:\Users\mario\Desktop\AR\Ákvæðisgrundvöllur Álagshlutföll.xlsx')
        
        # Clear existing
        db.query(WorkLoadRatio).delete()
        
        added = 0
        for _, row in df.iterrows():
            code = str(row['Númer'])
            desc = str(row['Lýsing'])
            ratio = float(row['Hlutfall'])
            r_type = int(row['Tegund'])
            is_active = bool(row['Virkt'])
            
            wlr = WorkLoadRatio(
                code=code,
                description=desc,
                ratio=ratio,
                ratio_type=r_type,
                is_active=is_active
            )
            db.add(wlr)
            added += 1
            
        db.commit()
        print(f"Successfully seeded {added} WorkLoadRatio records.")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
