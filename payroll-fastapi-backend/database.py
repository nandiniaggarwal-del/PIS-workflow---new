import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variable database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Resolve absolute path for local data directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Dual-Database Engine initialization
if not DATABASE_URL:
    # Fallback to local SQLite for zero-setup developer sandbox
    sqlite_db_path = os.path.join(DATA_DIR, "payroll.db")
    DATABASE_URL = f"sqlite:///{sqlite_db_path}"
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Crucial for multi-threaded SQLite handling in FastAPI
    )
    print(f"Database: Running local development sandbox (SQLite: {sqlite_db_path})")
else:
    # Connecting to target enterprise PostgreSQL server
    # Add connection pooling parameters:
    # - pool_pre_ping: test connection health before giving it to FastAPI
    # - pool_recycle: automatically recycle connections every 30 minutes
    # - connect_timeout: fail fast if database is down
    engine = create_engine(
        DATABASE_URL,
        pool_size=15,
        max_overflow=25,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={"connect_timeout": 10}
    )
    print("Database: Running enterprise connection (PostgreSQL)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Session lifecycle dependency generator
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
