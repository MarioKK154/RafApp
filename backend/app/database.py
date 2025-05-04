# backend/app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("No DATABASE_URL environment variable set")

# Create the SQLAlchemy engine
# connect_args is specific to SQLite, not needed for PostgreSQL usually
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a SessionLocal class
# Each instance of SessionLocal will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class
# Models will inherit from this class
Base = declarative_base()

# Dependency for FastAPI routes to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()