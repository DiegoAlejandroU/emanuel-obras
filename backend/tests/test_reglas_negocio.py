"""Pruebas de integración de la checklist manual (sección 10 del estándar)."""

from datetime import date, timedelta

from .conftest import auth


def _crear_obra_en_ejecucion(client, token_admin, **overrides):
    payload = {
        "nombre": "Puente La Esperanza",
        "contratista": "Emanuel S.A.S.",
        "ubicacion": "Sogamoso",
        "fecha_inicio": str(date.today() - timedelta(days=30)),
        "fecha_fin_estimada": str(date.today() + timedelta(days=60)),
        "presupuesto_total": 100_000_000,
    }
    payload.update(overrides)
    resp = client.post("/api/obras/", json=payload, headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    obra = resp.json()

    resp = client.patch(f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_mass_assignment_ignora_campos_no_declarados(client, token_admin):
    """Un POST con campos no declarados en el esquema (ej. id, estado) se ignora silenciosamente."""
    resp = client.post(
        "/api/obras/",
        json={"nombre": "Obra X", "id": 999, "estado": "terminada"},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    obra = resp.json()
    assert obra["id"] != 999
    assert obra["estado"] == "planificada"  # el valor por defecto, no "terminada"


def test_maquina_estados_transicion_invalida_responde_409(client, token_admin, token_residente, token_interventor, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)

    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={"responsable_id": _id_usuario(db, "residente@test.com"), "fecha": str(date.today())},
        headers=auth(token_residente),
    )
    assert resp.status_code == 200, resp.text
    bitacora = resp.json()
    assert bitacora["estado"] == "borrador"

    # borrador -> aprobada no es una transición válida (falta pasar por "enviada")
    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado",
        json={"estado": "aprobada"},
        headers=auth(token_interventor),
    )
    assert resp.status_code == 409, resp.text


def test_unicidad_bitacora_por_obra_y_fecha(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    payload = {"responsable_id": _id_usuario(db, "residente@test.com"), "fecha": str(date.today())}

    resp1 = client.post(f"/api/obras/{obra['id']}/bitacoras", json=payload, headers=auth(token_residente))
    assert resp1.status_code == 200, resp1.text

    resp2 = client.post(f"/api/obras/{obra['id']}/bitacoras", json=payload, headers=auth(token_residente))
    assert resp2.status_code == 409, resp2.text


def test_delete_protegido_obra_con_actividades(client, token_admin):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Excavación", "peso_porcentual": 1.0},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text

    resp = client.delete(f"/api/obras/{obra['id']}", headers=auth(token_admin))
    assert resp.status_code == 409, resp.text


def test_delete_obra_sin_relaciones_es_exitoso(client, token_admin):
    resp = client.post("/api/obras/", json={"nombre": "Obra sin relaciones"}, headers=auth(token_admin))
    obra = resp.json()

    resp = client.delete(f"/api/obras/{obra['id']}", headers=auth(token_admin))
    assert resp.status_code == 204, resp.text


def test_autorizacion_por_rol_residente_no_puede_aprobar(client, token_admin, token_residente, db):
    obra = _crear_obra_en_ejecucion(client, token_admin)
    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={"responsable_id": _id_usuario(db, "residente@test.com"), "fecha": str(date.today())},
        headers=auth(token_residente),
    )
    bitacora = resp.json()

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente)
    )
    assert resp.status_code == 200, resp.text

    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_residente)
    )
    assert resp.status_code == 403, resp.text


def test_calculo_indicadores_coincide_con_calculo_manual(client, token_admin, token_residente, token_interventor, db):
    obra = _crear_obra_en_ejecucion(client, token_admin, presupuesto_total=200_000)

    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Cimentación", "peso_porcentual": 0.4, "costo_presupuestado": 80_000},
        headers=auth(token_admin),
    )
    actividad_1 = resp.json()
    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Estructura", "peso_porcentual": 0.6, "costo_presupuestado": 120_000},
        headers=auth(token_admin),
    )
    actividad_2 = resp.json()

    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={
            "responsable_id": _id_usuario(db, "residente@test.com"),
            "fecha": str(date.today()),
            "registros_avance": [
                {"actividad_id": actividad_1["id"], "avance_del_dia": 50},
                {"actividad_id": actividad_2["id"], "avance_del_dia": 20},
            ],
        },
        headers=auth(token_residente),
    )
    bitacora = resp.json()

    # Una bitácora en borrador/enviada no debe mover el indicador todavía.
    resp = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin))
    assert resp.json()["avance_fisico_porcentual"] == 0

    client.patch(f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente))
    client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_interventor)
    )

    resp = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin))
    indicadores = resp.json()

    avance_fisico_esperado = 0.4 * 50 + 0.6 * 20  # = 32
    costo_ejecutado_esperado = 80_000 * 0.5 + 120_000 * 0.2  # = 64_000
    avance_financiero_esperado = costo_ejecutado_esperado / 200_000 * 100  # = 32

    assert indicadores["avance_fisico_porcentual"] == round(avance_fisico_esperado, 2)
    assert indicadores["avance_financiero_porcentual"] == round(avance_financiero_esperado, 2)


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id
