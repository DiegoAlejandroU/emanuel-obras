from datetime import date as date_type, datetime, timezone

from sqlalchemy.orm import Session

from .. import models, schemas
from ..exceptions import AppError
from ..models.bitacora import TRANSICIONES_VALIDAS
from .obras_service import obtener_obra_o_404

ESTADOS_EDITABLES = {"borrador", "rechazada"}


def obtener_bitacora_o_404(db: Session, bitacora_id: int) -> models.BitacoraDiaria:
    bitacora = db.query(models.BitacoraDiaria).filter(models.BitacoraDiaria.id == bitacora_id).first()
    if not bitacora:
        raise AppError(404, "Bitácora no encontrada")
    return bitacora


def listar_bitacoras(db: Session, obra_id: int, fecha: date_type | None = None) -> list[models.BitacoraDiaria]:
    obtener_obra_o_404(db, obra_id)  # R1
    query = db.query(models.BitacoraDiaria).filter(models.BitacoraDiaria.obra_id == obra_id)
    if fecha is not None:
        query = query.filter(models.BitacoraDiaria.fecha == fecha)
    return query.order_by(models.BitacoraDiaria.fecha.desc()).all()


def _validar_actividades(db: Session, obra_id: int, actividad_ids: set[int]) -> None:
    if not actividad_ids:
        return
    encontradas = {
        a.id
        for a in db.query(models.Actividad.id).filter(
            models.Actividad.obra_id == obra_id, models.Actividad.id.in_(actividad_ids)
        )
    }
    faltantes = actividad_ids - encontradas
    if faltantes:
        raise AppError(404, f"Actividad(es) no encontrada(s) en esta obra: {sorted(faltantes)}")


def _validar_responsable(db: Session, responsable_id: int) -> None:
    if not db.query(models.Usuario).filter(models.Usuario.id == responsable_id).first():
        raise AppError(404, "El responsable indicado no existe")


def _verificar_propiedad_o_403(bitacora_o_datos_responsable_id: int, usuario: models.Usuario) -> None:
    """Un residente_obra solo puede registrar/editar/eliminar sus propias
    bitácoras (README: "Registrar y editar bitácoras propias"). administrador
    e interventor no tienen esta restricción."""
    if usuario.rol == "residente_obra" and bitacora_o_datos_responsable_id != usuario.id:
        raise AppError(403, "Un residente de obra solo puede operar sobre sus propias bitácoras")


def crear_bitacora(
    db: Session, obra_id: int, datos: schemas.BitacoraCrear, usuario: models.Usuario
) -> models.BitacoraDiaria:
    obra = obtener_obra_o_404(db, obra_id)  # R1

    if obra.estado != "en_ejecucion":  # R2
        raise AppError(409, "No se puede registrar una bitácora para una obra que no esté en ejecución")

    _verificar_propiedad_o_403(datos.responsable_id, usuario)

    fecha = datos.fecha or date_type.today()

    if fecha > date_type.today():  # R5
        raise AppError(400, "La fecha de la bitácora no puede ser futura", errores=[{"campo": "fecha", "mensaje": "no puede ser futura"}])
    if obra.fecha_inicio and fecha < obra.fecha_inicio:  # R5
        raise AppError(
            400,
            "La fecha de la bitácora no puede ser anterior al inicio de la obra",
            errores=[{"campo": "fecha", "mensaje": "anterior a la fecha de inicio de la obra"}],
        )

    existente = (
        db.query(models.BitacoraDiaria)
        .filter(models.BitacoraDiaria.obra_id == obra_id, models.BitacoraDiaria.fecha == fecha)
        .first()
    )
    if existente:  # R6
        raise AppError(409, "Ya existe una bitácora para esta obra en esa fecha")

    _validar_responsable(db, datos.responsable_id)
    _validar_actividades(db, obra_id, {r.actividad_id for r in datos.registros_avance})

    bitacora = models.BitacoraDiaria(
        obra_id=obra_id,
        fecha=fecha,
        responsable_id=datos.responsable_id,
        clima=datos.clima,
        personal_en_obra=datos.personal_en_obra or 0,
        resumen=datos.resumen,
        estado="borrador",
    )
    db.add(bitacora)
    db.flush()  # obtiene bitacora.id antes del commit

    for r in datos.registros_avance:
        db.add(models.RegistroAvanceActividad(bitacora_id=bitacora.id, **r.model_dump()))
    for r in datos.registros_personal:
        db.add(models.RegistroPersonal(bitacora_id=bitacora.id, **r.model_dump()))
    for r in datos.registros_material:
        db.add(models.RegistroMaterial(bitacora_id=bitacora.id, **r.model_dump()))
    for r in datos.incidentes:
        db.add(models.Incidente(bitacora_id=bitacora.id, **r.model_dump()))

    db.commit()
    db.refresh(bitacora)
    return bitacora


