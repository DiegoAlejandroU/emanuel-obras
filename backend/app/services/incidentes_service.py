"""Seguimiento de incidentes: un incidente reportado en una bitácora pasa a
ser una tarea con estado, responsable y fecha límite.

Solo se listan los incidentes de bitácoras ya enviadas o aprobadas: mientras
la bitácora está en borrador/rechazada se puede editar y sus incidentes se
reescriben completos (ver `actualizar_bitacora`), así que no son estables.
"""

from datetime import date as date_type, datetime, timezone

from sqlalchemy.orm import Session

from .. import models, schemas
from ..exceptions import AppError
from .bitacoras_service import verificar_propiedad_o_403
from .obras_service import obtener_obra_o_404

_ESTADOS_BITACORA_ESTABLES = ("enviada", "aprobada")


def _a_respuesta(incidente: models.Incidente, bitacora: models.BitacoraDiaria) -> schemas.IncidenteSeguimientoRespuesta:
    hoy = date_type.today()
    vencido = bool(
        incidente.estado != "cerrado" and incidente.fecha_limite and incidente.fecha_limite < hoy
    )
    return schemas.IncidenteSeguimientoRespuesta(
        id=incidente.id,
        bitacora_id=incidente.bitacora_id,
        obra_id=bitacora.obra_id,
        fecha_reporte=bitacora.fecha,
        tipo=incidente.tipo,
        descripcion=incidente.descripcion,
        gravedad=incidente.gravedad,
        acciones_tomadas=incidente.acciones_tomadas,
        estado=incidente.estado,
        responsable=incidente.responsable,
        fecha_limite=incidente.fecha_limite,
        cerrado_en=incidente.cerrado_en,
        vencido=vencido,
    )


def listar_incidentes_obra(
    db: Session, obra_id: int, estado: str | None = None
) -> list[schemas.IncidenteSeguimientoRespuesta]:
    obtener_obra_o_404(db, obra_id)  # R1
    query = (
        db.query(models.Incidente, models.BitacoraDiaria)
        .join(models.BitacoraDiaria, models.Incidente.bitacora_id == models.BitacoraDiaria.id)
        .filter(
            models.BitacoraDiaria.obra_id == obra_id,
            models.BitacoraDiaria.estado.in_(_ESTADOS_BITACORA_ESTABLES),
        )
    )
    if estado is not None:
        query = query.filter(models.Incidente.estado == estado)
    filas = query.order_by(models.BitacoraDiaria.fecha.desc(), models.Incidente.id.desc()).all()
    return [_a_respuesta(i, b) for i, b in filas]


def actualizar_seguimiento(
    db: Session,
    incidente_id: int,
    cambios: schemas.IncidenteSeguimientoActualizar,
    usuario: models.Usuario,
) -> schemas.IncidenteSeguimientoRespuesta:
    incidente = db.query(models.Incidente).filter(models.Incidente.id == incidente_id).first()
    if not incidente:
        raise AppError(404, "Incidente no encontrado")
    bitacora = incidente.bitacora
    verificar_propiedad_o_403(bitacora.responsable_id, usuario)

    if bitacora.estado not in _ESTADOS_BITACORA_ESTABLES:
        raise AppError(409, "El seguimiento solo aplica a incidentes de bitácoras ya enviadas o aprobadas")

    datos = cambios.model_dump(exclude_unset=True)
    nuevo_estado = datos.pop("estado", None)
    if nuevo_estado is not None and nuevo_estado != incidente.estado:
        incidente.estado = nuevo_estado
        incidente.cerrado_en = datetime.now(timezone.utc) if nuevo_estado == "cerrado" else None

    for campo, valor in datos.items():
        setattr(incidente, campo, valor)

    db.commit()
    db.refresh(incidente)
    return _a_respuesta(incidente, bitacora)
