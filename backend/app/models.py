from sqlalchemy import Column, Integer, String, Float, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Obra(Base):
    __tablename__ = "obras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    ubicacion = Column(String(200))
    fecha_inicio = Column(Date)
    fecha_fin_estimada = Column(Date)
    presupuesto_total = Column(Float, default=0)
    estado = Column(String(50), default="activa")  # activa, suspendida, finalizada

    actividades = relationship("Actividad", back_populates="obra", cascade="all, delete-orphan")
    registros_bitacora = relationship("RegistroBitacora", back_populates="obra", cascade="all, delete-orphan")


class Actividad(Base):
    """Actividad planeada del cronograma (ej: cimentación, estructura, redes)."""
    __tablename__ = "actividades"

    id = Column(Integer, primary_key=True, index=True)
    obra_id = Column(Integer, ForeignKey("obras.id"), nullable=False)
    nombre = Column(String(200), nullable=False)
    peso_porcentual = Column(Float, default=0)       # peso de esta actividad en el avance total de la obra
    presupuesto_asignado = Column(Float, default=0)
    avance_porcentual = Column(Float, default=0)     # se actualiza a partir de los registros de bitácora

    obra = relationship("Obra", back_populates="actividades")
    avances = relationship("AvanceActividad", back_populates="actividad", cascade="all, delete-orphan")


class RegistroBitacora(Base):
    """Entrada diaria de bitácora de obra."""
    __tablename__ = "registros_bitacora"

    id = Column(Integer, primary_key=True, index=True)
    obra_id = Column(Integer, ForeignKey("obras.id"), nullable=False)
    fecha = Column(Date, nullable=False, server_default=func.current_date())
    clima = Column(String(100))
    personal_en_obra = Column(Integer, default=0)
    descripcion_general = Column(Text)
    incidentes = Column(Text)
    creado_por = Column(String(120))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    obra = relationship("Obra", back_populates="registros_bitacora")
    avances_actividades = relationship("AvanceActividad", back_populates="registro", cascade="all, delete-orphan")


class AvanceActividad(Base):
    """Avance reportado para una actividad específica dentro de un registro de bitácora."""
    __tablename__ = "avances_actividad"

    id = Column(Integer, primary_key=True, index=True)
    registro_id = Column(Integer, ForeignKey("registros_bitacora.id"), nullable=False)
    actividad_id = Column(Integer, ForeignKey("actividades.id"), nullable=False)
    avance_incremental = Column(Float, default=0)   # % avanzado ese día en esa actividad
    materiales_usados = Column(Text)                 # descripción libre por ahora (ej: "20 bultos de cemento")
    costo_estimado_dia = Column(Float, default=0)

    registro = relationship("RegistroBitacora", back_populates="avances_actividades")
    actividad = relationship("Actividad", back_populates="avances")
