"""Verifica el límite de 5 intentos/minuto en /api/auth/login (sección 8)."""

from app.core.rate_limit import limiter


def test_login_bloquea_despues_de_cinco_intentos(client):
    limiter.enabled = True
    try:
        for _ in range(5):
            resp = client.post("/api/auth/login", data={"username": "nadie@test.com", "password": "x"})
            assert resp.status_code in (401, 429)

        resp = client.post("/api/auth/login", data={"username": "nadie@test.com", "password": "x"})
        assert resp.status_code == 429, resp.text
    finally:
        limiter.enabled = False
        limiter.reset()
