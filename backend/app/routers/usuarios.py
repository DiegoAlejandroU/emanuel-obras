from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..core.deps import requiere_rol
from ..db.session import get_db
from ..services import auth_service

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


@router.get("/", response_model=list[schemas.UsuarioRespuesta], dependencies=[Depends(requiere_rol("administrador"))])
def listar_usuarios(db: Session = Depends(get_db)):
    return auth_service.listar_usuarios(db)


@router.post("/", response_model=schemas.UsuarioRespuesta, dependencies=[Depends(requiere_rol("administrador"))])
def crear_usuario(datos: schemas.UsuarioCrear, db: Session = Depends(get_db)):
    return auth_service.crear_usuario(db, datos.nombre, datos.email, datos.password, datos.rol)
