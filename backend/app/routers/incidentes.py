from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.deps import requiere_rol, verificar_token
from ..db.session import get_db
from ..services import incidentes_service

router = APIRouter(prefix="/api", tags=["Incidentes"])

_ROLES_SEGUIMIENTO = ("administrador", "residente_obra", "interventor")


@router.get(
    "/obras/{obra_id}/incidentes",
    response_model=list[schemas.IncidenteSeguimientoRespuesta],
    dependencies=[Depends(verificar_token)],
)
def listar_incidentes(obra_id: int, estado: str | None = None, db: Session = Depends(get_db)):
    return incidentes_service.listar_incidentes_obra(db, obra_id, estado)


@router.patch(
    "/incidentes/{incidente_id}",
    response_model=schemas.IncidenteSeguimientoRespuesta,
)
def actualizar_seguimiento_incidente(
    incidente_id: int,
    datos: schemas.IncidenteSeguimientoActualizar,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(requiere_rol(*_ROLES_SEGUIMIENTO)),
):
    return incidentes_service.actualizar_seguimiento(db, incidente_id, datos, usuario)
