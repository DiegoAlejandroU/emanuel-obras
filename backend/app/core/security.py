"""Hashing de contraseñas y manejo de JWT (sección 8 del estándar)."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

_contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hashear_password(password: str) -> str:
    return _contexto_password.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return _contexto_password.verify(password_plano, password_hash)


def crear_token_acceso(datos: dict[str, Any]) -> str:
    """Crea un JWT de corta duración. Nunca incluye la contraseña."""
    ahora = datetime.now(timezone.utc)
    expira = ahora + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {**datos, "iat": ahora, "exp": expira}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decodificar_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
