"""El token de acceso incluye el nombre del usuario (solo para mostrarlo en la interfaz)."""

from app.core.security import decodificar_token


def test_token_incluye_nombre_rol_y_sub(client, db):
    from app.services.auth_service import crear_usuario

    crear_usuario(db, "María Pérez", "maria@test.com", "password123", "residente_obra")
    resp = client.post("/api/auth/login", data={"username": "maria@test.com", "password": "password123"})
    assert resp.status_code == 200, resp.text

    payload = decodificar_token(resp.json()["access_token"])
    assert payload["nombre"] == "María Pérez"
    assert payload["rol"] == "residente_obra"
    assert payload["sub"]


def test_me_devuelve_el_usuario_autenticado(client, token_admin):
    from .conftest import auth

    resp = client.get("/api/auth/me", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    datos = resp.json()
    assert datos["email"] == "admin@test.com"
    assert datos["rol"] == "administrador"
    assert datos["nombre"]
    assert "password_hash" not in datos


def test_me_requiere_token(client):
    assert client.get("/api/auth/me").status_code == 401
