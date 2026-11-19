# Sistema de Ejecución y Seguimiento de Obras — Emanuel Ingeniería y Construcciones S.A.S.

Proyecto de práctica profesional (Ingeniería de Sistemas — Universidad Santo Tomás, Tunja).

## Objetivo

Sistema web compuesto por varios módulos que trabajan juntos:

1. **Bitácora digital de obra**: registro diario de actividades ejecutadas, personal en obra, materiales consumidos e incidentes, con un flujo de aprobación (`borrador → enviada → aprobada/rechazada`) a cargo del interventor.
2. **Dashboard de indicadores**: avance físico y financiero por obra y por actividad, calculado únicamente a partir de bitácoras **aprobadas**.
3. **Alertas de retraso**: generadas por el sistema (no por el usuario) comparando avance real vs. programado.
4. **Control de acceso por roles**: `administrador`, `residente_obra`, `interventor`, `gerencia`.

El desarrollo sigue el `Estándar de Normalización — Emanuel_Obras` (convenciones de Git, nomenclatura, modelo de datos, reglas de negocio, arquitectura y seguridad).

## Stack

- **Backend**: FastAPI + PostgreSQL (SQLAlchemy) + JWT (OAuth2) + RBAC
- **Frontend**: React + Vite + Tailwind CSS

## Estructura del backend

```
backend/app/
├── main.py                  # crea la app, CORS, exception handlers, monta routers
├── core/
│   ├── config.py            # Settings (pydantic-settings), falla rápido si falta una variable
│   ├── security.py          # hashing (bcrypt) y JWT
│   ├── deps.py               # Depends(verificar_token) / Depends(requiere_rol(...))
│   └── rate_limit.py         # límite de intentos en /api/auth/login
├── db/                       # engine, SessionLocal, Base declarativa
├── models/                   # una clase SQLAlchemy por entidad
├── schemas/                  # Pydantic — Crear / Actualizar / Respuesta por recurso
├── services/                  # reglas de negocio (R1–R10 del estándar), nunca tocan Request/Response
├── routers/                   # path operations delgadas, delegan al service
└── exceptions.py              # AppError + formato de error uniforme
```

## Cómo correr el backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # En Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt   # app + herramientas de pruebas
cp .env.example .env         # ajustar DATABASE_URL y generar un SECRET_KEY propio
uvicorn app.main:app --reload
```

**En Windows**, `backend\setup_entorno.bat` hace los tres primeros pasos (crea `.venv`, instala `requirements-dev.txt` y copia `.env.example` a `.env` si no existe) — correrlo una sola vez con doble clic o `setup_entorno.bat` desde `backend\`. Después hay que editar `backend\.env` con la clave real del usuario `postgres` y crear la base de datos (`psql -U postgres -c "CREATE DATABASE emanuel_obras;"`) antes de arrancar el backend.

La API queda en `http://localhost:8000` y la documentación interactiva en `http://localhost:8000/docs`.

**Primer usuario administrador** (necesario para poder crear el resto de usuarios desde la API/UI):

```bash
python -m scripts.crear_usuario_admin
```

**Generar alertas de retraso** (nunca se crean por POST del usuario — regla R9 del estándar):

```bash
python -m scripts.generar_alertas
```

**Tarea programada (Windows Task Scheduler).** `backend/scripts/tarea_programada_alertas.bat` ejecuta el comando anterior usando el Python del `.venv` del proyecto (o el `python` del PATH si no hay `.venv`) y guarda cada corrida en `backend/logs/alertas.log`. Para registrarla, una sola vez, en `cmd` o PowerShell normal (no requiere permisos de administrador):

```
schtasks /create /tn "EmanuelObras - Alertas de retraso" /tr "C:\Users\diego\Documents\emanuel-obras\backend\scripts\tarea_programada_alertas.bat" /sc daily /st 06:00 /rl LIMITED /f
```

Esto la deja corriendo todos los días a las 6:00 a. m. (ajustable con `/st`). Para revisar el historial: `type backend\logs\alertas.log`. Para quitarla: `schtasks /delete /tn "EmanuelObras - Alertas de retraso" /f`.

