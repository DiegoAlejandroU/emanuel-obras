from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ---------- Obra ----------

class ObraBase(BaseModel):
    nombre: str
    ubicacion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    presupuesto_total: Optional[float] = 0
    estado: Optional[str] = "activa"


class ObraCreate(ObraBase):
    pass


class ObraUpdate(BaseModel):
    nombre: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    presupuesto_total: Optional[float] = None
    estado: Optional[str] = None


class Obra(ObraBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Actividad ----------

class ActividadBase(BaseModel):
    nombre: str
    peso_porcentual: Optional[float] = 0
    presupuesto_asignado: Optional[float] = 0


class ActividadCreate(ActividadBase):
    obra_id: int


class ActividadUpdate(BaseModel):
    nombre: Optional[str] = None
    peso_porcentual: Optional[float] = None
    presupuesto_asignado: Optional[float] = None


class Actividad(ActividadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    obra_id: int
    avance_porcentual: float


# ---------- Avance de actividad (dentro de un registro de bitácora) ----------

class AvanceActividadBase(BaseModel):
    actividad_id: int
    avance_incremental: Optional[float] = 0
    materiales_usados: Optional[str] = None
    costo_estimado_dia: Optional[float] = 0


class AvanceActividadCreate(AvanceActividadBase):
    pass


class AvanceActividad(AvanceActividadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registro_id: int


# ---------- Registro de bitácora ----------

class RegistroBitacoraBase(BaseModel):
    obra_id: int
    fecha: Optional[date] = None
    clima: Optional[str] = None
    personal_en_obra: Optional[int] = 0
    descripcion_general: Optional[str] = None
    incidentes: Optional[str] = None
    creado_por: Optional[str] = None


class RegistroBitacoraCreate(RegistroBitacoraBase):
    avances: list[AvanceActividadCreate] = []


class RegistroBitacora(RegistroBitacoraBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    creado_en: datetime
    avances_actividades: list[AvanceActividad] = []


# ---------- Dashboard ----------

class IndicadorActividad(BaseModel):
    actividad_id: int
    nombre: str
    peso_porcentual: float
    avance_porcentual: float


class IndicadorObra(BaseModel):
    obra_id: int
    nombre: str
    avance_general_porcentual: float
    presupuesto_total: float
    costo_ejecutado_estimado: float
    actividades: list[IndicadorActividad]
