from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from .. import schemas
from ..core.deps import requiere_rol, verificar_token
from ..db.session import get_db
from ..services import actividades_service, obras_service

router = APIRouter(prefix="/api/obras", tags=["Obras"])


@router.get("/", response_model=list[schemas.ObraRespuesta], dependencies=[Depends(verificar_token)])
def listar_obras(db: Session = Depends(get_db)):
    return obras_service.listar_obras(db)


@router.get("/{obra_id}", response_model=schemas.ObraRespuesta, dependencies=[Depends(verificar_token)])
def obtener_obra(obra_id: int, db: Session = Depends(get_db)):
    return obras_service.obtener_obra_o_404(db, obra_id)


@router.post(
    "/",
    response_model=schemas.ObraRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def crear_obra(datos: schemas.ObraCrear, db: Session = Depends(get_db)):
    return obras_service.crear_obra(db, datos)


@router.put(
    "/{obra_id}",
    response_model=schemas.ObraRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def actualizar_obra(obra_id: int, datos: schemas.ObraActualizar, db: Session = Depends(get_db)):
    return obras_service.actualizar_obra(db, obra_id, datos)


@router.patch(
    "/{obra_id}/estado",
    response_model=schemas.ObraRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def cambiar_estado_obra(obra_id: int, datos: schemas.ObraCambioEstado, db: Session = Depends(get_db)):
    return obras_service.cambiar_estado_obra(db, obra_id, datos.estado)


@router.delete(
    "/{obra_id}",
    status_code=204,
    dependencies=[Depends(requiere_rol("administrador"))],
)
def eliminar_obra(obra_id: int, db: Session = Depends(get_db)):
    obras_service.eliminar_obra(db, obra_id)
    return Response(status_code=204)


@router.get(
    "/{obra_id}/indicadores",
    response_model=schemas.IndicadorObra,
    dependencies=[Depends(verificar_token)],
)
def indicadores_obra(obra_id: int, db: Session = Depends(get_db)):
    return obras_service.calcular_indicadores(db, obra_id)


@router.get(
    "/{obra_id}/indicadores/historico",
    response_model=list[schemas.PuntoHistoricoAvance],
    dependencies=[Depends(verificar_token)],
)
def historico_avance_obra(obra_id: int, db: Session = Depends(get_db)):
    return obras_service.historico_avance(db, obra_id)


# ---------- Actividades anidadas bajo /api/obras/{obraId}/actividades ----------

@router.get(
    "/{obra_id}/actividades",
    response_model=list[schemas.ActividadRespuesta],
    dependencies=[Depends(verificar_token)],
)
def listar_actividades(obra_id: int, db: Session = Depends(get_db)):
    return actividades_service.listar_actividades(db, obra_id)


@router.post(
    "/{obra_id}/actividades",
    response_model=schemas.ActividadRespuesta,
    dependencies=[Depends(requiere_rol("administrador", "gerencia"))],
)
def crear_actividad(obra_id: int, datos: schemas.ActividadCrear, db: Session = Depends(get_db)):
    return actividades_service.crear_actividad(db, obra_id, datos)
