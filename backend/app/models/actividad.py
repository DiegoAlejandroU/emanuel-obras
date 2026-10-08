from sqlalchemy import Column, Integer, String, Float, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

ESTADOS_VALIDOS = ("pendiente", "en_progreso", "completada")


class Actividad(Base):
    """Actividad planeada del cronograma (ej: cimentación, estructura, redes)."""

    __tablename__ = "actividades"

    id = Column(Integer, primary_key=True, index=True)
    obra_id = Column(Integer, ForeignKey("obras.id"), nullable=False)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text)
    peso_porcentual = Column(Float, default=0)  # fracción 0–1 del avance total de la obra
    costo_presupuestado = Column(Float, default=0)
    costo_real = Column(Float, nullable=False, default=0, server_default="0")  # gasto real acumulado, lo registra administración
    fecha_inicio_programada = Column(Date)
    fecha_fin_programada = Column(Date)
    estado = Column(String(30), default="pendiente")

    obra = relationship("Obra", back_populates="actividades")
    registros_avance = relationship(
        "RegistroAvanceActividad", back_populates="actividad", cascade="all, delete-orphan"
    )
