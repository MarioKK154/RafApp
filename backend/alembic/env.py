# backend/alembic/env.py

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# --- Alembic Modifications Start ---

# Add project root to Python path to find the 'app' module
# This allows importing from 'app.models' etc.
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
# Load .env file located in the parent directory (backend/)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Try to import Base from your application's models
# Ensure app/models.py exists and defines 'Base' from app.database
try:
    # Assuming your models inherit from Base defined in app/database.py
    # and you have an app/models.py where your models (like User) are defined.
    from app.models import Base
except ImportError as e:
    print(f"Error importing Base from app.models: {e}")
    print("Please ensure backend/app/models.py exists and defines SQLAlchemy models inheriting from Base.")
    sys.exit(1) # Exit if models cannot be imported

# --- Alembic Modifications End ---

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Alembic Modification: Set target metadata ---
# Point Alembic to your models' metadata
target_metadata = Base.metadata
# --- Alembic Modification End ---

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # --- Alembic Modification: Get URL from environment for offline mode ---
    url = os.getenv('DATABASE_URL')
    if not url:
        print("Error: DATABASE_URL environment variable not set for offline migration.")
        sys.exit(1)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    # --- Alembic Modification End ---

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # --- Alembic Modification: Get URL from environment for online mode ---
    # Get database URL from environment variable set via load_dotenv
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL environment variable not set for online migration.")
        sys.exit(1)

    # Use the database URL directly when creating the engine
    # The configuration from alembic.ini is still available in 'config' object if needed
    # but engine_from_config expects 'sqlalchemy.url' which we modified in the .ini
    # Using create_engine directly with the env var is often clearer here.

    # Create engine configuration dictionary
    engine_config = {
        "url": db_url, # Use the URL loaded from .env
        "poolclass": pool.NullPool
    }

    connectable = engine_from_config(
        engine_config, # Pass the dictionary directly
        prefix="", # No prefix needed as keys are 'url', 'poolclass' etc.
    )
    # --- Alembic Modification End ---


    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()