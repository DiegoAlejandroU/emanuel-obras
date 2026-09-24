from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..db.base import Base


class FotoAvance(Base):
    """Foto adjunta a un registro de avance de una actividad, dentro de una
    bitácora diaria. El archivo se guarda en disco (`uploads/avances/`); esta
    fila solo guarda su metadato — nunca se confía en el nombre original del
    archivo para construir rutas (ver `fotos_avance_service`)."""

    __tablename__ = "fotos_avance"

    id = Column(Integer, primary_key=True, index=True)
    registro_avance_id = Column(Integer, ForeignKey("registros_avance_actividad.id"), nullable=False)
    nombre_archivo = Column(String(80), nullable=False)  # nombre generado en disco (uuid + extensión)
    nombre_original = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    tamano_bytes = Column(Integer, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    registro_avance = relationship("RegistroAvanceActividad", back_populates="fotos")
