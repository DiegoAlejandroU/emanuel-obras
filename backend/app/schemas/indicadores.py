from datetime import date
from typing import Optional

from pydantic import BaseModel


class IndicadorActividad(BaseModel):
    actividad_id: int
    nombre: str
    peso_porcentual: float
    avance_acumulado_porcentual: float
    costo_presupuestado: float = 0
    costo_real: float = 0
    # Valor ganado: lo que "debería" haber costado el avance aprobado hasta hoy
    # (costo presupuestado × avance acumulado). Se compara contra el costo real.
    valor_ganado: float = 0


class IndicadorObra(BaseModel):
    obra_id: int
    nombre: str
    avance_fisico_porcentual: float
    avance_financiero_porcentual: float
    presupuesto_total: float
    actividades: list[IndicadorActividad]
    # Control de costos (avance financiero arriba es presupuesto × avance;
    # aquí se compara contra el gasto real registrado por administración).
    costo_real_total: float = 0
    valor_ganado_total: float = 0
    desviacion_costo: float = 0  # valor ganado - costo real; negativo = sobrecosto
    indice_costo: Optional[float] = None  # valor ganado / costo real; <1 = sobrecosto
    # Seguimiento de incidentes (solo de bitácoras ya enviadas o aprobadas).
    incidentes_abiertos: int = 0
    incidentes_vencidos: int = 0


class PuntoHistoricoAvance(BaseModel):
    """Un punto de la curva de avance acumulado a una fecha dada — misma
    fórmula de ponderación que `IndicadorObra`, calculada con el avance
    aprobado que existía hasta esa fecha (ver `historico_avance`)."""

    fecha: date
    avance_fisico_porcentual: float
    avance_financiero_porcentual: float
