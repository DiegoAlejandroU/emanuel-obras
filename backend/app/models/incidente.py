from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

TIPOS_VALIDOS = ("seguridad", "clima", "tecnico", "logistico", "otro")
GRAVEDADES_VALIDAS = ("baja", "media", "alta")


class Incidente(Base):
    __tablename__ = "incidentes"

    id = Column(Integer, primary_key=True, index=True)
    bitacora_id = Column(Integer, ForeignKey("bitacoras_diarias.id"), nullable=False)
    tipo = Column(String(30), nullable=False, default="otro")
    descripcion = Column(Text, nullable=False)
    gravedad = Column(String(10), nullable=False, default="baja")
    acciones_tomadas = Column(Text)

    bitacora = relationship("BitacoraDiaria", back_populates="incidentes")
