from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from .. import schemas
from ..core.deps import requiere_rol
from ..db.session import get_db
from ..services import actividades_service

router = APIRouter(prefix="/api/actividades", tags=["Actividades"])


@router.put(
    "/{actividad_id}",
    response_model=schemas.ActividadRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def actualizar_actividad(actividad_id: int, datos: schemas.ActividadActualizar, db: Session = Depends(get_db)):
    return actividades_service.actualizar_actividad(db, actividad_id, datos)


@router.delete(
    "/{actividad_id}",
    status_code=204,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def eliminar_actividad(actividad_id: int, db: Session = Depends(get_db)):
    actividades_service.eliminar_actividad(db, actividad_id)
    return Response(status_code=204)
