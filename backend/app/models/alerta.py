from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base

TIPOS_VALIDOS = ("retraso_fisico", "retraso_financiero", "incidente_grave")
ESTADOS_VALIDOS = ("activa", "resuelta")


class Alerta(Base):
    """Generada únicamente por el sistema (regla R9) — nunca por POST directo del usuario."""

    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    obra_id = Column(Integer, ForeignKey("obras.id"), nullable=False)
    tipo = Column(String(30), nullable=False)
    mensaje = Column(Text, nullable=False)
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())
    estado = Column(String(10), nullable=False, default="activa")

    obra = relationship("Obra", back_populates="alertas")
