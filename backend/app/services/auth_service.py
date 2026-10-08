from sqlalchemy.orm import Session

from .. import models
from ..core.security import crear_token_acceso, hashear_password, verificar_password
from ..exceptions import AppError
from ..models.usuario import ROLES_VALIDOS


def autenticar(db: Session, email: str, password: str) -> str:
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or not usuario.activo or not verificar_password(password, usuario.password_hash):
        raise AppError(401, "Credenciales inválidas")

    # `nombre` solo se usa para mostrarlo en la interfaz; la autorización siempre
    # sale del usuario y rol que el backend vuelve a cargar en cada petición.
    return crear_token_acceso({"sub": str(usuario.id), "rol": usuario.rol, "nombre": usuario.nombre})


def crear_usuario(db: Session, nombre: str, email: str, password: str, rol: str) -> models.Usuario:
    if rol not in ROLES_VALIDOS:
        raise AppError(400, "Rol inválido", errores=[{"campo": "rol", "mensaje": f"debe ser uno de {ROLES_VALIDOS}"}])

    if db.query(models.Usuario).filter(models.Usuario.email == email).first():
        raise AppError(409, "Ya existe un usuario con ese correo")

    usuario = models.Usuario(
        nombre=nombre,
        email=email,
        password_hash=hashear_password(password),
        rol=rol,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def listar_usuarios(db: Session) -> list[models.Usuario]:
    return db.query(models.Usuario).order_by(models.Usuario.id).all()
