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
pip install -r requirements.txt
cp .env.example .env         # ajustar DATABASE_URL y generar un SECRET_KEY propio
uvicorn app.main:app --reload
```

**En Windows**, `backend\setup_entorno.bat` hace los tres primeros pasos (crea `.venv`, instala `requirements.txt` y copia `.env.example` a `.env` si no existe) — correrlo una sola vez con doble clic o `setup_entorno.bat` desde `backend\`. Después hay que editar `backend\.env` con la clave real del usuario `postgres` y crear la base de datos (`psql -U postgres -c "CREATE DATABASE emanuel_obras;"`) antes de arrancar el backend.

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
ruff check app scripts
bandit -r app
pip-audit
```

**Reportes exportables (PDF/XLSX).** `GET /api/obras/{obra_id}/reportes/pdf` y `GET /api/obras/{obra_id}/reportes/xlsx` — roles `administrador`, `gerencia` e `interventor` (no `residente_obra`). Incluyen los datos de la obra, los indicadores de avance físico/financiero, el avance por actividad y las alertas (activas y resueltas). Se generan al vuelo a partir de los mismos datos de `/indicadores` y `/alertas`, sin tablas nuevas. Desde el dashboard del frontend aparecen como botones "Descargar reporte PDF/Excel" cuando el usuario tiene uno de esos roles.

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

## Despliegue en producción

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
- **Pendiente** (próximo frente del roadmap): gráficas más elaboradas en el dashboard. La generación automática de alertas por tarea programada (Windows Task Scheduler), los reportes exportables (PDF/XLSX) y el despliegue de producción con HTTPS (Docker Compose + Caddy) ya están listos — ver las secciones correspondientes arriba.
