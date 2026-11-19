#!/usr/bin/env bash
# Espera a que la API en producción sirva el commit recién desplegado y hace
# una prueba de humo. La usa el pipeline de CD después de disparar Render.
#
# Variables:
#   API_URL          URL pública de la API (ej. https://emanuel-obras.onrender.com)
#   WEB_URL          URL pública del frontend (ej. https://emanuel-obras.vercel.app)
#   VERSION_ESPERADA SHA del commit que se acaba de desplegar
#   TIEMPO_MAXIMO    segundos de espera máxima (por defecto 1200 = 20 min;
#                    el plan gratuito de Render construye la imagen y además
#                    "despierta" el servicio, así que puede tardar)
set -euo pipefail

: "${API_URL:?Falta API_URL}"
: "${WEB_URL:?Falta WEB_URL}"
: "${VERSION_ESPERADA:?Falta VERSION_ESPERADA}"
TIEMPO_MAXIMO="${TIEMPO_MAXIMO:-1200}"
INTERVALO=20

echo "Esperando la versión ${VERSION_ESPERADA:0:7} en $API_URL (máx. ${TIEMPO_MAXIMO}s)..."

inicio=$(date +%s)
version=""
while true; do
  respuesta="$(curl -fsS --max-time 60 "$API_URL/" 2>/dev/null || true)"
  version="$(echo "$respuesta" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("version", ""))
except Exception:
    print("")' 2>/dev/null || true)"

  transcurrido=$(( $(date +%s) - inicio ))
  if [ "$version" = "$VERSION_ESPERADA" ]; then
    echo "Versión nueva en línea tras ${transcurrido}s: $respuesta"
    break
  fi

  if [ "$transcurrido" -ge "$TIEMPO_MAXIMO" ]; then
    echo "::error::La API no mostró la versión ${VERSION_ESPERADA:0:7} en ${TIEMPO_MAXIMO}s (versión actual: '${version:-sin respuesta}'). Revisa el log del deploy en Render."
    exit 1
  fi

  echo "  ${transcurrido}s: versión actual '${version:-sin respuesta}', se reintenta en ${INTERVALO}s"
  sleep "$INTERVALO"
done

echo
echo "==> Prueba de humo en producción"
echo "$respuesta" | grep -q '"status":"ok"'

codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$API_URL/api/auth/me")"
echo "GET /api/auth/me sin token -> $codigo (se espera 401)"
test "$codigo" = "401"

codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$WEB_URL/")"
echo "Frontend $WEB_URL -> $codigo (se espera 200)"
test "$codigo" = "200"

echo
echo "Despliegue verificado."
