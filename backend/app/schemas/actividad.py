from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ActividadBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    peso_porcentual: float = Field(default=0, ge=0, le=1)
    costo_presupuestado: Optional[float] = 0
    fecha_inicio_programada: Optional[date] = None
    fecha_fin_programada: Optional[date] = None


class ActividadCrear(ActividadBase):
    pass


class ActividadActualizar(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    peso_porcentual: Optional[float] = Field(default=None, ge=0, le=1)
    costo_presupuestado: Optional[float] = None
    fecha_inicio_programada: Optional[date] = None
    fecha_fin_programada: Optional[date] = None
    estado: Optional[str] = None


class ActividadRespuesta(ActividadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    obra_id: int
    estado: str
