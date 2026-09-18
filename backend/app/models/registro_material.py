from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base


class RegistroMaterial(Base):
    __tablename__ = "registros_material"

    id = Column(Integer, primary_key=True, index=True)
    bitacora_id = Column(Integer, ForeignKey("bitacoras_diarias.id"), nullable=False)
    material = Column(String(200), nullable=False)
    cantidad = Column(Float, default=0)
    unidad = Column(String(30))

    bitacora = relationship("BitacoraDiaria", back_populates="registros_material")
