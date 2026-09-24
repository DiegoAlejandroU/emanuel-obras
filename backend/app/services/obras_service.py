from sqlalchemy.orm import Session

from .. import models, schemas
from ..exceptions import AppError
from ..models.obra import ESTADOS_VALIDOS


def obtener_obra_o_404(db: Session, obra_id: int) -> models.Obra:
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise AppError(404, "Obra no encontrada")
    return obra


def listar_obras(db: Session) -> list[models.Obra]:
    return db.query(models.Obra).order_by(models.Obra.id).all()


def crear_obra(db: Session, datos: schemas.ObraCrear) -> models.Obra:
    obra = models.Obra(**datos.model_dump())
    db.add(obra)
    db.commit()
    db.refresh(obra)
    return obra


def actualizar_obra(db: Session, obra_id: int, cambios: schemas.ObraActualizar) -> models.Obra:
    obra = obtener_obra_o_404(db, obra_id)
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(obra, campo, valor)
    db.commit()
    db.refresh(obra)
    return obra


def cambiar_estado_obra(db: Session, obra_id: int, nuevo_estado: str) -> models.Obra:
    obra = obtener_obra_o_404(db, obra_id)
    if nuevo_estado not in ESTADOS_VALIDOS:
        raise AppError(
            400,
            "Estado de obra inválido",
            errores=[{"campo": "estado", "mensaje": f"debe ser uno de {ESTADOS_VALIDOS}"}],
        )
    obra.estado = nuevo_estado
    db.commit()
    db.refresh(obra)
    return obra


def eliminar_obra(db: Session, obra_id: int) -> None:
    obra = obtener_obra_o_404(db, obra_id)

    tiene_actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).first()
    tiene_bitacoras = db.query(models.BitacoraDiaria).filter(models.BitacoraDiaria.obra_id == obra_id).first()
    if tiene_actividades or tiene_bitacoras:
        raise AppError(409, "No se puede eliminar una obra que tiene actividades o bitácoras registradas")

    db.delete(obra)
    db.commit()


def _avance_acumulado_por_actividad(db: Session, actividades: list[models.Actividad]) -> dict[int, float]:
    """Suma de `avance_del_dia` (sin capar todavía) de todas las bitácoras
    `aprobada`, por actividad — una sola query para toda la obra."""
    acumulado: dict[int, float] = {}
    if not actividades:
        return acumulado
    registros = (
        db.query(models.RegistroAvanceActividad.actividad_id, models.RegistroAvanceActividad.avance_del_dia)
        .join(models.BitacoraDiaria)
        .filter(
            models.RegistroAvanceActividad.actividad_id.in_([a.id for a in actividades]),
            models.BitacoraDiaria.estado == "aprobada",
        )
        .all()
    )
    for actividad_id, avance_del_dia in registros:
        acumulado[actividad_id] = acumulado.get(actividad_id, 0.0) + (avance_del_dia or 0)
    return acumulado


def _resumen_desde_acumulados(
    actividades: list[models.Actividad],
    avance_acumulado_por_actividad: dict[int, float],
    presupuesto_total: float,
) -> tuple[float, float]:
    """(avance_fisico_porcentual, avance_financiero_porcentual) a partir del
    avance acumulado (se capa a 100 por actividad aquí). Única fórmula de
    ponderación — la usan tanto `calcular_indicadores` como
    `historico_avance`, para que nunca puedan divergir entre sí."""
    avance_fisico = 0.0
    costo_ejecutado = 0.0
    for actividad in actividades:
        avance_pct = min(100.0, avance_acumulado_por_actividad.get(actividad.id, 0.0))
        avance_fisico += (actividad.peso_porcentual or 0) * avance_pct
        costo_ejecutado += (actividad.costo_presupuestado or 0) * (avance_pct / 100)
    avance_financiero = (costo_ejecutado / presupuesto_total * 100) if presupuesto_total > 0 else 0.0
    return round(avance_fisico, 2), round(avance_financiero, 2)


def calcular_indicadores(db: Session, obra_id: int) -> schemas.IndicadorObra:
    """Sección 4.3 del estándar: solo cuentan registros de bitácoras `aprobada`."""
    obra = obtener_obra_o_404(db, obra_id)
    actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()
    avance_acumulado_por_actividad = _avance_acumulado_por_actividad(db, actividades)

    indicadores_actividad = [
        schemas.IndicadorActividad(
            actividad_id=actividad.id,
            nombre=actividad.nombre,
            peso_porcentual=actividad.peso_porcentual or 0,
            avance_acumulado_porcentual=round(
                min(100.0, avance_acumulado_por_actividad.get(actividad.id, 0.0)), 2
            ),
        )
        for actividad in actividades
    ]

    presupuesto_total = obra.presupuesto_total or 0
    avance_fisico, avance_financiero = _resumen_desde_acumulados(
        actividades, avance_acumulado_por_actividad, presupuesto_total
    )

    return schemas.IndicadorObra(
        obra_id=obra.id,
        nombre=obra.nombre,
        avance_fisico_porcentual=avance_fisico,
        avance_financiero_porcentual=avance_financiero,
        presupuesto_total=presupuesto_total,
        actividades=indicadores_actividad,
    )


def historico_avance(db: Session, obra_id: int) -> list[schemas.PuntoHistoricoAvance]:
    """Curva de avance acumulado en el tiempo: un punto por cada fecha con al
    menos una bitácora `aprobada`, con el avance físico/financiero tal como
    habría quedado `calcular_indicadores()` con lo aprobado hasta esa fecha
    (nunca lo posterior — así la curva es estrictamente lo que ya se sabía
    en cada momento, no una vista retroactiva)."""
    obra = obtener_obra_o_404(db, obra_id)
    actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()
    if not actividades:
        return []
    presupuesto_total = obra.presupuesto_total or 0

    filas = (
        db.query(
            models.BitacoraDiaria.fecha,
            models.RegistroAvanceActividad.actividad_id,
            models.RegistroAvanceActividad.avance_del_dia,
        )
        .join(models.RegistroAvanceActividad, models.RegistroAvanceActividad.bitacora_id == models.BitacoraDiaria.id)
        .filter(
            models.BitacoraDiaria.obra_id == obra_id,
            models.BitacoraDiaria.estado == "aprobada",
        )
        .order_by(models.BitacoraDiaria.fecha.asc())
        .all()
    )

    acumulado: dict[int, float] = {}
    puntos: list[schemas.PuntoHistoricoAvance] = []
    fecha_en_curso = None

    def _cerrar_punto(fecha) -> None:
        avance_fisico, avance_financiero = _resumen_desde_acumulados(actividades, acumulado, presupuesto_total)
        puntos.append(
            schemas.PuntoHistoricoAvance(
                fecha=fecha,
                avance_fisico_porcentual=avance_fisico,
                avance_financiero_porcentual=avance_financiero,
            )
        )

    for fecha, actividad_id, avance_del_dia in filas:
        if fecha_en_curso is not None and fecha != fecha_en_curso:
            _cerrar_punto(fecha_en_curso)
        acumulado[actividad_id] = acumulado.get(actividad_id, 0.0) + (avance_del_dia or 0)
        fecha_en_curso = fecha

    if fecha_en_curso is not None:
        _cerrar_punto(fecha_en_curso)

    return puntos
