"""Pruebas de fotos adjuntas a registros de avance de actividad."""

from datetime import date, timedelta

from .conftest import auth, crear_usuario_y_token

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def _crear_obra_en_ejecucion(client, token_admin):
    resp = client.post(
        "/api/obras/",
        json={"nombre": "Puente La Esperanza", "fecha_inicio": str(date.today() - timedelta(days=30))},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    obra = resp.json()
    resp = client.patch(
        f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin)
    )
    assert resp.status_code == 200, resp.text
    return obra


def _crear_actividad(client, token_admin, obra_id):
    resp = client.post(
        f"/api/obras/{obra_id}/actividades",
        json={"nombre": "Excavación", "peso_porcentual": 1.0, "costo_presupuestado": 1000},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _crear_bitacora_con_avance(client, token, obra_id, responsable_id, actividad_id):
    resp = client.post(
        f"/api/obras/{obra_id}/bitacoras",
        json={
            "responsable_id": responsable_id,
            "registros_avance": [{"actividad_id": actividad_id, "avance_del_dia": 10}],
        },
        headers=auth(token),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_subir_y_descargar_foto(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    actividad = _crear_actividad(client, token_admin, obra["id"])
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora_con_avance(client, token_residente, obra["id"], residente_id, actividad["id"])
    registro_id = bitacora["registros_avance"][0]["id"]

    resp = client.post(
        f"/api/bitacoras/registros-avance/{registro_id}/fotos",
        files=[("archivos", ("avance.png", PNG_1X1, "image/png"))],
        headers=auth(token_residente),
    )
    assert resp.status_code == 200, resp.text
    fotos = resp.json()
    assert len(fotos) == 1
    assert fotos[0]["nombre_original"] == "avance.png"
    assert fotos[0]["tamano_bytes"] == len(PNG_1X1)

    resp = client.get(f"/api/bitacoras/fotos/{fotos[0]['id']}", headers=auth(token_residente))
    assert resp.status_code == 200
    assert resp.content == PNG_1X1


def test_formato_no_admitido_es_rechazado(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    actividad = _crear_actividad(client, token_admin, obra["id"])
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora_con_avance(client, token_residente, obra["id"], residente_id, actividad["id"])
    registro_id = bitacora["registros_avance"][0]["id"]

    resp = client.post(
        f"/api/bitacoras/registros-avance/{registro_id}/fotos",
        files=[("archivos", ("avance.pdf", b"%PDF-1.4", "application/pdf"))],
        headers=auth(token_residente),
    )
    assert resp.status_code == 400, resp.text


def test_otro_residente_no_puede_subir_foto(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    actividad = _crear_actividad(client, token_admin, obra["id"])
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora_con_avance(client, token_residente, obra["id"], residente_id, actividad["id"])
    registro_id = bitacora["registros_avance"][0]["id"]

    token_otro = crear_usuario_y_token(client, db, "residente_obra", "otro_residente@test.com")

    resp = client.post(
        f"/api/bitacoras/registros-avance/{registro_id}/fotos",
        files=[("archivos", ("avance.png", PNG_1X1, "image/png"))],
        headers=auth(token_otro),
    )
    assert resp.status_code == 403, resp.text


def test_no_se_puede_subir_foto_a_bitacora_enviada(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    actividad = _crear_actividad(client, token_admin, obra["id"])
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora_con_avance(client, token_residente, obra["id"], residente_id, actividad["id"])
    registro_id = bitacora["registros_avance"][0]["id"]

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente)
    )
    assert resp.status_code == 200, resp.text

    resp = client.post(
        f"/api/bitacoras/registros-avance/{registro_id}/fotos",
        files=[("archivos", ("avance.png", PNG_1X1, "image/png"))],
        headers=auth(token_residente),
    )
    assert resp.status_code == 409, resp.text


def test_eliminar_foto(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    actividad = _crear_actividad(client, token_admin, obra["id"])
    residente_id = _id_usuario(db, "residente@test.com")
    bitacora = _crear_bitacora_con_avance(client, token_residente, obra["id"], residente_id, actividad["id"])
    registro_id = bitacora["registros_avance"][0]["id"]

    resp = client.post(
        f"/api/bitacoras/registros-avance/{registro_id}/fotos",
        files=[("archivos", ("avance.png", PNG_1X1, "image/png"))],
        headers=auth(token_residente),
    )
    foto_id = resp.json()[0]["id"]

    resp = client.delete(f"/api/bitacoras/fotos/{foto_id}", headers=auth(token_residente))
    assert resp.status_code == 204, resp.text

    resp = client.get(f"/api/bitacoras/fotos/{foto_id}", headers=auth(token_residente))
    assert resp.status_code == 404
