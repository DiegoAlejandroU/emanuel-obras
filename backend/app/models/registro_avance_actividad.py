from sqlalchemy import Column, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base


class RegistroAvanceActividad(Base):
    """Avance reportado para una actividad específica dentro de una bitácora diaria."""

    __tablename__ = "registros_avance_actividad"

    id = Column(Integer, primary_key=True, index=True)
    bitacora_id = Column(Integer, ForeignKey("bitacoras_diarias.id"), nullable=False)
    actividad_id = Column(Integer, ForeignKey("actividades.id"), nullable=False)
    avance_del_dia = Column(Float, default=0)  # % avanzado ese día en esa actividad
    observaciones = Column(Text)

    bitacora = relationship("BitacoraDiaria", back_populates="registros_avance")
    actividad = relationship("Actividad", back_populates="registros_avance")
    fotos = relationship("FotoAvance", back_populates="registro_avance", cascade="all, delete-orphan")
