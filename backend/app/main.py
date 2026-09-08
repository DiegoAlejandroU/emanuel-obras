from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import obras, bitacora, dashboard

# Crea las tablas si no existen (para desarrollo; en producción usar Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Ejecución y Seguimiento de Obras",
    description="API para la bitácora digital de obra y el dashboard de indicadores — Emanuel Ingeniería y Construcciones S.A.S.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(obras.router)
app.include_router(bitacora.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"status": "ok", "servicio": "emanuel-obras API"}
