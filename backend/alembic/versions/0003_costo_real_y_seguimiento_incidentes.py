"""costo real por actividad y seguimiento de incidentes

- actividades.costo_real: gasto real acumulado (lo registra administración).
- incidentes.estado / responsable / fecha_limite / cerrado_en: el incidente
  pasa a ser una tarea con seguimiento. Las filas existentes quedan
  'abierto' y las actividades existentes con costo_real = 0.

Revision ID: 0003_costo_y_seguimiento
Revises: 0002_fotos_avance
Create Date: 2026-10-08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003_costo_y_seguimiento"
down_revision = "0002_fotos_avance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "actividades",
        sa.Column("costo_real", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "incidentes",
        sa.Column("estado", sa.String(length=15), nullable=False, server_default="abierto"),
    )
    op.add_column("incidentes", sa.Column("responsable", sa.String(length=200), nullable=True))
    op.add_column("incidentes", sa.Column("fecha_limite", sa.Date(), nullable=True))
    op.add_column("incidentes", sa.Column("cerrado_en", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("incidentes", "cerrado_en")
    op.drop_column("incidentes", "fecha_limite")
    op.drop_column("incidentes", "responsable")
    op.drop_column("incidentes", "estado")
    op.drop_column("actividades", "costo_real")
