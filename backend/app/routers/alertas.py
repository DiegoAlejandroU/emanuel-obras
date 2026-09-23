from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..core.deps import requiere_rol, verificar_token
from ..db.session import get_db
from ..services import alertas_service

router = APIRouter(prefix="/api", tags=["Alertas"])


@router.get(
    "/obras/{obra_id}/alertas",
    response_model=list[schemas.AlertaRespuesta],
    dependencies=[Depends(verificar_token)],
)
def listar_alertas(obra_id: int, estado: str | None = None, db: Session = Depends(get_db)):
    return alertas_service.listar_alertas(db, obra_id, estado)


@router.patch(
    "/alertas/{alerta_id}/resolver",
    response_model=schemas.AlertaRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "interventor"))],
)
def resolver_alerta(alerta_id: int, db: Session = Depends(get_db)):
    return alertas_service.resolver_alerta(db, alerta_id)
