"""Excepción de dominio uniforme y su manejador (sección 6 del estándar).

Los `services` son la única capa que lanza `AppError`; los routers nunca
deciden por sí mismos si algo es 404 o 409, solo dejan que la excepción
suba y el `exception_handler` centralizado la traduce al formato JSON
uniforme: `{"mensaje": "...", "errores": [...]}`. `errores` solo se incluye
en respuestas 400 (validación).
"""

from __future__ import annotations


class AppError(Exception):
    def __init__(self, status_code: int, mensaje: str, errores: list[dict] | None = None):
        self.status_code = status_code
        self.mensaje = mensaje
        self.errores = errores
        super().__init__(mensaje)


def respuesta_error(mensaje: str, status_code: int, errores: list[dict] | None = None) -> dict:
    cuerpo = {"mensaje": mensaje}
    if status_code == 400 and errores:
        cuerpo["errores"] = errores
    return cuerpo
