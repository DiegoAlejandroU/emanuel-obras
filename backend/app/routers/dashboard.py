from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/obra/{obra_id}", response_model=schemas.IndicadorObra)
def indicadores_obra(obra_id: int, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    actividades = db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()

    # Avance general ponderado por el peso de cada actividad en el cronograma
    avance_general = sum(
        (a.avance_porcentual or 0) * (a.peso_porcentual or 0) / 100 for a in actividades
    )

    costo_ejecutado = (
        db.query(models.AvanceActividad)
        .join(models.RegistroBitacora)
        .filter(models.RegistroBitacora.obra_id == obra_id)
        .all()
    )
    costo_total_estimado = sum(a.costo_estimado_dia or 0 for a in costo_ejecutado)

    return schemas.IndicadorObra(
        obra_id=obra.id,
        nombre=obra.nombre,
        avance_general_porcentual=round(avance_general, 2),
        presupuesto_total=obra.presupuesto_total or 0,
        costo_ejecutado_estimado=round(costo_total_estimado, 2),
        actividades=[
            schemas.IndicadorActividad(
                actividad_id=a.id,
                nombre=a.nombre,
                peso_porcentual=a.peso_porcentual or 0,
                avance_porcentual=a.avance_porcentual or 0,
            )
            for a in actividades
        ],
    )
