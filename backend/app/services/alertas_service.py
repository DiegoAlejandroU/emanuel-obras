"""Alertas de retraso.

Regla R9: las alertas las genera el sistema (una tarea programada que
compara avance real vs. programado); nunca se crean por POST directo del
usuario. Por eso `generar_alertas_retraso` no está expuesta por ningún
router — la invoca únicamente `backend/scripts/generar_alertas.py`, pensado
para ejecutarse desde un cron/Task Scheduler cuando ese frente del roadmap
(alertas automáticas) se priorice.
"""

from datetime import date as date_type

from sqlalchemy.orm import Session

from .. import models
from ..core.config import settings
from ..exceptions import AppError
from .obras_service import calcular_indicadores


def listar_alertas(db: Session, obra_id: int, estado: str | None = None) -> list[models.Alerta]:
    query = db.query(models.Alerta).filter(models.Alerta.obra_id == obra_id)
    if estado is not None:
        query = query.filter(models.Alerta.estado == estado)
    return query.order_by(models.Alerta.fecha_generacion.desc()).all()


def resolver_alerta(db: Session, alerta_id: int) -> models.Alerta:
    alerta = db.query(models.Alerta).filter(models.Alerta.id == alerta_id).first()
    if not alerta:
        raise AppError(404, "Alerta no encontrada")
    alerta.estado = "resuelta"
    db.commit()
    db.refresh(alerta)
    return alerta


def _avance_programado_actividad(actividad: models.Actividad, hoy: date_type) -> float:
    """Avance esperado (%) a la fecha, interpolando linealmente entre el
    inicio y el fin programados de la actividad."""
    inicio = actividad.fecha_inicio_programada
    fin = actividad.fecha_fin_programada
    if not inicio or not fin or fin <= inicio:
        return 0.0
    if hoy <= inicio:
        return 0.0
    if hoy >= fin:
        return 100.0
    return (hoy - inicio).days / (fin - inicio).days * 100


def generar_alertas_retraso(db: Session, obra_id: int) -> list[models.Alerta]:
    """Compara avance real vs. programado y crea alertas activas nuevas.

    No duplica una alerta del mismo tipo si ya hay una activa para la obra.
    """
    hoy = date_type.today()
    indicadores = calcular_indicadores(db, obra_id)
    actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()

    avance_programado = sum(
        (a.peso_porcentual or 0) * _avance_programado_actividad(a, hoy) for a in actividades
    )

    nuevas: list[models.Alerta] = []

    def _crear_si_no_activa(tipo: str, mensaje: str) -> None:
        activa = (
            db.query(models.Alerta)
            .filter(models.Alerta.obra_id == obra_id, models.Alerta.tipo == tipo, models.Alerta.estado == "activa")
            .first()
        )
        if not activa:
            alerta = models.Alerta(obra_id=obra_id, tipo=tipo, mensaje=mensaje, estado="activa")
            db.add(alerta)
            nuevas.append(alerta)

    if avance_programado - indicadores.avance_fisico_porcentual > settings.umbral_alerta_retraso * 100:
        _crear_si_no_activa(
            "retraso_fisico",
            f"Avance físico real ({indicadores.avance_fisico_porcentual}%) por debajo del programado "
            f"({round(avance_programado, 2)}%).",
        )

    if avance_programado - indicadores.avance_financiero_porcentual > settings.umbral_alerta_retraso * 100:
        _crear_si_no_activa(
            "retraso_financiero",
            f"Avance financiero ({indicadores.avance_financiero_porcentual}%) por debajo de lo esperado "
            f"({round(avance_programado, 2)}%) para la fecha.",
        )

    db.commit()
    for alerta in nuevas:
        db.refresh(alerta)
    return nuevas
