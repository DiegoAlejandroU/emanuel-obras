# Sistema de Ejecución y Seguimiento de Obras — Emanuel Ingeniería y Construcciones S.A.S.

Proyecto de práctica profesional (Ingeniería de Sistemas — Universidad Santo Tomás, Tunja).

## Objetivo

Sistema web compuesto por dos módulos que trabajan juntos:

1. **Bitácora digital de obra**: registro diario de actividades ejecutadas, personal en obra, materiales consumidos e incidentes, capturado por el residente de obra (pensado para uso desde celular/tablet en campo).
2. **Dashboard de indicadores**: avance físico y financiero por obra y por actividad, calculado a partir de lo registrado en la bitácora, con alertas de retraso y reportes exportables para gerencia e interventoría.

## Stack

- **Backend**: FastAPI + PostgreSQL (SQLAlchemy)
- **Frontend**: React + Vite + Tailwind CSS

## Estructura del proyecto

```
emanuel-obras/
├── backend/          # API REST (FastAPI)
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       └── routers/
│           ├── obras.py       # CRUD de proyectos/obras
│           ├── bitacora.py    # Registro diario de obra
│           └── dashboard.py   # Indicadores de avance
└── frontend/         # Aplicación web (React + Tailwind)
    └── src/
        ├── pages/
        │   ├── Bitacora.jsx
        │   └── Dashboard.jsx
        └── components/
```

## Cómo correr el backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # y ajustar la URL de PostgreSQL
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000` y la documentación interactiva en `http://localhost:8000/docs`.

## Cómo correr el frontend

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`.

## Estado actual

- Backend: CRUD completo de obras y actividades (crear, editar, eliminar), registro de bitácora diaria con avance por actividad (`avance_incremental`, materiales, costo del día) y endpoint de indicadores por obra.
- Frontend: pestaña **Obras** para crear/editar/eliminar obras y sus actividades (con aviso visual si los pesos porcentuales no suman 100%); pestaña **Bitácora** con formulario de avance real por actividad conectado al backend (antes se enviaba vacío); pestaña **Dashboard** con indicadores de avance físico y presupuesto.

Próximos pasos: gráficas y desglose financiero más detallado en el dashboard, alertas de retraso frente al cronograma, reportes exportables (PDF/Excel) para gerencia e interventoría, y autenticación de usuarios (residente de obra vs. gerencia).
