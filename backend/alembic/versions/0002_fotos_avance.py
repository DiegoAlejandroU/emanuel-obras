"""fotos_avance — fotos adjuntas a un registro de avance de actividad

Revision ID: 0002_fotos_avance
Revises: 0001_inicial
Create Date: 2026-09-24

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_fotos_avance"
down_revision = "0001_inicial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fotos_avance",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "registro_avance_id",
            sa.Integer(),
            sa.ForeignKey("registros_avance_actividad.id"),
            nullable=False,
        ),
        sa.Column("nombre_archivo", sa.String(length=80), nullable=False),
        sa.Column("nombre_original", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("tamano_bytes", sa.Integer(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_fotos_avance_registro_avance_id", "fotos_avance", ["registro_avance_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_fotos_avance_registro_avance_id", table_name="fotos_avance")
    op.drop_table("fotos_avance")
