"""Pruebas de los hallazgos menores de la auditoría (2026-09-23):
resolver_alerta restringido a administrador/interventor, validación ge=0 en
presupuestos/costos, y el cálculo de indicadores tras quitar el N+1 (mismo
resultado, una sola query)."""

from datetime import date, timedelta

from .conftest import auth


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def test_gerencia_no_puede_resolver_alerta(client, token_gerencia):
    # El chequeo de rol corre como dependencia antes del endpoint, así que
    # ni siquiera hace falta que la alerta exista para verificar el 403.
    resp = client.patch("/api/alertas/999999/resolver", headers=auth(token_gerencia))
    assert resp.status_code == 403, resp.text


def test_presupuesto_negativo_es_rechazado(client, token_admin):
    resp = client.post(
        "/api/obras/", json={"nombre": "Obra presupuesto inválido", "presupuesto_total": -100}, headers=auth(token_admin)
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["errores"][0]["campo"] == "presupuesto_total"


def test_costo_presupuestado_negativo_es_rechazado(client, token_admin):
    resp = client.post("/api/obras/", json={"nombre": "Obra"}, headers=auth(token_admin))
    obra = resp.json()

    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Excavación", "costo_presupuestado": -500},
        headers=auth(token_admin),
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["errores"][0]["campo"] == "costo_presupuestado"


def test_indicadores_con_varias_actividades(client, token_admin, token_residente, token_interventor, db):
    resp = client.post(
        "/api/obras/",
        json={
            "nombre": "Obra con dos actividades",
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

    residente_id = _id_usuario(db, "residente@test.com")
    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={
            "responsable_id": residente_id,
            "fecha": str(date.today()),
            "registros_avance": [
                {"actividad_id": actividad_a["id"], "avance_del_dia": 50},
                {"actividad_id": actividad_b["id"], "avance_del_dia": 25},
            ],
        },
        headers=auth(token_residente),
    )
    bitacora = resp.json()

    client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente)
    )
    client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_interventor)
    )

    resp = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    indicadores = resp.json()

    # avance físico = 0.6*50 + 0.4*25 = 30 + 10 = 40
    assert indicadores["avance_fisico_porcentual"] == 40.0
    # costo ejecutado = 600*0.5 + 400*0.25 = 300 + 100 = 400 -> 400/1000*100 = 40%
    assert indicadores["avance_financiero_porcentual"] == 40.0
    assert {a["avance_acumulado_porcentual"] for a in indicadores["actividades"]} == {50.0, 25.0}
