"""Pruebas del control de propiedad en bitácoras (hallazgo de auditoría
2026-09-23): un residente_obra solo puede registrar/editar/eliminar/cambiar
el estado de sus PROPIAS bitácoras (README: "Registrar y editar bitácoras
propias"); administrador e interventor no tienen esa restricción."""

from datetime import date, timedelta

from .conftest import auth, crear_usuario_y_token


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def _crear_obra_en_ejecucion(client, token_admin):
    resp = client.post(
        "/api/obras/",
        json={
            "nombre": "Puente La Esperanza",
            "fecha_inicio": str(date.today() - timedelta(days=30)),
        },
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    obra = resp.json()
    resp = client.patch(
        f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin)
    )
    assert resp.status_code == 200, resp.text
    return obra


def _crear_bitacora(client, token, obra_id, responsable_id, fecha=None):
    return client.post(
        f"/api/obras/{obra_id}/bitacoras",
        json={"responsable_id": responsable_id, "fecha": str(fecha or date.today())},
        headers=auth(token),
    )


def test_residente_no_puede_crear_bitacora_para_otro_responsable(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    crear_usuario_y_token(client, db, "residente_obra", "otro_residente@test.com")
    otro_id = _id_usuario(db, "otro_residente@test.com")

    resp = _crear_bitacora(client, token_residente, obra["id"], otro_id)

    assert resp.status_code == 403, resp.text


def test_administrador_puede_crear_bitacora_para_cualquier_responsable(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")

    resp = _crear_bitacora(client, token_admin, obra["id"], residente_id)

    assert resp.status_code == 200, resp.text


def test_residente_no_puede_editar_bitacora_de_otro_residente(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora(client, token_residente, obra["id"], residente_id).json()

    token_otro = crear_usuario_y_token(client, db, "residente_obra", "otro_residente@test.com")
    resp = client.put(
        f"/api/bitacoras/{bitacora['id']}", json={"resumen": "intento ajeno"}, headers=auth(token_otro)
    )

    assert resp.status_code == 403, resp.text


def test_residente_no_puede_eliminar_bitacora_de_otro_residente(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora(client, token_residente, obra["id"], residente_id).json()

    token_otro = crear_usuario_y_token(client, db, "residente_obra", "otro_residente@test.com")
    resp = client.delete(f"/api/bitacoras/{bitacora['id']}", headers=auth(token_otro))

    assert resp.status_code == 403, resp.text


def test_residente_no_puede_cambiar_estado_de_bitacora_de_otro_residente(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora(client, token_residente, obra["id"], residente_id).json()

    token_otro = crear_usuario_y_token(client, db, "residente_obra", "otro_residente@test.com")
    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_otro)
    )

    assert resp.status_code == 403, resp.text


def test_gerencia_no_puede_cambiar_estado_de_bitacora(client, token_admin, token_residente, token_gerencia, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora(client, token_residente, obra["id"], residente_id).json()

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_gerencia)
    )

    assert resp.status_code == 403, resp.text


def test_interventor_puede_aprobar_bitacora_de_cualquier_residente(
    client, token_admin, token_residente, token_interventor, db
):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora(client, token_residente, obra["id"], residente_id).json()

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente)
    )
    assert resp.status_code == 200, resp.text

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_interventor)
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "aprobada"

