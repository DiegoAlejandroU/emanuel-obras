from datetime import date

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


class PuntoHistoricoAvance(BaseModel):
    """Un punto de la curva de avance acumulado a una fecha dada — misma
    fórmula de ponderación que `IndicadorObra`, calculada con el avance
    aprobado que existía hasta esa fecha (ver `historico_avance`)."""

    fecha: date
    avance_fisico_porcentual: float
    avance_financiero_porcentual: float
