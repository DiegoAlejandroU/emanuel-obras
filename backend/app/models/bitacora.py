from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base

ESTADOS_VALIDOS = ("borrador", "enviada", "aprobada", "rechazada")

# Máquina de estados — sección 5 del estándar. Cualquier transición no
# listada aquí responde 409 (regla R10).
TRANSICIONES_VALIDAS = {
    "borrador": {"enviada"},
    "enviada": {"aprobada", "rechazada"},
    "rechazada": {"borrador"},
    "aprobada": set(),  # estado final
}


class BitacoraDiaria(Base):
    """Entrada diaria de bitácora de obra."""

    __tablename__ = "bitacoras_diarias"

    id = Column(Integer, primary_key=True, index=True)
    obra_id = Column(Integer, ForeignKey("obras.id"), nullable=False)
    fecha = Column(Date, nullable=False, server_default=func.current_date())
    responsable_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    clima = Column(String(100))
    personal_en_obra = Column(Integer, default=0)
    resumen = Column(Text)
    estado = Column(String(20), nullable=False, default="borrador")

    aprobado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    aprobado_en = Column(DateTime(timezone=True), nullable=True)
    motivo_rechazo = Column(Text, nullable=True)

    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    obra = relationship("Obra", back_populates="bitacoras")
    responsable = relationship("Usuario", foreign_keys=[responsable_id])
    aprobado_por = relationship("Usuario", foreign_keys=[aprobado_por_id])

    registros_avance = relationship(
        "RegistroAvanceActividad", back_populates="bitacora", cascade="all, delete-orphan"
    )
    registros_personal = relationship(
        "RegistroPersonal", back_populates="bitacora", cascade="all, delete-orphan"
    )
    registros_material = relationship(
        "RegistroMaterial", back_populates="bitacora", cascade="all, delete-orphan"
    )
    incidentes = relationship("Incidente", back_populates="bitacora", cascade="all, delete-orphan")
