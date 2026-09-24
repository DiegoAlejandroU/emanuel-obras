from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Registro de avance por actividad ----------

class RegistroAvanceActividadCrear(BaseModel):
    actividad_id: int
    avance_del_dia: float = Field(default=0, ge=0, le=100)
    observaciones: Optional[str] = None


class FotoAvanceRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registro_avance_id: int
    nombre_original: str
    content_type: str
    tamano_bytes: int
    creado_en: datetime


class RegistroAvanceActividadRespuesta(RegistroAvanceActividadCrear):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bitacora_id: int
    fotos: list[FotoAvanceRespuesta] = []


# ---------- Registro de personal ----------

class RegistroPersonalCrear(BaseModel):
    cargo: str
    cantidad: int = Field(default=1, ge=1)
    horas_trabajadas: float = Field(default=0, ge=0)


class RegistroPersonalRespuesta(RegistroPersonalCrear):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bitacora_id: int


# ---------- Registro de materiales ----------

class RegistroMaterialCrear(BaseModel):
    material: str
    cantidad: float = Field(default=0, ge=0)
    unidad: Optional[str] = None


class RegistroMaterialRespuesta(RegistroMaterialCrear):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bitacora_id: int


# ---------- Incidentes ----------

class IncidenteCrear(BaseModel):
    tipo: str = "otro"
    descripcion: str
    gravedad: str = "baja"
    acciones_tomadas: Optional[str] = None


class IncidenteRespuesta(IncidenteCrear):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bitacora_id: int


# ---------- Bitácora diaria ----------

class BitacoraBase(BaseModel):
    fecha: Optional[date] = None
    clima: Optional[str] = None
    personal_en_obra: Optional[int] = 0
    resumen: Optional[str] = None


class BitacoraCrear(BitacoraBase):
    responsable_id: int
    registros_avance: list[RegistroAvanceActividadCrear] = []
    registros_personal: list[RegistroPersonalCrear] = []
    registros_material: list[RegistroMaterialCrear] = []
    incidentes: list[IncidenteCrear] = []


class BitacoraActualizar(BaseModel):
    """Solo aplica a bitácoras en `borrador` o `rechazada` (regla R4)."""

    clima: Optional[str] = None
    personal_en_obra: Optional[int] = None
    resumen: Optional[str] = None
    registros_avance: Optional[list[RegistroAvanceActividadCrear]] = None
    registros_personal: Optional[list[RegistroPersonalCrear]] = None
    registros_material: Optional[list[RegistroMaterialCrear]] = None
    incidentes: Optional[list[IncidenteCrear]] = None


class BitacoraCambioEstado(BaseModel):
    estado: str
    motivo_rechazo: Optional[str] = None


class BitacoraRespuesta(BitacoraBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    obra_id: int
    responsable_id: int
    estado: str
    aprobado_por_id: Optional[int] = None
    aprobado_en: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    creado_en: datetime
    registros_avance: list[RegistroAvanceActividadRespuesta] = []
    registros_personal: list[RegistroPersonalRespuesta] = []
    registros_material: list[RegistroMaterialRespuesta] = []
    incidentes: list[IncidenteRespuesta] = []
