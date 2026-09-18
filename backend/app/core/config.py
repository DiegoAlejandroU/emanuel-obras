"""Configuración de la aplicación.

Todas las variables obligatorias (sección 9 del estándar) se leen aquí a
través de pydantic-settings. Si falta alguna, `Settings()` lanza una
`pydantic.ValidationError` al arrancar la aplicación (falla rápido) que
indica el NOMBRE de la variable faltante, nunca su valor.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # Obligatorias
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    allowed_origin: str
    environment: str

    # Opcional (default documentado en la sección 9 del estándar)
    umbral_alerta_retraso: float = 0.1


@lru_cache
def obtener_settings() -> Settings:
    return Settings()


settings = obtener_settings()
