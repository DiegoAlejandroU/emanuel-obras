"""Rate limiting — sección 8: máximo 5 intentos/minuto por IP en /api/auth/login."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
