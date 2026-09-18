from sqlalchemy import Column, Integer, String, Float, Date
from sqlalchemy.orm import relationship

from ..db.base import Base

ESTADOS_VALIDOS = ("planificada", "en_ejecucion", "suspendida", "terminada", "cancelada")


class Obra(Base):
    __tablename__ = "obras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    contratista = Column(String(200))
    ubicacion = Column(String(200))
    fecha_inicio = Column(Date)
    fecha_fin_estimada = Column(Date)
    presupuesto_total = Column(Float, default=0)
    estado = Column(String(30), default="planificada")

    actividades = relationship("Actividad", back_populates="obra", cascade="all, delete-orphan")
    bitacoras = relationship("BitacoraDiaria", back_populates="obra", cascade="all, delete-orphan")
    alertas = relationship("Alerta", back_populates="obra", cascade="all, delete-orphan")