def actualizar_bitacora(
    db: Session, bitacora_id: int, cambios: schemas.BitacoraActualizar, usuario: models.Usuario
) -> models.BitacoraDiaria:
    bitacora = obtener_bitacora_o_404(db, bitacora_id)
    _verificar_propiedad_o_403(bitacora.responsable_id, usuario)

    if bitacora.estado not in ESTADOS_EDITABLES:  # R4
        raise AppError(409, "Una bitácora en este estado no se puede editar")

    datos = cambios.model_dump(exclude_unset=True)

    for coleccion, modelo in (
        ("registros_avance", models.RegistroAvanceActividad),
        ("registros_personal", models.RegistroPersonal),
        ("registros_material", models.RegistroMaterial),
        ("incidentes", models.Incidente),
    ):
        if coleccion in datos and datos[coleccion] is not None:
            nuevos = datos.pop(coleccion)
            if coleccion == "registros_avance":
                _validar_actividades(db, bitacora.obra_id, {r["actividad_id"] for r in nuevos})
            db.query(modelo).filter(modelo.bitacora_id == bitacora.id).delete()
            for item in nuevos:
                db.add(modelo(bitacora_id=bitacora.id, **item))

    for campo, valor in datos.items():
        setattr(bitacora, campo, valor)

    db.commit()
    db.refresh(bitacora)
    return bitacora


def cambiar_estado_bitacora(
    db: Session,
    bitacora_id: int,
    nuevo_estado: str,
    usuario: models.Usuario,
    motivo_rechazo: str | None = None,
) -> models.BitacoraDiaria:
    bitacora = obtener_bitacora_o_404(db, bitacora_id)
    _verificar_propiedad_o_403(bitacora.responsable_id, usuario)

    transiciones_permitidas = TRANSICIONES_VALIDAS.get(bitacora.estado, set())
    if nuevo_estado not in transiciones_permitidas:  # R10
        raise AppError(
            409,
            f"No se puede pasar una bitácora de '{bitacora.estado}' a '{nuevo_estado}'",
        )

    if nuevo_estado in ("aprobada", "rechazada") and usuario.rol != "interventor":  # R7
        raise AppError(403, "Solo un interventor puede aprobar o rechazar una bitácora")

    if nuevo_estado == "aprobada":
        bitacora.aprobado_por_id = usuario.id
        bitacora.aprobado_en = datetime.now(timezone.utc)
        bitacora.motivo_rechazo = None
    elif nuevo_estado == "rechazada":
        if not motivo_rechazo:
            raise AppError(
                400,
                "Debe indicar el motivo del rechazo",
                errores=[{"campo": "motivo_rechazo", "mensaje": "obligatorio al rechazar"}],
            )
        bitacora.motivo_rechazo = motivo_rechazo
    elif nuevo_estado == "borrador":
        pass  # el residente corrige y reenvía

    bitacora.estado = nuevo_estado
    db.commit()
    db.refresh(bitacora)
    return bitacora


def eliminar_bitacora(db: Session, bitacora_id: int, usuario: models.Usuario) -> None:
    bitacora = obtener_bitacora_o_404(db, bitacora_id)
    _verificar_propiedad_o_403(bitacora.responsable_id, usuario)
    if bitacora.estado == "aprobada":  # R4
        raise AppError(409, "Una bitácora aprobada no se puede eliminar")
    db.delete(bitacora)
    db.commit()
