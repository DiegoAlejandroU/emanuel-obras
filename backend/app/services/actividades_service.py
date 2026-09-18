from sqlalchemy.orm import Session

from .. import models, schemas
from ..exceptions import AppError
from .obras_service import obtener_obra_o_404


def obtener_actividad_o_404(db: Session, actividad_id: int) -> models.Actividad:
    actividad = db.query(models.Actividad).filter(models.Actividad.id == actividad_id).first()
    if not actividad:
        raise AppError(404, "Actividad no encontrada")
    return actividad


def listar_actividades(db: Session, obra_id: int) -> list[models.Actividad]:
    obtener_obra_o_404(db, obra_id)  # R1
    return db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).order_by(models.Actividad.id).all()


def _suma_pesos(db: Session, obra_id: int, excluir_actividad_id: int | None = None) -> float:
    query = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id)
    if excluir_actividad_id is not None:
        query = query.filter(models.Actividad.id != excluir_actividad_id)
    return sum(a.peso_porcentual or 0 for a in query.all())


def crear_actividad(db: Session, obra_id: int, datos: schemas.ActividadCrear) -> models.Actividad:
    obtener_obra_o_404(db, obra_id)  # R1

    if _suma_pesos(db, obra_id) + datos.peso_porcentual > 1.0 + 1e-9:
        raise AppError(
            409,
            "La suma de los pesos porcentuales de las actividades de la obra no puede superar 1 (100%)",
        )

    actividad = models.Actividad(obra_id=obra_id, **datos.model_dump())
    db.add(actividad)
    db.commit()
    db.refresh(actividad)
    return actividad


def actualizar_actividad(db: Session, actividad_id: int, cambios: schemas.ActividadActualizar) -> models.Actividad:
    actividad = obtener_actividad_o_404(db, actividad_id)
    datos = cambios.model_dump(exclude_unset=True)

    if "peso_porcentual" in datos and datos["peso_porcentual"] is not None:
        suma_otras = _suma_pesos(db, actividad.obra_id, excluir_actividad_id=actividad.id)
        if suma_otras + datos["peso_porcentual"] > 1.0 + 1e-9:
            raise AppError(
                409,
                "La suma de los pesos porcentuales de las actividades de la obra no puede superar 1 (100%)",
            )

    for campo, valor in datos.items():
        setattr(actividad, campo, valor)
    db.commit()
    db.refresh(actividad)
    return actividad


def eliminar_actividad(db: Session, actividad_id: int) -> None:
    actividad = obtener_actividad_o_404(db, actividad_id)
    db.delete(actividad)
    db.commit()
