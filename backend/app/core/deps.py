"""Dependencias de autenticación/autorización usadas por los routers.

Cadena descrita en la sección 7 del estándar:
Request → CORS → Depends(verificar_token) → Depends(requiere_rol(...)) → Router
"""

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .. import models
from ..db.session import get_db
from ..exceptions import AppError
from .security import decodificar_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verificar_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Usuario:
    """Decodifica el JWT y carga el usuario. Nunca confía en un rol que venga del body."""
    payload = decodificar_token(token)
    if not payload or "sub" not in payload:
        raise AppError(401, "Token inválido o expirado")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(payload["sub"])).first()
    if not usuario or not usuario.activo:
        raise AppError(401, "Token inválido o expirado")
    return usuario


def requiere_rol(*roles_permitidos: str):
    def dependencia(usuario: models.Usuario = Depends(verificar_token)) -> models.Usuario:
        if usuario.rol not in roles_permitidos:
            raise AppError(403, "No tiene el rol requerido para esta operación")
        return usuario

    return dependencia
