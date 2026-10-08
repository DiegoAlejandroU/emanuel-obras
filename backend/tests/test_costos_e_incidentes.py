"""Costo real por actividad (control de costos) y seguimiento de incidentes."""

from datetime import date, timedelta

from app.services.alertas_service import generar_alertas_retraso

from .conftest import auth


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def _obra_con_actividades(client, token_admin):
    obra = client.post(
        "/api/obras/",
        json={
            "nombre": "Obra costos",
            "fecha_inicio": str(date.today() - timedelta(days=20)),
            "presupuesto_total": 1000,
        },
        headers=auth(token_admin),
    ).json()
    client.patch(f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin))
    a = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Excavación", "peso_porcentual": 0.6, "costo_presupuestado": 600},
        headers=auth(token_admin),
    ).json()
    b = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Cimentación", "peso_porcentual": 0.4, "costo_presupuestado": 400},
        headers=auth(token_admin),
    ).json()
    return obra, a, b


def _bitacora(client, db, obra, token_residente, fecha, registros=None, incidentes=None):
    resp = client.post(
        f"/api/obras/{obra['id']}/bitacoras",
        json={
            "responsable_id": _id_usuario(db, "residente@test.com"),
            "fecha": str(fecha),
            "registros_avance": registros or [],
            "incidentes": incidentes or [],
        },
        headers=auth(token_residente),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _enviar(client, bitacora, token_residente):
    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "enviada"}, headers=auth(token_residente)
    )
    assert resp.status_code == 200, resp.text


def _aprobar(client, bitacora, token_residente, token_interventor):
    _enviar(client, bitacora, token_residente)
    resp = client.patch(
        f"/api/bitacoras/{bitacora['id']}/estado", json={"estado": "aprobada"}, headers=auth(token_interventor)
    )
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------- costo real


def test_costo_real_arranca_en_cero_y_admin_lo_actualiza(client, token_admin):
    obra, a, _ = _obra_con_actividades(client, token_admin)
    assert a["costo_real"] == 0

    resp = client.put(f"/api/actividades/{a['id']}", json={"costo_real": 250.5}, headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    assert resp.json()["costo_real"] == 250.5


def test_costo_real_no_acepta_negativos(client, token_admin):
    _, a, _ = _obra_con_actividades(client, token_admin)
    resp = client.put(f"/api/actividades/{a['id']}", json={"costo_real": -1}, headers=auth(token_admin))
    assert resp.status_code in (400, 422)


def test_residente_no_puede_registrar_costo_real(client, token_admin, token_residente):
    _, a, _ = _obra_con_actividades(client, token_admin)
    resp = client.put(f"/api/actividades/{a['id']}", json={"costo_real": 100}, headers=auth(token_residente))
    assert resp.status_code == 403


def test_indicadores_de_costo(client, db, token_admin, token_residente, token_interventor):
    obra, a, b = _obra_con_actividades(client, token_admin)
    # Excavación al 50% aprobado -> valor ganado 300; Cimentación sin avance.
    bit = _bitacora(
        client, db, obra, token_residente, date.today(),
        registros=[{"actividad_id": a["id"], "avance_del_dia": 50}],
    )
    _aprobar(client, bit, token_residente, token_interventor)
    client.put(f"/api/actividades/{a['id']}", json={"costo_real": 400}, headers=auth(token_admin))

    ind = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin)).json()
    assert ind["valor_ganado_total"] == 300
    assert ind["costo_real_total"] == 400
    assert ind["desviacion_costo"] == -100
    assert ind["indice_costo"] == 0.75
    act = next(x for x in ind["actividades"] if x["actividad_id"] == a["id"])
    assert (act["costo_presupuestado"], act["costo_real"], act["valor_ganado"]) == (600, 400, 300)
    # el avance financiero existente no cambia de significado
    assert ind["avance_financiero_porcentual"] == 30


def test_indice_de_costo_es_nulo_sin_costo_real(client, token_admin):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    ind = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin)).json()
    assert ind["costo_real_total"] == 0
    assert ind["indice_costo"] is None


def test_alerta_de_sobrecosto_sin_duplicados(client, db, token_admin, token_residente, token_interventor):
    obra, a, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(
        client, db, obra, token_residente, date.today(),
        registros=[{"actividad_id": a["id"], "avance_del_dia": 50}],
    )
    _aprobar(client, bit, token_residente, token_interventor)

    # Gasto razonable (310 vs 300 ganado = +3%): sin alerta de sobrecosto.
    client.put(f"/api/actividades/{a['id']}", json={"costo_real": 310}, headers=auth(token_admin))
    assert "sobrecosto" not in {x.tipo for x in generar_alertas_retraso(db, obra["id"])}

    # Gasto 50% por encima del avance aprobado: alerta, y una segunda corrida no la duplica.
    client.put(f"/api/actividades/{a['id']}", json={"costo_real": 450}, headers=auth(token_admin))
    nuevas = generar_alertas_retraso(db, obra["id"])
    sobrecostos = [x for x in nuevas if x.tipo == "sobrecosto"]
    assert len(sobrecostos) == 1
    assert "Excavación" in sobrecostos[0].mensaje
    assert not [x for x in generar_alertas_retraso(db, obra["id"]) if x.tipo == "sobrecosto"]


