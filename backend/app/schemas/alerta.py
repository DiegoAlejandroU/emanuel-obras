from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    obra_id: int
    tipo: str
    mensaje: str
    fecha_generacion: datetime
    estado: str
