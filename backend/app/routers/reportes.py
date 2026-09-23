from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..core.deps import requiere_rol
from ..db.session import get_db
from ..services import reportes_service

router = APIRouter(prefix="/api/obras", tags=["Reportes"])

_ROLES_REPORTES = ("administrador", "gerencia", "interventor")


@router.get("/{obra_id}/reportes/pdf", dependencies=[Depends(requiere_rol(*_ROLES_REPORTES))])
def reporte_pdf(obra_id: int, db: Session = Depends(get_db)):
    contenido, nombre_archivo = reportes_service.generar_reporte_pdf(db, obra_id)
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.get("/{obra_id}/reportes/xlsx", dependencies=[Depends(requiere_rol(*_ROLES_REPORTES))])
def reporte_xlsx(obra_id: int, db: Session = Depends(get_db)):
    contenido, nombre_archivo = reportes_service.generar_reporte_xlsx(db, obra_id)
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
