from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/obras", tags=["Obras"])


@router.get("/", response_model=list[schemas.Obra])
def listar_obras(db: Session = Depends(get_db)):
    return db.query(models.Obra).all()


@router.post("/", response_model=schemas.Obra)
def crear_obra(obra: schemas.ObraCreate, db: Session = Depends(get_db)):
    nueva = models.Obra(**obra.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.get("/{obra_id}", response_model=schemas.Obra)
def obtener_obra(obra_id: int, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    return obra


@router.patch("/{obra_id}", response_model=schemas.Obra)
def actualizar_obra(obra_id: int, cambios: schemas.ObraUpdate, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(obra, campo, valor)
    db.commit()
    db.refresh(obra)
    return obra


@router.delete("/{obra_id}", status_code=204)
def eliminar_obra(obra_id: int, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    db.delete(obra)
    db.commit()
    return Response(status_code=204)


@router.post("/{obra_id}/actividades", response_model=schemas.Actividad)
def crear_actividad(obra_id: int, actividad: schemas.ActividadBase, db: Session = Depends(get_db)):
    obra = db.query(models.Obra).filter(models.Obra.id == obra_id).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")
    nueva = models.Actividad(obra_id=obra_id, **actividad.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.get("/{obra_id}/actividades", response_model=list[schemas.Actividad])
def listar_actividades(obra_id: int, db: Session = Depends(get_db)):
    return db.query(models.Actividad).filter(models.Actividad.obra_id == obra_id).all()


@router.patch("/{obra_id}/actividades/{actividad_id}", response_model=schemas.Actividad)
def actualizar_actividad(
    obra_id: int, actividad_id: int, cambios: schemas.ActividadUpdate, db: Session = Depends(get_db)
):
    actividad = (
        db.query(models.Actividad)
        .filter(models.Actividad.id == actividad_id, models.Actividad.obra_id == obra_id)
        .first()
    )
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        setattr(actividad, campo, valor)
    db.commit()
    db.refresh(actividad)
    return actividad


@router.delete("/{obra_id}/actividades/{actividad_id}", status_code=204)
def eliminar_actividad(obra_id: int, actividad_id: int, db: Session = Depends(get_db)):
    actividad = (
        db.query(models.Actividad)
        .filter(models.Actividad.id == actividad_id, models.Actividad.obra_id == obra_id)
        .first()
    )
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    db.delete(actividad)
    db.commit()
    return Response(status_code=204)