# ----------------------------------------------------------------- incidentes

_INCIDENTE = {"tipo": "logistico", "descripcion": "No llegó el acero", "gravedad": "alta"}


def test_incidentes_de_borrador_no_se_listan_hasta_enviar(client, db, token_admin, token_residente):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])

    resp = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin))
    assert resp.status_code == 200 and resp.json() == []

    _enviar(client, bit, token_residente)
    lista = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin)).json()
    assert len(lista) == 1
    assert lista[0]["estado"] == "abierto"
    assert lista[0]["vencido"] is False
    assert lista[0]["fecha_reporte"] == str(date.today())


def test_admin_gestiona_y_cierra_incidente(client, db, token_admin, token_residente):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])
    _enviar(client, bit, token_residente)
    inc_id = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin)).json()[0]["id"]

    limite = str(date.today() + timedelta(days=5))
    resp = client.patch(
        f"/api/incidentes/{inc_id}",
        json={"estado": "en_gestion", "responsable": "Compras", "fecha_limite": limite},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["estado"] == "en_gestion"
    assert resp.json()["responsable"] == "Compras"
    assert resp.json()["fecha_limite"] == limite
    assert resp.json()["cerrado_en"] is None

    resp = client.patch(f"/api/incidentes/{inc_id}", json={"estado": "cerrado"}, headers=auth(token_admin))
    assert resp.json()["estado"] == "cerrado" and resp.json()["cerrado_en"] is not None

    resp = client.patch(f"/api/incidentes/{inc_id}", json={"estado": "abierto"}, headers=auth(token_admin))
    assert resp.json()["estado"] == "abierto" and resp.json()["cerrado_en"] is None


def test_estado_de_incidente_invalido(client, db, token_admin, token_residente):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])
    _enviar(client, bit, token_residente)
    inc_id = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin)).json()[0]["id"]
    resp = client.patch(f"/api/incidentes/{inc_id}", json={"estado": "inventado"}, headers=auth(token_admin))
    assert resp.status_code in (400, 422)


def test_gerencia_no_puede_modificar_incidentes(client, db, token_admin, token_residente, token_gerencia):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])
    _enviar(client, bit, token_residente)
    inc_id = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_gerencia)).json()[0]["id"]
    resp = client.patch(f"/api/incidentes/{inc_id}", json={"estado": "cerrado"}, headers=auth(token_gerencia))
    assert resp.status_code == 403


def test_incidente_de_borrador_no_admite_seguimiento(client, db, token_admin, token_residente):
    from app.models.incidente import Incidente

    obra, _, _ = _obra_con_actividades(client, token_admin)
    _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])
    inc_id = db.query(Incidente).first().id
    resp = client.patch(f"/api/incidentes/{inc_id}", json={"estado": "cerrado"}, headers=auth(token_admin))
    assert resp.status_code == 409


def test_incidente_inexistente(client, token_admin):
    resp = client.patch("/api/incidentes/999999", json={"estado": "cerrado"}, headers=auth(token_admin))
    assert resp.status_code == 404


def test_incidente_vencido_cuenta_en_indicadores_y_genera_alerta(client, db, token_admin, token_residente):
    obra, _, _ = _obra_con_actividades(client, token_admin)
    bit = _bitacora(client, db, obra, token_residente, date.today(), incidentes=[_INCIDENTE])
    _enviar(client, bit, token_residente)
    inc_id = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin)).json()[0]["id"]

    ayer = str(date.today() - timedelta(days=1))
    client.patch(f"/api/incidentes/{inc_id}", json={"fecha_limite": ayer}, headers=auth(token_admin))

    lista = client.get(f"/api/obras/{obra['id']}/incidentes", headers=auth(token_admin)).json()
    assert lista[0]["vencido"] is True
    ind = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin)).json()
    assert ind["incidentes_abiertos"] == 1 and ind["incidentes_vencidos"] == 1

    nuevas = generar_alertas_retraso(db, obra["id"])
    assert "incidente_vencido" in {x.tipo for x in nuevas}

    # al cerrarlo deja de contar como abierto/vencido
    client.patch(f"/api/incidentes/{inc_id}", json={"estado": "cerrado"}, headers=auth(token_admin))
    ind = client.get(f"/api/obras/{obra['id']}/indicadores", headers=auth(token_admin)).json()
    assert ind["incidentes_abiertos"] == 0 and ind["incidentes_vencidos"] == 0
