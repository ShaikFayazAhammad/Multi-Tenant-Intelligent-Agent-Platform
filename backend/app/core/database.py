import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)
database_url = settings.DATABASE_URL

def create_mysql_database_if_not_exists():
    """Create MySQL database schema automatically if it does not exist on MySQL server"""
    if "mysql" in database_url:
        try:
            import pymysql
            conn = pymysql.connect(
                host=settings.MYSQL_SERVER,
                user=settings.MYSQL_USER,
                password=settings.MYSQL_PASSWORD,
                port=int(settings.MYSQL_PORT)
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB}")
            conn.commit()
            cursor.close()
            conn.close()
            logger.info(f"MySQL database '{settings.MYSQL_DB}' verified/created.")
        except Exception as err:
            logger.warning(f"Could not initialize MySQL database directly: {err}")

# Attempt MySQL connection engine
try:
    if "mysql" in database_url:
        create_mysql_database_if_not_exists()
        engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=3600)
        # Test connection
        conn = engine.connect()
        conn.close()
        logger.info("Connected to MySQL Database Engine via SQLAlchemy")
    else:
        engine = create_engine(database_url, connect_args={"check_same_thread": False})
except Exception as e:
    logger.warning(f"MySQL server connection unavailable ({e}). Using persistent SQLite fallback.")
    sqlite_url = "sqlite:///./bfsi_platform_test.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
