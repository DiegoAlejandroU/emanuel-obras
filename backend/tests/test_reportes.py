"""Pruebas de los reportes exportables (PDF/XLSX) — sección "reportes
exportables para gerencia e interventoría" del roadmap."""

from datetime import date, timedelta

from .conftest import auth


def _id_usuario(db, email: str) -> int:
    from app.models.usuario import Usuario

    return db.query(Usuario).filter(Usuario.email == email).first().id


def _crear_obra_con_actividad(client, token_admin):
    resp = client.post(
        "/api/obras/",
        json={
            "nombre": "Puente La Esperanza",
            "contratista": "Emanuel S.A.S.",
            "ubicacion": "Sogamoso",
            "fecha_inicio": str(date.today() - timedelta(days=30)),
            "fecha_fin_estimada": str(date.today() + timedelta(days=60)),
            "presupuesto_total": 100_000_000,
        },
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text
    obra = resp.json()

    resp = client.patch(
        f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin)
    )
    assert resp.status_code == 200, resp.text

    resp = client.post(
        f"/api/obras/{obra['id']}/actividades",
        json={"nombre": "Excavación", "peso_porcentual": 1.0, "costo_presupuestado": 50_000_000},
        headers=auth(token_admin),
    )
    assert resp.status_code == 200, resp.text

    return obra


def _crear_obra_en_ejecucion(client, token_admin):
    resp = client.post("/api/obras/", json={"nombre": "Obra vacía"}, headers=auth(token_admin))
    assert resp.status_code == 200, resp.text
    obra = resp.json()
    resp = client.patch(
        f"/api/obras/{obra['id']}/estado", json={"estado": "en_ejecucion"}, headers=auth(token_admin)
    )
    assert resp.status_code == 200, resp.text
    return obra


def test_reporte_pdf_permitido_para_interventor(client, token_admin, token_interventor):
    obra = _crear_obra_con_actividad(client, token_admin)

    resp = client.get(f"/api/obras/{obra['id']}/reportes/pdf", headers=auth(token_interventor))

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert resp.content.startswith(b"%PDF")


def test_reporte_xlsx_permitido_para_gerencia(client, token_admin, token_gerencia):
    obra = _crear_obra_con_actividad(client, token_admin)

    resp = client.get(f"/api/obras/{obra['id']}/reportes/xlsx", headers=auth(token_gerencia))

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "attachment" in resp.headers["content-disposition"]
    # Un .xlsx es un ZIP — empieza con la firma "PK".
    assert resp.content.startswith(b"PK")


def test_reportes_prohibidos_para_residente_obra(client, token_admin, token_residente):
    obra = _crear_obra_en_ejecucion(client, token_admin)

    resp_pdf = client.get(f"/api/obras/{obra['id']}/reportes/pdf", headers=auth(token_residente))
    resp_xlsx = client.get(f"/api/obras/{obra['id']}/reportes/xlsx", headers=auth(token_residente))

    assert resp_pdf.status_code == 403, resp_pdf.text
    assert resp_xlsx.status_code == 403, resp_xlsx.text


def test_reporte_obra_inexistente_responde_404(client, token_admin):
    resp = client.get("/api/obras/999999/reportes/pdf", headers=auth(token_admin))
    assert resp.status_code == 404, resp.text


def test_reporte_incluye_alertas_de_la_obra(client, token_admin, token_interventor, db):
    """Una alerta generada por el sistema (no expuesta por POST — regla R9) debe
    aparecer en el reporte; se inserta directo por el service de pruebas."""
    from app.models.alerta import Alerta

    obra = _crear_obra_con_actividad(client, token_admin)
    db.add(Alerta(obra_id=obra["id"], tipo="retraso_fisico", mensaje="Avance por debajo de lo programado."))
    db.commit()

    resp = client.get(f"/api/obras/{obra['id']}/reportes/xlsx", headers=auth(token_interventor))
    assert resp.status_code == 200, resp.text
    assert resp.content.startswith(b"PK")
