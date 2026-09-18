from datetime import date as date_type

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.deps import requiere_rol, verificar_token
from ..db.session import get_db
from ..services import bitacoras_service

router = APIRouter(prefix="/api", tags=["Bitácoras"])

_ROLES_ESCRITURA = ("administrador", "residente_obra")


@router.get(
    "/obras/{obra_id}/bitacoras",
    response_model=list[schemas.BitacoraRespuesta],
    dependencies=[Depends(verificar_token)],
)
def listar_bitacoras(obra_id: int, fecha: date_type | None = None, db: Session = Depends(get_db)):
    return bitacoras_service.listar_bitacoras(db, obra_id, fecha)


@router.post(
    "/obras/{obra_id}/bitacoras",
    response_model=schemas.BitacoraRespuesta,
    dependencies=[Depends(requiere_rol(*_ROLES_ESCRITURA))],
)
def crear_bitacora(obra_id: int, datos: schemas.BitacoraCrear, db: Session = Depends(get_db)):
    return bitacoras_service.crear_bitacora(db, obra_id, datos)


@router.get(
    "/bitacoras/{bitacora_id}",
    response_model=schemas.BitacoraRespuesta,
    dependencies=[Depends(verificar_token)],
)
def obtener_bitacora(bitacora_id: int, db: Session = Depends(get_db)):
    return bitacoras_service.obtener_bitacora_o_404(db, bitacora_id)


@router.put(
    "/bitacoras/{bitacora_id}",
    response_model=schemas.BitacoraRespuesta,
    dependencies=[Depends(requiere_rol(*_ROLES_ESCRITURA))],
)
def actualizar_bitacora(bitacora_id: int, datos: schemas.BitacoraActualizar, db: Session = Depends(get_db)):
    return bitacoras_service.actualizar_bitacora(db, bitacora_id, datos)


@router.patch(
    "/bitacoras/{bitacora_id}/estado",
    response_model=schemas.BitacoraRespuesta,
)
def cambiar_estado_bitacora(
    bitacora_id: int,
    datos: schemas.BitacoraCambioEstado,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(verificar_token),
):
    return bitacoras_service.cambiar_estado_bitacora(
        db, bitacora_id, datos.estado, usuario, datos.motivo_rechazo
    )


@router.delete(
    "/bitacoras/{bitacora_id}",
    status_code=204,
    dependencies=[Depends(requiere_rol(*_ROLES_ESCRITURA))],
)
def eliminar_bitacora(bitacora_id: int, db: Session = Depends(get_db)):
    bitacoras_service.eliminar_bitacora(db, bitacora_id)
    return Response(status_code=204)
