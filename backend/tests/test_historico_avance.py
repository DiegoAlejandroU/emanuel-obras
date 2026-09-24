"""Pruebas de GET /api/obras/{obra_id}/indicadores/historico: la curva de
avance acumulado en el tiempo debe usar exactamente la misma fórmula de
ponderación que /indicadores (comparten `_resumen_desde_acumulados`), contar
solo bitácoras `aprobada` y devolver un punto por fecha distinta."""

from datetime import date, timedelta

from .conftest import auth


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def _crear_obra_con_dos_actividades(client, token_admin):
    resp = client.post(
        "/api/obras/",
        json={
            "nombre": "Obra histórico",
            "fecha_inicio": str(date.today() - timedelta(days=10)),
            "presupuesto_total": 1000,
        },
        headers=auth(token_admin),
    )
    obra = resp.json()
    client.patch(f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin))

    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Excavación", "peso_porcentual": 0.6, "costo_presupuestado": 600},
        headers=auth(token_admin),
    )
    actividad_a = resp.json()
    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Cimentación", "peso_porcentual": 0.4, "costo_presupuestado": 400},
        headers=auth(token_admin),
    )
    actividad_b = resp.json()
    return obra, actividad_a, actividad_b


def _crear_bitacora(client, db, obra, actividad_a, actividad_b, fecha, avance_a, avance_b, token_residente):
    residente_id = _id_usuario(db, "residente@test.com")
    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={
            "responsable_id": residente_id,
            "fecha": str(fecha),
            "registros_avance": [
                {"actividad_id": actividad_a["id"], "avance_del_dia": avance_a},
                {"actividad_id": actividad_b["id"], "avance_del_dia": avance_b},
            ],
        },
        headers=auth(token_residente),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _aprobar(client, bitacora, token_residente, token_interventor):
    client.patch(f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente))
    client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_interventor)
    )


def test_historico_vacio_sin_bitacoras_aprobadas(client, token_admin):
    obra, _, _ = _crear_obra_con_dos_actividades(client, token_admin)

    resp = client.get(f"/api/obras/{obra['id']}/indicadores/historico", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_historico_excluye_bitacoras_no_aprobadas(client, db, token_admin, token_residente):
    obra, actividad_a, actividad_b = _crear_obra_con_dos_actividades(client, token_admin)
    bitacora = _crear_bitacora(
        client, db, obra, actividad_a, actividad_b, date.today(), 20, 10, token_residente
    )
    # se queda en 'enviada' — nunca se aprueba
    client.patch(f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente))

    resp = client.get(f"/api/obras/{obra['id']}/indicadores/historico", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_historico_un_punto(client, db, token_admin, token_residente, token_interventor):
    obra, actividad_a, actividad_b = _crear_obra_con_dos_actividades(client, token_admin)
    fecha = date.today()
    bitacora = _crear_bitacora(client, db, obra, actividad_a, actividad_b, fecha, 20, 10, token_residente)
    _aprobar(client, bitacora, token_residente, token_interventor)

    resp = client.get(f"/api/obras/{obra['id']}/indicadores/historico", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    puntos = resp.json()

    assert len(puntos) == 1
    assert puntos[0]["fecha"] == str(fecha)
    # avance físico = 0.6*20 + 0.4*10 = 16; financiero = (600*0.2+400*0.1)/1000*100 = 16
    assert puntos[0]["avance_fisico_porcentual"] == 16.0
    assert puntos[0]["avance_financiero_porcentual"] == 16.0


def test_historico_acumula_por_fecha_y_coincide_con_indicadores(client, db, token_admin, token_residente, token_interventor):
    obra, actividad_a, actividad_b = _crear_obra_con_dos_actividades(client, token_admin)
    fecha_1 = date.today() - timedelta(days=5)
    fecha_2 = date.today()

    bitacora_1 = _crear_bitacora(client, db, obra, actividad_a, actividad_b, fecha_1, 20, 10, token_residente)
    _aprobar(client, bitacora_1, token_residente, token_interventor)

    bitacora_2 = _crear_bitacora(client, db, obra, actividad_a, actividad_b, fecha_2, 30, 15, token_residente)
    _aprobar(client, bitacora_2, token_residente, token_interventor)

    resp = client.get(f"/api/obras/{obra['id']}/indicadores/historico", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    puntos = resp.json()

    assert len(puntos) == 2
    assert [p["fecha"] for p in puntos] == [str(fecha_1), str(fecha_2)]

    # primer punto: igual al caso de un solo punto
    assert puntos[0]["avance_fisico_porcentual"] == 16.0
    assert puntos[0]["avance_financiero_porcentual"] == 16.0

    # segundo punto: acumulado a=50, b=25 -> físico 40, financiero 40
    assert puntos[1]["avance_fisico_porcentual"] == 40.0
    assert puntos[1]["avance_financiero_porcentual"] == 40.0

    # el último punto del histórico debe coincidir exactamente con la foto
    # actual de /indicadores (misma fórmula, mismos datos acumulados)
    resp_indicadores = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin))
    indicadores = resp_indicadores.json()
    assert puntos[-1]["avance_fisico_porcentual"] == indicadores["avance_fisico_porcentual"]
    assert puntos[-1]["avance_financiero_porcentual"] == indicadores["avance_financiero_porcentual"]
