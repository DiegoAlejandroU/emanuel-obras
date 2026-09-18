from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.usuario import ROLES_VALIDOS


class UsuarioCrear(BaseModel):
    nombre: str
    email: EmailStr
    password: str = Field(min_length=8)
    rol: str = Field(default="residente_obra")


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    email: EmailStr
    rol: str
    activo: bool


__all__ = ["UsuarioCrear", "UsuarioRespuesta", "ROLES_VALIDOS"]
