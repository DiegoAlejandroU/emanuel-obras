from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ObraBase(BaseModel):
    nombre: str
    contratista: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    presupuesto_total: Optional[float] = 0


class ObraCrear(ObraBase):
    pass


class ObraActualizar(BaseModel):
    nombre: Optional[str] = None
    contratista: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    presupuesto_total: Optional[float] = None


class ObraCambioEstado(BaseModel):
    estado: str


class ObraRespuesta(ObraBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: str
