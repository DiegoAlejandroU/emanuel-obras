"""GET / es el endpoint de salud que usan el HEALTHCHECK de Docker, el CI
(docker compose --wait) y la prueba de humo del CD."""


def test_salud_responde_ok_con_version(client, monkeypatch):
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.setenv("APP_VERSION", "abc1234")

    resp = client.get("/")

    assert resp.status_code == 200
    cuerpo = resp.json()
    assert cuerpo["status"] == "ok"
    assert cuerpo["version"] == "abc1234"


def test_salud_prefiere_el_commit_de_render(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "f00dbeef")
    monkeypatch.setenv("APP_VERSION", "abc1234")

    assert client.get("/").json()["version"] == "f00dbeef"


def test_salud_sin_variables_reporta_local(client, monkeypatch):
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.delenv("APP_VERSION", raising=False)

    assert client.get("/").json()["version"] == "local"
