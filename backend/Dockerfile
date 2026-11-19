# Imagen de producción del backend. Corre las migraciones de Alembic y
# levanta con gunicorn (workers de uvicorn) — no uvicorn --reload, que es
# solo para desarrollo.
#
# Solo instala requirements.txt (dependencias de la app); las de pruebas y
# calidad están en requirements-dev.txt y se usan en el CI, no en la imagen.
FROM python:3.12-slim

# Versión de la imagen (el SHA del commit en el pipeline de CD). La API la
# devuelve en GET / para que la prueba de humo sepa qué versión está viva.
ARG APP_VERSION=local

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_VERSION=${APP_VERSION}

WORKDIR /app

# Usuario sin privilegios: el proceso de la API no corre como root.
RUN groupadd --system app && useradd --system --gid app --home-dir /app app

# Primero solo requirements.txt: mientras no cambien las dependencias, Docker
# reutiliza esta capa en cache y el build es mucho más rápido.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app . .

# uploads/ debe ser escribible por el usuario "app" (fotos de avance). Si se
# monta un volumen con nombre ahí, Docker copia este dueño al volumen nuevo.
RUN chmod +x docker-entrypoint.sh \
    && mkdir -p uploads/avances \
    && chown -R app:app uploads

USER app

EXPOSE 8000

# Docker (y docker compose --wait) consideran el contenedor sano cuando la
# API responde en GET /.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4)" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
