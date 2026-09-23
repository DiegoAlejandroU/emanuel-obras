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


def calcular_indicadores(db: Session, obra_id: int) -> schemas.IndicadorObra:
    """Sección 4.3 del estándar: solo cuentan registros de bitácoras `aprobada`."""
    obra = obtener_obra_o_404(db, obra_id)
    actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()

    # Una sola query para el avance aprobado de todas las actividades de la
    # obra (antes: una query por actividad dentro del for de abajo).
    avance_acumulado_por_actividad: dict[int, float] = {}
    if actividades:
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
            avance_acumulado_por_actividad[actividad_id] = (
                avance_acumulado_por_actividad.get(actividad_id, 0.0) + (avance_del_dia or 0)
            )

    indicadores_actividad = []
    avance_fisico = 0.0
    costo_ejecutado_total = 0.0

    for actividad in actividades:
        avance_acumulado_pct = min(100.0, avance_acumulado_por_actividad.get(actividad.id, 0.0))

        avance_fisico += (actividad.peso_porcentual or 0) * avance_acumulado_pct
        costo_ejecutado_total += (actividad.costo_presupuestado or 0) * (avance_acumulado_pct / 100)

        indicadores_actividad.append(
            schemas.IndicadorActividad(
                actividad_id=actividad.id,
                nombre=actividad.nombre,
                peso_porcentual=actividad.peso_porcentual or 0,
                avance_acumulado_porcentual=round(avance_acumulado_pct, 2),
            )
        )

    presupuesto_total = obra.presupuesto_total or 0
    avance_financiero = (costo_ejecutado_total / presupuesto_total * 100) if presupuesto_total > 0 else 0.0

    return schemas.IndicadorObra(
        obra_id=obra.id,
        nombre=obra.nombre,
        avance_fisico_porcentual=round(avance_fisico, 2),
        avance_financiero_porcentual=round(avance_financiero, 2),
        presupuesto_total=presupuesto_total,
        actividades=indicadores_actividad,
    )
