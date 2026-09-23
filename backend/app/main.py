from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .core.config import settings
from .core.rate_limit import limiter
from .db.base import Base
from .db.session import engine
from .exceptions import AppError, respuesta_error
from .routers import actividades, alertas, auth, bitacoras, obras, reportes, usuarios

# Crea las tablas si no existen (para desarrollo; en producción usar Alembic).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Ejecución y Seguimiento de Obras",
    description="API para la bitácora digital de obra, indicadores de avance y alertas — Emanuel Ingeniería y Construcciones S.A.S.",
    version="0.2.0",
)

app.state.limiter = limiter

# Orden obligatorio (sección 8): CORS antes que autenticación, autenticación
# antes que autorización, autorización antes de llegar al router. CORS y el
# manejo de excepciones se montan aquí; autenticación/autorización se aplican
# como Depends() en cada router (core/deps.py).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def manejar_app_error(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=respuesta_error(exc.mensaje, exc.status_code, exc.errores))


@app.exception_handler(RequestValidationError)
def manejar_error_validacion(request: Request, exc: RequestValidationError):
    """Traduce el 422 automático de FastAPI/Pydantic al formato uniforme
    de la sección 6 (400 con `errores` por campo)."""
    errores = [
        {"campo": ".".join(str(p) for p in error["loc"][1:]) or str(error["loc"][-1]), "mensaje": error["msg"]}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=400, content=respuesta_error("Datos inválidos", 400, errores))


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(obras.router)
app.include_router(actividades.router)
app.include_router(bitacoras.router)
app.include_router(alertas.router)
app.include_router(reportes.router)


@app.get("/")
def root():
    return {"status": "ok", "servicio": "emanuel-obras API", "ambiente": settings.environment}