### Pruebas y calidad (checklist del estándar)

```bash
pytest -q            # pruebas de integración de las reglas de negocio (usa SQLite, no toca la BD real)
ruff check app scripts tests
bandit -r app
pip-audit -r requirements.txt
```

Las dependencias están separadas: `requirements.txt` es solo lo que necesita la app (es lo único que entra a la imagen Docker) y `requirements-dev.txt` agrega las herramientas de pruebas y calidad. El pipeline de CI corre estos mismos comandos en cada push (ver [Docker, CI y CD](#docker-ci-y-cd)).

**Reportes exportables (PDF/XLSX).** `GET /api/obras/{obra_id}/reportes/pdf` y `GET /api/obras/{obra_id}/reportes/xlsx` — roles `administrador`, `gerencia` e `interventor` (no `residente_obra`). Incluyen los datos de la obra, los indicadores de avance físico/financiero, el avance por actividad y las alertas (activas y resueltas). Se generan al vuelo a partir de los mismos datos de `/indicadores` y `/alertas`, sin tablas nuevas. Desde el dashboard del frontend aparecen como botones "Descargar reporte PDF/Excel" cuando el usuario tiene uno de esos roles.

**Fotos de avance.** Al registrar el avance de una actividad en la bitácora (`residente_obra`/`administrador`) se pueden adjuntar fotos (JPG/PNG/WEBP, máx. 8 MB c/u, hasta 12 por registro). Los archivos se guardan en disco bajo `backend/uploads/` (montado como volumen en `docker-compose.prod.yml` para que sobrevivan a un redeploy) — la base de datos solo guarda el metadato (`fotos_avance`). Mismas reglas que el resto de la bitácora: solo se pueden agregar/quitar fotos mientras esté en `borrador`/`rechazada` (R4), y un `residente_obra` solo sobre sus propias bitácoras. Endpoints: `POST /api/bitacoras/registros-avance/{id}/fotos` (multipart), `GET /api/bitacoras/fotos/{id}` (requiere el mismo token que ver la bitácora), `DELETE /api/bitacoras/fotos/{id}`.

**Gráficas del dashboard.** El dashboard muestra dos gráficas además de los indicadores numéricos: una curva de avance físico vs. financiero en el tiempo (`GET /api/obras/{obra_id}/indicadores/historico`, un punto por cada fecha con al menos una bitácora `aprobada`, calculado con la misma fórmula de ponderación que `/indicadores` para que nunca puedan divergir) y un gráfico de barras horizontales de avance por actividad, ordenado de la más atrasada a la más adelantada. Son componentes SVG/HTML propios (`frontend/src/components/GraficaAvanceHistorico.jsx`, `GraficaAvancePorActividad.jsx`), sin dependencias nuevas, con leyenda, tooltip al pasar el mouse y una paleta de color derivada del verde de marca (`obra-600`) validada para daltonismo.

## Cómo correr el frontend

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Inicia sesión con el usuario administrador creado arriba; desde la pestaña **Usuarios** puedes crear las cuentas de residente de obra, interventor y gerencia.

## Roles y qué puede hacer cada uno

| Rol | Puede |
| --- | --- |
| `administrador` | Todo: usuarios, obras, actividades, bitácoras, alertas |
| `gerencia` | Crear/editar obras y actividades, ver bitácoras, dashboard y alertas |
| `residente_obra` | Registrar y editar bitácoras propias (mientras estén en borrador/rechazada), ver obras y dashboard |
| `interventor` | Aprobar o rechazar bitácoras, resolver alertas, ver todo |

## Docker, CI y CD

### Correr todo el sistema con Docker (local)

Con Docker Desktop abierto, desde la raíz del repositorio:

```bash
docker compose up --build
```

Levanta tres contenedores (`docker-compose.yml`):

| Servicio | Imagen | Puerto en el equipo |
| --- | --- | --- |
| `db` | `postgres:16-alpine`, con volumen `db_data` | `5433` (para no chocar con un PostgreSQL local en 5432) |
| `backend` | `backend/Dockerfile` — aplica las migraciones de Alembic y arranca gunicorn | `8000` (API y `/docs`) |
| `frontend` | `frontend/Dockerfile` — build de Vite servido por nginx | `8080` |

El primer arranque tarda unos minutos (descarga imágenes e instala dependencias); los siguientes reutilizan la cache de Docker. Cada servicio tiene *healthcheck*: el backend espera a que la base esté lista y el frontend espera a que la API responda.

Crear el primer usuario administrador (una sola vez, con todo arriba, en otra terminal):

```bash
docker compose exec backend python -m scripts.crear_usuario_admin
```

Luego entrar a `http://localhost:8080`. Para detener: `Ctrl+C` o `docker compose down` (los datos se conservan); `docker compose down -v` borra también la base de datos.

**Buenas prácticas aplicadas en las imágenes:** imagen *multi-stage* en el frontend (la imagen final solo lleva nginx y el build, sin Node ni `node_modules`); dependencias copiadas antes que el código para aprovechar la cache de capas; `npm ci` para builds reproducibles; la API corre con un usuario sin privilegios (no root); `.dockerignore` en ambos servicios (sin secretos, pruebas ni `node_modules`); `HEALTHCHECK` en las dos imágenes; la imagen del backend no incluye las herramientas de pruebas.

### Pipeline de CI (`.github/workflows/ci.yml`)

Se ejecuta en GitHub Actions con cada push a `develop`, `feature/**` o `fix/**` y en cada pull request hacia `develop` o `produccion`:

| Job | Qué verifica |
| --- | --- |
| Backend · lint, seguridad y pruebas | `ruff`, `bandit`, migraciones de Alembic (subir, bajar y volver a subir) y las pruebas de `pytest` contra un **PostgreSQL real** (servicio del job). Publica el reporte `pytest.xml` como artefacto. |
| Backend · auditoría de dependencias | `pip-audit` sobre `requirements.txt`. Es **informativo**: reporta vulnerabilidades conocidas de las librerías sin bloquear el pipeline. |
| Frontend · build | `npm ci` y `npm run build`. |
| Docker · build y prueba de humo | Valida los dos `docker-compose`, construye las imágenes, levanta el sistema con `docker compose up --wait` y corre `.github/scripts/prueba_humo_local.sh`: salud de la API, migraciones, login con JWT, rechazo sin token y el frontend servido por nginx. |

### Pipeline de CD (`.github/workflows/cd.yml`)

Se ejecuta con cada push a `produccion` (o a mano desde la pestaña *Actions*):

1. **CI completo** (reutiliza `ci.yml`). Si algo falla, no se despliega nada.
2. **Publica las imágenes** en GitHub Container Registry: `ghcr.io/<usuario>/emanuel-obras-backend` y `-frontend`, con las etiquetas `<sha del commit>`, `produccion` y `latest`. Quedan en la sección *Packages* del repositorio.
3. **Despliega el backend en Render** llamando a su *Deploy Hook*.
4. **Verifica el despliegue**: `.github/scripts/esperar_despliegue.sh` espera hasta que `GET /` de la API en vivo reporte el commit recién desplegado (campo `version`, que Render llena con `RENDER_GIT_COMMIT`) y luego prueba la API y el frontend en producción.

El frontend lo sigue desplegando Vercel automáticamente con el mismo push.

**Configuración (una sola vez):**

1. En Render → servicio del backend → *Settings* → *Deploy Hook*: copiar la URL.
2. En GitHub → repositorio → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*: nombre `RENDER_DEPLOY_HOOK_URL`, valor la URL del paso 1. Es un secreto: no se pone en el código ni en el README.
3. En Render → *Settings* → *Auto-Deploy*: ponerlo en **Off**, para que quien despliegue sea el pipeline (solo después de que pase el CI) y no cada push directo. Verificar también que la rama del servicio sea `produccion`.
4. Opcional: en GitHub → *Settings* → *Environments* → `produccion`, agregar *Required reviewers* para que cada despliegue pida aprobación manual.

**Flujo de trabajo:** cambios en una rama `feature/...` → push (corre el CI) → merge a `develop` (corre el CI) → merge de `develop` a `produccion` y push (corre el CD y se despliega).

## Despliegue en producción (servidor propio con Caddy)

Despliegue genérico con Docker Compose + Caddy (HTTPS automático vía Let's
Encrypt) — no apunta a ningún servidor ni dominio en particular, para poder
apuntarlo a cualquier VPS/dominio cuando exista.

**Servicios** (`docker-compose.prod.yml`):

| Servicio | Imagen/build | Rol |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | Base de datos, con volumen persistente |
| `backend` | `backend/Dockerfile` | API FastAPI servida con gunicorn (`uvicorn.workers.UvicornWorker`); corre `alembic upgrade head` al arrancar |
| `frontend` | `frontend/Dockerfile` | Build estático de Vite servido por nginx |
| `caddy` | `caddy:2-alpine` | Reverse proxy: `/api/*` → `backend`, el resto → `frontend`; certificado HTTPS automático si `DOMAIN` es un dominio real |

### Pasos

1. Copiar las plantillas de variables de entorno y completarlas:

   ```bash
   cp deploy/.env.example deploy/.env
   cp backend/.env.prod.example backend/.env.prod
   ```

   En `deploy/.env`: `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` (deben
   coincidir con la `DATABASE_URL` de `backend/.env.prod`, que usa `db` como
   host) y `DOMAIN` (el dominio real, o `localhost` mientras no haya uno).

   En `backend/.env.prod`: la misma `DATABASE_URL`, un `SECRET_KEY` generado
   con `python -c "import secrets; print(secrets.token_hex(32))"`, y
   `ALLOWED_ORIGIN=https://TU_DOMINIO`.

   Ninguno de los dos archivos se versiona (ver `.gitignore`) — solo las
   plantillas `*.example`.

2. Levantar todo:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   El backend aplica las migraciones de Alembic automáticamente antes de
   arrancar (`backend/docker-entrypoint.sh`). Falta crear el primer usuario
   administrador — hacerlo una vez, dentro del contenedor:

   ```bash
   docker compose -f docker-compose.prod.yml exec backend python -m scripts.crear_usuario_admin
   ```

3. Con `DOMAIN` en `deploy/.env` apuntando a un dominio real (con su
   registro DNS ya apuntando al servidor), Caddy obtiene y renueva el
   certificado HTTPS sin configuración adicional. Con `DOMAIN=localhost`
   sirve por HTTP para probar localmente.

### Migraciones (Alembic)

`backend/alembic/` — `alembic upgrade head` aplica las migraciones
pendientes (se corre solo al arrancar el contenedor, ver arriba). Para
generar una migración nueva tras cambiar los modelos:

```bash
cd backend
alembic revision -m "descripcion_del_cambio"  # o --autogenerate si aplica
```

## Estado actual

- **Backend**: arquitectura por capas (`core/db/models/schemas/services/routers`), autenticación JWT + RBAC, CRUD de obras/actividades, bitácora diaria con máquina de estados y aprobación, indicadores de avance físico/financiero (solo con bitácoras aprobadas), modelo de alertas de retraso (generación vía script, no vía API), reportes exportables PDF/XLSX para gerencia e interventoría, formato de error uniforme, rate limiting en login, pruebas automatizadas de las reglas de negocio (R1–R10).
- **Frontend**: login con JWT, navegación por rol, gestión de obras/actividades, bitácora con registros de personal/materiales/incidentes y flujo de envío/aprobación/rechazo, dashboard con indicadores, alertas y descarga de reportes PDF/Excel (administrador, gerencia, interventor), gestión de usuarios (solo administrador).
- **DevOps**: sistema dockerizado (`docker-compose.yml` para local, `docker-compose.prod.yml` para un servidor propio), CI en GitHub Actions (lint, seguridad, migraciones, pruebas contra PostgreSQL, build y prueba de humo con Docker) y CD a producción (imágenes en GitHub Container Registry, deploy en Render y verificación automática).
- **En producción**: frontend en Vercel (`https://emanuel-obras.vercel.app`), API en Render (`https://emanuel-obras.onrender.com`) y base de datos en Neon.
