from pydantic import BaseModel


class IndicadorActividad(BaseModel):
    actividad_id: int
    nombre: str
    peso_porcentual: float
    avance_acumulado_porcentual: float


class IndicadorObra(BaseModel):
    obra_id: int
    nombre: str
    avance_fisico_porcentual: float
    avance_financiero_porcentual: float
    presupuesto_total: float
    actividades: list[IndicadorActividad]
