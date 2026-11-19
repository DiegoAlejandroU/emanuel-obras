#!/usr/bin/env bash
# Prueba de humo del sistema levantado con docker-compose.yml (la usa el CI).
# Recorre el camino completo: frontend (nginx) -> API -> PostgreSQL con las
# migraciones aplicadas -> autenticación JWT.
#
# Uso: .github/scripts/prueba_humo_local.sh   (con `docker compose up` corriendo)
set -euo pipefail

API="${API_URL:-http://localhost:8000}"
WEB="${WEB_URL:-http://localhost:8080}"
EMAIL="ci-humo@emanuel-obras.co"
CLAVE="clave-de-prueba-ci-123"

paso() { echo; echo "==> $*"; }

paso "API responde en GET /"
salud="$(curl -fsS "$API/")"
echo "$salud"
echo "$salud" | grep -q '"status":"ok"'

paso "Migraciones aplicadas: la tabla de usuarios existe y se puede escribir"
docker compose exec -T backend python - <<PY
from app.db.session import SessionLocal
from app.services.auth_service import crear_usuario

db = SessionLocal()
try:
    crear_usuario(db, "Usuario CI", "$EMAIL", "$CLAVE", "administrador")
finally:
    db.close()
print("usuario de prueba creado")
PY

paso "Login devuelve un token JWT"
token="$(curl -fsS -X POST "$API/api/auth/login" \
  -d "username=$EMAIL" --data-urlencode "password=$CLAVE" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
test -n "$token"
echo "token recibido (${#token} caracteres)"

paso "Endpoint protegido acepta el token"
curl -fsS -H "Authorization: Bearer $token" "$API/api/auth/me" | grep -q "$EMAIL"
echo "GET /api/auth/me OK"

paso "Endpoint protegido rechaza peticiones sin token"
codigo="$(curl -s -o /dev/null -w '%{http_code}' "$API/api/auth/me")"
echo "GET /api/auth/me sin token -> $codigo"
test "$codigo" = "401"

paso "Frontend servido por nginx"
curl -fsS "$WEB/healthz" | grep -q ok
curl -fsS "$WEB/" | grep -q '<div id="root">'
# Ruta del cliente (react-router): nginx debe devolver index.html, no 404.
curl -fsS "$WEB/obras" | grep -q '<div id="root">'
echo "frontend OK"

echo
echo "Prueba de humo superada."
