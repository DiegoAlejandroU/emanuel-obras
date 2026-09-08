from fastapi import APIRouter, Depends, HTTPException
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
