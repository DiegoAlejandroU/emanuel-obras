"""Fotos adjuntas a los registros de avance de actividad de una bitácora.

Los archivos se guardan en disco bajo `RUTA_UPLOADS` (montado como volumen
en producción, ver docker-compose.prod.yml) — la base de datos solo guarda
el metadato. El nombre en disco siempre se genera con `uuid4`, nunca se usa
el nombre original del archivo para construir la ruta (evita path
traversal). Solo puede haber fotos mientras la bitácora esté en un estado
editable (misma regla R4 que el resto del contenido de la bitácora), y
aplica el mismo control de propiedad que el resto de operaciones de
bitácoras (ver `bitacoras_service.verificar_propiedad_o_403`).
"""

import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from .. import models
from ..exceptions import AppError
from .bitacoras_service import ESTADOS_EDITABLES, obtener_bitacora_o_404, verificar_propiedad_o_403

RUTA_UPLOADS = Path("uploads/avances")

EXTENSION_POR_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024  # 8 MB por foto
MAX_FOTOS_POR_REGISTRO = 12


@dataclass
class ArchivoSubido:
    """Contenido ya leído de un archivo recibido por el router (evita que el
    servicio dependa de `UploadFile`/async — mismo estilo síncrono del resto
    de los servicios)."""

    nombre_original: str
    content_type: str
    contenido: bytes


def _obtener_registro_avance_o_404(db: Session, registro_avance_id: int) -> models.RegistroAvanceActividad:
    registro = (
        db.query(models.RegistroAvanceActividad)
        .filter(models.RegistroAvanceActividad.id == registro_avance_id)
        .first()
    )
    if not registro:
        raise AppError(404, "Registro de avance no encontrado")
    return registro


def _verificar_bitacora_editable(bitacora: models.BitacoraDiaria, usuario: models.Usuario) -> None:
    verificar_propiedad_o_403(bitacora.responsable_id, usuario)
    if bitacora.estado not in ESTADOS_EDITABLES:  # R4
        raise AppError(409, "Una bitácora en este estado no se puede editar")


def subir_fotos(
    db: Session, registro_avance_id: int, archivos: list[ArchivoSubido], usuario: models.Usuario
) -> list[models.FotoAvance]:
    if not archivos:
        raise AppError(400, "No se recibió ningún archivo")

    registro = _obtener_registro_avance_o_404(db, registro_avance_id)
    _verificar_bitacora_editable(registro.bitacora, usuario)

    existentes = (
        db.query(models.FotoAvance).filter(models.FotoAvance.registro_avance_id == registro.id).count()
    )
    if existentes + len(archivos) > MAX_FOTOS_POR_REGISTRO:
        raise AppError(
            400,
            f"Un registro de avance admite máximo {MAX_FOTOS_POR_REGISTRO} fotos "
            f"(ya tiene {existentes})",
        )

    for archivo in archivos:
        if archivo.content_type not in EXTENSION_POR_CONTENT_TYPE:
            raise AppError(
                400,
                f"Formato de imagen no admitido: {archivo.content_type}. Use JPG, PNG o WEBP.",
                errores=[{"campo": "archivos", "mensaje": "formato no admitido"}],
            )
        if len(archivo.contenido) > TAMANO_MAXIMO_BYTES:
            raise AppError(
                400,
                f"'{archivo.nombre_original}' supera el tamaño máximo de "
                f"{TAMANO_MAXIMO_BYTES // (1024 * 1024)} MB",
                errores=[{"campo": "archivos", "mensaje": "archivo demasiado grande"}],
            )
        if not archivo.contenido:
            raise AppError(400, f"'{archivo.nombre_original}' está vacío")

    directorio = RUTA_UPLOADS / str(registro.id)
    directorio.mkdir(parents=True, exist_ok=True)

    fotos_creadas = []
    for archivo in archivos:
        extension = EXTENSION_POR_CONTENT_TYPE[archivo.content_type]
        nombre_archivo = f"{uuid.uuid4().hex}{extension}"
        (directorio / nombre_archivo).write_bytes(archivo.contenido)

        foto = models.FotoAvance(
            registro_avance_id=registro.id,
            nombre_archivo=nombre_archivo,
            nombre_original=archivo.nombre_original[:255],
            content_type=archivo.content_type,
            tamano_bytes=len(archivo.contenido),
        )
        db.add(foto)
        fotos_creadas.append(foto)

    db.commit()
    for foto in fotos_creadas:
        db.refresh(foto)
    return fotos_creadas


def obtener_foto_o_404(db: Session, foto_id: int) -> models.FotoAvance:
    foto = db.query(models.FotoAvance).filter(models.FotoAvance.id == foto_id).first()
    if not foto:
        raise AppError(404, "Foto no encontrada")
    return foto


def ruta_absoluta(foto: models.FotoAvance) -> Path:
    return RUTA_UPLOADS / str(foto.registro_avance_id) / foto.nombre_archivo


def eliminar_foto(db: Session, foto_id: int, usuario: models.Usuario) -> None:
    foto = obtener_foto_o_404(db, foto_id)
    bitacora = obtener_bitacora_o_404(db, foto.registro_avance.bitacora_id)
    _verificar_bitacora_editable(bitacora, usuario)

    ruta = ruta_absoluta(foto)
    db.delete(foto)
    db.commit()
    ruta.unlink(missing_ok=True)
