from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class IncidenteSeguimientoRespuesta(BaseModel):
    """Un incidente visto como tarea de seguimiento de la obra: incluye la
    fecha de la bitácora donde se reportó y si ya venció su fecha límite."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    bitacora_id: int
    obra_id: int
    fecha_reporte: date
    tipo: str
    descripcion: str
    gravedad: str
    acciones_tomadas: Optional[str] = None
    estado: str
    responsable: Optional[str] = None
    fecha_limite: Optional[date] = None
    cerrado_en: Optional[datetime] = None
    vencido: bool = False


class IncidenteSeguimientoActualizar(BaseModel):
    estado: Optional[Literal["abierto", "en_gestion", "cerrado"]] = None
    responsable: Optional[str] = None
    fecha_limite: Optional[date] = None
    acciones_tomadas: Optional[str] = None
