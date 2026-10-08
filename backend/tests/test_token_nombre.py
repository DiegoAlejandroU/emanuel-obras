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
