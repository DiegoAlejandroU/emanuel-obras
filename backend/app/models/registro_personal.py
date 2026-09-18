from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base


class RegistroPersonal(Base):
    __tablename__ = "registros_personal"

    id = Column(Integer, primary_key=True, index=True)
    bitacora_id = Column(Integer, ForeignKey("bitacoras_diarias.id"), nullable=False)
    cargo = Column(String(120), nullable=False)
    cantidad = Column(Integer, default=1)
    horas_trabajadas = Column(Float, default=0)

    bitacora = relationship("BitacoraDiaria", back_populates="registros_personal")
