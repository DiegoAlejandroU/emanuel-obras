from fastapi import APIRouter, Depends, File, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import schemas
from ..core.deps import requiere_rol, verificar_token
from ..db.session import get_db
from ..services import fotos_avance_service
from ..services.fotos_avance_service import ArchivoSubido

router = APIRouter(prefix="/api/bitacoras", tags=["Fotos de avance"])

_ROLES_ESCRITURA = ("administrador", "residente_obra")


@router.post(
    "/registros-avance/{registro_avance_id}/fotos",
    response_model=list[schemas.FotoAvanceRespuesta],
)
async def subir_fotos_avance(
    registro_avance_id: int,
    archivos: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(requiere_rol(*_ROLES_ESCRITURA)),
):
    leidos = [
        ArchivoSubido(
            nombre_original=archivo.filename or "foto",
            content_type=archivo.content_type or "",
            contenido=await archivo.read(),
        )
        for archivo in archivos
    ]
    return fotos_avance_service.subir_fotos(db, registro_avance_id, leidos, usuario)


@router.get("/fotos/{foto_id}", dependencies=[Depends(verificar_token)])
def descargar_foto_avance(foto_id: int, db: Session = Depends(get_db)):
    foto = fotos_avance_service.obtener_foto_o_404(db, foto_id)
    return FileResponse(
        fotos_avance_service.ruta_absoluta(foto),
        media_type=foto.content_type,
        filename=foto.nombre_original,
    )


@router.delete("/fotos/{foto_id}", status_code=204)
def eliminar_foto_avance(
    foto_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(requiere_rol(*_ROLES_ESCRITURA)),
):
    fotos_avance_service.eliminar_foto(db, foto_id, usuario)
    return Response(status_code=204)
