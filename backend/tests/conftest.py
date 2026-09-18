import os
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_emanuel_obras.db")
os.environ.setdefault("SECRET_KEY", "clave-de-pruebas-no-usar-en-produccion")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("ALLOWED_ORIGIN", "http://localhost:5173")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.auth_service import crear_usuario  # noqa: E402

# El límite de 5 intentos/min en /api/auth/login se prueba explícitamente en
# test_rate_limit_login.py; en el resto de pruebas se desactiva para no
# interferir (todas comparten la misma IP de prueba).
limiter.enabled = False


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _borrar_archivo_db_al_final():
    yield
    ruta = Path("test_emanuel_obras.db")
    if ruta.exists():
        ruta.unlink()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


def crear_usuario_y_token(client: TestClient, db, rol: str, email: str) -> str:
    crear_usuario(db, "Usuario de prueba", email, "password123", rol)
    resp = client.post("/api/auth/login", data={"username": email, "password": "password123"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def token_admin(client, db):
    return crear_usuario_y_token(client, db, "administrador", "admin@test.com")


@pytest.fixture
def token_residente(client, db):
    return crear_usuario_y_token(client, db, "residente_obra", "residente@test.com")


@pytest.fixture
def token_interventor(client, db):
    return crear_usuario_y_token(client, db, "interventor", "interventor@test.com")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
