# backend/scripts/migrate_piecework.py
import sys
import os
from sqlalchemy import inspect, text

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine
from app import models  # Force registration of models on Base

def run_migration():
    print("Starting database sync/migration...")
    
    # 1. Create any missing tables (e.g. piecework_rates, piecework_task_catalog, project_installation_logs)
    print("Creating missing tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Check and add missing columns to existing tables
    inspector = inspect(engine)
    
    with engine.begin() as connection:
        # Check projects columns
        projects_columns = [col["name"] for col in inspector.get_columns("projects")]
        print(f"Current columns in 'projects': {projects_columns}")
        
        if "is_certified" not in projects_columns:
            print("Adding 'is_certified' column to 'projects' table...")
            connection.execute(text("ALTER TABLE projects ADD COLUMN is_certified BOOLEAN DEFAULT FALSE"))
            
        if "certification_date" not in projects_columns:
            print("Adding 'certification_date' column to 'projects' table...")
            connection.execute(text("ALTER TABLE projects ADD COLUMN certification_date TIMESTAMP"))
            
        # Check time_logs columns
        timelogs_columns = [col["name"] for col in inspector.get_columns("time_logs")]
        print(f"Current columns in 'time_logs': {timelogs_columns}")
        
        if "actual_hours" not in timelogs_columns:
            print("Adding 'actual_hours' column to 'time_logs' table...")
            connection.execute(text("ALTER TABLE time_logs ADD COLUMN actual_hours FLOAT"))
            
        if "base_hourly_wage_paid" not in timelogs_columns:
            print("Adding 'base_hourly_wage_paid' column to 'time_logs' table...")
            connection.execute(text("ALTER TABLE time_logs ADD COLUMN base_hourly_wage_paid FLOAT"))
            
    print("Database sync completed successfully!")

if __name__ == "__main__":
    run_migration()
