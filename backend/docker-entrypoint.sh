#!/bin/sh
# Corre las migraciones antes de levantar el servidor — así un despliegue
# nuevo o un contenedor reiniciado siempre arranca con el esquema al día.
set -e

echo "Aplicando migraciones de Alembic..."
alembic upgrade head

echo "Arrancando gunicorn..."
exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-2}" \
    --access-logfile - \
    --error-logfile -
