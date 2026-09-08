from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/bitacora", tags=["Bitácora"])


@router.post("/", response_model=schemas.RegistroBitacora)
def crear_registro(registro: schemas.RegistroBitacoraCreate, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == registro.obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    data = registro.model_dump(exclude={"avances"})
    if not data.get("fecha"):
        data["fecha"] = date_type.today()

    nuevo_registro = models.RegistroBitacora(**data)
    db.add(nuevo_registro)
    db.flush()  # para obtener nuevo_registro.id antes del commit

    for avance in registro.avances:
        actividad = db.query(models.Actividad).filter(models.Actividad.id == avance.actividad_id).first()
        if not actividad:
            raise HTTPException(status_code=404, detail=f"Actividad {avance.actividad_id} no encontrada")

        db.add(models.AvanceActividad(registro_id=nuevo_registro.id, **avance.model_dump()))

        # Actualiza el avance acumulado de la actividad (tope 100%)
        actividad.avance_porcentual = min(100.0, actividad.avance_porcentual + avance.avance_incremental)

    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro


@router.get("/obra/{obra_id}", response_model=list[schemas.RegistroBitacora])
def listar_registros_por_obra(obra_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.RegistroBitacora)
        .filter(models.RegistroBitacora.obra_id == obra_id)
        .order_by(models.RegistroBitacora.fecha.desc())
        .all()
    )


@router.get("/{registro_id}", response_model=schemas.RegistroBitacora)
def obtener_registro(registro_id: int, db: Session = Depends(get_db)):
    registro = db.query(models.RegistroBitacora).filter(models.RegistroBitacora.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return registro
