from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from ..db.base import Base

ROLES_VALIDOS = ("administrador", "residente_obra", "interventor", "gerencia")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(30), nullable=False, default="residente_obra")
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
