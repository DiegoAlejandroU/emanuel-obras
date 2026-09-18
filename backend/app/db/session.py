from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.config import settings

# `connect_args` solo aplica a SQLite (se usa en las pruebas); en PostgreSQL
# create_engine lo ignora si no está presente en la URL.
_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
